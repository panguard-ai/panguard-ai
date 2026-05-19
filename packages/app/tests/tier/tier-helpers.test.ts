/**
 * Unit tests for the tier ordering helpers.
 *
 * Every gating decision in the dashboard funnels through `meetsTier`.
 * If the ordering ever flips (e.g. someone alphabetises the enum and
 * accidentally puts 'enterprise' below 'pilot'), Pilot customers would
 * suddenly lose access to features they paid for. These tests pin the
 * ordering invariant.
 */

import { describe, it, expect } from 'vitest';
import { meetsTier, TIER_ORDER, type Tier } from '../../src/lib/tier/types';

describe('TIER_ORDER', () => {
  it('orders community < pilot < enterprise', () => {
    expect(TIER_ORDER.community).toBeLessThan(TIER_ORDER.pilot);
    expect(TIER_ORDER.pilot).toBeLessThan(TIER_ORDER.enterprise);
  });

  it('uses contiguous integers starting at 0 (defensive — guards against typos)', () => {
    expect(TIER_ORDER.community).toBe(0);
    expect(TIER_ORDER.pilot).toBe(1);
    expect(TIER_ORDER.enterprise).toBe(2);
  });
});

describe('meetsTier', () => {
  // Identity — every tier meets itself.
  it.each<[Tier, Tier]>([
    ['community', 'community'],
    ['pilot', 'pilot'],
    ['enterprise', 'enterprise'],
  ])('meetsTier(%s, %s) === true (identity)', (actual, required) => {
    expect(meetsTier(actual, required)).toBe(true);
  });

  // Strict downward — Community never meets paid tiers.
  it.each<[Tier, Tier]>([
    ['community', 'pilot'],
    ['community', 'enterprise'],
  ])('meetsTier(%s, %s) === false (downgrade)', (actual, required) => {
    expect(meetsTier(actual, required)).toBe(false);
  });

  // Upgrade — paid tier inherits lower-tier access.
  it.each<[Tier, Tier]>([
    ['pilot', 'community'],
    ['enterprise', 'community'],
    ['enterprise', 'pilot'],
  ])('meetsTier(%s, %s) === true (inheritance)', (actual, required) => {
    expect(meetsTier(actual, required)).toBe(true);
  });

  // Pilot doesn't grant Enterprise.
  it('meetsTier(pilot, enterprise) === false (Pilot cannot reach Enterprise-only)', () => {
    expect(meetsTier('pilot', 'enterprise')).toBe(false);
  });

  // Concrete narrative: a workspace that just downgraded from Pilot to
  // Community via the lazy-downgrade webhook should immediately fail the
  // pilot gate. This is THE invariant the lazy-downgrade flow depends on.
  it('a freshly-downgraded community workspace fails the pilot gate', () => {
    const tierAfterDowngrade: Tier = 'community';
    expect(meetsTier(tierAfterDowngrade, 'pilot')).toBe(false);
  });

  // Concrete narrative: an Enterprise customer browsing a Pilot-only
  // surface must NOT see the upsell — they paid more, they should see
  // the feature.
  it('an enterprise customer is granted every gate', () => {
    const tier: Tier = 'enterprise';
    expect(meetsTier(tier, 'community')).toBe(true);
    expect(meetsTier(tier, 'pilot')).toBe(true);
    expect(meetsTier(tier, 'enterprise')).toBe(true);
  });
});
