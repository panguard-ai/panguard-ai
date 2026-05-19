/**
 * Relay event ingestion HTTP handler
 * Relay 事件接收 HTTP 處理器
 *
 * Accepts events from Guard relay-clients, authenticates via Bearer token,
 * forwards into the aggregator and fans out to dashboard WebSocket listeners.
 *
 * @module @panguard-ai/panguard-manager/api/events
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@panguard-ai/core';
import type { AgentsRegistry } from '../agents-registry.js';
import type { FleetAggregator } from '../aggregator.js';
import type { RelayEventBody } from '../types.js';
import { fail, newRequestId, ok, readJsonBody } from './respond.js';

const logger = createLogger('panguard-manager:api:events');

export interface EventsApiDeps {
  readonly registry: AgentsRegistry;
  readonly aggregator: FleetAggregator;
  /** Broadcast hook fired after an event is ingested / 事件入庫後觸發的廣播 hook */
  readonly broadcast: (payload: {
    type: 'fleet_event' | 'fleet_verdict' | 'fleet_status';
    agent_id: string;
    data: unknown;
    timestamp: string;
  }) => void;
}

/** Extract Bearer token from Authorization header / 從 Authorization 標頭抽出 Bearer token */
function extractBearer(req: IncomingMessage): string | undefined {
  const h = req.headers.authorization ?? '';
  if (!h.startsWith('Bearer ')) return undefined;
  return h.slice('Bearer '.length).trim();
}

/** POST /api/relay/event / 接收 Guard relay event */
export async function handleRelayEvent(
  req: IncomingMessage,
  res: ServerResponse,
  deps: EventsApiDeps
): Promise<void> {
  const request_id = newRequestId();

  const token = extractBearer(req);
  if (!token) {
    fail(res, 401, 'missing bearer token', request_id);
    return;
  }

  let body: RelayEventBody;
  try {
    body = await readJsonBody<RelayEventBody>(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(res, 400, `invalid body: ${msg}`, request_id);
    return;
  }

  if (!body.agent_id) {
    fail(res, 400, 'agent_id is required', request_id);
    return;
  }
  if (!deps.registry.validateToken(body.agent_id, token)) {
    fail(res, 401, 'invalid agent_id or token', request_id);
    return;
  }
  if (!body.event && !body.threat_verdict && !body.status) {
    fail(res, 400, 'event, threat_verdict, or status is required', request_id);
    return;
  }

  const record = deps.registry.findByAgentId(body.agent_id);
  if (!record) {
    fail(res, 401, 'agent revoked', request_id);
    return;
  }

  deps.aggregator.ingest(record, body);
  deps.registry.touch(body.agent_id);

  const timestamp = new Date().toISOString();
  if (body.event) {
    deps.broadcast({
      type: 'fleet_event',
      agent_id: body.agent_id,
      data: body.event,
      timestamp,
    });
  }
  if (body.threat_verdict) {
    deps.broadcast({
      type: 'fleet_verdict',
      agent_id: body.agent_id,
      data: body.threat_verdict,
      timestamp,
    });
  }
  if (body.status) {
    deps.broadcast({
      type: 'fleet_status',
      agent_id: body.agent_id,
      data: body.status,
      timestamp,
    });
  }

  logger.debug(`Ingested relay event from ${body.agent_id}`);
  ok(res, { ingested: true }, request_id);
}
