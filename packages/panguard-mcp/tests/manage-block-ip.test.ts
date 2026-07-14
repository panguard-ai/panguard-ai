/**
 * panguard_block_ip honesty tests.
 *
 * The tool used to return status:'blocked' while applying no firewall rule and
 * queuing nothing — a fake-green in a security product. It now: (a) refuses to
 * claim a block unless a real firewall rule is applied, (b) is OFF by default
 * (enforcementPolicy.blockIPs.enabled) and says so honestly, and (c) surfaces a
 * truthful failure when the rule cannot be applied (e.g. no privileges).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock the guard IP executor so the "armed" path is deterministic (no real pfctl).
const blockMock = vi.fn();
vi.mock('@panguard-ai/panguard-guard', () => ({
  IPBlocker: class {
    block(...args: unknown[]) {
      return blockMock(...args);
    }
  },
}));

import { executeBlockIP } from '../src/tools/manage-tools.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function body(res: any): any {
  return JSON.parse(res.content[0].text);
}

describe('panguard_block_ip — honest enforcement (no fake-green)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pg-blockip-'));
    blockMock.mockReset();
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  const writeConfig = (obj: unknown) =>
    writeFileSync(join(dir, 'config.json'), JSON.stringify(obj));

  it('rejects a missing IP', async () => {
    const res = await executeBlockIP({ dataDir: dir });
    expect(res.isError).toBe(true);
    expect(body(res).error).toMatch(/required/i);
  });

  it('rejects an invalid IP', async () => {
    const res = await executeBlockIP({ ip: 'not-an-ip!!', dataDir: dir });
    expect(res.isError).toBe(true);
    expect(body(res).error).toMatch(/Invalid IP/i);
  });

  it('does NOT fake a block when enforcement is off (no config on disk)', async () => {
    const res = await executeBlockIP({ ip: '198.51.100.5', dataDir: dir });
    expect(body(res).status).toBe('not_enforced');
    expect(body(res).status).not.toBe('blocked');
    expect(blockMock).not.toHaveBeenCalled();
  });

  it('does NOT fake a block when blockIPs.enabled is false', async () => {
    writeConfig({ enforcementPolicy: { blockIPs: { enabled: false } } });
    const res = await executeBlockIP({ ip: '198.51.100.5', dataDir: dir });
    expect(body(res).status).toBe('not_enforced');
    expect(blockMock).not.toHaveBeenCalled();
  });

  it('applies a REAL block and reports success only when armed', async () => {
    writeConfig({ enforcementPolicy: { blockIPs: { enabled: true } } });
    blockMock.mockResolvedValue({ success: true, message: 'IP 198.51.100.5 blocked until 2026' });
    const res = await executeBlockIP({ ip: '198.51.100.5', duration: '2h', dataDir: dir });
    expect(blockMock).toHaveBeenCalledWith('198.51.100.5', expect.any(String), 7_200_000);
    expect(body(res).status).toBe('blocked');
    expect(res.isError).toBeUndefined();
  });

  it('reports an HONEST failure (never "blocked") when the firewall rule cannot be applied', async () => {
    writeConfig({ enforcementPolicy: { blockIPs: { enabled: true } } });
    blockMock.mockResolvedValue({
      success: false,
      message: 'Firewall error: Operation not permitted',
    });
    const res = await executeBlockIP({ ip: '198.51.100.5', dataDir: dir });
    expect(body(res).status).toBe('failed');
    expect(body(res).status).not.toBe('blocked');
    expect(res.isError).toBe(true);
    expect(body(res).note).toMatch(/privileges/i);
  });
});
