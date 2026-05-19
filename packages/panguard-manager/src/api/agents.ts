/**
 * Agent registration + listing HTTP handlers
 * 代理註冊與列出的 HTTP 處理器
 *
 * @module @panguard-ai/panguard-manager/api/agents
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@panguard-ai/core';
import type { AgentsRegistry } from '../agents-registry.js';
import type { FleetAggregator } from '../aggregator.js';
import type { RegisterBody } from '../types.js';
import { fail, newRequestId, ok, readJsonBody } from './respond.js';

const logger = createLogger('panguard-manager:api:agents');

export interface AgentsApiDeps {
  readonly registry: AgentsRegistry;
  readonly aggregator: FleetAggregator;
}

/** POST /api/agents/register / 註冊新代理 */
export async function handleRegister(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AgentsApiDeps
): Promise<void> {
  const request_id = newRequestId();
  try {
    const body = await readJsonBody<Partial<RegisterBody>>(req);
    if (!body.hostname || !body.machine_id) {
      fail(res, 400, 'hostname and machine_id are required', request_id);
      return;
    }
    const { agent_id, token } = deps.registry.register({
      hostname: body.hostname,
      os_type: body.os_type ?? 'unknown',
      panguard_version: body.panguard_version ?? 'unknown',
      machine_id: body.machine_id,
    });
    // Hydrate aggregator so a fresh agent shows up in /api/status even before its first relay event
    // 讓新代理在第一筆 relay 事件之前就能出現在 /api/status
    const record = deps.registry.findByAgentId(agent_id);
    if (record) {
      deps.aggregator.hydrateFromRegistry([record]);
    }
    logger.info(`Registered agent ${agent_id} (${body.hostname})`);
    ok(res, { agent_id, token }, request_id, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(res, 400, msg, request_id);
  }
}

/** GET /api/agents / 列出所有代理 */
export function handleList(res: ServerResponse, deps: AgentsApiDeps): void {
  const request_id = newRequestId();
  const agents = deps.aggregator.listAgents();
  ok(res, { agents, total: agents.length }, request_id);
}

/** GET /api/agents/:id / 取得單一代理 detail */
export function handleDetail(res: ServerResponse, agent_id: string, deps: AgentsApiDeps): void {
  const request_id = newRequestId();
  const detail = deps.aggregator.getAgentDetail(agent_id);
  if (!detail) {
    fail(res, 404, `unknown agent: ${agent_id}`, request_id);
    return;
  }
  ok(res, detail, request_id);
}

/** POST /api/agents/:id/revoke / 撤銷代理 */
export function handleRevoke(res: ServerResponse, agent_id: string, deps: AgentsApiDeps): void {
  const request_id = newRequestId();
  const revoked = deps.registry.revoke(agent_id);
  if (!revoked) {
    fail(res, 404, `unknown agent: ${agent_id}`, request_id);
    return;
  }
  deps.aggregator.drop(agent_id);
  logger.info(`Revoked agent ${agent_id}`);
  ok(res, { agent_id, revoked: true }, request_id);
}
