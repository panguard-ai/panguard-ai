/**
 * Workspace tier provisioning helper.
 *
 * Shared by every Stripe webhook arm that mutates `workspaces.tier`. Centralises:
 *   1. The workspaces UPDATE (tier + tier_expires_at + stripe_customer_id).
 *   2. The audit_log INSERT describing the change.
 *
 * The two writes are issued sequentially against the service-role client. We
 * deliberately do NOT wrap them in a single Postgres transaction — Supabase
 * REST does not expose multi-statement transactions, and adding an RPC
 * wrapper for two writes that touch separate tables is more code for less
 * safety than the current "primary write first, audit second" ordering:
 *
 *   - If the UPDATE fails, we never write a misleading audit entry.
 *   - If the audit INSERT fails after a successful UPDATE, the tier change
 *     is still recorded in the source-of-truth column. The audit log is
 *     useful for forensics but is not the primary record. The handler still
 *     logs the audit failure to stderr so an operator can replay if needed.
 *
 * Stripe will retry the webhook on a 500, so a transient DB failure on the
 * primary UPDATE turns into idempotent re-delivery via `billing_events`.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Tier } from '@/lib/types';

/**
 * Arguments to `setWorkspaceTier`.
 *
 * - `tierExpiresAt: null` is a meaningful value (community never expires;
 *   cancelled subscriptions reset to null). The caller passes `undefined`
 *   only when they want the column left untouched, which today no caller
 *   does — but the type leaves the door open.
 */
export interface SetWorkspaceTierArgs {
  workspaceId: string;
  tier: Tier;
  /**
   * ISO-8601 timestamp at which the tier expires, or `null` to clear it.
   * Pass `null` for community tier (free forever) and on cancellation.
   */
  tierExpiresAt: string | null;
  /**
   * The Stripe customer id (`cus_...`) to record on the workspace. Pass
   * `undefined` to leave the existing value alone — useful for the
   * `customer.subscription.updated` handler which already has the customer
   * mapping established from the original checkout.
   */
  stripeCustomerId?: string;
  /**
   * Audit action verb — one of `billing.upgraded`, `billing.updated`,
   * `billing.cancelled`, `billing.payment_failed`. Caller-controlled so
   * each webhook arm can describe its own semantics.
   */
  auditAction: string;
  /**
   * Free-form JSON to attach to the audit_log entry. Should include the
   * Stripe subscription/event id so an operator can correlate the audit
   * row with the original Stripe object.
   */
  auditMetadata: Record<string, unknown>;
}

export interface SetWorkspaceTierResult {
  ok: boolean;
  /** Populated when `ok === false` so the caller can decide 200 vs 500. */
  error?: string;
}

/**
 * Apply a tier change to a workspace and write the matching audit_log entry.
 *
 * Uses the service-role admin client so RLS does not block writes on
 * workspaces.tier / workspaces.tier_expires_at (which are admin-only via
 * the `ws_update` policy) — Stripe webhooks have no Supabase session.
 */
export async function setWorkspaceTier(
  args: SetWorkspaceTierArgs
): Promise<SetWorkspaceTierResult> {
  const admin = createAdminClient();

  // Build the workspaces UPDATE payload. Only include `stripe_customer_id`
  // when the caller supplied one — undefined keys are omitted by the
  // Supabase client which avoids overwriting an existing customer id with
  // null on subsequent renewals.
  const updatePayload: Record<string, unknown> = {
    tier: args.tier,
    tier_expires_at: args.tierExpiresAt,
  };
  if (args.stripeCustomerId !== undefined) {
    updatePayload.stripe_customer_id = args.stripeCustomerId;
  }

  const { error: updateErr } = await admin
    .from('workspaces')
    .update(updatePayload)
    .eq('id', args.workspaceId);

  if (updateErr) {
    return {
      ok: false,
      error: `workspace_update_failed: ${updateErr.message}`,
    };
  }

  // Audit write — non-fatal. We log on failure so an operator can spot a
  // pattern of missing audit rows, but we do NOT return ok=false because
  // the primary state has already moved.
  const { error: auditErr } = await admin.from('audit_log').insert({
    workspace_id: args.workspaceId,
    action: args.auditAction,
    target_type: 'subscription',
    target_id:
      typeof args.auditMetadata.subscription_id === 'string'
        ? args.auditMetadata.subscription_id
        : null,
    metadata: args.auditMetadata,
  });
  if (auditErr) {
    // eslint-disable-next-line no-console
    console.error(
      `[billing/provision] audit_log insert failed for ${args.workspaceId} action=${args.auditAction}: ${auditErr.message}`
    );
  }

  return { ok: true };
}
