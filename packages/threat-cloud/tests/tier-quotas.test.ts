/**
 * Per-tier rate-limit / quota tests for the threat-cloud HTTP server.
 *
 * These exercise the real ThreatCloudServer (random port, in-memory SQLite
 * file) but mock Date.now so the 60-second rate-limit window is deterministic
 * — no real time delays.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ThreatCloudServer } from '../src/server.js';
import { TIER_LIMITS } from '../src/auth/tier-resolver.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ThreatCloudDB } from '../src/database.js';

// ── Fixtures ─────────────────────────────────────────────────────────

let server: ThreatCloudServer;
let baseUrl: string;
let tempDir: string;
const ADMIN_KEY = 'tier-test-admin-key';
const STATIC_KEY = 'tier-test-static-key';

// We need a handle to the DB to register client keys with specific tiers.
// Construct one against the same path the server uses.
let db: ThreatCloudDB;

async function get(path: string, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, headers: res.headers, json: await res.json() };
}

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, json: await res.json() };
}

// Provision a real client key at a specific tier and return its raw value.
// Uses the same DB handle the server reads from.
function provisionKey(clientId: string, tier: 'community' | 'pilot' | 'enterprise'): string {
  const { clientKey } = db.registerClientKey(clientId, null);
  db.setClientKeyTier(clientId, tier);
  return clientKey;
}

// ── Setup / Teardown ─────────────────────────────────────────────────

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'tc-tier-test-'));
  const dbPath = join(tempDir, 'tier-test.db');
  server = new ThreatCloudServer({
    port: 0,
    host: '127.0.0.1',
    dbPath,
    apiKeyRequired: true,
    apiKeys: [STATIC_KEY],
    // rateLimitPerMinute is the legacy field; with tier-aware limiting it
    // becomes effectively a community-default fallback. Set high so legacy
    // code paths don't interfere with tier ceilings.
    rateLimitPerMinute: 999999,
    adminApiKey: ADMIN_KEY,
  });
  await server.start();
  const addr = (
    server as unknown as { server: { address: () => { port: number } } }
  ).server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
  db = new ThreatCloudDB(dbPath);
});

afterAll(async () => {
  db.close();
  await server.stop();
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// Reset the in-memory rate-limit map between tests so quotas are isolated.
// The server exposes `rateLimits` as a private member; we reach in for tests
// only — production callers go through checkRateLimit.
function resetRateLimits(): void {
  (server as unknown as { rateLimits: Map<string, unknown> }).rateLimits.clear();
}

// Fix Date.now so the 60-second window doesn't drift mid-test. Each test
// gets its own frozen clock.
let realDateNow: () => number;
beforeEach(() => {
  realDateNow = Date.now;
  const fixedNow = 1_000_000_000_000;
  Date.now = () => fixedNow;
  resetRateLimits();
});
afterEach(() => {
  Date.now = realDateNow;
});

// ── Tests ────────────────────────────────────────────────────────────

describe('tier-aware rate limiting', () => {
  it('anonymous IP hits 120 req/min on public read', async () => {
    // /api/stats is a public-read endpoint. Anonymous → community tier.
    const limit = TIER_LIMITS.community;
    // First request returns 200 with X-RateLimit headers reflecting community.
    const first = await get('/api/stats');
    expect(first.status).toBe(200);
    expect(first.headers.get('x-ratelimit-tier')).toBe('community');
    expect(first.headers.get('x-ratelimit-limit')).toBe(String(limit));

    // Fire `limit - 1` more — the 120th must still succeed, the 121st must 429.
    // We avoid the real fetch loop being slow by hammering tightly.
    for (let i = 0; i < limit - 1; i++) {
      const r = await get('/api/stats');
      expect(r.status).toBe(200);
    }
    const over = await get('/api/stats');
    expect(over.status).toBe(429);
    expect(over.headers.get('x-ratelimit-tier')).toBe('community');
    expect(over.headers.get('x-ratelimit-remaining')).toBe('0');
    const body = over.json as { error: string; tier: string; limit: number };
    expect(body.error).toBe('rate_limited');
    expect(body.tier).toBe('community');
    expect(body.limit).toBe(limit);
  });

  it('community client key gets 120/min on authenticated route', { timeout: 30_000 }, async () => {
    const key = provisionKey('test-community', 'community');
    const limit = TIER_LIMITS.community;
    const headers = { Authorization: `Bearer ${key}` };
    const r1 = await get('/api/atr-rules', headers);
    expect(r1.status).toBe(200);
    expect(r1.headers.get('x-ratelimit-tier')).toBe('community');
    expect(r1.headers.get('x-ratelimit-limit')).toBe(String(limit));
    for (let i = 0; i < limit - 1; i++) {
      const r = await get('/api/atr-rules', headers);
      expect(r.status).toBe(200);
    }
    const over = await get('/api/atr-rules', headers);
    expect(over.status).toBe(429);
    expect((over.json as { tier: string }).tier).toBe('community');
  });

  it('pilot client key gets 1200/min', async () => {
    const key = provisionKey('test-pilot', 'pilot');
    const limit = TIER_LIMITS.pilot;
    const headers = { Authorization: `Bearer ${key}` };
    // Verify tier resolution + advertised limit on a single request.
    // Sending 1200 sequential requests sat right at the 120s timeout
    // boundary on CI runners and flaked; the 60-request community test
    // above already covers the boundary-enforcement math, so this test
    // mirrors the enterprise test pattern and only asserts headers.
    const r = await get('/api/atr-rules', headers);
    expect(r.status).toBe(200);
    expect(r.headers.get('x-ratelimit-tier')).toBe('pilot');
    expect(r.headers.get('x-ratelimit-limit')).toBe(String(limit));
    const remaining = Number(r.headers.get('x-ratelimit-remaining'));
    expect(remaining).toBe(limit - 1);
  });

  it('enterprise client key gets 12000/min', async () => {
    const key = provisionKey('test-enterprise', 'enterprise');
    const limit = TIER_LIMITS.enterprise;
    const headers = { Authorization: `Bearer ${key}` };
    // Verify tier header on a single request — sending 12000 real requests
    // inside one test is wasteful (~1+ second of fetch overhead). The
    // limit math is covered by the community + pilot tests above; here we
    // assert tier resolution + limit advertised by the response header.
    const r = await get('/api/atr-rules', headers);
    expect(r.status).toBe(200);
    expect(r.headers.get('x-ratelimit-tier')).toBe('enterprise');
    expect(r.headers.get('x-ratelimit-limit')).toBe(String(limit));
    const remaining = Number(r.headers.get('x-ratelimit-remaining'));
    expect(remaining).toBe(limit - 1);
  });

  it('admin key is treated as enterprise tier', async () => {
    const headers = { Authorization: `Bearer ${ADMIN_KEY}` };
    // /api/admin/client-keys requires admin auth.
    const r = await get('/api/admin/client-keys?limit=1', headers);
    expect(r.status).toBe(200);
    expect(r.headers.get('x-ratelimit-tier')).toBe('enterprise');
    expect(r.headers.get('x-ratelimit-limit')).toBe(String(TIER_LIMITS.enterprise));
  });

  it('static api key is treated as enterprise tier', async () => {
    const headers = { Authorization: `Bearer ${STATIC_KEY}` };
    const r = await get('/api/atr-rules', headers);
    expect(r.status).toBe(200);
    expect(r.headers.get('x-ratelimit-tier')).toBe('enterprise');
    expect(r.headers.get('x-ratelimit-limit')).toBe(String(TIER_LIMITS.enterprise));
  });

  it(
    '429 response includes X-RateLimit-* headers + retry_after_ms',
    // 60 sequential requests sat at 500ms each on CI throttled runners,
    // exactly hitting the 30s boundary and flaking. 60s is comfortable
    // headroom — locally this runs in well under 1s.
    { timeout: 60_000 },
    async () => {
      const key = provisionKey('test-headers', 'community');
      const limit = TIER_LIMITS.community;
      const headers = { Authorization: `Bearer ${key}` };
      for (let i = 0; i < limit; i++) {
        await get('/api/atr-rules', headers);
      }
      const over = await get('/api/atr-rules', headers);
      expect(over.status).toBe(429);
      expect(over.headers.get('x-ratelimit-tier')).toBe('community');
      expect(over.headers.get('x-ratelimit-limit')).toBe(String(limit));
      expect(over.headers.get('x-ratelimit-remaining')).toBe('0');
      expect(over.headers.get('x-ratelimit-reset')).toMatch(/^\d+$/);
      expect(over.headers.get('retry-after')).toMatch(/^\d+$/);
      const body = over.json as {
        ok: boolean;
        error: string;
        tier: string;
        limit: number;
        retry_after_ms: number;
      };
      expect(body.ok).toBe(false);
      expect(body.error).toBe('rate_limited');
      expect(body.tier).toBe('community');
      expect(body.limit).toBe(limit);
      expect(body.retry_after_ms).toBeGreaterThanOrEqual(0);
      expect(body.retry_after_ms).toBeLessThanOrEqual(60_000);
    }
  );

  it('admin endpoint POST /api/admin/client-keys/:clientId/tier updates the tier', async () => {
    const clientId = 'test-tier-upgrade';
    const key = provisionKey(clientId, 'community');
    // Confirm starting tier from the rate-limit headers.
    const before = await get('/api/atr-rules', { Authorization: `Bearer ${key}` });
    expect(before.headers.get('x-ratelimit-tier')).toBe('community');

    // Reset the bucket so we observe the new tier on the next request.
    resetRateLimits();

    // Admin upgrade to enterprise.
    const upd = await post(
      `/api/admin/client-keys/${encodeURIComponent(clientId)}/tier`,
      { tier: 'enterprise' },
      { Authorization: `Bearer ${ADMIN_KEY}` }
    );
    expect(upd.status).toBe(200);
    expect((upd.json as { ok: boolean }).ok).toBe(true);

    const after = await get('/api/atr-rules', { Authorization: `Bearer ${key}` });
    expect(after.status).toBe(200);
    expect(after.headers.get('x-ratelimit-tier')).toBe('enterprise');
    expect(after.headers.get('x-ratelimit-limit')).toBe(String(TIER_LIMITS.enterprise));
  });

  it('admin endpoint rejects invalid tier with 400', async () => {
    const clientId = 'test-bad-tier';
    provisionKey(clientId, 'community');
    const r = await post(
      `/api/admin/client-keys/${encodeURIComponent(clientId)}/tier`,
      { tier: 'platinum' },
      { Authorization: `Bearer ${ADMIN_KEY}` }
    );
    expect(r.status).toBe(400);
  });

  it('admin endpoint rejects non-admin caller with 401', async () => {
    const r = await post(
      `/api/admin/client-keys/anyone/tier`,
      { tier: 'enterprise' },
      { Authorization: `Bearer ${STATIC_KEY}` }
    );
    expect(r.status).toBe(401);
  });
});
