/**
 * Dashboard security-hardening tests (CLUSTER B, 2026-06-16):
 *  1. GET /api/ai-config never returns a plaintext apiKey / byokApiKey —
 *     only { provider, model, endpoint, hasApiKey } shape.
 *  2. Token / CSRF chain:
 *     - GET / WITHOUT the launch token issues NO auth cookie (the token must
 *       come from the pga-launched URL, not from serving the index).
 *     - GET /?token=<authToken> mints the HttpOnly auth cookie.
 *     - A cookie-authenticated state-changing POST with an ABSENT or MISMATCHED
 *       Origin is rejected (absent is NOT treated as same-origin).
 *     - A header-authenticated (Authorization: Bearer) POST is exempt (not a
 *       CSRF vector) — the legitimate CLI / test flow keeps working.
 *  3. Layer C onboarding copy points at the WORKING cloud path
 *     (ANTHROPIC_API_KEY / OPENAI_API_KEY env, or local Ollama) and never
 *     mentions the no-op `pga config llm`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe('DashboardServer — security hardening (Cluster B)', () => {
  let dashboard: DashboardServer;
  let port: number;
  let baseUrl: string;
  let token: string;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = mkdtempSync(join(tmpdir(), 'pg-sec-'));
    port = await pickFreePort();
    dashboard = new DashboardServer(port);
    dashboard.setConfigGetter(() => baseConfig(dataDir));
    await dashboard.start();
    baseUrl = `http://127.0.0.1:${port}`;
    token = dashboard.getAuthToken();
  });

  afterEach(async () => {
    await dashboard.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  describe('1. /api/ai-config never leaks the cloud key', () => {
    it('returns only non-secret fields when an ai block with apiKey is configured', async () => {
      dashboard.setConfigGetter(
        () =>
          ({
            ...baseConfig(dataDir),
            ai: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              endpoint: 'https://api.openai.com/v1',
              apiKey: 'sk-super-secret-should-never-appear',
              byokApiKey: 'byok-super-secret-should-never-appear',
            },
          }) as unknown as GuardConfig
      );
      const res = await fetch(`${baseUrl}/api/ai-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const raw = await res.text();
      expect(raw).not.toContain('sk-super-secret-should-never-appear');
      expect(raw).not.toContain('byok-super-secret-should-never-appear');
      const body = JSON.parse(raw);
      expect(body.ai).toEqual({
        provider: 'openai',
        model: 'gpt-4o-mini',
        endpoint: 'https://api.openai.com/v1',
        hasApiKey: true,
      });
      expect('apiKey' in body.ai).toBe(false);
      expect('byokApiKey' in body.ai).toBe(false);
    });

    it('reports hasApiKey=false when no key is set, and null when no ai block', async () => {
      dashboard.setConfigGetter(
        () =>
          ({
            ...baseConfig(dataDir),
            ai: { provider: 'ollama', model: 'llama3' },
          }) as unknown as GuardConfig
      );
      let body = await (
        await fetch(`${baseUrl}/api/ai-config`, { headers: { Authorization: `Bearer ${token}` } })
      ).json();
      expect(body.ai.hasApiKey).toBe(false);

      dashboard.setConfigGetter(() => baseConfig(dataDir));
      body = await (
        await fetch(`${baseUrl}/api/ai-config`, { headers: { Authorization: `Bearer ${token}` } })
      ).json();
      expect(body.ai).toBeNull();
    });

    it('rejects POST to /api/ai-config (read-only) without mentioning `pga config llm`', async () => {
      const res = await fetch(`${baseUrl}/api/ai-config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Origin: baseUrl,
        },
        body: JSON.stringify({ provider: 'openai', apiKey: 'x' }),
      });
      expect(res.status).toBe(405);
      const body = await res.json();
      expect(body.error).not.toContain('pga config llm');
      expect(body.error).toContain('ANTHROPIC_API_KEY');
    });
  });

  describe('2. token / cookie issuance on GET /', () => {
    it('does NOT Set-Cookie an auth token to an UNAUTHENTICATED GET /', async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeNull();
      // And the served HTML must not embed the token either.
      const html = await res.text();
      expect(html).not.toContain(token);
    });

    it('does NOT Set-Cookie when GET /?token= carries a WRONG token', async () => {
      const res = await fetch(`${baseUrl}/?token=not-the-real-token`);
      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('mints the HttpOnly auth cookie when GET /?token=<authToken> is correct', async () => {
      const res = await fetch(`${baseUrl}/?token=${token}`);
      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie') ?? '';
      expect(setCookie).toContain(`panguard_auth=${token}`);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
    });
  });

  describe('2. CSRF Origin check on cookie-authenticated POSTs', () => {
    const cookie = (): string => `panguard_auth=${token}`;

    it('REJECTS a cookie-auth POST with an ABSENT Origin (not treated as same-origin)', async () => {
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Cookie: cookie(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'report-only' }),
      });
      expect(res.status).toBe(403);
    });

    it('REJECTS a cookie-auth POST with a cross-site Origin', async () => {
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: {
          Cookie: cookie(),
          Origin: 'https://evil.example.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: 'report-only' }),
      });
      expect(res.status).toBe(403);
    });

    it('ALLOWS a cookie-auth POST with the loopback Origin (the real SPA flow)', async () => {
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: {
          Cookie: cookie(),
          Origin: baseUrl,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: 'report-only' }),
      });
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it('ALLOWS a header-token POST with NO Origin (CLI / test client, not a CSRF vector)', async () => {
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'report-only' }),
      });
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    it('still 401s an unauthenticated POST regardless of Origin', async () => {
      const res = await fetch(`${baseUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { Origin: baseUrl, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'report-only' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('3. Layer C onboarding copy points at the working path', () => {
    it('mentions ANTHROPIC_API_KEY / OPENAI_API_KEY env + Ollama, never `pga config llm`', async () => {
      const status = await (
        await fetch(`${baseUrl}/api/status`, { headers: { Authorization: `Bearer ${token}` } })
      ).json();
      const detail: string = status.layers.c.detail;
      expect(detail).toContain('ANTHROPIC_API_KEY');
      expect(detail).toContain('OPENAI_API_KEY');
      expect(detail).toContain('PANGUARD_SEMANTIC=1');
      expect(detail.toLowerCase()).toContain('ollama');
      expect(detail).not.toContain('pga config llm');
    });
  });
});
