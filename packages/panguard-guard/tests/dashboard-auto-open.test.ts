/**
 * shouldAutoOpenDashboard — daemon browser auto-open policy
 *
 * Round-2 GA bug: the daemon auto-opened the dashboard browser tab on EVERY
 * start, so the launchd/systemd persistence service popped a tab on every
 * login, reboot, and KeepAlive restart. A background service must never spawn
 * a browser tab. The policy is pure + exported so it is tested without ever
 * launching a real browser or daemon.
 */

import { describe, it, expect, vi } from 'vitest';

// The module under test calls createLogger() at top level — stub it so the
// import has no side effects (no real logger / transport wiring).
vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  };
});

import { shouldAutoOpenDashboard } from '../src/guard-engine.js';

describe('shouldAutoOpenDashboard — only on interactive foreground start', () => {
  it('opens when started in a foreground terminal (stdout is a TTY)', () => {
    expect(shouldAutoOpenDashboard({}, true)).toBe(true);
  });

  it('does NOT open when started by a service (stdout redirected to a log/journal — no TTY)', () => {
    // launchd StandardOutPath, systemd journal, Windows service: stdout is not a TTY.
    expect(shouldAutoOpenDashboard({}, false)).toBe(false);
  });

  it('does NOT open when pga up spawned the ephemeral daemon (PANGUARD_QUIET_GUARD set)', () => {
    // pga up opens the dashboard itself; the daemon must not double-open.
    expect(shouldAutoOpenDashboard({ PANGUARD_QUIET_GUARD: '1' }, true)).toBe(false);
  });

  it('honours the explicit PANGUARD_NO_AUTO_OPEN opt-out even with a TTY', () => {
    expect(shouldAutoOpenDashboard({ PANGUARD_NO_AUTO_OPEN: '1' }, true)).toBe(false);
  });

  it('opt-out / quiet flags win regardless of TTY state', () => {
    expect(shouldAutoOpenDashboard({ PANGUARD_NO_AUTO_OPEN: '1' }, false)).toBe(false);
    expect(shouldAutoOpenDashboard({ PANGUARD_QUIET_GUARD: '1' }, false)).toBe(false);
  });
});
