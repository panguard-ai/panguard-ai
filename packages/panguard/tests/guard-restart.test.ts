/**
 * Tests for `panguard guard restart` — service-aware restart (Fix 3)
 *
 * Pins the fix: a reboot-surviving launchd service has KeepAlive=true, so a
 * plain stop+start races the respawn (launchd relaunches the daemon between
 * the two steps) and `start` misreports "already running". `restart` must
 * detect an installed service and go through launchctl kickstart
 * (isPersistentServiceInstalled + restartPersistentService from
 * ./persist.js) instead, printing '[OK] Guard service restarted' and
 * returning — only falling back to stop+start for an ephemeral daemon.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the guard engine CLI so a fallback stop+start never spawns a real
// daemon or touches the network.
vi.mock('@panguard-ai/panguard-guard', () => ({
  runCLI: vi.fn().mockResolvedValue(undefined),
}));

// Mock persist.js — the module `guard restart` dynamically imports for the
// service-aware path. Names must start with "mock" so vitest's hoisting
// allows referencing them inside the factory (same convention as
// guard-config.test.ts).
const mockIsPersistentServiceInstalled = vi.fn();
const mockRestartPersistentService = vi.fn();

vi.mock('../src/cli/commands/persist.js', () => ({
  isPersistentServiceInstalled: (...args: unknown[]) => mockIsPersistentServiceInstalled(...args),
  restartPersistentService: (...args: unknown[]) => mockRestartPersistentService(...args),
  ensurePersistentService: vi.fn(() => 'installed'),
}));

// Mock @panguard-ai/core rendering helpers so console output is deterministic
// (no color-detection / TTY dependence) — copied from status.test.ts's block,
// plus `header`/`divider` which guard.ts also imports. `box` is left as the
// real implementation via importOriginal (unused by the restart path).
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
      pass: '[OK]',
      fail: '[x]',
      warn: '[!]',
      scan: '[scan]',
    },
    divider: (label: string) => `--- ${label} ---`,
    header: (text: string) => `=== ${text} ===`,
  };
});

import { guardCommand } from '../src/cli/commands/guard.js';
import { runCLI } from '@panguard-ai/panguard-guard';

const mockedRunCLI = vi.mocked(runCLI);

describe('guard restart — service-aware (Fix 3)', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.exitCode = 0;
  });

  it('restarts via launchctl kickstart when the KeepAlive service is installed, and never falls back to stop+start', async () => {
    mockIsPersistentServiceInstalled.mockReturnValue(true);
    mockRestartPersistentService.mockReturnValue(true);

    const cmd = guardCommand();
    await cmd.parseAsync(['restart'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(output).toContain('[OK] Guard service restarted');
    expect(mockRestartPersistentService).toHaveBeenCalled();
    expect(mockedRunCLI).not.toHaveBeenCalledWith(['stop']);
    expect(mockedRunCLI).not.toHaveBeenCalledWith(['start']);
  });

  it('falls through to plain stop+start when no service is installed (ephemeral daemon)', async () => {
    mockIsPersistentServiceInstalled.mockReturnValue(false);

    const cmd = guardCommand();
    await cmd.parseAsync(['restart'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(output).not.toContain('Guard service restarted');
    expect(mockRestartPersistentService).not.toHaveBeenCalled();
    expect(mockedRunCLI).toHaveBeenCalledWith(['stop']);
    expect(mockedRunCLI).toHaveBeenCalledWith(['start']);
  });

  it('falls through to stop+start when the service is installed but the kickstart itself fails (no false "restarted" claim)', async () => {
    mockIsPersistentServiceInstalled.mockReturnValue(true);
    mockRestartPersistentService.mockReturnValue(false);

    const cmd = guardCommand();
    await cmd.parseAsync(['restart'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((call) => call[0]).join('\n');
    expect(output).not.toContain('Guard service restarted');
    expect(mockedRunCLI).toHaveBeenCalledWith(['stop']);
    expect(mockedRunCLI).toHaveBeenCalledWith(['start']);
  });
});
