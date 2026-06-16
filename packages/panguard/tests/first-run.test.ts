/**
 * Tests for first-run detection module
 * packages/panguard/src/cli/first-run.ts
 *
 * Regression guard for BUG #3: `pga up` / bare `pga` re-ran the welcome +
 * interactive setup on EVERY run because the old markers (telemetry-gated
 * ~/.panguard/activated and the never-written ~/.panguard/config.json) were the
 * wrong source of truth. The fix is a dedicated, telemetry-independent marker.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { isFirstRun, markInitialized } from '../src/cli/first-run.js';

const MARKER = '/tmp/test-home/.panguard/.initialized';
const DIR = '/tmp/test-home/.panguard';

describe('first-run detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isFirstRun', () => {
    it('returns true when the marker is absent', () => {
      mockExistsSync.mockReturnValue(false);
      expect(isFirstRun()).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith(MARKER);
    });

    it('returns false when the marker exists (not first run)', () => {
      mockExistsSync.mockImplementation((p: string) => p === MARKER);
      expect(isFirstRun()).toBe(false);
    });

    it('is independent of telemetry markers (does not look at ~/.panguard/activated)', () => {
      // Only the activation marker exists — first-run must still be true so an
      // opt-out user is NOT re-shown the welcome+setup every run.
      mockExistsSync.mockImplementation((p: string) => p.endsWith('/activated'));
      expect(isFirstRun()).toBe(true);
    });
  });

  describe('markInitialized', () => {
    it('creates ~/.panguard (0700) and writes the marker (0600) on first call', () => {
      mockExistsSync.mockReturnValue(false);
      markInitialized();
      expect(mockMkdirSync).toHaveBeenCalledWith(DIR, { recursive: true, mode: 0o700 });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        MARKER,
        expect.any(String),
        { encoding: 'utf-8', mode: 0o600 }
      );
    });

    it('is idempotent — does not rewrite when the marker already exists', () => {
      mockExistsSync.mockReturnValue(true); // dir + marker both present
      markInitialized();
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('does not create the dir when it already exists', () => {
      // dir exists, marker does not
      mockExistsSync.mockImplementation((p: string) => p === DIR);
      markInitialized();
      expect(mockMkdirSync).not.toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(MARKER, expect.any(String), {
        encoding: 'utf-8',
        mode: 0o600,
      });
    });

    it('swallows write errors (best-effort, never throws on the happy path)', () => {
      mockExistsSync.mockReturnValue(false);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('EACCES');
      });
      expect(() => markInitialized()).not.toThrow();
    });
  });
});
