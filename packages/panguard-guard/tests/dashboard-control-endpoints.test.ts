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

    // POST /api/enforce — the Overview arm/disarm button. armed=true raises the
    // live mode to 'protection' (Guard blocks detected threats); armed=false
    // drops to 'report-only' (detect + log only). It NEVER touches
    // enforcementPolicy, so arming can never kill a process or delete a file.
    const enforce = (armed: unknown) =>
      fetch(`${liveUrl}/api/enforce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${liveToken}` },
        body: JSON.stringify({ armed }),
      });
    const liveMode = async () =>
      (
        await (
          await fetch(`${liveUrl}/api/config`, {
            headers: { Authorization: `Bearer ${liveToken}` },
          })
        ).json()
      ).mode;

    it('armed:false disarms to report-only; armed:true arms to protection — live', async () => {
      const off = await enforce(false);
      expect(off.status).toBe(200);
      const offBody = await off.json();
      expect(offBody).toMatchObject({ success: true, armed: false, mode: 'report-only' });
      expect(await liveMode()).toBe('report-only');

      const on = await enforce(true);
      expect(on.status).toBe(200);
      const onBody = await on.json();
      expect(onBody).toMatchObject({ success: true, armed: true, mode: 'protection' });
      expect(await liveMode()).toBe('protection');
    });

    it('arming never arms an OS-level response (conservative) — enforcement stays monitoring', async () => {
      // Give the engine rules so posture is not downgraded to 'degraded'.
      liveDashboard.updateStatus({ atrRuleCount: 100 });
      await enforce(true);
      const status = await (
        await fetch(`${liveUrl}/api/status`, {
          headers: { Authorization: `Bearer ${liveToken}` },
        })
      ).json();
      // Arming = protection mode with the inline blockers live = PROTECTED, but the
      // toggle must NOT silently enable destructive OS-auto-response actions.
      expect(status.enforcement.mode).toBe('protection');
      expect(status.enforcement.osActionsArmed).toBe(false);
      expect(status.enforcement.posture).toBe('protected');
      // The persisted config carries no armed enforcementPolicy.
      const cfg = await (
        await fetch(`${liveUrl}/api/config`, {
          headers: { Authorization: `Bearer ${liveToken}` },
        })
      ).json();
      const ep = cfg.enforcementPolicy ?? {};
      expect(ep.killProcesses?.enabled ?? false).toBe(false);
      expect(ep.blockIPs?.enabled ?? false).toBe(false);
      expect(ep.isolateFiles?.enabled ?? false).toBe(false);
      expect(ep.disableAccounts?.enabled ?? false).toBe(false);
    });

    it('rejects a missing or non-boolean "armed" with 400 (no silent mode change)', async () => {
      const missing = await fetch(`${liveUrl}/api/enforce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${liveToken}` },
        body: JSON.stringify({}),
      });
      expect(missing.status).toBe(400);
      const bad = await enforce('yes');
      expect(bad.status).toBe(400);
      // Mode is untouched (still the launch-time 'protection').
      expect(await liveMode()).toBe('protection');
    });

    it('GET /api/enforce is 405 (POST-only control)', async () => {
      const res = await fetch(`${liveUrl}/api/enforce`, {
        headers: { Authorization: `Bearer ${liveToken}` },
      });
      expect(res.status).toBe(405);
    });
  });

  describe('enforcement posture — PROTECTED in protection mode; OS-response executability shown as armed/inert', () => {
    it('protection mode = protected (inline hook + MCP proxy block in real time, no root needed)', async () => {
      dashboard.updateStatus({ mode: 'protection', atrRuleCount: 100 });
      const d = await (await get('/api/status')).json();
      // The default `pga up` state: no OS-auto-response armed, but the inline
      // blockers ARE denying hard-deny threats — that is genuine protection.
      expect(d.enforcement.posture).toBe('protected');
      expect(d.enforcement.osActionsArmed).toBe(false);
    });

    it('zero rules loaded = degraded, never a green protected/monitoring claim', async () => {
      // Fake-green guard: a detection engine with 0 rules cannot detect anything,
      // so an active posture would overclaim. Must downgrade to 'degraded'.
      dashboard.updateStatus({ mode: 'protection', atrRuleCount: 0 });
      const d = await (await get('/api/status')).json();
      expect(d.enforcement.posture).toBe('degraded');
    });

    it('protection mode WITH a genuinely-executable armed response = protected', async () => {
      // kill-process runs unprivileged AND has a non-empty allow-list, so it can
      // actually fire — this is a real armed action, not a fake-green.
      dashboard.setConfigGetter(
        () =>
          ({
            ...baseConfig(dataDir),
            enforcementPolicy: {
              blockIPs: { enabled: false },
              killProcesses: { enabled: true, allowedProcessNames: ['evil-agent'] },
              isolateFiles: { enabled: false, allowedPaths: [] },
              disableAccounts: { enabled: false },
            },
          }) as unknown as GuardConfig
      );
      dashboard.updateStatus({ mode: 'protection', atrRuleCount: 100 });
      const d = await (await get('/api/status')).json();
      expect(d.enforcement.posture).toBe('protected');
      expect(d.enforcement.armedActions).toContain('kill processes');
    });

    it('FAKE-GREEN GUARD (1.8.13): block-IP enabled on a non-root daemon is inert, NOT protected', async () => {
      // block-IP needs root (pfctl); the test process is non-root, so arming it
      // must NOT lift the posture to protected — it lands in inertActions instead.
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
      const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
      // posture stays PROTECTED (inline blocking is on) — but block-IP is reported
      // INERT, never as an armed OS action, so the OS-response claim stays honest.
      expect(d.enforcement.posture).toBe('protected');
      if (!isRoot) {
        expect(d.enforcement.armedActions).not.toContain('block IPs');
        expect(d.enforcement.inertActions.join(' ')).toContain('block IPs');
      } else {
        expect(d.enforcement.armedActions).toContain('block IPs');
      }
    });

    it('kill-process / isolate-file with an EMPTY allow-list is inert, NOT protected', async () => {
      dashboard.setConfigGetter(
        () =>
          ({
            ...baseConfig(dataDir),
            enforcementPolicy: {
              blockIPs: { enabled: false },
              killProcesses: { enabled: true, allowedProcessNames: [] },
              isolateFiles: { enabled: true, allowedPaths: [] },
              disableAccounts: { enabled: false },
            },
          }) as unknown as GuardConfig
      );
      dashboard.updateStatus({ mode: 'protection', atrRuleCount: 100 });
      const d = await (await get('/api/status')).json();
      expect(d.enforcement.posture).toBe('protected'); // inline blocking on; the OS actions are merely inert
      expect(d.enforcement.armedActions).toEqual([]);
      expect(d.enforcement.inertActions.length).toBeGreaterThan(0);
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

    it('Overview has a one-click automatic-response control wired to /api/enforce (CSP-safe)', () => {
      expect(html).toContain('id="arm-card"');
      expect(html).toContain('id="arm-btn"');
      expect(html).toContain('updateArmControl');
      expect(html).toContain('toggleArm');
      expect(html).toContain('/api/enforce');
      expect(html).toContain('On by default');
      // Wired via addEventListener, never an inline handler (the whole-file
      // no-onclick assertion covers this too, but keep it local + explicit).
      expect(html).toContain("on('arm-btn', 'click', toggleArm)");
    });

    it('af() retries a transient 401 (cookie flap) before declaring the session unauthenticated', () => {
      // Regression for "every tab except Overview fails to load real data": a
      // proxying/embedded browser intermittently drops the HttpOnly SameSite
      // cookie, so a single /api call 401s while the session is valid. Overview
      // polled and recovered; one-shot tab loads (Rules/Skills/Coverage/Runtime/
      // Settings) failed to empty. af() now retries a 401 (safe — 401 is rejected
      // at the gate before the handler, so no side effect) and heals the UI when a
      // later call succeeds.
      expect(html).toMatch(/function af\(path, opts, _retriesLeft\)/);
      expect(html).toContain('_retriesLeft');
      expect(html).toContain('function hideUnauthenticated');
      // A success must clear a transient overlay so the dashboard self-heals.
      expect(html).toContain('if (r.ok && _unauthShown) hideUnauthenticated()');
    });

    it('the automatic-response control is HONEST: it does not claim to toggle tool-call blocking', () => {
      // Regression lock for the pre-release honesty finding: the button governs
      // the daemon's automatic OS-level responses, NOT tool-call blocking (which
      // the MCP proxy + built-in hook do ALWAYS). The copy must say so and must
      // NOT resurrect the old lie that disarming lets blocked actions through.
      // Tool-call blocking is independent of the arm switch...
      expect(html).toContain('whether this is armed or not');
      // ...and the arm switch governs ONLY the automatic OS-level responses.
      expect(html).toContain('automatic OS-level responses');
      // ...but be honest that built-in-tool coverage needs the agent restarted to
      // load the hook (do not resurrect a bare "always on" that hides that caveat).
      expect(html).toContain('restart the agent');
      // The scrapped arm-control overclaims must not come back (these strings
      // were unique to the old dishonest arm copy).
      expect(html).not.toContain('Guard now blocks detected threats');
      expect(html).not.toContain('actions Guard would otherwise stop');
    });

    it('uses the full 5-path brand mark (not the 1-path blob)', () => {
      const start = html.indexOf('class="sb-brand"');
      const sidebar = html.slice(start, html.indexOf('class="sb-nav"', start));
      const paths = (sidebar.match(/<path/g) || []).length;
      expect(paths).toBe(5);
    });
  });
});
