/**
 * Agent registration + listing HTTP handlers
 * 代理註冊與列出的 HTTP 處理器
 *
 * @module @panguard-ai/panguard-manager/api/agents
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@panguard-ai/core';
import type { AgentsStore } from '../agents-store.js';
import type { FleetAggregator } from '../aggregator.js';
import type { EnrollmentTokenStore } from '../enrollment-store.js';
import type { RegisterBody } from '../types.js';
import { fail, newRequestId, ok, readJsonBody } from './respond.js';

const logger = createLogger('panguard-manager:api:agents');

export interface AgentsApiDeps {
  readonly registry: AgentsStore;
  readonly aggregator: FleetAggregator;
}

/** Deps for the enrollment-gated register handler / register 端點所需的依賴 */
export interface RegisterDeps extends AgentsApiDeps {
  readonly enrollment: EnrollmentTokenStore;
}

/** Pull X-Enrollment-Token header / 抽出 X-Enrollment-Token 標頭 */
function extractEnrollmentToken(req: IncomingMessage): string | undefined {
  const h = req.headers['x-enrollment-token'];
  if (typeof h === 'string') return h.trim();
  if (Array.isArray(h) && h[0]) return h[0].trim();
  return undefined;
}

/** POST /api/agents/register — gated by an issued enrollment token / 由發放的 enrollment token 控管 */
export async function handleRegister(
  req: IncomingMessage,
  res: ServerResponse,
  deps: RegisterDeps
): Promise<void> {
  const request_id = newRequestId();
  const enrollmentToken = extractEnrollmentToken(req);
  if (!enrollmentToken) {
    fail(res, 401, 'X-Enrollment-Token header required', request_id);
    return;
  }

  // Cheap pre-flight check; the real atomic claim happens below after we
  // know the agent_id. This rejects obviously-bad tokens without spending
  // a SQLite INSERT on the agents table.
  const meta = deps.enrollment.lookup(enrollmentToken);
  if (!meta) {
    fail(res, 401, 'invalid enrollment token', request_id);
    return;
  }
  if (meta.revoked) {
    fail(res, 401, 'enrollment token revoked', request_id);
    return;
  }
  if (meta.used_at) {
    fail(res, 401, 'enrollment token already used', request_id);
    return;
  }
  if (Date.parse(meta.expires_at) < Date.now()) {
    fail(res, 401, 'enrollment token expired', request_id);
    return;
  }

  let body: Partial<RegisterBody>;
  try {
    body = await readJsonBody<Partial<RegisterBody>>(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(res, 400, `invalid body: ${msg}`, request_id);
    return;
  }
  if (!body.hostname || !body.machine_id) {
    fail(res, 400, 'hostname and machine_id are required', request_id);
    return;
  }

  let agent_id: string;
  let token: string;
  try {
    ({ agent_id, token } = deps.registry.register({
      hostname: body.hostname,
      os_type: body.os_type ?? 'unknown',
      panguard_version: body.panguard_version ?? 'unknown',
      machine_id: body.machine_id,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(res, 400, msg, request_id);
    return;
  }

  // Atomically claim the enrollment token now that we have an agent_id.
  // If another concurrent register call beat us, roll back the new agent.
  const claim = deps.enrollment.consume(enrollmentToken, agent_id);
  if (!claim.ok) {
    deps.registry.revoke(agent_id);
    fail(res, 401, `enrollment token ${claim.reason}`, request_id);
    return;
  }

  const record = deps.registry.findByAgentId(agent_id);
  if (record) {
    deps.aggregator.hydrateFromRegistry([record]);
  }
  logger.info(`Registered agent ${agent_id} (${body.hostname}) via enrollment token`);
  ok(res, { agent_id, token }, request_id, 201);
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
