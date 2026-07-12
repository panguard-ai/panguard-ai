/**
 * 1.8.2 audit remediation — group I2 (dashboard HTTP server).
 *
 * Regression tests that PIN the security + honesty invariants fixed in this group.
 * Each `describe` block maps to one finding; the assertions are written so the
 * BAD behaviour the audit flagged can never silently recur.
 *
 *  - Finding 7  (rate-limit DoS): the pre-auth cap and the authenticated per-token
 *               budget are SEPARATE buckets. An unauthenticated flood that
 *               exhausts the pre-auth cap must NOT 429 the authenticated user.
 *  - Finding 8  (Host allowlist / DNS-rebinding): any request whose Host header is
 *               not 127.0.0.1 / localhost (and the dashboard port) is 403'd before
 *               any other processing — HTTP and WS upgrade alike.
 *  - Finding 9  (ai-config secret leak): GET /api/ai-config redacts a credential
 *               embedded in the BYO-LLM endpoint URL (userinfo or ?key= param).
 *  - Finding 10 (outbound SSRF / DNS rebinding): POST /api/threat-cloud rejects an
 *               endpoint whose hostname RESOLVES to a private/loopback/metadata
 *               address, not only literal private IPs.
 *  - Finding 13 (honest integrity): a pristine fresh install (zero durable events)
 *               exports integrity 'NO_RECORDS', never 'TAMPERED'.
 *  - Finding 26 (Layer C live reachability): a configured semantic layer whose
 *               last call errored reports 'degraded' with the live error, not a
 *               fake green 'active'.
 *  - Finding 30 (grounded cost claim): the Layer C detail references the user's own
 *               flagged-event count, not an unqualified flat "a few cents a month".
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, request as httpRequest } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// node:dns/promises is mocked so the SSRF test can make a hostname resolve to a
// private/loopback address deterministically (the outbound DNS-rebinding case).
// Default resolution is a public IP so unrelated lookups never fail-closed.
const { mockLookup } = vi.hoisted(() => ({
  mockLookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]),
}));
vi.mock('node:dns/promises', () => ({
  lookup: (...args: unknown[]) => mockLookup(...args),
}));

import { DashboardServer } from '../src/dashboard/index.js';
import type { GuardConfig } from '../src/types.js';

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

function baseConfig(dataDir: string): GuardConfig {
  return {
    lang: 'en',
    mode: 'protection',
    learningDays: 0,
    actionPolicy: { autoRespond: 85, notifyAndWait: 50, logOnly: 0 },
    notifications: {},
    dataDir,
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
  };
}

/**
 * Raw HTTP request that lets us set an ARBITRARY Host header — the global fetch()
 * (undici) forbids overriding Host, which is exactly the header the DNS-rebinding
 * defence keys on. Connects to loopback while sending whatever Host we choose.
 */
function rawRequest(
  port: number,
  opts: { path?: string; method?: string; headers?: Record<string, string> }
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: opts.path ?? '/',
        method: opts.method ?? 'GET',
        headers: opts.headers ?? {},
      },
      (res) => {
        let body = '';
        res.on('data', (c: Buffer) => (body += c.toString()));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('1.8.2-I2 dashboard server', () => {
  let dashboard: DashboardServer;
  let port: number;
  let baseUrl: string;
  let token: string;
  let dataDir: string;
  let currentConfig: GuardConfig;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLookup.mockImplementation(async () => [{ address: '93.184.216.34', family: 4 }]);
    dataDir = mkdtempSync(join(tmpdir(), 'pg-i2-'));
    port = await pickFreePort();
    dashboard = new DashboardServer(port);
    currentConfig = baseConfig(dataDir);
    dashboard.setConfigGetter(() => currentConfig);
    await dashboard.start();
    baseUrl = `http://127.0.0.1:${port}`;
    token = dashboard.getAuthToken();
  });

  afterEach(async () => {
    await dashboard.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Finding 7 — tiered rate limiting: unauth flood cannot DoS the real user.
  // ---------------------------------------------------------------------------
  describe('finding 7: unauthenticated flood never throttles the authenticated user', () => {
    it('exhausting the pre-auth cap 429s unauth callers but leaves an authed request 200', async () => {
      // Fire well past the pre-auth cap (240) of UNAUTHENTICATED /api requests.
      const floodCount = 260;
      const statuses = await Promise.all(
        Array.from({ length: floodCount }, () =>
          fetch(`${baseUrl}/api/status`).then((r) => r.status)
        )
      );
      // Under the cap: 401 (unauthorized). Over the cap: 429 (pre-auth bucket).
      expect(statuses).toContain(401);
      expect(statuses).toContain(429);

      // The authenticated user is metered by a SEPARATE per-token budget, so even
      // with the pre-auth bucket fully drained their API traffic still succeeds.
      const authed = await fetch(`${baseUrl}/api/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(authed.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Finding 8 — Host allowlist (DNS-rebinding defence-in-depth).
  // ---------------------------------------------------------------------------
  describe('finding 8: Host header allowlist', () => {
    it('403s a request whose Host is a foreign (rebound) hostname', async () => {
      const res = await rawRequest(port, { path: '/', headers: { Host: 'tc.attacker.example' } });
      expect(res.status).toBe(403);
      expect(res.body).toContain('Host');
    });

    it('403s a loopback Host on the WRONG port', async () => {
      const res = await rawRequest(port, { path: '/', headers: { Host: '127.0.0.1:1' } });
      expect(res.status).toBe(403);
    });

    it('allows a correct loopback Host (127.0.0.1 and localhost)', async () => {
      const r1 = await rawRequest(port, { path: '/', headers: { Host: `127.0.0.1:${port}` } });
      expect(r1.status).toBe(200);
      const r2 = await rawRequest(port, { path: '/', headers: { Host: `localhost:${port}` } });
      expect(r2.status).toBe(200);
    });

    it('rejects a WebSocket upgrade with a foreign Host', async () => {
      const res = await rawRequest(port, {
        path: '/ws',
        headers: {
          Host: 'tc.attacker.example',
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Sec-WebSocket-Version': '13',
        },
      }).catch(() => ({ status: 0, body: '' }));
      // The upgrade handler destroys the socket for a foreign Host, so the client
      // never sees a 101 Switching Protocols.
      expect(res.status).not.toBe(101);
    });
  });

  // ---------------------------------------------------------------------------
  // Finding 9 — endpoint credential redaction on GET /api/ai-config.
  // ---------------------------------------------------------------------------
  describe('finding 9: /api/ai-config redacts a credential embedded in the endpoint URL', () => {
    it('strips userinfo and a secret query param from the endpoint before returning it', async () => {
      currentConfig = {
        ...baseConfig(dataDir),
        ai: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          endpoint: 'https://user:s3cr3t-token@byo.example.com/v1?api_key=SUPERSECRETKEY',
          apiKey: 'sk-should-be-boolean-only',
        },
      } as unknown as GuardConfig;

      const raw = await (
        await fetch(`${baseUrl}/api/ai-config`, { headers: { Authorization: `Bearer ${token}` } })
      ).text();

      // No credential material leaks into the JSON body.
      expect(raw).not.toContain('s3cr3t-token');
      expect(raw).not.toContain('SUPERSECRETKEY');
      expect(raw).not.toContain('sk-should-be-boolean-only');

      const body = JSON.parse(raw) as { ai: { endpoint: string; hasApiKey: boolean } };
      // The host is still shown (so the UI can say WHERE the model lives).
      expect(body.ai.endpoint).toContain('byo.example.com');
      expect(body.ai.hasApiKey).toBe(true);
    });

    it('passes a clean endpoint through unchanged', async () => {
      currentConfig = {
        ...baseConfig(dataDir),
        ai: { provider: 'openai', model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1' },
      } as unknown as GuardConfig;
      const body = (await (
        await fetch(`${baseUrl}/api/ai-config`, { headers: { Authorization: `Bearer ${token}` } })
      ).json()) as { ai: { endpoint: string } };
      expect(body.ai.endpoint).toBe('https://api.openai.com/v1');
    });
  });

  // ---------------------------------------------------------------------------
  // Finding 10 — outbound SSRF: reject a hostname that RESOLVES to a private IP.
  // ---------------------------------------------------------------------------
  describe('finding 10: threatCloudEndpoint rejects hostnames resolving to private/internal IPs', () => {
    it('rejects an endpoint whose hostname resolves to loopback (outbound DNS rebinding)', async () => {
      mockLookup.mockImplementation(async () => [{ address: '127.0.0.1', family: 4 }]);
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'https://tc.attacker.example/api' }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error.toLowerCase()).toContain('private');
    });

    it('rejects when ANY resolved record is private even if another is public', async () => {
      mockLookup.mockImplementation(async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '169.254.169.254', family: 4 },
      ]);
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'https://tc.mixed.example/api' }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects a literal private/metadata IP endpoint (fast synchronous gate)', async () => {
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'https://169.254.169.254/api' }),
      });
      expect(res.status).toBe(400);
    });

    it('accepts an endpoint that resolves to a public address', async () => {
      mockLookup.mockImplementation(async () => [{ address: '93.184.216.34', family: 4 }]);
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'https://tc.public.example/api' }),
      });
      expect(res.status).toBe(200);
    });

    it('fails closed when DNS resolution fails (cannot prove the host is public)', async () => {
      mockLookup.mockImplementation(async () => {
        throw new Error('ENOTFOUND');
      });
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'https://tc.unresolvable.example/api' }),
      });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Finding 13 — honest integrity: fresh install is NO_RECORDS, not TAMPERED.
  // ---------------------------------------------------------------------------
  describe('finding 13: a pristine install never accuses itself of TAMPERED', () => {
    it('SARIF export on an empty durable log reports integrity NO_RECORDS', async () => {
      const res = await fetch(`${baseUrl}/api/export/sarif`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const sarif = (await res.json()) as {
        runs: Array<{ properties: { integrity: string } }>;
      };
      const integrity = sarif.runs[0]?.properties.integrity;
      expect(integrity).toBe('NO_RECORDS');
      expect(integrity).not.toBe('TAMPERED');
    });

    it('Evidence export is Enterprise-gated (403 on Community) + reports NO_RECORDS on a paid tier', async () => {
      // Community: the compliance Evidence Pack is an Enterprise feature → 403.
      const gated = await fetch(`${baseUrl}/api/export/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(gated.status).toBe(403);

      // Paid tier: the export runs and, on an empty durable log, reports
      // NO_RECORDS (never a self-accusing TAMPERED).
      currentConfig = { ...currentConfig, cliTier: 'enterprise' };
      const res = await fetch(`${baseUrl}/api/export/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const doc = (await res.json()) as { integrity: string };
      expect(doc.integrity).toBe('NO_RECORDS');
      expect(doc.integrity).not.toBe('TAMPERED');
    });
  });

  // ---------------------------------------------------------------------------
  // Finding 26 — Layer C reflects LIVE reachability, not config presence.
  // ---------------------------------------------------------------------------
  describe('finding 26: Layer C degrades when its last call failed', () => {
    async function layerC(): Promise<{ state: string; detail: string }> {
      const status = (await (
        await fetch(`${baseUrl}/api/status`, { headers: { Authorization: `Bearer ${token}` } })
      ).json()) as { layers: { c: { state: string; detail: string } } };
      return status.layers.c;
    }

    beforeEach(() => {
      currentConfig = {
        ...baseConfig(dataDir),
        ai: { provider: 'openai', model: 'gpt-4o-mini' },
      } as unknown as GuardConfig;
    });

    it('is active when configured and no failure has been reported yet', async () => {
      const c = await layerC();
      expect(c.state).toBe('active');
    });

    it('degrades (with the live error) after a failed advisory call', async () => {
      dashboard.reportLayerCOutcome(false, 'billing block: 402 Payment Required');
      const c = await layerC();
      expect(c.state).toBe('degraded');
      expect(c.detail).toContain('billing block');
    });

    it('recovers to active after a subsequent successful call', async () => {
      dashboard.reportLayerCOutcome(false, 'timeout');
      expect((await layerC()).state).toBe('degraded');
      dashboard.reportLayerCOutcome(true);
      expect((await layerC()).state).toBe('active');
    });

    it('is off (not degraded) when no semantic layer is configured', async () => {
      currentConfig = baseConfig(dataDir);
      const c = await layerC();
      expect(c.state).toBe('off');
    });
  });

  // ---------------------------------------------------------------------------
  // Finding 30 — cost claim grounded in the user's own flagged-event volume.
  // ---------------------------------------------------------------------------
  describe('finding 30: Layer C cost line is grounded, not an unqualified flat claim', () => {
    it('references the user actual flagged-event count and drops the flat "a few cents a month"', async () => {
      currentConfig = {
        ...baseConfig(dataDir),
        ai: { provider: 'openai', model: 'gpt-4o-mini' },
      } as unknown as GuardConfig;
      dashboard.updateStatus({ threatsDetected: 7 });

      const status = (await (
        await fetch(`${baseUrl}/api/status`, { headers: { Authorization: `Bearer ${token}` } })
      ).json()) as { layers: { c: { detail: string } } };
      const detail = status.layers.c.detail;

      // Grounded in the user's own volume.
      expect(detail).toContain('7 flagged event');
      // Free-with-local-Ollama stays honest.
      expect(detail.toLowerCase()).toContain('ollama');
      // The old ungrounded flat claim must not reappear.
      expect(detail).not.toContain('a few cents a month');
    });
  });
});
