/**
 * Manager admin-token auth + fail-closed binding tests
 * Manager 管理 token 認證 + 失敗即關閉綁定測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsRegistry } from '../src/agents-registry.js';
import { FleetAggregator } from '../src/aggregator.js';
import { ManagerServer } from '../src/server.js';

const TOKEN = 'a'.repeat(40);

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (typeof addr === 'object' && addr) {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        reject(new Error('no address'));
      }
    });
  });
}

async function post(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<number> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  await res.text();
  return res.status;
}

describe('ManagerServer auth', () => {
  it('refuses to bind a non-loopback host without an auth token (fail closed)', () => {
    const registry = new AgentsRegistry({ filePath: join(tmpdir(), 'a.json') });
    const aggregator = new FleetAggregator();
    expect(
      () => new ManagerServer({ port: 8099, host: '0.0.0.0', registry, aggregator })
    ).toThrow(/non-loopback/);
  });

  it('rejects a too-short auth token', () => {
    const registry = new AgentsRegistry({ filePath: join(tmpdir(), 'b.json') });
    const aggregator = new FleetAggregator();
    expect(
      () =>
        new ManagerServer({ port: 8099, host: '0.0.0.0', registry, aggregator, authToken: 'short' })
    ).toThrow(/16 chars/);
  });

  it('allows non-loopback bind when an auth token is provided', () => {
    const registry = new AgentsRegistry({ filePath: join(tmpdir(), 'c.json') });
    const aggregator = new FleetAggregator();
    expect(
      () =>
        new ManagerServer({ port: 8099, host: '0.0.0.0', registry, aggregator, authToken: TOKEN })
    ).not.toThrow();
  });

  describe('with token configured', () => {
    let tmp: string;
    let server: ManagerServer;
    let base: string;

    beforeEach(async () => {
      tmp = join(tmpdir(), `mgr-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(tmp, { recursive: true });
      const port = await getFreePort();
      base = `http://127.0.0.1:${port}`;
      const registry = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
      const aggregator = new FleetAggregator();
      server = new ManagerServer({ port, host: '127.0.0.1', registry, aggregator, authToken: TOKEN });
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
      rmSync(tmp, { recursive: true, force: true });
    });

    it('rejects register without the admin token (401)', async () => {
      const status = await post(`${base}/api/agents/register`, {
        hostname: 'h',
        machine_id: 'm',
      });
      expect(status).toBe(401);
    });

    it('rejects register with a wrong token (401)', async () => {
      const status = await post(
        `${base}/api/agents/register`,
        { hostname: 'h', machine_id: 'm' },
        { Authorization: 'Bearer wrong-token-wrong-token-wrong' }
      );
      expect(status).toBe(401);
    });

    it('accepts register with the correct admin token (201)', async () => {
      const status = await post(
        `${base}/api/agents/register`,
        { hostname: 'h', machine_id: 'm' },
        { Authorization: `Bearer ${TOKEN}` }
      );
      expect(status).toBe(201);
    });

    it('rejects revoke without the admin token (401)', async () => {
      const status = await post(`${base}/api/agents/agent_x/revoke`, {});
      expect(status).toBe(401);
    });
  });
});
