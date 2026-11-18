import { describe, it, expect, vi } from 'vitest';

const platformMock = vi.hoisted(() => vi.fn(() => 'darwin'));
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, platform: platformMock };
});

import { toMonitorEngineConfig } from '../src/monitor-config.js';
import { DEFAULT_GUARD_CONFIG } from '../src/config.js';
import { generateInstallScript } from '../src/install/index.js';

describe('host monitors are off by default', () => {
  it('forwards every flag from the default config to the monitor engine', () => {
    expect(toMonitorEngineConfig(DEFAULT_GUARD_CONFIG.monitors)).toMatchObject({
      logMonitor: false,
      networkMonitor: false,
      processMonitor: false,
      fileMonitor: false,
    });
  });

  it('honours an explicit opt-in', () => {
    const cfg = toMonitorEngineConfig({ ...DEFAULT_GUARD_CONFIG.monitors, networkMonitor: true });
    expect(cfg.networkMonitor).toBe(true);
    expect(cfg.processMonitor).toBe(false);
  });

  it.each([
    ['darwin', (n: string) => `"${n}": false`, (n: string) => `"${n}": true`],
    ['win32', (n: string) => `${n} = $false`, (n: string) => `${n} = $true`],
  ])('the %s install script template writes all four monitors as off', (os, off, on) => {
    platformMock.mockReturnValue(os);
    const script = generateInstallScript({ dataDir: '/tmp/pg-data' });
    for (const name of ['logMonitor', 'networkMonitor', 'processMonitor', 'fileMonitor']) {
      expect(script).toContain(off(name));
      expect(script).not.toContain(on(name));
    }
  });
});
