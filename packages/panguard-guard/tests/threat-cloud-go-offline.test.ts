import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  };
});

const { ThreatCloudClient } = await import('../src/threat-cloud/index.js');

describe('ThreatCloudClient.goOffline', () => {
  it('makes every later call a local no-op', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tc-offline-'));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const client = new ThreatCloudClient('https://tc.example.com', dir, 'key');
      expect(client.getStatus()).not.toBe('offline');
      client.goOffline();
      expect(client.getStatus()).toBe('offline');
      expect(await client.fetchBlocklist()).toEqual([]);
      expect(await client.fetchSkillWhitelist()).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
