/**
 * Unit tests for the pure grace-period decision helpers.
 *
 * These cover the webhook's subscription.deleted branch and the page-load
 * lazy-downgrade branch without standing up Supabase or Stripe.
 */

import { describe, it, expect } from 'vitest';
import { decideCancellationOutcome, decideLazyDowngrade } from '../../src/lib/billing/grace';

// A fixed reference instant used across the suite so tests are deterministic
// regardless of wall-clock. Picked arbitrarily inside the 2026 window the
// project lives in.
const NOW_MS = Date.UTC(2026, 4, 12, 12, 0, 0); // 2026-05-12T12:00:00Z

describe('decideCancellationOutcome', () => {
  it('returns grace with cancel_at when current_period_end is in the future', () => {
    // Concrete narrative: customer paid for a 90-day pilot on day 1.
    // tier_expires_at = day 90. They cancel on day 15. Stripe emits
    // subscription.deleted with current_period_end = day-90 epoch seconds.
    // We must NOT downgrade now — they have 75 days of prepaid pilot left.
    const day90Sec = Math.floor(
      Date.UTC(2026, 7, 10, 12, 0, 0) / 1000 // ~90 days after NOW_MS
    );
    const out = decideCancellationOutcome(day90Sec, NOW_MS);
    expect(out.kind).toBe('grace');
    if (out.kind === 'grace') {
      expect(out.cancelAtIso).toBe(new Date(day90Sec * 1000).toISOString());
    }
  });

  it('returns downgrade_now when current_period_end is in the past', () => {
    // Period ended yesterday — no grace owed.
    const yesterdaySec = Math.floor((NOW_MS - 24 * 60 * 60 * 1000) / 1000);
    expect(decideCancellationOutcome(yesterdaySec, NOW_MS)).toEqual({
      kind: 'downgrade_now',
    });
  });

  it('returns downgrade_now when current_period_end is null or zero', () => {
    expect(decideCancellationOutcome(null, NOW_MS)).toEqual({
      kind: 'downgrade_now',
    });
    expect(decideCancellationOutcome(undefined, NOW_MS)).toEqual({
      kind: 'downgrade_now',
    });
    expect(decideCancellationOutcome(0, NOW_MS)).toEqual({
      kind: 'downgrade_now',
    });
  });

  it('returns downgrade_now at the exact boundary (period_end == now)', () => {
    // If the period ends right now, there's no remaining prepaid value to
    // protect. The check is "period_end > now" (strict), so equality falls
    // into the immediate-downgrade branch.
    const nowSec = Math.floor(NOW_MS / 1000);
    expect(decideCancellationOutcome(nowSec, nowSec * 1000)).toEqual({
      kind: 'downgrade_now',
    });
  });
});

describe('decideLazyDowngrade', () => {
  it('returns false for community-tier workspaces', () => {
    // No matter what tier_expires_at says, a workspace already on community
    // never gets downgraded again.
    expect(decideLazyDowngrade('community', null, NOW_MS)).toBe(false);
    expect(decideLazyDowngrade('community', '2020-01-01T00:00:00Z', NOW_MS)).toBe(false);
  });

  it('returns false when tier_expires_at is null', () => {
    // Paid tier with no expiry on file — treat as "still valid".
    expect(decideLazyDowngrade('pilot', null, NOW_MS)).toBe(false);
    expect(decideLazyDowngrade('enterprise', null, NOW_MS)).toBe(false);
  });

  it('returns false when expiry is in the future', () => {
    const futureIso = new Date(NOW_MS + 24 * 60 * 60 * 1000).toISOString();
    expect(decideLazyDowngrade('pilot', futureIso, NOW_MS)).toBe(false);
  });

  it('returns true when expiry is in the past', () => {
    const pastIso = new Date(NOW_MS - 24 * 60 * 60 * 1000).toISOString();
    expect(decideLazyDowngrade('pilot', pastIso, NOW_MS)).toBe(true);
    expect(decideLazyDowngrade('enterprise', pastIso, NOW_MS)).toBe(true);
  });

  it('returns true exactly at the expiry instant', () => {
    // The check is `expires <= now`, so at the instant expiry passes the
    // workspace is downgraded. Matches the "day 90+1 the lazy-check
    // downgrades them" behaviour described in the migration notes.
    const nowIso = new Date(NOW_MS).toISOString();
    expect(decideLazyDowngrade('pilot', nowIso, NOW_MS)).toBe(true);
  });

  it('returns false for unparseable expiry strings', () => {
    // Defensive: if the column somehow holds junk, do not downgrade — the
    // safer default is to keep the customer on their paid tier rather than
    // silently churn them based on garbage data.
    expect(decideLazyDowngrade('pilot', 'not-a-date', NOW_MS)).toBe(false);
  });
});

describe('grace-period end-to-end narrative', () => {
  it('matches the day-15-of-90 scenario from the design doc', () => {
    // Day 1: customer upgrades to pilot. tier_expires_at = day 90.
    const day1Ms = Date.UTC(2026, 0, 1);
    const day90Ms = Date.UTC(2026, 3, 1); // ~90 days later, exact value irrelevant
    const day15Ms = Date.UTC(2026, 0, 16);
    const day91Ms = day90Ms + 24 * 60 * 60 * 1000;
    const day90Sec = Math.floor(day90Ms / 1000);

    // Day 15: customer cancels. Webhook decides "grace" with
    // cancel_at = day 90 — does NOT downgrade.
    const cancelOutcome = decideCancellationOutcome(day90Sec, day15Ms);
    expect(cancelOutcome.kind).toBe('grace');
    expect(day15Ms).toBeGreaterThan(day1Ms); // sanity

    // Day 50 (some time in the grace window): a workspace page loads.
    // Stored: tier=pilot, tier_expires_at=day90 iso. Lazy-downgrade=false.
    const day50Ms = Date.UTC(2026, 1, 20);
    expect(decideLazyDowngrade('pilot', new Date(day90Ms).toISOString(), day50Ms)).toBe(false);

    // Day 91: page loads again. Now lazy-downgrade=true.
    expect(decideLazyDowngrade('pilot', new Date(day90Ms).toISOString(), day91Ms)).toBe(true);
  });
});
