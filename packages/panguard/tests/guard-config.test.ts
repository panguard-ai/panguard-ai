/**
 * Tests for guard-config module
 * packages/panguard/src/cli/guard-config.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockChmodSync = vi.fn();

vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  chmodSync: (...args: unknown[]) => mockChmodSync(...args),
}));

vi.mock('node:os', () => ({
  homedir: () => '/tmp/test-home',
}));

// updateGuardConfig re-seals the integrity manifest via the guard's
// resealConfigManifest after writing. Stub it so the dynamic import resolves
// and we can assert the re-seal happens (the fix for the false "config tampered").
const mockReseal = vi.fn();
vi.mock('@panguard-ai/panguard-guard', () => ({
  resealConfigManifest: (...args: unknown[]) => mockReseal(...args),
}));

import { loadGuardConfig, updateGuardConfig } from '../src/cli/guard-config.js';

describe('loadGuardConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object when config file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadGuardConfig()).toEqual({});
  });

  it('parses JSON correctly when file exists', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{"telemetryEnabled":true,"mode":"monitor"}');

    const config = loadGuardConfig();
    expect(config).toEqual({ telemetryEnabled: true, mode: 'monitor' });
  });

  it('returns empty object on parse error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not valid json{{{');

    expect(loadGuardConfig()).toEqual({});
  });
});

describe('updateGuardConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes JSON to correct path with 0o600 mode (secret-bearing config)', () => {
    mockExistsSync.mockReturnValue(true);
    updateGuardConfig({ telemetryEnabled: true });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/tmp/test-home/.panguard-guard/config.json',
      JSON.stringify({ telemetryEnabled: true }, null, 2),
      { encoding: 'utf-8', mode: 0o600 }
    );
  });

  it('chmods the file to 0o600 even when it already existed (tighten loose perms)', () => {
    mockExistsSync.mockReturnValue(true);
    updateGuardConfig({ telemetryEnabled: true });

    expect(mockChmodSync).toHaveBeenCalledWith('/tmp/test-home/.panguard-guard/config.json', 0o600);
  });

  it('creates directory with 0o700 mode if needed', () => {
    mockExistsSync.mockReturnValue(false);
    updateGuardConfig({ mode: 'enforce' });

    expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/test-home/.panguard-guard', {
      recursive: true,
      mode: 0o700,
    });
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('preserves existing fields when adding new ones', () => {
    mockExistsSync.mockReturnValue(true);
    updateGuardConfig({ telemetryEnabled: true, mode: 'monitor', dashboardPort: 3000 });

    const writtenJson = mockWriteFileSync.mock.calls[0][1] as string;
    const parsed = JSON.parse(writtenJson);
    expect(parsed).toEqual({ telemetryEnabled: true, mode: 'monitor', dashboardPort: 3000 });
  });

  // Regression (1.8.22): a plain write left the integrity manifest stale, so a
  // legitimate telemetry / Threat-Cloud toggle made the NEXT `pga doctor` falsely
  // report "config tampered". updateGuardConfig must re-seal after writing.
  it('re-seals the integrity manifest after writing (config, guard dir)', async () => {
    mockExistsSync.mockReturnValue(true);
    await updateGuardConfig({ telemetryEnabled: true });

    expect(mockReseal).toHaveBeenCalledTimes(1);
    expect(mockReseal).toHaveBeenCalledWith(
      { telemetryEnabled: true },
      '/tmp/test-home/.panguard-guard'
    );
  });

  it('writes BEFORE it re-seals (a re-seal failure must never lose the write)', async () => {
    mockExistsSync.mockReturnValue(true);
    const order: string[] = [];
    mockWriteFileSync.mockImplementation(() => order.push('write'));
    mockReseal.mockImplementation(() => order.push('reseal'));
    await updateGuardConfig({ telemetryEnabled: false });

    expect(order).toEqual(['write', 'reseal']);
  });
});
