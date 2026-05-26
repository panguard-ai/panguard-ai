/**
 * Session cookie + auth-middleware helpers.
 * Session cookie 與認證中介層輔助。
 *
 * Cookie design:
 *   - name: pgm_session
 *   - value: plaintext OperatorStore session token (64 hex chars)
 *   - HttpOnly: always — JS can never read the token
 *   - SameSite=Lax: enables top-level form POST to /login, blocks CSRF on
 *     state-changing /api/* calls (which we additionally CSRF-gate below)
 *   - Secure: emitted when the connection looks TLS-terminated (X-Forwarded-Proto:
 *     https) so we don't break local-loopback dev (HTTP).
 *
 * @module @panguard-ai/panguard-manager/api/session
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { OperatorStore, SessionLookup } from '../operators-store.js';
import type { Operator } from '../types.js';

/** Cookie name for the operator session / 管理員 session 的 cookie 名稱 */
export const SESSION_COOKIE_NAME = 'pgm_session';

/** Parse the `pgm_session` cookie out of an incoming request / 從進來請求解析 pgm_session cookie */
export function readSessionCookie(req: IncomingMessage): string | undefined {
  const header = req.headers['cookie'];
  if (!header) return undefined;
  // Split on semicolons; tolerate extra whitespace.
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SESSION_COOKIE_NAME && rest.length > 0) {
      return rest.join('=');
    }
  }
  return undefined;
}

/** Decide whether to mark the cookie Secure / 判定 cookie 是否標 Secure */
function isHttpsRequest(req: IncomingMessage): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string' && forwardedProto.toLowerCase() === 'https') {
    return true;
  }
  // node:http req does not expose tls directly; rely on encrypted socket marker.
  const socket = req.socket as unknown as { encrypted?: boolean };
  return socket.encrypted === true;
}

/** Format a Set-Cookie header value for a fresh session / 為新 session 組合 Set-Cookie 標頭值 */
export function buildSessionCookie(
  token: string,
  expiresAt: string,
  req: IncomingMessage
): string {
  const maxAgeSec = Math.max(
    0,
    Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)
  );
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isHttpsRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

/** Format a Set-Cookie header value that clears the session / 為清除 session 組合 Set-Cookie */
export function buildClearSessionCookie(req: IncomingMessage): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isHttpsRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

/** Authenticated request context / 已認證的請求上下文 */
export interface AuthContext {
  readonly operator: Operator;
  readonly token: string;
  readonly expiresAt: string;
}

/**
 * Look up the session attached to a request, if any. Returns null when no
 * cookie, unknown token, expired, revoked, or operator disabled.
 */
export function getAuthContext(
  req: IncomingMessage,
  operators: OperatorStore
): AuthContext | null {
  const token = readSessionCookie(req);
  if (!token) return null;
  const lookup: SessionLookup | null = operators.validateSession(token);
  if (!lookup) return null;
  return {
    operator: lookup.operator,
    token,
    expiresAt: lookup.expires_at,
  };
}

/**
 * Guard a handler so it only runs for authenticated operators of a given
 * role. Writes the 401/403 response and returns null when authorisation
 * fails — callers should early-return.
 */
export function requireOperator(
  req: IncomingMessage,
  res: ServerResponse,
  operators: OperatorStore,
  options: {
    readonly request_id: string;
    /** Minimum role required. Defaults to 'viewer' (any logged-in operator). */
    readonly minRole?: 'viewer' | 'admin';
  }
): AuthContext | null {
  const ctx = getAuthContext(req, operators);
  if (!ctx) {
    write401(res, options.request_id);
    return null;
  }
  if (options.minRole === 'admin' && ctx.operator.role !== 'admin') {
    write403(res, options.request_id);
    return null;
  }
  return ctx;
}

function write401(res: ServerResponse, request_id: string): void {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'authentication required', request_id }));
}

function write403(res: ServerResponse, request_id: string): void {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'admin role required', request_id }));
}
