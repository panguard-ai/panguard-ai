/**
 * Admin endpoints for issuing + auditing enrollment tokens.
 *
 * @module @panguard-ai/panguard-manager/api/enrollment
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@panguard-ai/core';
import type { EnrollmentTokenStore } from '../enrollment-store.js';
import { fail, newRequestId, ok, readJsonBody } from './respond.js';
import type { AuthContext } from './session.js';

const logger = createLogger('panguard-manager:api:enrollment');

export interface EnrollmentApiDeps {
  readonly enrollment: EnrollmentTokenStore;
}

interface IssueBody {
  readonly ttl_ms?: number;
  readonly description?: string;
}

/** POST /api/enrollment-tokens (admin) / 發放新 enrollment token */
export async function handleIssue(
  req: IncomingMessage,
  res: ServerResponse,
  deps: EnrollmentApiDeps,
  auth: AuthContext
): Promise<void> {
  const request_id = newRequestId();
  let body: IssueBody = {};
  try {
    body = await readJsonBody<IssueBody>(req);
  } catch {
    // Empty body is fine — fall through with defaults.
  }

  if (body.ttl_ms !== undefined) {
    if (typeof body.ttl_ms !== 'number' || body.ttl_ms <= 0 || body.ttl_ms > 365 * 24 * 60 * 60 * 1000) {
      fail(res, 400, 'ttl_ms must be a positive number up to one year', request_id);
      return;
    }
  }

  const issueOpts: Parameters<EnrollmentTokenStore['issue']>[0] = {
    createdByOperatorId: auth.operator.id,
    ...(body.ttl_ms !== undefined ? { ttlMs: body.ttl_ms } : {}),
    ...(typeof body.description === 'string' && body.description
      ? { description: body.description.slice(0, 200) }
      : {}),
  };
  const { token, expires_at } = deps.enrollment.issue(issueOpts);
  logger.info(
    `Enrollment token issued by ${auth.operator.username} (expires ${expires_at})`
  );
  ok(res, { token, expires_at }, request_id, 201);
}

/** GET /api/enrollment-tokens (admin) — only returns metadata, never plaintext / 列出所有 enrollment token 中繼資料 */
export function handleList(res: ServerResponse, deps: EnrollmentApiDeps): void {
  const request_id = newRequestId();
  const tokens = deps.enrollment.listAll();
  ok(res, { tokens, total: tokens.length }, request_id);
}

/** POST /api/enrollment-tokens/:tokenHash/revoke (admin) / 撤銷 enrollment token */
export function handleRevoke(
  res: ServerResponse,
  tokenHash: string,
  deps: EnrollmentApiDeps,
  auth: AuthContext
): void {
  const request_id = newRequestId();
  if (!/^[a-f0-9]{64}$/.test(tokenHash)) {
    fail(res, 400, 'invalid token hash', request_id);
    return;
  }
  const revoked = deps.enrollment.revokeByHash(tokenHash);
  if (!revoked) {
    fail(res, 404, 'token not found or already revoked', request_id);
    return;
  }
  logger.info(`Enrollment token ${tokenHash.slice(0, 8)}… revoked by ${auth.operator.username}`);
  ok(res, { token_hash: tokenHash, revoked: true }, request_id);
}
