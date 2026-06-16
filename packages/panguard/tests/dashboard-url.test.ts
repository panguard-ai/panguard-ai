/**
 * Tests for shared dashboard-URL helpers
 * packages/panguard/src/cli/dashboard-url.ts
 *
 * Regression guard: `pga up` AND `pga setup` must open/print the AUTHENTICATED
 * dashboard URL (carrying the daemon's launch token), never a bare
 * http://127.0.0.1:PORT that lands on a 401 "Invalid token" page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

vi.mock('node:os', () => ({
  homedir: () => '/tmp/test-home',
}));

import {
  readDashboardPort,
  dashboardBaseUrl,
  readAuthenticatedDashboardUrl,
} from '../src/cli/dashboard-url.js';

const CONFIG = '/tmp/test-home/.panguard-guard/config.json';
const TOKEN = '/tmp/test-home/.panguard-guard/dashboard-token';

describe('dashboard-url helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readDashboardPort', () => {
    it('defaults to 3100 when config is absent', () => {
      mockExistsSync.mockReturnValue(false);
      expect(readDashboardPort()).toBe(3100);
    });

    it('reads a configured non-default port', () => {
      mockExistsSync.mockImplementation((p: string) => p === CONFIG);
      mockReadFileSync.mockReturnValue(JSON.stringify({ dashboardPort: 4242 }));
      expect(readDashboardPort()).toBe(4242);
    });

    it('falls back to default on unreadable / malformed config', () => {
      mockExistsSync.mockImplementation((p: string) => p === CONFIG);
      mockReadFileSync.mockReturnValue('{not json');
      expect(readDashboardPort()).toBe(3100);
    });
  });

  describe('dashboardBaseUrl', () => {
    it('builds a loopback URL on the resolved port', () => {
      mockExistsSync.mockReturnValue(false);
      expect(dashboardBaseUrl()).toBe('http://127.0.0.1:3100');
    });
  });

  describe('readAuthenticatedDashboardUrl', () => {
    it('returns null when the token file is absent (caller prints guidance)', () => {
      mockExistsSync.mockReturnValue(false);
      expect(readAuthenticatedDashboardUrl()).toBeNull();
    });

    it('returns null when the token file is empty', () => {
      mockExistsSync.mockImplementation((p: string) => p === TOKEN);
      mockReadFileSync.mockReturnValue('   ');
      expect(readAuthenticatedDashboardUrl()).toBeNull();
    });

    it('builds /?token=… when the token is present', () => {
      mockExistsSync.mockImplementation((p: string) => p === TOKEN || p === CONFIG);
      mockReadFileSync.mockImplementation((p: string) =>
        p === TOKEN ? 'secret-token-xyz\n' : JSON.stringify({ dashboardPort: 3100 })
      );
      expect(readAuthenticatedDashboardUrl()).toBe(
        'http://127.0.0.1:3100/?token=secret-token-xyz'
      );
    });
  });
});
