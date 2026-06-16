/**
 * Dashboard 1.7 — consumer onboarding UX (Cluster B).
 *
 * A non-technical user must be able to ACT on three things:
 *  1) Collective defense (Threat Cloud) — turn it ON from the dashboard. The
 *     toggle posts {consentGiven} which flips BOTH threatCloudUploadEnabled and
 *     telemetryEnabled together and records the consent marker (so the CLI
 *     first-run prompt does not re-ask and clobber the choice). Opt-in, OFF by
 *     default.
 *  2) Layer 3 (semantic) cost transparency — the guidance states it runs only on
 *     flagged events for a few cents/month, free + private with local Ollama.
 *  3) Alert channels — the dashboard default is zero-config ("alerts show here"),
 *     with the real channels (email/slack/telegram/line/webhook) behind an
 *     optional disclosure, each with a copy-paste config snippet.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
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
    mode: 'report-only',
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

describe('Dashboard 1.7 — consumer onboarding UX (Cluster B)', () => {
  let dashboard: DashboardServer;
  let port: number;
  let baseUrl: string;
  let token: string;
  let dataDir: string;
  let fakeHome: string;
  let savedHome: string | undefined;
  let savedProfile: string | undefined;

  beforeEach(async () => {
    // Redirect homedir() (used for the consent marker + config path) to a temp
    // dir so the test never reads or writes the real ~/.panguard-guard.
    fakeHome = mkdtempSync(join(tmpdir(), 'pg-home-'));
    savedHome = process.env['HOME'];
    savedProfile = process.env['USERPROFILE'];
    process.env['HOME'] = fakeHome;
    process.env['USERPROFILE'] = fakeHome;
    // Guard: only proceed when homedir() actually honours the override on this
    // platform — otherwise we'd be poking the real home directory.
    expect(homedir()).toBe(fakeHome);

    dataDir = join(fakeHome, '.panguard-guard');
    port = await pickFreePort();
    dashboard = new DashboardServer(port);
    dashboard.setConfigGetter(() => baseConfig(dataDir));
    await dashboard.start();
    baseUrl = `http://127.0.0.1:${port}`;
    token = dashboard.getAuthToken();
  });

  afterEach(async () => {
    await dashboard.stop();
    if (savedHome === undefined) delete process.env['HOME'];
    else process.env['HOME'] = savedHome;
    if (savedProfile === undefined) delete process.env['USERPROFILE'];
    else process.env['USERPROFILE'] = savedProfile;
    rmSync(fakeHome, { recursive: true, force: true });
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

  describe('collective defense — consentGiven flips both flags + marks consent', () => {
    const consentMarker = () => join(fakeHome, '.panguard-guard', '.telemetry-prompted');

    it('opt-in: consentGiven=true enables BOTH upload + telemetry and writes the marker', async () => {
      expect(existsSync(consentMarker())).toBe(false);
      const res = await post('/api/threat-cloud', { consentGiven: true });
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);

      const cfg = JSON.parse(readFileSync(join(dataDir, 'config.json'), 'utf-8')) as {
        threatCloudUploadEnabled?: boolean;
        telemetryEnabled?: boolean;
      };
      expect(cfg.threatCloudUploadEnabled).toBe(true);
      expect(cfg.telemetryEnabled).toBe(true);
      expect(existsSync(consentMarker())).toBe(true);
    });

    it('opt-out: consentGiven=false disables BOTH flags and still records the answer', async () => {
      const res = await post('/api/threat-cloud', { consentGiven: false });
      expect(res.status).toBe(200);
      const cfg = JSON.parse(readFileSync(join(dataDir, 'config.json'), 'utf-8')) as {
        threatCloudUploadEnabled?: boolean;
        telemetryEnabled?: boolean;
      };
      expect(cfg.threatCloudUploadEnabled).toBe(false);
      expect(cfg.telemetryEnabled).toBe(false);
      expect(existsSync(consentMarker())).toBe(true);
    });

    it('rejects a non-boolean consentGiven with 400', async () => {
      expect((await post('/api/threat-cloud', { consentGiven: 'yes' })).status).toBe(400);
    });

    it('GET /api/threat-cloud reports default OFF (opt-in) and consentAsked=false before any answer', async () => {
      const d = await (await get('/api/threat-cloud')).json();
      expect(d.uploadEnabled).toBe(false);
      expect(d.consentAsked).toBe(false);
    });

    it('GET /api/threat-cloud reflects consentAsked=true after a dashboard answer', async () => {
      await post('/api/threat-cloud', { consentGiven: false });
      const d = await (await get('/api/threat-cloud')).json();
      expect(d.consentAsked).toBe(true);
    });

    it('a mode-only save does NOT touch the upload flag or the consent marker', async () => {
      // Saving the Guard mode must not silently flip sharing or claim consent.
      const res = await post('/api/threat-cloud', { mode: 'protection' });
      expect(res.status).toBe(200);
      const cfg = JSON.parse(readFileSync(join(dataDir, 'config.json'), 'utf-8')) as {
        threatCloudUploadEnabled?: boolean;
        mode?: string;
      };
      expect(cfg.mode).toBe('protection');
      // unchanged from baseConfig (undefined → stays off)
      expect(cfg.threatCloudUploadEnabled).toBeUndefined();
      expect(existsSync(consentMarker())).toBe(false);
    });
  });

  describe('status .layers.c — honest cost transparency', () => {
    it('Layer C off-state guidance states flagged-only + a few cents/month + free local Ollama', async () => {
      const d = await (await get('/api/status')).json();
      const detail = String(d.layers.c.detail).toLowerCase();
      expect(d.layers.c.state).toBe('off');
      expect(detail).toContain('flagged events');
      expect(detail).toContain('cents');
      expect(detail).toContain('ollama');
      expect(detail).toContain('free');
    });
  });

  describe('dashboard HTML — consumer can act (CSP-safe, real channels only)', () => {
    let html = '';
    beforeEach(async () => {
      html = await (await fetch(`${baseUrl}/`)).text();
    });

    it('frames collective defense with value + privacy + a real toggle (default OFF)', () => {
      expect(html).toContain('Collective defense');
      expect(html).toContain('id="tc-toggle"');
      // value + privacy disclosure
      expect(html).toContain('new ATR rule');
      expect(html).toContain('Never shared');
      // the toggle posts the single consent answer, not the legacy uploadEnabled
      expect(html).toContain('consentGiven');
      // CLI fallback with the REAL command
      expect(html).toContain('pga config set telemetry true');
    });

    it('alert channels default is zero-config + an OPTIONAL disclosure', () => {
      expect(html).toContain('already set up');
      expect(html).toContain('shows up right here');
      expect(html).toContain('id="notify-details"');
      expect(html).toContain('(optional)');
    });

    it('exposes ONLY the channels the notifications config actually supports', () => {
      // Present (real NotificationConfig keys)
      for (const real of ['slack', 'telegram', 'email', 'line', 'webhook']) {
        expect(html).toContain("key: '" + real + "'");
      }
      // Each real channel ships a copy-paste config snippet with its real shape
      expect(html).toContain('"webhookUrl"');
      expect(html).toContain('"botToken"');
      expect(html).toContain('"accessToken"');
      // Secrets are placeholders only — never a real-looking persisted value
      expect(html).toContain('YOUR_BOT_TOKEN');
      // No invented channel that the backend cannot dispatch
      for (const fake of ['discord', 'pagerduty', 'sms', 'desktop']) {
        expect(html).not.toContain("key: '" + fake + "'");
      }
    });

    it('every command box has a CSP-safe copy button (no inline onclick)', () => {
      expect(html).toContain('data-copy-target');
      expect(html).toContain('function copyText');
      expect(html).not.toMatch(/onclick=/);
    });
  });
});
