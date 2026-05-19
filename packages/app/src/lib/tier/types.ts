/**
 * Tier helpers — ordering + comparison.
 *
 * The dashboard gates several surfaces (Compliance Evidence archive,
 * endpoint health detail, retention windows) by tier. We compare tiers
 * by a numeric ordering rather than by enum equality so that callers
 * can write `meetsTier(actual, 'pilot')` once and have Enterprise users
 * automatically inherit Pilot-level access.
 *
 * `Tier` is re-exported from the canonical Supabase row type in
 * `@/lib/types` so there's exactly one source of truth for the string
 * literal union.
 */

import type { Tier as DbTier } from '@/lib/types';

export type Tier = DbTier;

/**
 * Strict numeric ordering. Higher = more access.
 * Pilot supersedes Community; Enterprise supersedes Pilot.
 */
export const TIER_ORDER: Record<Tier, number> = {
  community: 0,
  pilot: 1,
  enterprise: 2,
};

/**
 * Returns true iff the workspace's actual tier is at least the required
 * tier in the ordering above. Use this for every gating decision in the
 * dashboard — never compare tier strings directly.
 *
 * Examples:
 *   meetsTier('community', 'community') === true
 *   meetsTier('community', 'pilot')     === false
 *   meetsTier('pilot',     'pilot')     === true
 *   meetsTier('enterprise','pilot')     === true   // inherits
 */
export function meetsTier(actual: Tier, required: Tier): boolean {
  return TIER_ORDER[actual] >= TIER_ORDER[required];
}
