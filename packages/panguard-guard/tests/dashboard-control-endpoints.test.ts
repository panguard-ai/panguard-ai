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
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
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

    it('Layer C reports off + points at `pga guard ai` when no semantic LLM is configured', async () => {
      const d = await (await get('/api/status')).json();
      expect(d.layers.c.state).toBe('off');
      expect(d.layers.c.optional).toBe(true);
      // Off-state guidance points at the canonical secure connect path.
      expect(d.layers.c.detail.toLowerCase()).toContain('pga guard ai');
      expect(d.layers.c.detail.toLowerCase()).toContain('advisory');
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

  describe('mode change is live — GET /api/config returns the NEW mode (no stale read)', () => {
    // Mirror how the engine wires the dashboard: a MUTABLE live config behind
    // setConfigGetter, plus setConfigApplier that mutates it. Without the
    // applier, getConfig() kept returning the launch-time config, so
    // /api/config and /api/status served the STALE mode and the UI snapped back.
    let liveDashboard: DashboardServer;
    let livePort: number;
    let liveUrl: string;
    let liveToken: string;
    let liveDir: string;
    let liveConfig: GuardConfig;

    beforeEach(async () => {
      liveDir = mkdtempSync(join(tmpdir(), 'pg-live-'));
      liveConfig = baseConfig(liveDir); // starts in 'protection'
      livePort = await pickFreePort();
      liveDashboard = new DashboardServer(livePort);
      liveDashboard.setConfigGetter(() => liveConfig);
      // Mirror the engine's applyConfig: update the live config AND push the new
      // mode into dashboard status (the engine does this via updateDashboardStatus
      // so /api/status enforcement.mode follows the live mode without a restart).
      liveDashboard.setConfigApplier((cfg) => {
        liveConfig = cfg;
        liveDashboard.updateStatus({ mode: cfg.mode });
      });
      await liveDashboard.start();
      liveUrl = `http://127.0.0.1:${livePort}`;
      liveToken = liveDashboard.getAuthToken();
    });

    afterEach(async () => {
      await liveDashboard.stop();
      rmSync(liveDir, { recursive: true, force: true });
    });

    it('GET /api/config reflects the new mode immediately after a mode POST', async () => {
      // sanity: starts protection
      const before = await (
        await fetch(`${liveUrl}/api/config`, {
          headers: { Authorization: `Bearer ${liveToken}` },
        })
      ).json();
      expect(before.mode).toBe('protection');

      const saveRes = await fetch(`${liveUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${liveToken}` },
        body: JSON.stringify({ mode: 'report-only' }),
      });
      expect(saveRes.status).toBe(200);

      // The applier must have updated the LIVE config — no stale read.
      const after = await (
        await fetch(`${liveUrl}/api/config`, {
          headers: { Authorization: `Bearer ${liveToken}` },
        })
      ).json();
      expect(after.mode).toBe('report-only');

      // /api/status enforcement posture follows the live mode too.
      const status = await (
        await fetch(`${liveUrl}/api/status`, {
          headers: { Authorization: `Bearer ${liveToken}` },
        })
      ).json();
      expect(status.enforcement.mode).toBe('report-only');
    });

    it('two consecutive saves compose — a consent toggle does not clobber a saved mode', async () => {
      await fetch(`${liveUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${liveToken}` },
        body: JSON.stringify({ mode: 'report-only' }),
      });
      // Second save touches consent only — must NOT rewrite mode back.
      await fetch(`${liveUrl}/api/threat-cloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${liveToken}` },
        body: JSON.stringify({ consentGiven: true }),
      });
      const after = await (
        await fetch(`${liveUrl}/api/config`, {
          headers: { Authorization: `Bearer ${liveToken}` },
        })
      ).json();
      expect(after.mode).toBe('report-only');
      expect(after.threatCloudUploadEnabled).toBe(true);
    });
  });

  describe('enforcement posture — PROTECTED only when it will actually act', () => {
    it('protection mode with NO armed response = monitoring, not protected', async () => {
      dashboard.updateStatus({ mode: 'protection', atrRuleCount: 100 });
      const d = await (await get('/api/status')).json();
      expect(d.enforcement.posture).toBe('monitoring');
      expect(d.enforcement.osActionsArmed).toBe(false);
    });

    it('zero rules loaded = degraded, never a green protected/monitoring claim', async () => {
      // Fake-green guard: a detection engine with 0 rules cannot detect anything,
      // so an active posture would overclaim. Must downgrade to 'degraded'.
      dashboard.updateStatus({ mode: 'protection', atrRuleCount: 0 });
      const d = await (await get('/api/status')).json();
      expect(d.enforcement.posture).toBe('degraded');
    });

    it('protection mode WITH an armed response = protected', async () => {
      dashboard.setConfigGetter(
        () =>
          ({
            ...baseConfig(dataDir),
            enforcementPolicy: {
              blockIPs: { enabled: true },
              killProcesses: { enabled: false, allowedProcessNames: [] },
              isolateFiles: { enabled: false, allowedPaths: [] },
              disableAccounts: { enabled: false },
            },
          }) as unknown as GuardConfig
      );
      dashboard.updateStatus({ mode: 'protection', atrRuleCount: 100 });
      const d = await (await get('/api/status')).json();
      expect(d.enforcement.posture).toBe('protected');
      expect(d.enforcement.armedActions).toContain('block IPs');
    });

    it('report-only mode reports report-only', async () => {
      dashboard.updateStatus({ mode: 'report-only', atrRuleCount: 100 });
      const d = await (await get('/api/status')).json();
      expect(d.enforcement.posture).toBe('report-only');
    });
  });

  describe('Dashboard HTML — 1.7 controls are wired (CSP-safe)', () => {
    let html = '';
    beforeEach(async () => {
      html = await (await fetch(`${baseUrl}/`)).text();
    });

    it('has the rule-update banner + the notify-only fetch', () => {
      expect(html).toContain('id="rule-update-banner"');
      expect(html).toContain('loadRuleUpdate');
      expect(html).toContain('/api/rule-update');
    });

    it('renders real layer health (renderLayers) + a Layer C connect CTA', () => {
      expect(html).toContain('renderLayers');
      // The old silent #lc-hint was replaced by a discoverable two-state CTA that
      // deep-links to the Settings "Semantic layer (Layer C)" connect section.
      expect(html).toContain('id="lc-cta"');
      expect(html).toContain('id="p-settings-layerc"');
    });

    it('mode is a 3-state segmented control incl. report-only — no binary toggle', () => {
      expect(html).toContain('id="st-mode-seg"');
      expect(html).toContain('data-mode="report-only"');
      expect(html).toContain('data-mode="protection"');
      expect(html).toContain('data-mode="learning"');
      // the old binary toggle + its handler are gone (it caused the clobber)
      expect(html).not.toContain('st-mode-toggle');
      // CSP-safe: no inline onclick handlers anywhere
      expect(html).not.toMatch(/onclick=/);
    });

    it('skills tab exposes quarantine list + restore and whitelist removal', () => {
      expect(html).toContain('id="qz-section"');
      expect(html).toContain('loadQuarantined');
      expect(html).toContain('restoreQuarantined');
      expect(html).toContain('data-restore-id');
      expect(html).toContain('/api/skills/restore');
      // the append-only whitelist now has an in-product undo
      expect(html).toContain('data-act="unwhitelist"');
    });

    it('settings surfaces alert channels + enforcement-policy blast radius (read-only)', () => {
      expect(html).toContain('id="st-notify-list"');
      expect(html).toContain('renderNotifyChannels');
      expect(html).toContain('id="st-enforce-list"');
      expect(html).toContain('renderEnforcement');
    });

    it('surfaces the latent endpoints as Coverage + Runtime tabs', () => {
      expect(html).toContain('data-tab="coverage"');
      expect(html).toContain('data-tab="runtime"');
      expect(html).toContain('id="p-coverage"');
      expect(html).toContain('id="p-runtime"');
      expect(html).toContain('loadCoverage');
      expect(html).toContain('loadRuntime');
      expect(html).toContain('/api/agents');
      expect(html).toContain('/api/proxy-verdicts');
    });

    it('derives the hero badge from honest enforcement posture, not a hardcoded mode string', () => {
      expect(html).toContain('postureView');
      expect(html).toContain('MONITORING');
      // the old overclaiming ternary is gone
      expect(html).not.toContain("s.mode === 'protection' ? 'PROTECTED' : 'LEARNING'");
    });

    it('leads the Overview with a posture score + actionable deductions', () => {
      expect(html).toContain('id="posture-score"');
      expect(html).toContain('id="posture-deductions"');
      expect(html).toContain('renderPosture');
      expect(html).toContain('data-goto');
    });

    it('uses the full 5-path brand mark (not the 1-path blob)', () => {
      const start = html.indexOf('class="sb-brand"');
      const sidebar = html.slice(start, html.indexOf('class="sb-nav"', start));
      const paths = (sidebar.match(/<path/g) || []).length;
      expect(paths).toBe(5);
    });
  });
});
