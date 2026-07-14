/**
 * Dashboard launch-token persistence tests (CLUSTER B / BUG 1).
 *
 * The dashboard's per-launch auth token lives only in DashboardServer memory and
 * mints the auth cookie ONLY for a request carrying it as `/?token=<token>`. So a
 * bare http://127.0.0.1:PORT 401s on a rerun / already-running daemon / headless
 * host. The fix: the daemon persists that token to ~/.panguard-guard/dashboard-token
 * (0o600) when the dashboard starts, so a separate `pga up` invocation can build the
 * authenticated URL — and removes it on stop so the secret never outlives the daemon.
 *
 * These tests pin a temp HOME (via a node:os mock) so we never touch the real
 * ~/.panguard-guard, then assert: persist-on-start, the persisted value equals the
 * live token, owner-only mode (0o600), and removal on stop() and via the exported
 * removeDashboardToken().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';

// Pin HOME to a per-run temp dir so the module-level token path resolves there.
// Must be set BEFORE importing the dashboard module (the path is computed at
// module load via join(homedir(), ...)).
const TEST_HOME = mkdtempSync(join(tmpdir(), 'pg-dash-token-'));
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, homedir: () => TEST_HOME };
});

const { DashboardServer, removeDashboardToken } = await import('../src/dashboard/index.js');

const TOKEN_PATH = join(TEST_HOME, '.panguard-guard', 'dashboard-token');

/** Ask the kernel for a free TCP port on 127.0.0.1. */
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

describe('Dashboard launch-token persistence', () => {
  let dashboard: InstanceType<typeof DashboardServer> | null = null;

  beforeEach(() => {
    // Start each test with no token file on disk.
    if (existsSync(TOKEN_PATH)) rmSync(TOKEN_PATH, { force: true });
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.stop();
      dashboard = null;
    }
    if (existsSync(TOKEN_PATH)) rmSync(TOKEN_PATH, { force: true });
  });

  it('persists the launch token to ~/.panguard-guard/dashboard-token on start', async () => {
    const port = await pickFreePort();
    dashboard = new DashboardServer(port);
    await dashboard.start();

    expect(existsSync(TOKEN_PATH)).toBe(true);
    const persisted = readFileSync(TOKEN_PATH, 'utf-8').trim();
    // The persisted value must equal the live token so the minted /?token= URL
    // actually authenticates (this is the whole point — no dead bare URL).
    expect(persisted).toBe(dashboard.getAuthToken());
    expect(persisted.length).toBeGreaterThan(0);
  });

  it('writes the token file owner-only (0o600) — treated like the auth cookie', async () => {
    const port = await pickFreePort();
    dashboard = new DashboardServer(port);
    await dashboard.start();

    expect(existsSync(TOKEN_PATH)).toBe(true);
    // Mask to the permission bits; 0o600 = owner rw, no group/other access.
    const mode = statSync(TOKEN_PATH).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('removes the token file on stop() so the secret never outlives the daemon', async () => {
    const port = await pickFreePort();
    dashboard = new DashboardServer(port);
    await dashboard.start();
    expect(existsSync(TOKEN_PATH)).toBe(true);

    await dashboard.stop();
    dashboard = null;
    expect(existsSync(TOKEN_PATH)).toBe(false);
  });

  it('removeDashboardToken() deletes an orphaned token (e.g. after a hard kill)', () => {
    // Simulate a token left behind by a daemon that died without a graceful stop.
    writeFileSync(TOKEN_PATH, 'deadbeef'.repeat(8), { mode: 0o600 });
    expect(existsSync(TOKEN_PATH)).toBe(true);

    removeDashboardToken();
    expect(existsSync(TOKEN_PATH)).toBe(false);
  });

  it('removeDashboardToken() is a no-op (no throw) when the token is already gone', () => {
    expect(existsSync(TOKEN_PATH)).toBe(false);
    expect(() => removeDashboardToken()).not.toThrow();
  });

  // ── Self-heal (GA hardening) ────────────────────────────────────────────
  // A live dashboard whose token file vanishes (stray cleanup, a stop that raced
  // a KeepAlive respawn, a leftover pre-upgrade daemon) would 401 every visit with
  // no recovery short of a restart. ensureTokenPersisted() lets the running daemon
  // rewrite the token on its periodic status tick so it self-heals.

  it('ensureTokenPersisted() rewrites the token if it vanished while listening', async () => {
    const port = await pickFreePort();
    dashboard = new DashboardServer(port);
    await dashboard.start();
    const live = dashboard.getAuthToken();
    expect(readFileSync(TOKEN_PATH, 'utf-8')).toBe(live);

    // Simulate a stray cleanup removing the file under a running daemon.
    rmSync(TOKEN_PATH, { force: true });
    expect(existsSync(TOKEN_PATH)).toBe(false);

    dashboard.ensureTokenPersisted();
    expect(existsSync(TOKEN_PATH)).toBe(true);
    expect(readFileSync(TOKEN_PATH, 'utf-8')).toBe(live);
    // Healed file must keep the owner-only mode.
    expect(statSync(TOKEN_PATH).mode & 0o777).toBe(0o600);
  });

  it('ensureTokenPersisted() rewrites a mismatched token (another daemon left one behind)', async () => {
    const port = await pickFreePort();
    dashboard = new DashboardServer(port);
    await dashboard.start();
    const live = dashboard.getAuthToken();

    // A different daemon's token is on disk — a visitor using it would 401.
    writeFileSync(TOKEN_PATH, 'not-our-token-value', { mode: 0o600 });
    dashboard.ensureTokenPersisted();
    expect(readFileSync(TOKEN_PATH, 'utf-8')).toBe(live);
  });

  it('ensureTokenPersisted() is a no-op when the dashboard is not listening', () => {
    // A never-started dashboard must not create a token file — nothing is serving,
    // so a token on disk would point `pga up` at a dead port.
    const port = 3199;
    dashboard = new DashboardServer(port);
    // Intentionally do NOT start().
    dashboard.ensureTokenPersisted();
    expect(existsSync(TOKEN_PATH)).toBe(false);
    dashboard = null; // nothing to stop
  });
});
