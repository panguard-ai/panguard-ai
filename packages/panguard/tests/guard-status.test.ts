/**
 * Regression test for `pga guard status --detailed`.
 *
 * Pins Fix 5: the detailed status panel must never FAKE "connected".
 * Before the fix, the AI-layer line echoed the *configured* provider as
 * "connected" with no probe at all, and the Cloud line said "connected" off
 * nothing but the guard process being up (Threat Cloud upload is opt-in and
 * default OFF). Now:
 *   - AI shows "active" only when the engine is running AND a usable
 *     credential exists (llm.enc present, or ANTHROPIC_API_KEY /
 *     OPENAI_API_KEY set) — otherwise "configured (engine stopped)" /
 *     "configured (inactive ...)" / "not configured".
 *   - Cloud shows "enabled" only when threatCloudUploadEnabled === true,
 *     else "disabled" — never a bare "connected".
 *
 * showDetailedStatus() (packages/panguard/src/cli/commands/guard.ts) renders
 * via process.stdout.write(...), NOT console.log — so this file spies on
 * process.stdout.write rather than console.log.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// node:os — fixed home dir so every path the command touches is deterministic
// and never resolves into the real ~/.panguard-guard on the host machine.
// `platform` is statically imported by guard.ts (used by the unrelated
// `guard install` branch) so it must still resolve to something.
// ---------------------------------------------------------------------------
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: () => '/tmp/pg-guard-status-test-home',
    platform: () => 'darwin',
  };
});

// ---------------------------------------------------------------------------
// node:fs — existsSync/readFileSync are driven per-test via these mocks so
// the command never touches the real filesystem.
// ---------------------------------------------------------------------------
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  };
});

// ---------------------------------------------------------------------------
// node:child_process — never spawn a real `ps`. showDetailedStatus() wraps
// the uptime probe in try/catch, so a throw here just leaves uptime
// "unknown" — deterministic and hermetic.
// ---------------------------------------------------------------------------
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFileSync: vi.fn(() => {
      throw new Error('ps not available in test');
    }),
  };
});

// ---------------------------------------------------------------------------
// node:http — hard backstop against any real network call from the
// dashboard-reachability probe (neither scenario below actually reaches it,
// since dashboard is off/engine-stopped in both, but this keeps the test
// hermetic even if that logic changes).
// ---------------------------------------------------------------------------
vi.mock('node:http', () => ({
  request: vi.fn(() => ({
    on: vi.fn(),
    end: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// @panguard-ai/panguard-guard — guard.ts statically imports all four; stub
// them so the module loads with no real crypto/fs side effects.
// ---------------------------------------------------------------------------
vi.mock('@panguard-ai/panguard-guard', () => ({
  runCLI: vi.fn().mockResolvedValue(undefined),
  writeEncryptedLlmConfig: vi.fn(),
  clearEncryptedLlmConfig: vi.fn(),
  getEncryptedLlmConfigPath: vi.fn(),
}));

// ensurePersistentService is only used by the unrelated `guard install`
// branch, but it's a static import so it must resolve.
vi.mock('../src/cli/commands/persist.js', () => ({
  ensurePersistentService: vi.fn(() => 'installed'),
}));

// readSecret is only used by the unrelated `guard setup-ai` flow.
vi.mock('../src/cli/secret-input.js', () => ({
  readSecret: vi.fn().mockResolvedValue(''),
}));

// ---------------------------------------------------------------------------
// @panguard-ai/core — copied from status.test.ts's rendering-helper mock,
// plus `box` (which showDetailedStatus uses to draw the panel and
// status.test.ts does not need). All wrappers are identity so assertions can
// match on plain substrings.
// ---------------------------------------------------------------------------
vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@panguard-ai/core')>();
  return {
    ...actual,
    c: {
      sage: (s: string) => s,
      bold: (s: string) => s,
      dim: (s: string) => s,
      safe: (s: string) => s,
      caution: (s: string) => s,
      critical: (s: string) => s,
    },
    symbols: {
      info: '[i]',
      pass: '[ok]',
      fail: '[x]',
      warn: '[!]',
      scan: '[scan]',
    },
    divider: (label?: string) => `--- ${label ?? ''} ---`,
    box: (content: string) => content,
    header: (text: string) => `=== ${text} ===`,
  };
});

import { guardCommand } from '../src/cli/commands/guard.js';

describe('guard status --detailed (Fix 5: no fake "connected")', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  function renderedOutput(): string {
    return stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
  }

  it('engine STOPPED + no key/opt-in: never says "connected", reflects honest not-configured/disabled/stopped state', async () => {
    // No pid file, no config.json, no log, no llm.enc — everything is absent.
    mockExistsSync.mockReturnValue(false);

    const cmd = guardCommand();
    await cmd.parseAsync(['status', '--detailed'], { from: 'user' });

    const output = renderedOutput();

    // The core regression: the word "connected" must never appear.
    expect(output).not.toContain('connected');

    // Honest states instead.
    expect(output).toContain('not configured'); // AI layer, unconfigured
    expect(output).toContain('disabled'); // Cloud, opt-in default off
    expect(output).toContain('stopped'); // Process line
  });

  it('engine RUNNING + keyed (llm.enc present) + threatCloudUploadEnabled: AI shows "active", Cloud shows "enabled", still never "connected"', async () => {
    mockExistsSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('panguard-guard.pid')) return true;
      if (p.endsWith('config.json')) return true;
      if (p.endsWith('llm.enc')) return true;
      return false; // log file etc.
    });
    mockReadFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('panguard-guard.pid')) return '54321';
      if (p.endsWith('config.json')) {
        return JSON.stringify({
          ai: { provider: 'claude', model: 'sonnet-4' },
          threatCloudUploadEnabled: true,
          // Keep dashboard off so this test never depends on the network probe.
          dashboardEnabled: false,
          mode: 'protection',
        });
      }
      return '';
    });
    // process.kill(pid, 0) not throwing == the process is running.
    vi.spyOn(process, 'kill').mockImplementation(() => true);

    const cmd = guardCommand();
    await cmd.parseAsync(['status', '--detailed'], { from: 'user' });

    const output = renderedOutput();

    expect(output).not.toContain('connected');
    expect(output).toContain('active'); // AI layer, keyed + running
    expect(output).toContain('enabled'); // Cloud, opted in
    expect(output).toContain('running'); // Process line
  });
});
