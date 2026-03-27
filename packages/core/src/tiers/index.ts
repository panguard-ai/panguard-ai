/* Tier definitions — community stubs (enterprise tiers in private repo) */

export type Tier = 'community' | 'solo' | 'pro' | 'business' | 'enterprise';

export const TIERS: readonly Tier[] = [
  'community',
  'solo',
  'pro',
  'business',
  'enterprise',
] as const;

export const TIER_LEVEL: Record<string, number> = {
  community: 0,
  solo: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
};

export const FEATURE_TIER: Record<string, Tier> = {};

export function isTierAtLeast(current: string, required: string): boolean {
  return (TIER_LEVEL[current] ?? 0) >= (TIER_LEVEL[required] ?? 0);
}

export function isValidTier(tier: string): tier is Tier {
  return tier in TIER_LEVEL;
}
