/**
 * Tests for telemetry consent module
 * packages/panguard/src/cli/consent.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockExistsSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
}));

vi.mock('node:os', () => ({
  homedir: () => '/tmp/test-home',
}));

const mockLoadGuardConfig = vi.fn();
const mockUpdateGuardConfig = vi.fn();

vi.mock('../src/cli/guard-config.js', () => ({
  loadGuardConfig: () => mockLoadGuardConfig(),
  updateGuardConfig: (...args: unknown[]) => mockUpdateGuardConfig(...args),
}));

vi.mock('@panguard-ai/core', () => ({
  c: {
    bold: (s: string) => s,
    dim: (s: string) => s,
    safe: (s: string) => s,
  },
  symbols: {
    info: 'i',
  },
}));

// We need to mock createInterface for TTY tests
const mockQuestion = vi.fn();
const mockClose = vi.fn();
const mockCreateInterface = vi.fn(() => ({
  question: mockQuestion,
  close: mockClose,
}));

vi.mock('node:readline', () => ({
  createInterface: (...args: unknown[]) => mockCreateInterface(...args),
}));

import {
  hasConsentBeenAsked,
  askTelemetryConsent,
  ensureTelemetryConsent,
} from '../src/cli/consent.js';

describe('hasConsentBeenAsked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when marker file exists', () => {
    mockExistsSync.mockReturnValue(true);
    expect(hasConsentBeenAsked()).toBe(true);
  });

  it('returns false when marker file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(hasConsentBeenAsked()).toBe(false);
  });
});

describe('ensureTelemetryConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('returns current config value when already asked', async () => {
    // hasConsentBeenAsked returns true
    mockExistsSync.mockReturnValue(true);
    mockLoadGuardConfig.mockReturnValue({ telemetryEnabled: true });

    const result = await ensureTelemetryConsent();
    expect(result).toBe(true);
  });

  it('returns false when already asked and telemetryEnabled is undefined', async () => {
    mockExistsSync.mockReturnValue(true);
    mockLoadGuardConfig.mockReturnValue({});

    const result = await ensureTelemetryConsent();
    expect(result).toBe(false);
  });
});

describe('askTelemetryConsent', () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
  });

  it('returns false and marks as asked for non-TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
    // markConsentAsked: existsSync for dir check
    mockExistsSync.mockReturnValue(false);

    const result = await askTelemetryConsent();
    expect(result).toBe(false);
    // Should have called mkdirSync + writeFileSync (markConsentAsked)
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('returns true and sets telemetryEnabled=true when user answers y', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
    mockLoadGuardConfig.mockReturnValue({});
    // Simulate the readline question callback answering 'y'
    mockQuestion.mockImplementation((_q: string, cb: (answer: string) => void) => {
      cb('y');
    });
    // markConsentAsked: dir exists
    mockExistsSync.mockReturnValue(true);

    const result = await askTelemetryConsent();
    expect(result).toBe(true);
    expect(mockUpdateGuardConfig).toHaveBeenCalledWith({ telemetryEnabled: true });
  });

  it('returns false and sets telemetryEnabled=false when user answers n', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
    mockLoadGuardConfig.mockReturnValue({});
    mockQuestion.mockImplementation((_q: string, cb: (answer: string) => void) => {
      cb('n');
    });
    mockExistsSync.mockReturnValue(true);

    const result = await askTelemetryConsent();
    expect(result).toBe(false);
    expect(mockUpdateGuardConfig).toHaveBeenCalledWith({ telemetryEnabled: false });
  });
});

describe('markConsentAsked (via askTelemetryConsent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('creates directory if needed and writes marker file', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
    // Dir does not exist
    mockExistsSync.mockReturnValue(false);

    await askTelemetryConsent();

    expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('.panguard-guard'), {
      recursive: true,
    });
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.telemetry-prompted'),
      expect.any(String),
      'utf-8'
    );
  });

  it('handles write errors gracefully', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
    mockExistsSync.mockReturnValue(false);
    mockMkdirSync.mockImplementation(() => {
      throw new Error('permission denied');
    });

    // Should not throw
    const result = await askTelemetryConsent();
    expect(result).toBe(false);
  });
});
