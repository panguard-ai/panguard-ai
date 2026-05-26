/**
 * AgentsStore unit tests — same surface the old AgentsRegistry tests covered,
 * now exercising the SQLite-backed implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsStore } from '../src/agents-store.js';

describe('AgentsStore', () => {
  let tmp: string;
  let store: AgentsStore | null;

  beforeEach(() => {
    tmp = join(
      tmpdir(),
      `panguard-manager-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmp, { recursive: true });
    store = null;
  });

  afterEach(() => {
    if (store) {
      store.close();
      store = null;
    }
    rmSync(tmp, { recursive: true, force: true });
  });

  function openStore(): AgentsStore {
    store = new AgentsStore({ dbPath: join(tmp, 'manager.db') });
    return store;
  }

  it('starts empty when no DB file exists', () => {
    const reg = openStore();
    expect(reg.list()).toHaveLength(0);
    expect(reg.count()).toBe(0);
  });

  it('registers an agent and returns id + token', () => {
    const reg = openStore();
    const { agent_id, token } = reg.register({
      hostname: 'host-1',
      os_type: 'linux',
      panguard_version: '1.5.6',
      machine_id: 'm-1',
    });
    expect(agent_id).toMatch(/^agent_/);
    expect(token).toHaveLength(64);
    expect(reg.count()).toBe(1);
  });

  it('reuses the existing record when the same machine_id registers again', () => {
    const reg = openStore();
    const a = reg.register({
      hostname: 'host-1',
      os_type: 'linux',
      panguard_version: '1.5.6',
      machine_id: 'm-1',
    });
    const b = reg.register({
      hostname: 'host-1-rebooted',
      os_type: 'linux',
      panguard_version: '1.5.7',
      machine_id: 'm-1',
    });
    expect(b.agent_id).toBe(a.agent_id);
    expect(b.token).toBe(a.token);
    expect(reg.count()).toBe(1);
  });

  it('issues a new id after revoking the previous one', () => {
    const reg = openStore();
    const a = reg.register({
      hostname: 'host-1',
      os_type: 'linux',
      panguard_version: '1.5.6',
      machine_id: 'm-1',
    });
    expect(reg.revoke(a.agent_id)).toBe(true);
    const b = reg.register({
      hostname: 'host-1',
      os_type: 'linux',
      panguard_version: '1.5.6',
      machine_id: 'm-1',
    });
    expect(b.agent_id).not.toBe(a.agent_id);
  });

  it('persists across restarts', () => {
    const dbPath = join(tmp, 'manager.db');
    const r1 = new AgentsStore({ dbPath });
    const { agent_id, token } = r1.register({
      hostname: 'host-1',
      os_type: 'darwin',
      panguard_version: '1.5.6',
      machine_id: 'm-1',
    });
    r1.close();
    expect(existsSync(dbPath)).toBe(true);

    const r2 = new AgentsStore({ dbPath });
    try {
      expect(r2.count()).toBe(1);
      expect(r2.validateToken(agent_id, token)).toBe(true);
    } finally {
      r2.close();
    }
  });

  it('validateToken rejects wrong token', () => {
    const reg = openStore();
    const { agent_id } = reg.register({
      hostname: 'h',
      os_type: 'linux',
      panguard_version: 'x',
      machine_id: 'm',
    });
    expect(reg.validateToken(agent_id, 'wrong')).toBe(false);
    expect(reg.validateToken('unknown', 'x')).toBe(false);
  });

  it('validateToken rejects a revoked agent', () => {
    const reg = openStore();
    const { agent_id, token } = reg.register({
      hostname: 'h',
      os_type: 'linux',
      panguard_version: 'x',
      machine_id: 'm',
    });
    expect(reg.validateToken(agent_id, token)).toBe(true);
    reg.revoke(agent_id);
    expect(reg.validateToken(agent_id, token)).toBe(false);
  });

  it('revoke returns false for unknown agent_id', () => {
    const reg = openStore();
    expect(reg.revoke('agent_unknown')).toBe(false);
  });

  it('list() excludes revoked but listAll() includes them', () => {
    const reg = openStore();
    const a = reg.register({
      hostname: 'h1',
      os_type: 'linux',
      panguard_version: 'x',
      machine_id: 'm-1',
    });
    reg.register({
      hostname: 'h2',
      os_type: 'linux',
      panguard_version: 'x',
      machine_id: 'm-2',
    });
    reg.revoke(a.agent_id);
    expect(reg.list()).toHaveLength(1);
    expect(reg.listAll()).toHaveLength(2);
  });

  it('rejects register with missing required fields', () => {
    const reg = openStore();
    expect(() =>
      reg.register({ hostname: '', os_type: 'linux', panguard_version: 'x', machine_id: 'm' })
    ).toThrow();
  });

  it('touch() updates last_seen on the active record', () => {
    const reg = openStore();
    const { agent_id } = reg.register({
      hostname: 'h',
      os_type: 'linux',
      panguard_version: 'x',
      machine_id: 'm',
    });
    expect(reg.findByAgentId(agent_id)?.last_seen).toBeUndefined();
    reg.touch(agent_id);
    const after = reg.findByAgentId(agent_id);
    expect(after?.last_seen).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('touch() on revoked agent is a no-op', () => {
    const reg = openStore();
    const { agent_id } = reg.register({
      hostname: 'h',
      os_type: 'linux',
      panguard_version: 'x',
      machine_id: 'm',
    });
    reg.revoke(agent_id);
    reg.touch(agent_id);
    // No findByAgentId for revoked; check via listAll
    const all = reg.listAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.last_seen).toBeUndefined();
  });
});
