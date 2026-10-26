/**
 * WebSocket front end (spec 2026-04-24, "WebSocket mode").
 *
 * One client connection is pinned to one upstream connection: store=false state
 * lives on the provider's connection, so a gateway that reconnected or
 * multiplexed would break the chain. Turns run strictly one at a time; a turn
 * the gateway cut keeps draining upstream before the next one is sent.
 *
 * The gateway is the server the client sees, so it honours the spec's eviction
 * rule itself: when it fails a continuation turn, the referenced
 * previous_response_id is evicted on this connection and later references get
 * previous_response_not_found.
 *
 * @module @panguard-ai/panguard-gateway/ws-session
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import WebSocket, { type RawData } from 'ws';
import type { AuditContext } from './audit.js';
import {
  previousResponseNotFound,
  invalidRequest,
  wsErrorEnvelope,
  type Rejection,
} from './errors.js';
import { isObject, num, parseJson, str, type JsonObject } from './json.js';
import { inspectRequest } from './request-inspector.js';
import {
  auditResponse,
  inspectContext,
  recordLedger,
  turnContext,
  type GatewayServices,
} from './services.js';
import { TurnProcessor } from './turn-processor.js';
import { forwardHeaders, upstreamWsUrl } from './upstream.js';

const TERMINAL = new Set(['response.completed', 'response.incomplete', 'response.failed']);

interface ActiveTurn {
  readonly processor: TurnProcessor;
  readonly previousId: string | undefined;
  readonly audit: Omit<AuditContext, 'phase' | 'session' | 'response_id'>;
  readonly clientDone: boolean;
}

export class WsSession {
  private readonly services: GatewayServices;
  private readonly client: WebSocket;
  private readonly upstream: WebSocket;
  private readonly upstreamOpen: Promise<boolean>;
  private readonly id = `ws-${randomUUID()}`;
  private pending: readonly string[] = [];
  private active: ActiveTurn | undefined;
  private starting = false;
  private evicted: ReadonlySet<string> = new Set();
  private upstreamChain: Promise<void> = Promise.resolve();

  constructor(client: WebSocket, req: IncomingMessage, services: GatewayServices) {
    this.services = services;
    this.client = client;
    this.upstream = new WebSocket(upstreamWsUrl(services.config.upstream), {
      headers: forwardHeaders(req.headers, services.config.forwardHeaders),
    });
    this.upstreamOpen = new Promise((resolve) => {
      this.upstream.once('open', () => resolve(true));
      this.upstream.once('error', () => resolve(false));
    });
    this.upstream.on('message', (data) => {
      this.upstreamChain = this.upstreamChain
        .then(() => this.onUpstream(data))
        .catch((err: unknown) => this.fail(`upstream event handling failed: ${errorText(err)}`));
    });
    this.upstream.on('close', () => {
      this.upstreamChain = this.upstreamChain.then(() => this.onUpstreamClosed());
    });
    this.upstream.on('error', (err) => {
      process.stderr.write(`[panguard-gateway] upstream WebSocket error: ${err.message}\n`);
    });
    this.client.on('message', (data) => {
      this.pending = [...this.pending, rawText(data)];
      this.next();
    });
    this.client.on('close', () => this.upstream.close());
    this.client.on('error', () => this.upstream.close());
  }

  /** Start the next queued turn when none is running. */
  private next(): void {
    if (this.active || this.starting) return;
    const [raw, ...rest] = this.pending;
    if (raw === undefined) return;
    this.pending = rest;
    this.starting = true;
    this.startTurn(raw)
      .catch((err: unknown) => this.fail(`turn failed: ${errorText(err)}`))
      .finally(() => {
        this.starting = false;
        this.next();
      });
  }

  private async startTurn(raw: string): Promise<void> {
    const body = parseJson(raw);
    if (!isObject(body))
      return this.sendError(invalidRequest('invalid_json', 'Invalid JSON.', null));
    if (str(body, 'type') !== 'response.create') {
      return this.sendError(invalidRequest('invalid_event', 'Expected response.create.', 'type'));
    }
    const previousId = str(body, 'previous_response_id');
    if (previousId !== undefined && this.evicted.has(previousId)) {
      return this.sendError(previousResponseNotFound(previousId));
    }
    const audit = {
      transport: 'websocket' as const,
      previous_response_id: previousId,
      safety_identifier: str(body, 'safety_identifier'),
    };
    const inspection = await inspectRequest(body, inspectContext(this.services));
    this.services.audit.record(
      { ...audit, phase: 'request', session: this.id },
      inspection.decisions
    );
    if (inspection.kind === 'reject') {
      // The gateway failed this continuation turn: evict as the spec requires.
      if (previousId !== undefined) this.evict(previousId);
      return this.sendError(inspection.rejection);
    }
    if (!(await this.upstreamOpen)) {
      return this.sendError({
        status: 502,
        type: 'server_error',
        code: 'upstream_unavailable',
        message: '[PanGuard] the upstream WebSocket could not be opened',
        param: null,
      });
    }
    const ctx = turnContext(
      this.services,
      inspection.declared,
      inspection.decisions,
      inspection.notInspected
    );
    this.active = { processor: new TurnProcessor(ctx), previousId, audit, clientDone: false };
    this.upstream.send(JSON.stringify(inspection.body));
  }

  private async onUpstream(data: RawData): Promise<void> {
    const text = rawText(data);
    const event = parseJson(text);
    const turn = this.active;
    if (!turn || !isObject(event)) {
      process.stderr.write(
        '[panguard-gateway] dropped an upstream WebSocket message outside a turn\n'
      );
      return;
    }
    if (str(event, 'type') === 'error' && num(event, 'status') !== undefined) {
      // The provider failed the turn (and evicted on its side); relay and mirror.
      if (!turn.clientDone) this.send(event);
      if (turn.previousId !== undefined) this.evict(turn.previousId);
      return this.endTurn();
    }
    const out = await turn.processor.push(event);
    if (!turn.clientDone) for (const message of out) this.send(message);
    if (!turn.clientDone && turn.processor.isEnded()) {
      this.active = { ...turn, clientDone: true };
      recordLedger(this.services, turn.processor.outcome());
    }
    if (TERMINAL.has(str(event, 'type') ?? '')) this.endTurn();
  }

  private onUpstreamClosed(): void {
    const turn = this.active;
    if (turn && !turn.clientDone) for (const message of turn.processor.finish()) this.send(message);
    if (turn) this.endTurn();
    this.client.close();
  }

  private endTurn(): void {
    const turn = this.active;
    this.active = undefined;
    if (turn) {
      const outcome = turn.processor.outcome();
      recordLedger(this.services, outcome);
      auditResponse(this.services, turn.audit, this.id, outcome);
    }
    this.next();
  }

  private evict(responseId: string): void {
    this.evicted = new Set([...this.evicted, responseId]);
  }

  private sendError(rejection: Rejection): void {
    this.send(wsErrorEnvelope(rejection));
  }

  private send(message: JsonObject): void {
    if (this.client.readyState === WebSocket.OPEN) this.client.send(JSON.stringify(message));
  }

  private fail(reason: string): void {
    process.stderr.write(`[panguard-gateway] WebSocket session ${this.id}: ${reason}\n`);
    this.client.close(1011, 'gateway error');
    this.upstream.close();
  }
}

function rawText(data: RawData): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf-8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf-8');
  return Buffer.from(data).toString('utf-8');
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
