/**
 * Unit tests for the endpoints page pure helper.
 *
 * The page itself is a Next.js server component; we cover its purely-
 * deterministic slice (health-status computation) here. The Supabase
 * query is exercised in an integration test elsewhere — at this layer
 * we only care that the health badge matches the contract:
 *
 *   < 5 min  → healthy
 *   < 1 hour → stale
 *   else     → offline
 */

import { describe, it, expect } from 'vitest';
import { computeHealth } from '../src/app/w/[slug]/endpoints/page';

// Fixed instant for deterministic delta arithmetic.
const NOW_MS = Date.UTC(2026, 4, 12, 12, 0, 0);

function isoMinutesAgo(mins: number): string {
  return new Date(NOW_MS - mins * 60 * 1000).toISOString();
}

describe('computeHealth', () => {
  it('returns "healthy" when last_seen is within 5 minutes', () => {
    expect(computeHealth(isoMinutesAgo(0), NOW_MS)).toBe('healthy');
    expect(computeHealth(isoMinutesAgo(2), NOW_MS)).toBe('healthy');
    expect(computeHealth(isoMinutesAgo(4), NOW_MS)).toBe('healthy');
  });

  it('returns "stale" when last_seen is between 5 and 60 minutes', () => {
    expect(computeHealth(isoMinutesAgo(5), NOW_MS)).toBe('stale');
    expect(computeHealth(isoMinutesAgo(30), NOW_MS)).toBe('stale');
    expect(computeHealth(isoMinutesAgo(59), NOW_MS)).toBe('stale');
  });

  it('returns "offline" when last_seen is > 1 hour', () => {
    expect(computeHealth(isoMinutesAgo(60), NOW_MS)).toBe('offline');
    expect(computeHealth(isoMinutesAgo(120), NOW_MS)).toBe('offline');
    expect(computeHealth(isoMinutesAgo(60 * 24 * 7), NOW_MS)).toBe('offline');
  });

  it('returns "offline" when last_seen is null or invalid', () => {
    expect(computeHealth(null, NOW_MS)).toBe('offline');
    expect(computeHealth('not-a-date', NOW_MS)).toBe('offline');
  });

  // Boundary check — exact 5-minute mark is the first "stale" tick.
  it('treats exactly-5-minutes-ago as stale (not healthy)', () => {
    expect(computeHealth(isoMinutesAgo(5), NOW_MS)).toBe('stale');
  });

  // Boundary check — exact 60-minute mark is the first "offline" tick.
  it('treats exactly-60-minutes-ago as offline (not stale)', () => {
    expect(computeHealth(isoMinutesAgo(60), NOW_MS)).toBe('offline');
  });

  // Concrete narrative: a fleet endpoint that just rebooted shows up
  // as healthy the moment it posts its first heartbeat post-restart.
  it('a freshly-restarted endpoint is healthy on first heartbeat', () => {
    const justBooted = isoMinutesAgo(0);
    expect(computeHealth(justBooted, NOW_MS)).toBe('healthy');
  });

  // Concrete narrative: a laptop closed overnight shows up as offline
  // the next morning, prompting the analyst to investigate.
  it('a laptop closed overnight is offline', () => {
    const closedTenHoursAgo = isoMinutesAgo(60 * 10);
    expect(computeHealth(closedTenHoursAgo, NOW_MS)).toBe('offline');
  });
});
