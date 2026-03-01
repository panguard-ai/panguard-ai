/**
 * Usage / Quota route handlers:
 * handleUsageSummary, handleUsageLimits, handleUsageCheck, handleUsageRecord.
 * @module @panguard-ai/panguard-auth/routes/usage
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { authenticateRequest } from '../middleware.js';
import { checkQuota, recordUsage, getUsageSummary, getQuotaLimits } from '../usage-meter.js';
import type { MeterableResource } from '../usage-meter.js';
import type { RouteContext } from './shared.js';
import { readBody, json } from './shared.js';

export function createUsageRoutes(ctx: RouteContext) {
  const { db } = ctx;

  /**
   * GET /api/usage
   * Returns current usage and quota for the authenticated user.
   */
  function handleUsageSummary(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'GET') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const user = authenticateRequest(req, db);
    if (!user) {
      json(res, 401, { ok: false, error: 'Not authenticated' });
      return;
    }

    const summary = getUsageSummary(db, user.id, user.tier);
    json(res, 200, { ok: true, data: { usage: summary, tier: user.tier } });
  }

  /**
   * GET /api/usage/limits
   * Returns quota limits for the authenticated user's tier.
   */
  function handleUsageLimits(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'GET') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const user = authenticateRequest(req, db);
    if (!user) {
      json(res, 401, { ok: false, error: 'Not authenticated' });
      return;
    }

    const limits = getQuotaLimits(user.tier);
    json(res, 200, { ok: true, data: { limits, tier: user.tier } });
  }

  /**
   * POST /api/usage/check
   * Checks if the user has quota for a specific resource.
   * Body: { resource: string }
   */
  async function handleUsageCheck(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const user = authenticateRequest(req, db);
    if (!user) {
      json(res, 401, { ok: false, error: 'Not authenticated' });
      return;
    }

    const body = await readBody(req);
    if (!body.ok) {
      json(res, body.status, { ok: false, error: 'Invalid request body' });
      return;
    }

    const resource = body.data['resource'] as MeterableResource;
    if (!resource) {
      json(res, 400, { ok: false, error: 'resource is required' });
      return;
    }

    const check = checkQuota(db, user.id, user.tier, resource);
    json(res, 200, { ok: true, data: check });
  }

  /**
   * POST /api/usage/record
   * Records usage for a resource. Intended for internal/trusted callers.
   * Body: { resource: string, count?: number }
   */
  async function handleUsageRecord(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const user = authenticateRequest(req, db);
    if (!user) {
      json(res, 401, { ok: false, error: 'Not authenticated' });
      return;
    }

    const body = await readBody(req);
    if (!body.ok) {
      json(res, body.status, { ok: false, error: 'Invalid request body' });
      return;
    }

    const VALID_RESOURCES: readonly string[] = [
      'scan',
      'guard_endpoints',
      'reports',
      'api_calls',
      'notifications',
      'trap_instances',
    ];
    const resource = body.data['resource'] as MeterableResource;
    const count = typeof body.data['count'] === 'number' ? body.data['count'] : 1;

    if (!resource || !VALID_RESOURCES.includes(resource)) {
      json(res, 400, { ok: false, error: 'Invalid or missing resource type' });
      return;
    }

    // Check quota before recording
    const check = checkQuota(db, user.id, user.tier, resource);
    if (!check.allowed) {
      json(res, 429, {
        ok: false,
        error: 'Quota exceeded',
        data: { current: check.current, limit: check.limit, resource },
      });
      return;
    }

    recordUsage(db, user.id, resource, count);
    json(res, 200, { ok: true, data: { recorded: count, resource } });
  }

  return {
    handleUsageSummary,
    handleUsageLimits,
    handleUsageCheck,
    handleUsageRecord,
  };
}
