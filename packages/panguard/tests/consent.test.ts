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
  isSharingEnabled: (c: { threatCloudUploadEnabled?: boolean }) =>
    c.threatCloudUploadEnabled === true,
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
  markConsentAsked,
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
    mockLoadGuardConfig.mockReturnValue({ threatCloudUploadEnabled: true });

    const result = await ensureTelemetryConsent();
    expect(result).toBe(true);
  });

  it('returns false when already asked and sharing is not enabled', async () => {
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
    // One "I agree" wires the whole collective-defense loop: contribute
    // (telemetry + upload) AND receive (rule sync auto-updates).
    expect(mockUpdateGuardConfig).toHaveBeenCalledWith({
      telemetryEnabled: true,
      threatCloudUploadEnabled: true,
      threatCloudRuleSyncEnabled: true,
    });
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
    // Declining leaves every flag off — nothing connects, nothing syncs.
    expect(mockUpdateGuardConfig).toHaveBeenCalledWith({
      telemetryEnabled: false,
      threatCloudUploadEnabled: false,
      threatCloudRuleSyncEnabled: false,
    });
  });

  it('non-TTY leaves all three collective-defense flags OFF', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
    mockLoadGuardConfig.mockReturnValue({});
    mockExistsSync.mockReturnValue(true);

    const result = await askTelemetryConsent();
    expect(result).toBe(false);
    expect(mockUpdateGuardConfig).toHaveBeenCalledWith({
      telemetryEnabled: false,
      threatCloudUploadEnabled: false,
      threatCloudRuleSyncEnabled: false,
    });
  });
});

describe('markConsentAsked (exported — single consent point for pga setup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is exported and writes the consent marker file', () => {
    // Dir already exists; markConsentAsked just writes the marker.
    mockExistsSync.mockReturnValue(true);
    markConsentAsked();
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.telemetry-prompted'),
      expect.any(String),
      'utf-8'
    );
  });

  it('creates the guard dir first when it does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    markConsentAsked();
    expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('.panguard-guard'), {
      recursive: true,
    });
  });
});

describe('ensureTelemetryConsent does not re-prompt once marked (BUG2 regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('returns the stored opt-in WITHOUT prompting after consent was marked', async () => {
    // Simulate pga setup having written telemetryEnabled=true and marked asked.
    // The trailing ensureTelemetryConsent() must NOT prompt again (which used to
    // default-NO and silently overwrite the opt-in) — it just reads the value back.
    mockExistsSync.mockReturnValue(true); // hasConsentBeenAsked() === true
    mockLoadGuardConfig.mockReturnValue({ threatCloudUploadEnabled: true });

    const result = await ensureTelemetryConsent();

    expect(result).toBe(true);
    // No second prompt, and no config write that could clobber the opt-in.
    expect(mockCreateInterface).not.toHaveBeenCalled();
    expect(mockUpdateGuardConfig).not.toHaveBeenCalled();
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

describe('collective defense disclosure text', async () => {
  const { COLLECTIVE_DEFENSE_LINES } = await import('../src/cli/consent.js');
  const text = COLLECTIVE_DEFENSE_LINES.join('\n');

  it('does not promise automatic community rules or rule updates', () => {
    expect(text).not.toMatch(/get every community rule back/i);
    expect(text).not.toMatch(/auto-?update your detection rules/i);
    expect(text).toContain('pga upgrade');
  });

  it('names the command that stops every upload and download', () => {
    expect(text).toContain('pga config set threat-cloud false');
  });

  it('discloses the downloads, the drafter LLM call and the logged-in workspace link', () => {
    expect(text).toMatch(/every 5 minutes/);
    expect(text).toMatch(/200 characters/);
    expect(text).toMatch(/pga login/);
    expect(text).toMatch(/TERM|terminal program name/i);
  });

  it('says proposals and runtime tool names stay on this machine', () => {
    expect(text).toMatch(/proposals[\s\S]*stay on this machine/);
    expect(text).toMatch(/names of tools your agents call at\s*runtime are never uploaded/);
  });
});
