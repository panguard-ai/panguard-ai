/**
 * Dashboard skill-action endpoint tests (Phase 1 — threat → one-click action)
 *
 * Covers the two write endpoints that turn the dashboard from SEE-only into
 * SEE-and-DO:
 *  - POST /api/skills/whitelist — mark a skill safe (persists to skill-whitelist.json)
 *  - POST /api/skills/quarantine — move a file-based skill to quarantine
 *
 * The quarantine success path moves a real file under ~/.claude/skills, so to
 * avoid touching the developer's real home we only assert quarantine's guard
 * rails here (missing name, path traversal, non-existent skill, method, auth).
 * Whitelist's success path is fully exercised against a temp dataDir.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DashboardServer } from '../src/dashboard/index.js';
import { SkillWhitelistManager } from '../src/engines/skill-whitelist.js';
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

describe('DashboardServer — skill action endpoints', () => {
  let dashboard: DashboardServer;
  let port: number;
  let baseUrl: string;
  let token: string;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = mkdtempSync(join(tmpdir(), 'pg-skill-act-'));
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

  function post(path: string, body?: unknown, withAuth = true): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(withAuth ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  describe('/api/skills/whitelist', () => {
    it('adds the skill to skill-whitelist.json and returns success', async () => {
      const res = await post('/api/skills/whitelist', { name: 'weather-helper' });
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);

      const wlPath = join(dataDir, 'skill-whitelist.json');
      expect(existsSync(wlPath)).toBe(true);
      const data = JSON.parse(readFileSync(wlPath, 'utf-8')) as {
        whitelist: Array<{ name: string; normalizedName?: string; source?: string }>;
      };
      const entry = data.whitelist.find((s) => s.name === 'weather-helper');
      expect(entry).toBeDefined();
      // Fallback path (no engine wired) MUST still write a record the live gate
      // can match: a valid WhitelistSource + the normalizedName key. Writing a
      // partial record (missing normalizedName / out-of-union source) was the
      // 2026-07 "Mark safe" fake-green.
      expect(entry?.source).toBe('manual');
      expect(entry?.normalizedName).toBe('weather-helper');
    });

    it('is idempotent — whitelisting twice does not duplicate', async () => {
      await post('/api/skills/whitelist', { name: 'dupe' });
      await post('/api/skills/whitelist', { name: 'dupe' });
      const data = JSON.parse(readFileSync(join(dataDir, 'skill-whitelist.json'), 'utf-8')) as {
        whitelist: Array<{ name: string }>;
      };
      expect(data.whitelist.filter((s) => s.name === 'dupe')).toHaveLength(1);
    });

    it('rejects a missing name with 400', async () => {
      const res = await post('/api/skills/whitelist', {});
      expect(res.status).toBe(400);
    });

    it('rejects GET with 405', async () => {
      const res = await fetch(`${baseUrl}/api/skills/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(405);
    });

    it('rejects unauthenticated POST with 401', async () => {
      const res = await post('/api/skills/whitelist', { name: 'x' }, false);
      expect(res.status).toBe(401);
    });

    // The core fix for the 2026-07 fake-green: when a live whitelist manager is
    // wired (the real guard process), "Mark safe"/"Un-trust" must take effect on
    // the SAME in-memory gate the detection engine consults — no restart.
    it('routes Mark safe / Un-trust through the LIVE gate (effect without restart)', async () => {
      const mgr = new SkillWhitelistManager();
      dashboard.setWhitelistManager(mgr);

      expect(mgr.isWhitelisted('Weather Helper')).toBe(false);

      const r1 = await post('/api/skills/whitelist', { name: 'Weather Helper' });
      expect(r1.status).toBe(200);
      expect((await r1.json()).success).toBe(true);
      // Live gate now honors it immediately, case/space-insensitively — this is
      // exactly what never worked before (record landed under key `undefined`).
      expect(mgr.isWhitelisted('Weather Helper')).toBe(true);
      expect(mgr.isWhitelisted('weather-helper')).toBe(true);

      const r2 = await post('/api/skills/unwhitelist', { name: 'Weather Helper' });
      expect(r2.status).toBe(200);
      expect((await r2.json()).removed).toBe(true);
      // Revocation takes effect on the live gate immediately (was restart-only).
      expect(mgr.isWhitelisted('Weather Helper')).toBe(false);
      // ...and it must SURVIVE auto-promotion: a stable fingerprint must not
      // silently re-whitelist a just-un-trusted skill. (Using remove() instead of
      // revoke() would let autoPromote re-add it here — the regression the
      // adversarial review caught.)
      expect(mgr.autoPromote('Weather Helper', 'deadbeefcafe0123')).toBe(false);
      expect(mgr.isWhitelisted('Weather Helper')).toBe(false);
    });
  });

  describe('/api/skills/quarantine — guard rails', () => {
    it('rejects a missing name with 400', async () => {
      const res = await post('/api/skills/quarantine', {});
      expect(res.status).toBe(400);
    });

    it('rejects a path-traversal name with 400', async () => {
      const res = await post('/api/skills/quarantine', { name: '../../../etc/passwd' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for a skill that has no folder under ~/.claude/skills', async () => {
      const res = await post('/api/skills/quarantine', {
        name: 'definitely-not-a-real-skill-xyz-9182',
      });
      expect(res.status).toBe(404);
    });

    it('rejects GET with 405', async () => {
      const res = await fetch(`${baseUrl}/api/skills/quarantine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(405);
    });

    it('rejects unauthenticated POST with 401', async () => {
      const res = await post('/api/skills/quarantine', { name: 'x' }, false);
      expect(res.status).toBe(401);
    });
  });

  describe('Dashboard HTML — skills tab exposes action buttons', () => {
    it('renders the Actions column header and wires quarantine/whitelist via data-act', async () => {
      const res = await fetch(`${baseUrl}/`);
      const html = await res.text();
      expect(html).toContain('data-act="quarantine"');
      expect(html).toContain('data-act="whitelist"');
      // No inline onclick — actions are wired via delegation (CSP-safe).
      expect(html).not.toMatch(/onclick=/);
    });
  });
});
