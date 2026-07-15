/**
 * Reboot-persistence RESTART helpers (1.8.22).
 *
 * `pga guard restart` became service-aware: against the KeepAlive launchd unit a
 * plain stop+start races the respawn and misreports "already running". These pin
 * the two seams that decide the service-aware path — isPersistentServiceInstalled
 * (is the launchd unit present?) and restartPersistentService (launchctl kickstart
 * -k). Fully mocked: node:child_process is stubbed so the suite never spawns a real
 * launchctl or touches a real machine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPlatform = vi.fn(() => 'darwin');
const mockExistsSync = vi.fn(() => true);
const mockExecFileSync = vi.fn();

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, platform: () => mockPlatform(), homedir: () => '/Users/x' };
});
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: (...a: unknown[]) => mockExistsSync(...(a as [])) };
});
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFileSync: (...a: unknown[]) => mockExecFileSync(...(a as [])),
  };
});

import {
  isPersistentServiceInstalled,
  restartPersistentService,
  SERVICE_LABEL,
} from '../src/cli/commands/persist.js';

describe('isPersistentServiceInstalled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform.mockReturnValue('darwin');
  });

  it('is true on darwin when the LaunchAgent plist exists', () => {
    mockExistsSync.mockReturnValue(true);
    expect(isPersistentServiceInstalled()).toBe(true);
  });

  it('is false on darwin when the plist is absent', () => {
    mockExistsSync.mockReturnValue(false);
    expect(isPersistentServiceInstalled()).toBe(false);
  });

  it('is false on a non-darwin platform even if a plist-like file exists', () => {
    mockPlatform.mockReturnValue('linux');
    mockExistsSync.mockReturnValue(true);
    expect(isPersistentServiceInstalled()).toBe(false);
  });
});

describe('restartPersistentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform.mockReturnValue('darwin');
    mockExistsSync.mockReturnValue(true);
  });

  it('kickstarts the launchd unit (kickstart -k gui/<uid>/<label>) and returns true', () => {
    const uidSpy = vi.spyOn(process, 'getuid').mockReturnValue(501);
    try {
      const ok = restartPersistentService();
      expect(ok).toBe(true);
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
      const [bin, args] = mockExecFileSync.mock.calls[0] as [string, string[]];
      expect(bin).toBe('/bin/launchctl');
      expect(args).toEqual(['kickstart', '-k', `gui/501/${SERVICE_LABEL}`]);
    } finally {
      uidSpy.mockRestore();
    }
  });

  it('returns false on a non-darwin platform and never shells out', () => {
    mockPlatform.mockReturnValue('win32');
    expect(restartPersistentService()).toBe(false);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('returns false (never throws) when launchctl fails', () => {
    const uidSpy = vi.spyOn(process, 'getuid').mockReturnValue(501);
    mockExecFileSync.mockImplementation(() => {
      throw new Error('Could not find service');
    });
    try {
      expect(restartPersistentService()).toBe(false);
    } finally {
      uidSpy.mockRestore();
    }
  });

  it('returns false when the service is not installed (no plist)', () => {
    mockExistsSync.mockReturnValue(false);
    expect(restartPersistentService()).toBe(false);
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});
