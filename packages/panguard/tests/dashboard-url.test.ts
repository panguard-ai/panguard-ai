/**
 * Tests for shared dashboard-URL helpers
 * packages/panguard/src/cli/dashboard-url.ts
 *
 * Regression guard: `pga up` AND `pga setup` must open/print the AUTHENTICATED
 * dashboard URL (carrying the daemon's launch token), never a bare
 * http://127.0.0.1:PORT that lands on a 401 "Invalid token" page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  isDashboardHealthy,
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
      expect(readAuthenticatedDashboardUrl()).toBe('http://127.0.0.1:3100/?token=secret-token-xyz');
    });
  });

  // `pga up` self-heal gate: a running daemon whose dashboard cannot authenticate
  // (no token, mismatched token, or unreachable) must be treated as unhealthy so
  // `pga up` restarts it instead of polling forever for a token that never lands.
  describe('isDashboardHealthy', () => {
    const realFetch = globalThis.fetch;
    afterEach(() => {
      globalThis.fetch = realFetch;
    });

    it('returns false (and never calls fetch) when the token file is absent', async () => {
      mockExistsSync.mockReturnValue(false);
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      expect(await isDashboardHealthy()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns false (and never calls fetch) when the token file is empty', async () => {
      mockExistsSync.mockImplementation((p: string) => p === TOKEN);
      mockReadFileSync.mockReturnValue('   ');
      const fetchMock = vi.fn();
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      expect(await isDashboardHealthy()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns true and authenticates with Bearer against /api/status when the daemon answers 200', async () => {
      mockExistsSync.mockImplementation((p: string) => p === TOKEN || p === CONFIG);
      mockReadFileSync.mockImplementation((p: string) =>
        p === TOKEN ? 'tok-abc\n' : JSON.stringify({ dashboardPort: 3100 })
      );
      const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      expect(await isDashboardHealthy()).toBe(true);
      const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://127.0.0.1:3100/api/status');
      expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-abc');
    });

    it('returns false on a non-200 (daemon serving but token mismatch → 401)', async () => {
      mockExistsSync.mockImplementation((p: string) => p === TOKEN);
      mockReadFileSync.mockReturnValue('tok');
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue({ ok: false } as Response) as unknown as typeof fetch;
      expect(await isDashboardHealthy()).toBe(false);
    });

    it('returns false when the dashboard is unreachable (fetch rejects)', async () => {
      mockExistsSync.mockImplementation((p: string) => p === TOKEN);
      mockReadFileSync.mockReturnValue('tok');
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
      expect(await isDashboardHealthy()).toBe(false);
    });
  });
});
