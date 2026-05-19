/**
 * Reverse Stripe Price ID → tier mapping.
 *
 * The checkout route maps tier → Price ID via `STRIPE_PRICE_ID_PILOT` and
 * `STRIPE_PRICE_ID_ENTERPRISE`. The webhook needs the inverse: given a Price
 * ID that landed on a subscription item, work out which paid tier it
 * represents. This module is the single source of truth for that inverse —
 * both `customer.subscription.updated` and any future BLOCK C reconciliation
 * job MUST go through `priceIdToTier()` rather than hard-coding env keys.
 *
 * Design notes:
 *   - Env vars are read at call time (not module load) so swapping sandbox
 *     ↔ live keys does not require a redeploy. Same pattern the checkout
 *     route uses for the forward map.
 *   - Unknown price → 'community'. The webhook treats an unknown price on a
 *     subscription as "downgrade to community" rather than throwing, because
 *     a misconfigured Stripe Price would otherwise wedge the entire renewal
 *     pipeline. The audit_log entry includes the raw Price ID so an operator
 *     can spot the misconfiguration and re-publish the env var.
 */

import type { Tier } from '@/lib/types';

/**
 * Reverse-map a Stripe Price ID to a PanGuard tier.
 *
 * @param priceId - The `price.id` from a Stripe subscription item, or any
 *                  caller-supplied price identifier. Treated as opaque.
 * @returns        The matching tier, or `'community'` if no match (also when
 *                 `priceId` is empty/missing — defensive against malformed
 *                 webhook payloads).
 */
export function priceIdToTier(priceId: string | null | undefined): Tier {
  if (!priceId || priceId.length === 0) return 'community';

  const pilotPriceId = process.env.STRIPE_PRICE_ID_PILOT;
  if (pilotPriceId && pilotPriceId.length > 0 && priceId === pilotPriceId) {
    return 'pilot';
  }

  const enterprisePriceId = process.env.STRIPE_PRICE_ID_ENTERPRISE;
  if (enterprisePriceId && enterprisePriceId.length > 0 && priceId === enterprisePriceId) {
    return 'enterprise';
  }

  return 'community';
}
