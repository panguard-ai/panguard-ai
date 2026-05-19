/**
 * AgentsRegistry unit tests
 * AgentsRegistry 單元測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsRegistry } from '../src/agents-registry.js';

describe('AgentsRegistry', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = join(tmpdir(), `panguard-manager-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmp, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('starts empty when no file exists', () => {
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
    expect(reg.list()).toHaveLength(0);
    expect(reg.count()).toBe(0);
  });

  it('registers an agent and returns id + token', () => {
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
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
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
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
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
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
    const filePath = join(tmp, 'agents.json');
    const r1 = new AgentsRegistry({ filePath });
    const { agent_id, token } = r1.register({
      hostname: 'host-1',
      os_type: 'darwin',
      panguard_version: '1.5.6',
      machine_id: 'm-1',
    });
    expect(existsSync(filePath)).toBe(true);

    const r2 = new AgentsRegistry({ filePath });
    expect(r2.count()).toBe(1);
    expect(r2.validateToken(agent_id, token)).toBe(true);
  });

  it('validateToken rejects wrong token', () => {
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
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
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
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

  it('handles corrupt JSON by starting empty', () => {
    const filePath = join(tmp, 'agents.json');
    // Write garbage
    writeFileSync(filePath, 'not json{{{', 'utf-8');
    const reg = new AgentsRegistry({ filePath });
    expect(reg.count()).toBe(0);
  });

  it('list() excludes revoked but listAll() includes them', () => {
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
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
    const reg = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
    expect(() =>
      reg.register({ hostname: '', os_type: 'linux', panguard_version: 'x', machine_id: 'm' })
    ).toThrow();
  });
});
