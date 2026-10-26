/**
 * HTTP front end: POST /v1/responses (JSON and SSE), the compact endpoint as an
 * explicit pass-through, a health route, and 404 for everything else. Unknown
 * routes are refused, never forwarded, so no traffic slips past unchecked.
 *
 * @module @panguard-ai/panguard-gateway/http-handler
 */

import { once } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { httpErrorBody, invalidRequest, type Rejection } from './errors.js';
import { isObject, parseJson, str, type JsonObject } from './json.js';
import { inspectRequest } from './request-inspector.js';
import { inspectResponseBody } from './response-inspector.js';
import {
  auditResponse,
  inspectContext,
  recordLedger,
  turnContext,
  type GatewayServices,
} from './services.js';
import { SSE_DONE, formatSse, readSse } from './sse.js';
import { TurnProcessor, type TurnContext } from './turn-processor.js';
import { forwardHeaders, postUpstream } from './upstream.js';

interface AuditBase {
  readonly transport: 'sse' | 'http';
  readonly previous_response_id: string | undefined;
  readonly safety_identifier: string | undefined;
}

/** How long the gateway keeps reading a provider stream after it cut the client's. */
const DRAIN_LIMIT_MS = 60_000;

export type HealthReport = () => JsonObject;

export function createHttpHandler(
  services: GatewayServices,
  health: HealthReport
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    route(req, res, services, health).catch((err: unknown) => {
      process.stderr.write(`[panguard-gateway] request failed: ${errorText(err)}\n`);
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: {
            type: 'server_error',
            code: 'gateway_internal_error',
            message: '[PanGuard] gateway error',
            param: null,
          },
        });
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  };
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  services: GatewayServices,
  health: HealthReport
): Promise<void> {
  const path = new URL(req.url ?? '/', 'http://gateway').pathname.replace(/\/+$/, '');
  if (req.method === 'POST' && path === '/v1/responses') return handleResponses(req, res, services);
  if (req.method === 'POST' && path === '/v1/responses/compact')
    return passThrough(req, res, services);
  if (req.method === 'GET' && path === '/healthz') return sendJson(res, 200, health());
  sendJson(res, 404, {
    error: {
      type: 'not_found',
      code: 'route_not_found',
      message: `No route for ${req.method ?? ''} ${path}`,
      param: null,
    },
  });
}

async function handleResponses(
  req: IncomingMessage,
  res: ServerResponse,
  services: GatewayServices
): Promise<void> {
  const raw = await readBody(req, services.config.maxBodyBytes);
  if (typeof raw !== 'string') return sendRejection(res, raw);
  const body = parseJson(raw);
  if (!isObject(body)) {
    return sendRejection(
      res,
      invalidRequest('invalid_json', 'Request body must be a JSON object.', null)
    );
  }
  const streaming = body['stream'] === true;
  const previousId = str(body, 'previous_response_id');
  const auditBase: AuditBase = {
    transport: streaming ? 'sse' : 'http',
    previous_response_id: previousId,
    safety_identifier: str(body, 'safety_identifier'),
  };
  const inspection = await inspectRequest(body, inspectContext(services));
  services.audit.record(
    {
      ...auditBase,
      phase: 'request',
      session: previousId !== undefined ? services.ledger.chainRoot(previousId) : 'new-chain',
    },
    inspection.decisions
  );
  if (inspection.kind === 'reject') return sendRejection(res, inspection.rejection);

  const abort = new AbortController();
  const upstream = await callUpstream(
    req,
    services,
    '/responses',
    JSON.stringify(inspection.body),
    abort
  );
  if (!upstream) return sendRejection(res, upstreamUnavailable());
  if (!upstream.ok) return relay(res, upstream);

  const ctx = turnContext(
    services,
    inspection.declared,
    inspection.decisions,
    inspection.notInspected
  );
  const isSse = (upstream.headers.get('content-type') ?? '').includes('text/event-stream');
  if (streaming && isSse && upstream.body) {
    return streamTurn(res, upstream, ctx, services, auditBase, abort);
  }
  const payload = parseJson(await upstream.text());
  if (!isObject(payload)) return sendRejection(res, upstreamInvalid());
  const { body: inspected, outcome } = await inspectResponseBody(payload, ctx);
  recordLedger(services, outcome);
  auditResponse(services, auditBase, undefined, outcome);
  sendJson(res, 200, inspected);
}

/** SSE turn: relay as the processor releases, then drain the provider to complete the ledger. */
async function streamTurn(
  res: ServerResponse,
  upstream: Response,
  ctx: TurnContext,
  services: GatewayServices,
  auditBase: AuditBase,
  abort: AbortController
): Promise<void> {
  const turn = new TurnProcessor(ctx);
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  res.on('close', () => {
    // Client gone mid-stream: stop paying for tokens nobody will read.
    if (!turn.isEnded()) abort.abort();
  });
  let drainTimer: NodeJS.Timeout | undefined;
  try {
    for await (const message of readSse(upstream.body as unknown as AsyncIterable<Uint8Array>)) {
      if (message.data === '[DONE]') break;
      const event = parseJson(message.data);
      if (!isObject(event)) {
        process.stderr.write('[panguard-gateway] dropped a non-JSON upstream SSE event\n');
        continue;
      }
      const wasEnded = turn.isEnded();
      await writeEvents(res, await turn.push(event));
      if (!wasEnded && turn.isEnded()) {
        // A fast continuation must already find this turn's withheld calls.
        recordLedger(services, turn.outcome());
        await closeStream(res);
        drainTimer = setTimeout(() => abort.abort(), DRAIN_LIMIT_MS);
      }
    }
  } catch (err) {
    if (!abort.signal.aborted) {
      process.stderr.write(`[panguard-gateway] upstream stream error: ${errorText(err)}\n`);
    }
  } finally {
    clearTimeout(drainTimer);
  }
  const tail = turn.finish();
  if (tail.length > 0) {
    await writeEvents(res, tail);
    await closeStream(res);
  }
  const outcome = turn.outcome();
  recordLedger(services, outcome);
  auditResponse(services, auditBase, undefined, outcome);
}

async function writeEvents(res: ServerResponse, events: readonly JsonObject[]): Promise<void> {
  for (const event of events) await write(res, formatSse(event));
}

async function write(res: ServerResponse, chunk: string): Promise<void> {
  if (res.writableEnded || res.destroyed) return;
  if (!res.write(chunk)) await Promise.race([once(res, 'drain'), once(res, 'close')]);
}

async function closeStream(res: ServerResponse): Promise<void> {
  if (res.writableEnded || res.destroyed) return;
  await write(res, SSE_DONE);
  res.end();
}

/** /responses/compact returns an encrypted compaction window: forwarded unchanged. */
async function passThrough(
  req: IncomingMessage,
  res: ServerResponse,
  services: GatewayServices
): Promise<void> {
  const raw = await readBody(req, services.config.maxBodyBytes);
  if (typeof raw !== 'string') return sendRejection(res, raw);
  const upstream = await callUpstream(
    req,
    services,
    '/responses/compact',
    raw,
    new AbortController()
  );
  if (!upstream) return sendRejection(res, upstreamUnavailable());
  return relay(res, upstream);
}

async function callUpstream(
  req: IncomingMessage,
  services: GatewayServices,
  path: string,
  body: string,
  abort: AbortController
): Promise<Response | undefined> {
  try {
    return await postUpstream(
      services.config.upstream,
      path,
      body,
      forwardHeaders(req.headers, services.config.forwardHeaders),
      abort.signal
    );
  } catch (err) {
    process.stderr.write(`[panguard-gateway] upstream request failed: ${errorText(err)}\n`);
    return undefined;
  }
}

/** Provider errors go back as they came: status, type and body. */
async function relay(res: ServerResponse, upstream: Response): Promise<void> {
  const text = await upstream.text();
  res.writeHead(upstream.status, {
    'content-type': upstream.headers.get('content-type') ?? 'application/json',
  });
  res.end(text);
}

type BodyResult = string | Rejection;

async function readBody(req: IncomingMessage, limit: number): Promise<BodyResult> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > limit) {
      return invalidRequest('request_too_large', `Request body exceeds ${limit} bytes.`, null);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function sendRejection(res: ServerResponse, rejection: Rejection): void {
  sendJson(res, rejection.status, httpErrorBody(rejection));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

function upstreamUnavailable(): Rejection {
  return {
    status: 502,
    type: 'server_error',
    code: 'upstream_unavailable',
    message: '[PanGuard] the upstream provider could not be reached',
    param: null,
  };
}

function upstreamInvalid(): Rejection {
  return {
    status: 502,
    type: 'server_error',
    code: 'upstream_invalid_response',
    message: '[PanGuard] the upstream provider returned a body that is not a JSON object',
    param: null,
  };
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
