/**
 * Dashboard tier-gate tests
 *
 * Covers:
 *  - /api/status now carries `license.tier` so the SPA can gate Pilot-only UI
 *  - the served HTML contains `data-tier-gate="pilot"` attributes on the
 *    SARIF + Evidence buttons (so the JS gate code has something to find)
 *  - POST /api/export/sarif and /api/export/evidence return realistic-shape
 *    JSON downloads
 *  - regression: the served HTML no longer contains stale UI strings
 *    ("Connect LLM", "Groq", "Tier 1-3") removed during the cleanup pass
 *
 * Spins up DashboardServer on an OS-picked port (port 0), authenticates with
 * the per-server token via the existing Bearer-header path, then makes raw
 * fetch() calls. The server binds to 127.0.0.1 only.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { DashboardServer } from '../src/dashboard/index.js';
import type { GuardConfig } from '../src/types.js';

/** Helper: ask the kernel for a free TCP port on 127.0.0.1. */
function pickFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

function baseConfig(overrides: Partial<GuardConfig> = {}): GuardConfig {
  return {
    lang: 'en',
    mode: 'protection',
    learningDays: 0,
    actionPolicy: { autoRespond: 85, notifyAndWait: 50, logOnly: 0 },
    notifications: {},
    dataDir: '/tmp/panguard-test',
    dashboardPort: 0,
    dashboardEnabled: true,
    verbose: false,
    monitors: {
      logMonitor: false,
      networkMonitor: false,
      processMonitor: false,
      fileMonitor: false,
      networkPollInterval: 60_000,
      processPollInterval: 60_000,
    },
    watchdogEnabled: false,
    watchdogInterval: 60_000,
    ...overrides,
  };
}

interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

describe('DashboardServer — tier gating', () => {
  let dashboard: DashboardServer;
  let port: number;
  let baseUrl: string;
  let token: string;

  beforeEach(async () => {
    port = await pickFreePort();
    dashboard = new DashboardServer(port);
    await dashboard.start();
    baseUrl = `http://127.0.0.1:${port}`;
    token = dashboard.getAuthToken();
  });

  afterEach(async () => {
    await dashboard.stop();
  });

  function authed(path: string, init: FetchInit = {}): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  }

  describe('/api/status license envelope', () => {
    it('includes license.tier set to "community" by default', async () => {
      // No config getter wired → license defaults to community
      const res = await authed('/api/status');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { license?: { tier?: string } };
      expect(body.license).toBeDefined();
      expect(body.license?.tier).toBe('community');
    });

    it('reflects cliTier=pilot from GuardConfig', async () => {
      const cfg = baseConfig({ cliTier: 'pilot' });
      dashboard.setConfigGetter(() => cfg);

      const res = await authed('/api/status');
      const body = (await res.json()) as { license: { tier: string } };
      expect(body.license.tier).toBe('pilot');
    });

    it('reflects cliTier=enterprise from GuardConfig', async () => {
      const cfg = baseConfig({ cliTier: 'enterprise' });
      dashboard.setConfigGetter(() => cfg);

      const res = await authed('/api/status');
      const body = (await res.json()) as { license: { tier: string } };
      expect(body.license.tier).toBe('enterprise');
    });

    it('normalizes unknown tier values to community', async () => {
      const cfg = baseConfig({ cliTier: 'mystery-tier' });
      dashboard.setConfigGetter(() => cfg);

      const res = await authed('/api/status');
      const body = (await res.json()) as { license: { tier: string } };
      expect(body.license.tier).toBe('community');
    });
  });

  describe('Dashboard HTML — tier-gate attributes', () => {
    it('exposes data-tier-gate="pilot" on the SARIF and Evidence buttons', async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      const html = await res.text();

      // Both buttons must carry the gate attribute so applyTierGates can
      // find them. Use a regex tolerant of attribute order.
      expect(html).toMatch(
        /id="btn-sarif"[^>]*data-tier-gate="pilot"|data-tier-gate="pilot"[^>]*id="btn-sarif"/
      );
      expect(html).toMatch(
        /id="btn-evidence"[^>]*data-tier-gate="pilot"|data-tier-gate="pilot"[^>]*id="btn-evidence"/
      );

      // The upsell link must also be present so non-paid tiers see it.
      expect(html).toContain('data-tier-upsell="pilot"');
    });

    it('does NOT contain stale "Connect LLM" / "Groq" / "Tier 1-3" UI strings', async () => {
      const res = await fetch(`${baseUrl}/`);
      const html = await res.text();

      // These were removed as part of the LLM-CTA cleanup.
      expect(html).not.toContain('Connect LLM');
      expect(html).not.toContain('Groq');
      expect(html).not.toContain('Tier 1-3');
      expect(html).not.toContain('Tier 1-2');

      // Layers A/B are deterministic + always on. Layer C is the optional, advisory,
      // bring-your-own semantic layer — off by default, never auto-blocks.
      expect(html).toContain('Layer A');
      expect(html).toContain('Layer B');
      expect(html).toContain('Layer C');
      expect(html).toContain('advisory');
    });
  });

  describe('/api/export/sarif', () => {
    it('returns a 200 + SARIF-shaped JSON envelope', async () => {
      const res = await authed('/api/export/sarif', { method: 'POST' });
      expect(res.status).toBe(200);

      const contentType = res.headers.get('content-type') ?? '';
      expect(contentType).toContain('sarif+json');

      const body = (await res.json()) as {
        version?: string;
        runs?: Array<{ tool?: { driver?: { name?: string } } }>;
      };
      expect(body.version).toBe('2.1.0');
      expect(body.runs?.[0]?.tool?.driver?.name).toBe('PanGuard Guard');
    });

    it('rejects GET with 405', async () => {
      const res = await authed('/api/export/sarif', { method: 'GET' });
      expect(res.status).toBe(405);
    });
  });

  describe('/api/export/evidence', () => {
    it('returns a 200 + Evidence-Pack JSON envelope with workspace + summary', async () => {
      const res = await authed('/api/export/evidence', { method: 'POST' });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        kind?: string;
        workspace_id?: string;
        generated_at?: string;
        summary?: { rules_active?: number };
      };
      expect(body.kind).toBe('panguard.evidence-pack');
      expect(body.workspace_id).toBeDefined();
      expect(body.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(body.summary).toBeDefined();
      expect(typeof body.summary?.rules_active).toBe('number');
    });

    it('rejects GET with 405', async () => {
      const res = await authed('/api/export/evidence', { method: 'GET' });
      expect(res.status).toBe(405);
    });
  });

  describe('Export endpoints require auth', () => {
    it('returns 401 when no token is supplied to /api/export/sarif', async () => {
      const res = await fetch(`${baseUrl}/api/export/sarif`, { method: 'POST' });
      expect(res.status).toBe(401);
    });

    it('returns 401 when no token is supplied to /api/export/evidence', async () => {
      const res = await fetch(`${baseUrl}/api/export/evidence`, { method: 'POST' });
      expect(res.status).toBe(401);
    });
  });
});
