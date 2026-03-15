/**
 * Shared types, helpers and middleware for serve sub-modules.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthDB } from '@panguard-ai/panguard-auth';
import { authenticateRequest, requireAdmin } from '@panguard-ai/panguard-auth';
import type { ManagerProxy } from '@panguard-ai/panguard-auth';
import type { createAuthHandlers } from '@panguard-ai/panguard-auth';

// Threat Cloud types (dynamically loaded -- not published to npm)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThreatCloudDBInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LLMReviewerInstance = any;

/** Context passed to every route handler module */
export interface RouteContext {
  readonly handlers: ReturnType<typeof createAuthHandlers>;
  readonly db: AuthDB;
  readonly adminDir: string | undefined;
  readonly managerProxy: ManagerProxy;
  readonly threatDb: ThreatCloudDBInstance;
  readonly llmReviewer: LLMReviewerInstance;
}

// ── JSON Response ──────────────────────────────────────────────

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ── Request Body Reader ────────────────────────────────────────

/** Read request body with 1MB size limit */
export function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX_BODY = 1_048_576; // 1MB

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// ── Timing-safe Comparison ─────────────────────────────────────

/** Timing-safe string comparison to prevent side-channel attacks */
export function timingSafeCompare(a: string, b: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Compare against self to maintain constant time
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

// ── Threat Cloud Auth Helpers ──────────────────────────────────

/**
 * Require TC_API_KEY auth for write endpoints.
 * In production: BLOCK if TC_API_KEY not set (refuse unauthenticated writes).
 * In dev: allow passthrough with warning.
 */
export function requireTCWriteAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const tcApiKey = process.env['TC_API_KEY'];
  if (!tcApiKey) {
    if (process.env['NODE_ENV'] === 'production') {
      sendJson(res, 503, {
        ok: false,
        error: 'Threat Cloud write API not configured (TC_API_KEY missing)',
      });
      return false;
    }
    return true; // dev passthrough
  }
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!timingSafeCompare(token, tcApiKey)) {
    sendJson(res, 401, { ok: false, error: 'Invalid API key' });
    return false;
  }
  return true;
}

/**
 * Require admin session auth for admin-only GET endpoints.
 * Verifies the Bearer token is a valid session with admin role.
 */
export function requireTCAdminAuth(req: IncomingMessage, res: ServerResponse, db: AuthDB): boolean {
  const user = authenticateRequest(req, db);
  if (!user) {
    sendJson(res, 401, { ok: false, error: 'Authentication required' });
    return false;
  }
  if (!requireAdmin(user)) {
    sendJson(res, 403, { ok: false, error: 'Admin access required' });
    return false;
  }
  return true;
}

/** Validate Content-Type is application/json for POST requests */
export function requireJsonContentType(req: IncomingMessage, res: ServerResponse): boolean {
  const ct = req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    sendJson(res, 400, { ok: false, error: 'Content-Type must be application/json' });
    return false;
  }
  return true;
}

// ── Rate Limiter ───────────────────────────────────────────────

/** Per-IP rate limiter for Threat Cloud endpoints (120 req/min) */
const tcRateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkTCRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = tcRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    tcRateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= 120;
}
