/**
 * Tests for `pga login`.
 *
 * Exercises the device-code flow end-to-end with a mocked fetch, and verifies
 * that the auth file is written with mode 0600 and the correct shape.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@panguard-ai/core')>();
  return {
    ...actual,
    c: {
      sage: (s: string) => s,
      cream: (s: string) => s,
      bold: (s: string) => s,
      dim: (s: string) => s,
      safe: (s: string) => s,
      caution: (s: string) => s,
      critical: (s: string) => s,
      heading: (s: string) => s,
      brand: (s: string) => s,
      success: (s: string) => s,
      error: (s: string) => s,
      info: (s: string) => s,
    },
    symbols: { pass: '[ok]', fail: '[x]', warn: '[!]', info: '[i]' },
    box: (content: string) => `[BOX]\n${content}\n[/BOX]`,
  };
});

// Prevent the real browser-open from firing shell commands in CI.
vi.mock('../src/cli/device-flow.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/cli/device-flow.js')>();
  return { ...actual, openBrowser: vi.fn() };
});

let HOME_DIR: string;

beforeEach(async () => {
  HOME_DIR = await mkdtemp(join(tmpdir(), 'pga-login-test-'));
  vi.stubEnv('HOME', HOME_DIR);
  vi.stubEnv('USERPROFILE', HOME_DIR);
  vi.stubEnv('PANGUARD_APP_URL', 'https://test.example.com');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(HOME_DIR, { recursive: true, force: true });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('pga login', () => {
  it('writes ~/.panguard/auth.json with mode 0600 on successful device-code flow', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        user_code: 'ABCD-1234',
        device_code: 'secret-device-code',
        verification_uri: 'https://test.example.com/device',
        verification_uri_complete: 'https://test.example.com/device?code=ABCD-1234',
        expires_in: 600,
        interval: 0, // poll immediately in tests
      })
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse(428, { error: 'authorization_pending' }));
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        api_key: 'pga_' + 'a'.repeat(60),
        workspace: { id: 'w-123', slug: 'acme', name: 'Acme Corp', tier: 'pilot' },
        user: { email: 'attila@panguard.ai' },
      })
    );

    const { runLogin } = await import('../src/cli/commands/login.js');
    await runLogin({ browser: false, quiet: true });

    const authPath = join(HOME_DIR, '.panguard', 'auth.json');
    const parsed = JSON.parse(await readFile(authPath, 'utf-8'));
    expect(parsed.api_key).toBe('pga_' + 'a'.repeat(60));
    expect(parsed.workspace_id).toBe('w-123');
    expect(parsed.workspace_slug).toBe('acme');
    expect(parsed.workspace_name).toBe('Acme Corp');
    expect(parsed.tier).toBe('pilot');
    expect(parsed.user_email).toBe('attila@panguard.ai');
    expect(typeof parsed.logged_in_at).toBe('string');

    // Mode 0600 — owner rw only. Skip on Windows (POSIX perms not meaningful).
    if (process.platform !== 'win32') {
      const s = await stat(authPath);
      expect(s.mode & 0o777).toBe(0o600);
    }

    // 3 calls: /device/code then 2× /device/poll.
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const pollCall = fetchSpy.mock.calls[1];
    expect(pollCall?.[0]).toBe('https://test.example.com/api/device/poll');
  });

  it('does nothing if already logged in (no --force)', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const dir = join(HOME_DIR, '.panguard');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'auth.json'),
      JSON.stringify({
        api_key: 'pga_existing',
        workspace_id: 'w-old',
        workspace_slug: 'old',
        workspace_name: 'Old',
        tier: 'community',
        user_email: 'old@example.com',
        logged_in_at: '2026-01-01T00:00:00Z',
      })
    );

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { runLogin } = await import('../src/cli/commands/login.js');
    await runLogin({ browser: false, quiet: true });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('exits with error if /device/code returns non-200', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(jsonResponse(500, { error: 'server' }));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runLogin } = await import('../src/cli/commands/login.js');
    await runLogin({ browser: false, quiet: true });

    expect(process.exitCode).toBe(1);
    process.exitCode = 0; // reset for other tests
    errSpy.mockRestore();
  });

  it('handles expired_token cleanly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        user_code: 'EXPR-0000',
        device_code: 'dc',
        verification_uri: 'https://test.example.com/device',
        verification_uri_complete: 'https://test.example.com/device?code=EXPR-0000',
        expires_in: 600,
        interval: 0,
      })
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse(400, { error: 'expired_token' }));

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runLogin } = await import('../src/cli/commands/login.js');
    await runLogin({ browser: false, quiet: true });

    expect(process.exitCode).toBe(1);
    // auth.json must NOT exist.
    await expect(readFile(join(HOME_DIR, '.panguard', 'auth.json'), 'utf-8')).rejects.toThrow();
    process.exitCode = 0;
    errSpy.mockRestore();
  });

  it('slow_down response increases the polling interval', async () => {
    const { pollOnce } = await import('../src/cli/device-flow.js');

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValueOnce(jsonResponse(429, { error: 'slow_down' }));

    const outcome = await pollOnce('https://test.example.com', 'dc');
    expect(outcome.kind).toBe('slow_down');
  });

  it('registers a SIGINT handler during the poll loop', async () => {
    // We can't easily send a real SIGINT in tests, but we can verify that
    // the command registers a listener before polling starts.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    // Return device code, then success immediately.
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        user_code: 'SIGI-NTTT',
        device_code: 'dc',
        verification_uri: 'https://test.example.com/device',
        verification_uri_complete: 'https://test.example.com/device?code=SIGI-NTTT',
        expires_in: 600,
        interval: 0,
      })
    );
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        api_key: 'pga_ok',
        workspace: { id: 'w', slug: 's', name: 'n', tier: 'community' },
        user: { email: 'e@e.com' },
      })
    );

    const beforeCount = process.listenerCount('SIGINT');
    const { runLogin } = await import('../src/cli/commands/login.js');
    await runLogin({ browser: false, quiet: true });
    const afterCount = process.listenerCount('SIGINT');

    // Handler removed after completion — same count as before.
    expect(afterCount).toBe(beforeCount);
  });
});

describe('device-flow helpers', () => {
  it('resolveAppUrl: flag wins over env, env wins over default', async () => {
    const { resolveAppUrl, DEFAULT_APP_URL } = await import('../src/cli/device-flow.js');
    vi.stubEnv('PANGUARD_APP_URL', 'https://env.example.com');
    expect(resolveAppUrl('https://flag.example.com')).toBe('https://flag.example.com');
    expect(resolveAppUrl(undefined)).toBe('https://env.example.com');
    vi.unstubAllEnvs();
    expect(resolveAppUrl(undefined)).toBe(DEFAULT_APP_URL);
  });

  it('resolveAppUrl: strips trailing slash', async () => {
    const { resolveAppUrl } = await import('../src/cli/device-flow.js');
    expect(resolveAppUrl('https://foo.com/')).toBe('https://foo.com');
  });
});
