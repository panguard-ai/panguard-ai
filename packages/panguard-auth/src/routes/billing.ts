/**
 * Billing (Lemon Squeezy) route handlers:
 * handleBillingWebhook, handleBillingCheckout, handleBillingPortal, handleBillingStatus.
 * @module @panguard-ai/panguard-auth/routes/billing
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { authenticateRequest } from '../middleware.js';
import {
  verifyWebhookSignature,
  handleWebhookEvent,
} from '../lemonsqueezy.js';
import type { RouteContext } from './shared.js';
import { readRawBody, json } from './shared.js';

export function createBillingRoutes(ctx: RouteContext) {
  const { db, config } = ctx;

  /**
   * POST /api/billing/webhook
   * Receives Lemon Squeezy webhook events. Verifies HMAC signature.
   */
  async function handleBillingWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    if (!config.lemonsqueezy) {
      json(res, 501, { ok: false, error: 'Billing not configured' });
      return;
    }

    const rawResult = await readRawBody(req);
    if (!rawResult.ok) {
      json(res, rawResult.status, { ok: false, error: 'Invalid request body' });
      return;
    }

    // Verify HMAC signature
    const signature = req.headers['x-signature'] as string | undefined;
    if (
      !signature ||
      !verifyWebhookSignature(rawResult.raw, signature, config.lemonsqueezy.webhookSecret)
    ) {
      json(res, 401, { ok: false, error: 'Invalid webhook signature' });
      return;
    }

    let payload: {
      meta: { event_name: string; custom_data?: Record<string, string> };
      data: { type: string; id: string; attributes: Record<string, unknown> };
    };
    try {
      payload = JSON.parse(rawResult.raw);
    } catch {
      json(res, 400, { ok: false, error: 'Invalid JSON' });
      return;
    }

    const result = handleWebhookEvent(payload, config.lemonsqueezy, db);

    // Always return 200 to prevent Lemon Squeezy from retrying
    json(res, 200, { ok: true, data: result });
  }

  /**
   * POST /api/billing/checkout
   * Billing disabled — all features are free and open source.
   */
  async function handleBillingCheckout(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    json(res, 200, { ok: false, error: 'Billing disabled. All features are free and open source.' });
  }

  /**
   * GET /api/billing/portal
   * Billing disabled — all features are free and open source.
   */
  async function handleBillingPortal(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    json(res, 200, { ok: false, error: 'Billing disabled. All features are free and open source.' });
  }

  /**
   * GET /api/billing/status
   * Returns the current subscription status for the authenticated user.
   */
  function handleBillingStatus(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== 'GET') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    const user = authenticateRequest(req, db);
    if (!user) {
      json(res, 401, { ok: false, error: 'Not authenticated' });
      return;
    }

    const subscription = db.getActiveSubscription(user.id);
    json(res, 200, {
      ok: true,
      data: {
        tier: user.tier,
        planExpiresAt: user.planExpiresAt,
        subscription: subscription
          ? {
              status: subscription.status,
              tier: subscription.tier,
              renewsAt: subscription.renewsAt,
              endsAt: subscription.endsAt,
            }
          : null,
      },
    });
  }

  return {
    handleBillingWebhook,
    handleBillingCheckout,
    handleBillingPortal,
    handleBillingStatus,
  };
}
