/**
 * Tests for guard-config module
 * packages/panguard/src/cli/guard-config.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
}));

vi.mock('node:os', () => ({
  homedir: () => '/tmp/test-home',
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

  it('writes JSON to correct path', () => {
    mockExistsSync.mockReturnValue(true);
    updateGuardConfig({ telemetryEnabled: true });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/tmp/test-home/.panguard-guard/config.json',
      JSON.stringify({ telemetryEnabled: true }, null, 2),
      'utf-8'
    );
  });

  it('creates directory if needed', () => {
    mockExistsSync.mockReturnValue(false);
    updateGuardConfig({ mode: 'enforce' });

    expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/test-home/.panguard-guard', {
      recursive: true,
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
});
