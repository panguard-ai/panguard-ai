/**
 * Tests for `pga whoami`.
 *
 * Covers: (a) not logged in → exit 1 with guidance, (b) reads auth.json
 * and issues a Bearer-authed GET /api/me, (c) --json output shape.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
    },
    symbols: { pass: '[ok]', fail: '[x]', warn: '[!]', info: '[i]' },
    divider: () => '---',
    header: (t: string) => `=== ${t} ===`,
    statusPanel: (_title: string, items: Array<{ label: string; value: string }>) =>
      items.map((i) => `${i.label}: ${i.value}`).join('\n'),
  };
});

let HOME_DIR: string;

beforeEach(async () => {
  HOME_DIR = await mkdtemp(join(tmpdir(), 'pga-whoami-test-'));
  vi.stubEnv('HOME', HOME_DIR);
  vi.stubEnv('USERPROFILE', HOME_DIR);
  vi.stubEnv('PANGUARD_APP_URL', 'https://test.example.com');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  process.exitCode = 0;
  await rm(HOME_DIR, { recursive: true, force: true });
});

async function writeAuthFile(): Promise<void> {
  const dir = join(HOME_DIR, '.panguard');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'auth.json'),
    JSON.stringify({
      api_key: 'pga_secret',
      workspace_id: 'w-1',
      workspace_slug: 'acme',
      workspace_name: 'Acme Corp',
      tier: 'pilot',
      user_email: 'attila@panguard.ai',
      logged_in_at: '2026-04-22T00:00:00Z',
    })
  );
}

describe('pga whoami', () => {
  it('prints "Not logged in" and exits 1 if auth.json is missing', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { runWhoami } = await import('../src/cli/commands/whoami.js');
    await runWhoami({});

    expect(process.exitCode).toBe(1);
    const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).toMatch(/Not logged in/);
  });

  it('--json prints { authenticated: false } when not logged in', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { runWhoami } = await import('../src/cli/commands/whoami.js');
    await runWhoami({ json: true });
    const body = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(body).toEqual({ authenticated: false });
  });

  it('reads auth.json and calls /api/me with Bearer token', async () => {
    await writeAuthFile();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { email: 'attila@panguard.ai' },
          workspace: { id: 'w-1', slug: 'acme', name: 'Acme Corp' },
          tier: 'pilot',
          tier_expires_at: '2026-07-22T00:00:00Z',
          endpoints_count: 12,
          events_30d: 345,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { runWhoami } = await import('../src/cli/commands/whoami.js');
    await runWhoami({ quiet: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe('https://test.example.com/api/me');
    const headers = (init as RequestInit | undefined)?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer pga_secret');

    // Output should contain the user email and workspace (Authorization never).
    const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).toContain('attila@panguard.ai');
    expect(out).toContain('Acme Corp');
    expect(out).not.toContain('pga_secret');
  });

  it('falls back to cached session when /api/me fails', async () => {
    await writeAuthFile();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { runWhoami } = await import('../src/cli/commands/whoami.js');
    await runWhoami({ quiet: false });

    const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).toContain('attila@panguard.ai');
    expect(out).toContain('Acme Corp');
  });

  it('--json output includes tier and endpoint counts from /api/me', async () => {
    await writeAuthFile();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { email: 'attila@panguard.ai' },
          workspace: { id: 'w-1', slug: 'acme', name: 'Acme Corp' },
          tier: 'enterprise',
          tier_expires_at: null,
          endpoints_count: 99,
          events_30d: 1_000,
        }),
        { status: 200 }
      )
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { runWhoami } = await import('../src/cli/commands/whoami.js');
    await runWhoami({ json: true });

    const body = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(body.authenticated).toBe(true);
    expect(body.tier).toBe('enterprise');
    expect(body.endpoints_count).toBe(99);
    expect(body.events_30d).toBe(1000);
    expect(body.workspace.slug).toBe('acme');
    expect(body.user_email).toBe('attila@panguard.ai');
  });
});

describe('auth-guard helpers', () => {
  it('loadAuth returns null when file is missing', async () => {
    const { loadAuth } = await import('../src/cli/auth-guard.js');
    expect(await loadAuth()).toBeNull();
  });

  it('loadAuth returns null on malformed JSON', async () => {
    const dir = join(HOME_DIR, '.panguard');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'auth.json'), 'not json');

    const { loadAuth } = await import('../src/cli/auth-guard.js');
    expect(await loadAuth()).toBeNull();
  });

  it('authHeader returns Bearer token when logged in', async () => {
    await writeAuthFile();
    const { authHeader } = await import('../src/cli/auth-guard.js');
    expect(await authHeader()).toEqual({ Authorization: 'Bearer pga_secret' });
  });

  it('authHeader returns {} when not logged in', async () => {
    const { authHeader } = await import('../src/cli/auth-guard.js');
    expect(await authHeader()).toEqual({});
  });

  it('isAuthenticated reflects file presence', async () => {
    const { isAuthenticated } = await import('../src/cli/auth-guard.js');
    expect(await isAuthenticated()).toBe(false);
    await writeAuthFile();
    expect(await isAuthenticated()).toBe(true);
  });

  it('requireLogin throws when not logged in', async () => {
    const { requireLogin } = await import('../src/cli/auth-guard.js');
    await expect(requireLogin()).rejects.toThrow(/Not logged in/);
  });
});
