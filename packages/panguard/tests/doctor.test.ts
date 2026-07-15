/**
 * Regression test for `pga doctor` exit-code honesty.
 *
 * Pins the fix: `--json` and `--fix` (and the default render path) must set
 * process.exitCode = 1 when ANY check reports status 'fail'. Before the fix,
 * both the `--json` and `--fix` branches `return`ed BEFORE the exit-code
 * assignment, so a broken system (daemon down / 0 rules / config tampered)
 * always exited 0 — a green exit code that lied.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doctorCommand } from '../src/cli/commands/doctor.js';

// Mock fs so existsSync is false for everything (no guard config, no PID
// file). This drives checkConfiguration() AND checkGuardEngine() to 'fail'.
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue(''),
  };
});

// checkAiProvider / checkAiLayerLocal probe `ollama` via execFileSync — make
// that hermetic (no real process spawn) and force "not installed".
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    execFileSync: () => {
      throw new Error('not installed');
    },
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
      caution: (s: string) => s,
      critical: (s: string) => s,
    },
    symbols: {
      info: '[i]',
      pass: '[ok]',
      fail: '[x]',
      warn: '[!]',
    },
    header: (text: string) => `=== ${text} ===`,
    box: (content: string) => content,
  };
});

vi.mock('@panguard-ai/panguard-guard', () => ({
  verifyConfigIntegrity: () => ({ status: 'unsealed', findings: [] }),
  checkSelfState: () => ({ ok: true, findings: [] }),
}));

vi.mock('../src/cli/daemon-status.js', () => ({
  fetchDaemonStatus: async () => null,
}));

vi.mock('../src/cli/commands/hook.js', () => ({
  readHookProtectionStatus: () => null,
  isBuiltinHookInstalled: () => false,
}));

describe('doctorCommand — exit-code honesty regression', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset before each test so a leaked exit code from a prior suite/test
    // never leaks into this file's assertions.
    process.exitCode = 0;
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    // Reset again so this file never leaks a non-zero exit code into the
    // rest of the test run (the whole point of the bug being pinned).
    process.exitCode = 0;
  });

  it('--json sets process.exitCode = 1 when a check fails (the regression)', async () => {
    const cmd = doctorCommand();
    await cmd.parseAsync(['--json'], { from: 'user' });
    expect(process.exitCode).toBe(1);
  });

  it('--fix sets process.exitCode = 1 when a check fails (the regression)', async () => {
    const cmd = doctorCommand();
    await cmd.parseAsync(['--fix'], { from: 'user' });
    expect(process.exitCode).toBe(1);
  });

  it('default (no flag) output also sets process.exitCode = 1 when a check fails', async () => {
    const cmd = doctorCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(process.exitCode).toBe(1);
  });

  it('--json prints a valid JSON array of {status, label} check objects', async () => {
    const cmd = doctorCommand();
    await cmd.parseAsync(['--json'], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalled();
    const jsonOutput = consoleSpy.mock.calls[0]![0] as string;
    const parsed: unknown = JSON.parse(jsonOutput);

    expect(Array.isArray(parsed)).toBe(true);
    const results = parsed as Array<Record<string, unknown>>;
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(typeof result['status']).toBe('string');
      expect(typeof result['label']).toBe('string');
    }
  });

  it('--json reports fail for the missing config and dead guard daemon checks', async () => {
    const cmd = doctorCommand();
    await cmd.parseAsync(['--json'], { from: 'user' });

    const jsonOutput = consoleSpy.mock.calls[0]![0] as string;
    const results = JSON.parse(jsonOutput) as Array<{ status: string; label: string }>;

    const configCheck = results.find((r) => r.label === 'Configuration valid');
    const guardCheck = results.find((r) => r.label === 'Guard engine');
    expect(configCheck?.status).toBe('fail');
    expect(guardCheck?.status).toBe('fail');
  });
});
