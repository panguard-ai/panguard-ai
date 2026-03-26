/* Tier definitions — community-only (enterprise tiers in private repo) */

export type Tier = 'community';

export const TIERS: readonly Tier[] = ['community'] as const;

export const TIER_LEVEL: Record<string, number> = {
  community: 0,
};

export const FEATURE_TIER: Record<string, Tier> = {};

export function isTierAtLeast(current: string, required: string): boolean {
  return (TIER_LEVEL[current] ?? 0) >= (TIER_LEVEL[required] ?? 0);
}

export function isValidTier(tier: string): tier is Tier {
  return tier === 'community';
}
