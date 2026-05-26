/**
 * AgentsStore.migrateLegacyJson tests — covers upgrade path from the old
 * JSON-file-backed AgentsRegistry to the new SQLite-backed AgentsStore.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsStore } from '../src/agents-store.js';

interface LegacyShape {
  version: number;
  updated_at: string;
  agents: Array<{
    agent_id: string;
    token: string;
    hostname: string;
    os_type: string;
    panguard_version: string;
    machine_id: string;
    registered_at: string;
    revoked: boolean;
    last_seen?: string;
  }>;
}

function legacyJson(records: LegacyShape['agents']): string {
  return JSON.stringify(
    { version: 1, updated_at: new Date().toISOString(), agents: records },
    null,
    2
  );
}

describe('AgentsStore.migrateLegacyJson', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `pgm-migrate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('is a no-op when no agents.json exists', () => {
    const result = AgentsStore.migrateLegacyJson(join(tmp, 'manager.db'));
    expect(result.imported).toBe(0);
    expect(result.archivedTo).toBeUndefined();
  });

  it('imports agents and renames the JSON file', () => {
    const jsonPath = join(tmp, 'agents.json');
    writeFileSync(
      jsonPath,
      legacyJson([
        {
          agent_id: 'agent_legacy_1',
          token: 'a'.repeat(64),
          hostname: 'host-1',
          os_type: 'linux',
          panguard_version: '1.4.13',
          machine_id: 'm-1',
          registered_at: '2026-01-01T00:00:00Z',
          revoked: false,
        },
        {
          agent_id: 'agent_legacy_2',
          token: 'b'.repeat(64),
          hostname: 'host-2',
          os_type: 'darwin',
          panguard_version: '1.5.0',
          machine_id: 'm-2',
          registered_at: '2026-01-02T00:00:00Z',
          revoked: true,
          last_seen: '2026-01-03T00:00:00Z',
        },
      ])
    );

    const dbPath = join(tmp, 'manager.db');
    const result = AgentsStore.migrateLegacyJson(dbPath);
    expect(result.imported).toBe(2);
    expect(result.archivedTo).toMatch(/agents\.json\.migrated\.\d+$/);
    expect(existsSync(jsonPath)).toBe(false);
    expect(result.archivedTo && existsSync(result.archivedTo)).toBe(true);

    // Confirm tokens survive — a Guard that had the legacy token in its
    // config must still authenticate after migration.
    const store = new AgentsStore({ dbPath });
    try {
      expect(store.count()).toBe(1); // 2 records, 1 revoked → 1 active
      expect(store.listAll()).toHaveLength(2);
      expect(store.validateToken('agent_legacy_1', 'a'.repeat(64))).toBe(true);
      expect(store.validateToken('agent_legacy_2', 'b'.repeat(64))).toBe(false); // revoked
    } finally {
      store.close();
    }
  });

  it('does not re-import on second invocation (SQLite already populated)', () => {
    const jsonPath = join(tmp, 'agents.json');
    writeFileSync(
      jsonPath,
      legacyJson([
        {
          agent_id: 'agent_x',
          token: 'c'.repeat(64),
          hostname: 'h',
          os_type: 'linux',
          panguard_version: 'x',
          machine_id: 'm-x',
          registered_at: '2026-01-01T00:00:00Z',
          revoked: false,
        },
      ])
    );
    const dbPath = join(tmp, 'manager.db');

    const first = AgentsStore.migrateLegacyJson(dbPath);
    expect(first.imported).toBe(1);

    // Re-create JSON (simulating someone restoring an old backup) and try again
    writeFileSync(
      jsonPath,
      legacyJson([
        {
          agent_id: 'agent_y',
          token: 'd'.repeat(64),
          hostname: 'h2',
          os_type: 'linux',
          panguard_version: 'x',
          machine_id: 'm-y',
          registered_at: '2026-01-02T00:00:00Z',
          revoked: false,
        },
      ])
    );
    const second = AgentsStore.migrateLegacyJson(dbPath);
    expect(second.imported).toBe(0);

    const store = new AgentsStore({ dbPath });
    try {
      expect(store.count()).toBe(1);
      expect(store.findByAgentId('agent_x')).toBeDefined();
      expect(store.findByAgentId('agent_y')).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('handles malformed JSON by leaving the file in place', () => {
    const jsonPath = join(tmp, 'agents.json');
    writeFileSync(jsonPath, 'not json{{{');
    const result = AgentsStore.migrateLegacyJson(join(tmp, 'manager.db'));
    expect(result.imported).toBe(0);
    expect(result.archivedTo).toBeUndefined();
    expect(existsSync(jsonPath)).toBe(true);
  });

  it('archives an empty agents.json (no records, but valid JSON)', () => {
    const jsonPath = join(tmp, 'agents.json');
    writeFileSync(jsonPath, legacyJson([]));
    const result = AgentsStore.migrateLegacyJson(join(tmp, 'manager.db'));
    expect(result.imported).toBe(0);
    expect(result.archivedTo).toMatch(/agents\.json\.migrated\.\d+$/);
    expect(existsSync(jsonPath)).toBe(false);
  });

  it('skips records missing required fields', () => {
    const jsonPath = join(tmp, 'agents.json');
    // Cast through unknown to seed a deliberately-invalid record alongside a valid one.
    const records = [
      { agent_id: '', token: 't', hostname: 'h', os_type: 'x', panguard_version: 'x', machine_id: 'm', registered_at: 'now', revoked: false },
      { agent_id: 'agent_good', token: 'e'.repeat(64), hostname: 'h', os_type: 'linux', panguard_version: 'x', machine_id: 'm-good', registered_at: '2026-01-01T00:00:00Z', revoked: false },
    ] as unknown as LegacyShape['agents'];
    writeFileSync(jsonPath, legacyJson(records));

    const dbPath = join(tmp, 'manager.db');
    const result = AgentsStore.migrateLegacyJson(dbPath);
    expect(result.imported).toBe(1);

    const archives = readdirSync(tmp).filter((f) => f.startsWith('agents.json.migrated.'));
    expect(archives).toHaveLength(1);
  });
});
