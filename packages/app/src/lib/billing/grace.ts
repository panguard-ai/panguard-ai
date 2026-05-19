/**
 * Pure decision helpers for the Stripe cancellation grace period.
 *
 * The webhook (`api/billing/webhook/route.ts`) and the lazy-downgrade path
 * (`lib/workspaces.ts`) both need to answer "given a subscription's prepaid
 * window end, what should the workspace look like now?". This module keeps
 * that decision in a single side-effect-free place so it can be unit-tested
 * without spinning up Supabase or the Stripe SDK.
 *
 * Two helpers:
 *   - decideCancellationOutcome: webhook side. Maps a deleted subscription's
 *     `current_period_end` (Unix seconds) to one of two outcomes: keep the
 *     paid tier (and record the future cancel_at), or downgrade immediately.
 *   - decideLazyDowngrade: page-load side. Given a workspace's stored
 *     tier_expires_at and current tier, decides whether we should downgrade
 *     it now (true) or leave it alone (false).
 */

export type CancellationOutcome =
  | { kind: 'grace'; cancelAtIso: string }
  | { kind: 'downgrade_now' };

/**
 * Decide what to do when a customer.subscription.deleted event arrives.
 *
 * Rationale: Stripe reports the prepaid window's end as `current_period_end`
 * (Unix seconds). If it is in the future, the customer has already paid
 * through that date and we should keep their tier alive until then. If it
 * is in the past or unset, we downgrade right away.
 *
 * @param currentPeriodEndSec - Stripe's `current_period_end` field.
 * @param nowMs               - Current epoch ms (parameter so tests can pin time).
 */
export function decideCancellationOutcome(
  currentPeriodEndSec: number | null | undefined,
  nowMs: number
): CancellationOutcome {
  if (typeof currentPeriodEndSec !== 'number' || currentPeriodEndSec <= 0) {
    return { kind: 'downgrade_now' };
  }
  const periodEndMs = currentPeriodEndSec * 1000;
  if (periodEndMs > nowMs) {
    return { kind: 'grace', cancelAtIso: new Date(periodEndMs).toISOString() };
  }
  return { kind: 'downgrade_now' };
}

/**
 * Decide whether a workspace whose tier is non-community should be lazily
 * downgraded to community based on its stored `tier_expires_at`.
 *
 * Returns:
 *   - `true`  → tier_expires_at is set and in the past → caller should
 *               flip tier to community.
 *   - `false` → community tier (no-op), no expiry on file, expiry is in
 *               the future, or the expiry string is unparseable.
 */
export function decideLazyDowngrade(
  tier: string,
  tierExpiresAtIso: string | null,
  nowMs: number
): boolean {
  if (tier === 'community') return false;
  if (!tierExpiresAtIso) return false;
  const expiresMs = Date.parse(tierExpiresAtIso);
  if (Number.isNaN(expiresMs)) return false;
  return expiresMs <= nowMs;
}
