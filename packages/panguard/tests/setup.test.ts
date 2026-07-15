/**
 * Regression test for `pga setup` daemon-up honesty (Fix 7).
 *
 * Pins the fix: after installService() installs the guard as a system
 * service, `pga setup` used to report `guard.running: true` immediately —
 * blind, without checking whether the daemon actually came up. Now it polls
 * the guard PID file (~/.panguard-guard/panguard-guard.pid) via
 * `process.kill(pid, 0)` for up to ~12s and reports the REAL state.
 *
 * These tests drive the smallest hermetic seam: `pga setup --json --skip-scan`
 * (empty platform list, skill scan skipped) so only the guard-install /
 * daemon-poll path runs, and assert `jsonOutput.guard.running` reflects the
 * mocked PID-file state rather than being blindly `true`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupCommand } from '../src/cli/commands/setup.js';

// Controllable fs stand-ins. node:fs is mocked below by spreading the real
// module and overriding these + the write paths (no real disk I/O).
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...(args as [string])),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...(args as [string, string])),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    chmodSync: vi.fn(),
  };
});

// setup.ts's openBrowser()/spawn fallback must never spawn a real process —
// neither is expected to fire on the success path exercised here, but stub
// both so an unexpected code path can't touch the real OS.
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    execFile: vi.fn(),
    spawn: vi.fn(() => ({ unref: vi.fn(), pid: -1 })),
  };
});

vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@panguard-ai/core')>();
  return {
    ...actual,
    c: {
      sage: (s: string) => s,
      bold: (s: string) => s,
      dim: (s: string) => s,
      green: (s: string) => s,
      yellow: (s: string) => s,
      red: (s: string) => s,
      safe: (s: string) => s,
      caution: (s: string) => s,
      critical: (s: string) => s,
    },
    symbols: {
      info: '[i]',
      pass: '[ok]',
      fail: '[x]',
      warn: '[!]',
      dot: '.',
      scan: '[scan]',
    },
    divider: (label?: string) => (label ? `--- ${label} ---` : '---'),
    header: (text: string) => `=== ${text} ===`,
    banner: vi.fn(),
    promptConfirm: vi.fn().mockResolvedValue(true),
    setLogLevel: vi.fn(),
  };
});

// No platforms detected → step 3 (inject/remove) is a no-op; keeps the test
// focused on the guard-install / daemon-poll path.
vi.mock('@panguard-ai/panguard-mcp/config', () => ({
  detectPlatforms: vi.fn().mockResolvedValue([]),
  injectMCPConfig: vi.fn(),
  removeMCPConfig: vi.fn(),
  discoverAllSkills: vi.fn().mockResolvedValue([]),
  removeServer: vi.fn().mockReturnValue(true),
}));

// installService "succeeds" (service installed) — the fix under test is
// whether `running` is then verified via the PID poll, not blindly true.
vi.mock('@panguard-ai/panguard-guard', () => ({
  installService: vi.fn().mockResolvedValue('/fake/service/path'),
  loadConfig: vi.fn().mockReturnValue({}),
  saveConfig: vi.fn(),
}));

// Threat Cloud opt-in / telemetry consent are out of scope for this fix —
// stub them out so step 6 is a no-op.
vi.mock('../src/cli/consent.js', () => ({
  markConsentAsked: vi.fn(),
  ensureTelemetryConsent: vi.fn().mockResolvedValue(false),
  hasConsentBeenAsked: vi.fn().mockReturnValue(true),
}));

/** Pull the JSON payload out of console.log calls (setup.ts prints a couple
 * of unconditional blank lines before the final JSON.stringify call). */
function extractJsonOutput(spy: ReturnType<typeof vi.spyOn>): {
  guard?: { installed?: boolean; running?: boolean };
} {
  const jsonCall = spy.mock.calls
    .map((c) => c[0])
    .find((v): v is string => typeof v === 'string' && v.trimStart().startsWith('{'));
  expect(jsonCall).toBeDefined();
  return JSON.parse(jsonCall as string) as { guard?: { installed?: boolean; running?: boolean } };
}

describe('setupCommand — guard daemon-up regression (Fix 7)', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Any existsSync() call (guard binary resolution, config lookups, etc.)
    // resolves truthy by default so the guard-install path is reached; the
    // regression itself is pinned via readFileSync (the PID file content).
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.exitCode = 0;
    vi.useRealTimers();
  });

  it('reports guard.running: true only when the PID file holds a live PID', async () => {
    // Simulate a live daemon: the PID file contains THIS test process's own
    // pid, so `process.kill(pid, 0)` (a real, harmless existence check)
    // succeeds on the very first poll — no fake timers needed.
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.endsWith('panguard-guard.pid')) return String(process.pid);
      return '';
    });

    const cmd = setupCommand();
    await cmd.parseAsync(['--json', '--skip-scan'], { from: 'user' });

    const { guard } = extractJsonOutput(consoleSpy);
    expect(guard?.installed).toBe(true);
    expect(guard?.running).toBe(true);
  });

  it('the regression: reports guard.running: false (not blindly true) when the PID file never appears', async () => {
    vi.useFakeTimers();
    // Simulate the PID file never being written (daemon never came up).
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.endsWith('panguard-guard.pid')) {
        const err = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      }
      return '';
    });

    const cmd = setupCommand();
    const run = cmd.parseAsync(['--json', '--skip-scan'], { from: 'user' });
    // Flush the ~12s (120 x 100ms) poll loop.
    await vi.advanceTimersByTimeAsync(13000);
    await run;

    const { guard } = extractJsonOutput(consoleSpy);
    expect(guard?.installed).toBe(true);
    expect(guard?.running).toBe(false);
  });

  it('sibling: reports guard.running: false when the PID file holds a dead/invalid PID (process.kill fails)', async () => {
    vi.useFakeTimers();
    // File exists and has content, but it is not a live process — pins that
    // the poll actually checks liveness via process.kill, not just presence.
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.endsWith('panguard-guard.pid')) return 'not-a-pid';
      return '';
    });

    const cmd = setupCommand();
    const run = cmd.parseAsync(['--json', '--skip-scan'], { from: 'user' });
    await vi.advanceTimersByTimeAsync(13000);
    await run;

    const { guard } = extractJsonOutput(consoleSpy);
    expect(guard?.running).toBe(false);
    expect(mockReadFileSync).toHaveBeenCalled();
  });
});
