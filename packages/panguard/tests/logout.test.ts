/**
 * Tests for `pga logout`.
 *
 * Validates that auth.json is removed and that the server revoke call is
 * best-effort (network failures do not break local cleanup).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
    },
    symbols: { pass: '[ok]', fail: '[x]', warn: '[!]', info: '[i]' },
  };
});

let HOME_DIR: string;

beforeEach(async () => {
  HOME_DIR = await mkdtemp(join(tmpdir(), 'pga-logout-test-'));
  vi.stubEnv('HOME', HOME_DIR);
  vi.stubEnv('USERPROFILE', HOME_DIR);
  vi.stubEnv('PANGUARD_APP_URL', 'https://test.example.com');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(HOME_DIR, { recursive: true, force: true });
});

async function writeAuthFile(): Promise<string> {
  const dir = join(HOME_DIR, '.panguard');
  await mkdir(dir, { recursive: true });
  const authPath = join(dir, 'auth.json');
  await writeFile(
    authPath,
    JSON.stringify({
      api_key: 'pga_secret',
      workspace_id: 'w-1',
      workspace_slug: 's',
      workspace_name: 'Name',
      tier: 'community',
      user_email: 'u@example.com',
      logged_in_at: '2026-04-22T00:00:00Z',
    })
  );
  return authPath;
}

describe('pga logout', () => {
  it('removes auth.json and calls /api/auth/revoke', async () => {
    const authPath = await writeAuthFile();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    const { runLogout } = await import('../src/cli/commands/logout.js');
    await runLogout({ quiet: true });

    await expect(access(authPath)).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0];
    expect(call?.[0]).toBe('https://test.example.com/api/auth/revoke');
    const init = call?.[1] as RequestInit | undefined;
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer pga_secret');
  });

  it('still removes auth.json if the revoke call fails', async () => {
    const authPath = await writeAuthFile();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const { runLogout } = await import('../src/cli/commands/logout.js');
    await runLogout({ quiet: true });

    await expect(access(authPath)).rejects.toThrow();
  });

  it('is a no-op when not logged in', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const { runLogout } = await import('../src/cli/commands/logout.js');
    await runLogout({ quiet: true });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
