/**
 * Dashboard 1.7 control-endpoint tests — closing the "shows me X but I can't
 * touch it" gaps found in the control audit (2026-06-16):
 *  - GET  /api/status .layers       — REAL per-layer health (no more fake green)
 *  - GET  /api/rule-update          — surface the daily notify-only rule check
 *  - GET  /api/skills/quarantined   — see what's quarantined
 *  - POST /api/skills/restore       — honor the "can be restored" promise
 *  - POST /api/skills/unwhitelist   — reverse a mistaken "Mark safe"
 *  - POST /api/threat-cloud {mode}  — report-only is accepted, not silently clobbered
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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

describe('DashboardServer — 1.7 control endpoints', () => {
  let dashboard: DashboardServer;
  let port: number;
  let baseUrl: string;
  let token: string;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = mkdtempSync(join(tmpdir(), 'pg-ctrl-'));
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

  function get(path: string, withAuth = true): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      headers: withAuth ? { Authorization: `Bearer ${token}` } : {},
    });
  }
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

  describe('/api/status .layers — real engine health, not hard-coded', () => {
    it('Layer A is degraded with zero rules loaded (no fake green)', async () => {
      const d = await (await get('/api/status')).json();
      expect(d.layers).toBeDefined();
      expect(d.layers.a.state).toBe('degraded'); // no atrRuleCount reported yet
      expect(d.layers.a.detail).toContain('no rules');
    });

    it('Layer A is active once rules are loaded AND engine is running', async () => {
      dashboard.updateStatus({ atrRuleCount: 642, mode: 'protection' });
      const d = await (await get('/api/status')).json();
      expect(d.layers.a.state).toBe('active');
      expect(d.layers.a.detail).toContain('642');
      expect(d.layers.b.state).toBe('active');
    });

    it('Layer C reports off + BYO guidance when no semantic LLM is configured', async () => {
      const d = await (await get('/api/status')).json();
      expect(d.layers.c.state).toBe('off');
      expect(d.layers.c.optional).toBe(true);
      expect(d.layers.c.detail.toLowerCase()).toContain('bring your own');
    });

    it('Layer C is active when a BYO LLM is configured', async () => {
      dashboard.setConfigGetter(
        () => ({ ...baseConfig(dataDir), ai: { provider: 'openai' } }) as unknown as GuardConfig
      );
      const d = await (await get('/api/status')).json();
      expect(d.layers.c.state).toBe('active');
    });
  });

  describe('/api/rule-update — surface the daily notify-only check', () => {
    it('reports neverChecked before the first check has run', async () => {
      const d = await (await get('/api/rule-update')).json();
      expect(d.neverChecked).toBe(true);
      expect(d.updateAvailable).toBe(false);
    });

    it('surfaces an available update written by the rule-sync check', async () => {
      writeFileSync(
        join(dataDir, 'rule-update.json'),
        JSON.stringify({
          updateAvailable: true,
          currentVersion: '3.4.0',
          latestVersion: '3.5.0',
          checkedAt: '2026-06-16T00:00:00Z',
        })
      );
      const d = await (await get('/api/rule-update')).json();
      expect(d.updateAvailable).toBe(true);
      expect(d.latestVersion).toBe('3.5.0');
    });
  });

  describe('/api/skills/quarantined + /api/skills/restore', () => {
    it('returns a records array', async () => {
      const d = await (await get('/api/skills/quarantined')).json();
      expect(Array.isArray(d.records)).toBe(true);
    });

    it('restore rejects a missing id with 400', async () => {
      expect((await post('/api/skills/restore', {})).status).toBe(400);
    });

    it('restore of an unknown id fails gracefully (not a 500)', async () => {
      const res = await post('/api/skills/restore', { id: 'nonexistent-id-9182' });
      expect(res.status).toBe(400);
      expect((await res.json()).success).toBe(false);
    });

    it('restore rejects GET (405) and unauthenticated POST (401)', async () => {
      expect((await get('/api/skills/restore')).status).toBe(405);
      expect((await post('/api/skills/restore', { id: 'x' }, false)).status).toBe(401);
    });
  });

  describe('/api/skills/unwhitelist — reverse a mistaken Mark-safe', () => {
    it('removes a previously whitelisted skill', async () => {
      await post('/api/skills/whitelist', { name: 'oops-trusted' });
      const res = await post('/api/skills/unwhitelist', { name: 'oops-trusted' });
      expect(res.status).toBe(200);
      expect((await res.json()).removed).toBe(true);

      const data = JSON.parse(readFileSync(join(dataDir, 'skill-whitelist.json'), 'utf-8')) as {
        whitelist: Array<{ name: string }>;
      };
      expect(data.whitelist.some((s) => s.name === 'oops-trusted')).toBe(false);
    });

    it('is graceful when the skill was not whitelisted (removed:false)', async () => {
      const res = await post('/api/skills/unwhitelist', { name: 'never-added' });
      expect(res.status).toBe(200);
      expect((await res.json()).removed).toBe(false);
    });

    it('rejects GET (405) and unauthenticated POST (401)', async () => {
      expect((await get('/api/skills/unwhitelist')).status).toBe(405);
      expect((await post('/api/skills/unwhitelist', { name: 'x' }, false)).status).toBe(401);
    });
  });

  describe('mode — report-only is accepted, not silently clobbered', () => {
    it('accepts mode=report-only and persists it', async () => {
      const res = await post('/api/threat-cloud', { mode: 'report-only' });
      expect(res.status).toBe(200);
      const cfg = JSON.parse(readFileSync(join(dataDir, 'config.json'), 'utf-8')) as {
        mode: string;
      };
      expect(cfg.mode).toBe('report-only');
    });

    it('still rejects a bogus mode with 400', async () => {
      expect((await post('/api/threat-cloud', { mode: 'yolo' })).status).toBe(400);
    });
  });
});
