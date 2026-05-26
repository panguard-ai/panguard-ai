/**
 * Operator login / logout / me endpoints.
 * 管理員登入 / 登出 / me 端點。
 *
 * @module @panguard-ai/panguard-manager/api/auth
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@panguard-ai/core';
import type { OperatorStore } from '../operators-store.js';
import { fail, newRequestId, ok, readJsonBody } from './respond.js';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  getAuthContext,
  readSessionCookie,
} from './session.js';

const logger = createLogger('panguard-manager:api:auth');

export interface AuthApiDeps {
  readonly operators: OperatorStore;
}

interface LoginBody {
  readonly username: string;
  readonly password: string;
}

/** POST /api/auth/login / 管理員登入 */
export async function handleLogin(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AuthApiDeps
): Promise<void> {
  const request_id = newRequestId();

  let body: LoginBody;
  try {
    body = await readJsonBody<LoginBody>(req);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(res, 400, `invalid body: ${msg}`, request_id);
    return;
  }

  if (!body.username || !body.password) {
    fail(res, 400, 'username and password are required', request_id);
    return;
  }

  const operator = deps.operators.verifyPassword(body.username, body.password);
  if (!operator) {
    fail(res, 401, 'invalid credentials', request_id);
    return;
  }

  const { token, expires_at } = deps.operators.createSession(operator.id, {
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    ipAddress: req.socket.remoteAddress ?? undefined,
  });

  res.setHeader('Set-Cookie', buildSessionCookie(token, expires_at, req));
  logger.info(`Login: ${operator.username} (${operator.role})`);
  ok(res, { operator, expires_at }, request_id);
}

/** POST /api/auth/logout / 管理員登出 */
export function handleLogout(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AuthApiDeps
): void {
  const request_id = newRequestId();
  const token = readSessionCookie(req);
  if (token) {
    deps.operators.revokeSession(token);
  }
  res.setHeader('Set-Cookie', buildClearSessionCookie(req));
  ok(res, { logged_out: true }, request_id);
}

/** GET /api/auth/me / 取得目前管理員資訊 */
export function handleMe(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AuthApiDeps
): void {
  const request_id = newRequestId();
  const ctx = getAuthContext(req, deps.operators);
  if (!ctx) {
    fail(res, 401, 'authentication required', request_id);
    return;
  }
  ok(res, { operator: ctx.operator, expires_at: ctx.expiresAt }, request_id);
}
