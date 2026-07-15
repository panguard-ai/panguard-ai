/**
 * Tests for `panguard upgrade` command
 * Pins Fix 6: upgrade must target the top-level `panguard` wrapper (not the
 * `@panguard-ai/panguard` dependency), fail loudly on install error, and
 * verify the ACTUAL resulting version instead of blindly claiming success.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecSync = vi.fn();

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    execSync: (...args: unknown[]) => mockExecSync(...args),
  };
});

// Mock PANGUARD_VERSION so we can deterministically force the "same" vs
// "different" version branches without depending on the real package.json.
vi.mock('../src/index.js', () => ({
  PANGUARD_VERSION: '9.9.9',
}));

import { upgradeCommand } from '../src/cli/commands/upgrade.js';

describe('upgradeCommand', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = 0;
  });

  it('installs the top-level "panguard" wrapper, not the @panguard-ai/panguard dependency', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('--version')) return '9.9.9';
      return undefined;
    });

    const cmd = upgradeCommand();
    await cmd.parseAsync([], { from: 'user' });

    const installCall = mockExecSync.mock.calls.find(
      (c) => typeof c[0] === 'string' && !c[0].includes('--version')
    );
    expect(installCall).toBeDefined();
    const installCmd = installCall![0] as string;
    expect(installCmd).toContain('panguard@latest');
    expect(installCmd).not.toContain('@panguard-ai/panguard');
    expect(installCall![1]).toEqual(expect.objectContaining({ stdio: 'inherit' }));
  });

  it('sets process.exitCode = 1 and prints the manual install command when install fails', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (!cmd.includes('--version')) {
        throw new Error('npm install failed');
      }
      return '9.9.9';
    });

    const cmd = upgradeCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(process.exitCode).toBe(1);
    const errOutput = consoleErrorSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(errOutput).toContain('npm install -g panguard@latest');
  });

  it('reports "Already on the latest" when the version probe matches PANGUARD_VERSION', async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: unknown) => {
      if (cmd.includes('--version')) return '9.9.9';
      expect(opts).toEqual(expect.objectContaining({ stdio: 'inherit' }));
      return undefined;
    });

    const cmd = upgradeCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Already on the latest');
    expect(process.exitCode).not.toBe(1);
  });

  it('reports the new version (via a separate --version probe) when it differs from PANGUARD_VERSION', async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: unknown) => {
      if (cmd.includes('--version')) {
        expect(opts).toEqual(expect.objectContaining({ encoding: 'utf-8' }));
        return '10.0.0';
      }
      return undefined;
    });

    const cmd = upgradeCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('updated');
    expect(output).toContain('10.0.0');
    expect(mockExecSync).toHaveBeenCalledTimes(2);
  });
});
