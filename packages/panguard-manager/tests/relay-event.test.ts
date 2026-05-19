/**
 * Relay-event end-to-end HTTP test against a live ManagerServer
 * Relay-event 對啟動中的 ManagerServer 的端對端 HTTP 測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsRegistry } from '../src/agents-registry.js';
import { FleetAggregator } from '../src/aggregator.js';
import { ManagerServer } from '../src/server.js';

/** Find a free TCP port to avoid collisions in parallel test runs / 找個空閒的 TCP 埠避免平行測試衝突 */
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

interface PostResult {
  status: number;
  body: unknown;
}

async function post(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<PostResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  return { status: res.status, body: parsed };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  return res.json();
}

describe('relay-event HTTP flow', () => {
  let tmp: string;
  let port: number;
  let server: ManagerServer;
  let base: string;
  let registry: AgentsRegistry;

  beforeEach(async () => {
    tmp = join(
      tmpdir(),
      `panguard-manager-it-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(tmp, { recursive: true });
    port = await getFreePort();
    base = `http://127.0.0.1:${port}`;
    registry = new AgentsRegistry({ filePath: join(tmp, 'agents.json') });
    const aggregator = new FleetAggregator();
    server = new ManagerServer({ port, host: '127.0.0.1', registry, aggregator });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('healthz returns ok', async () => {
    const r = await fetch(`${base}/healthz`);
    expect(r.status).toBe(200);
    const json = (await r.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it('register issues an agent_id and token', async () => {
    const r = await post(`${base}/api/agents/register`, {
      hostname: 'host-1',
      os_type: 'linux',
      panguard_version: '1.5.6',
      machine_id: 'm-1',
    });
    expect(r.status).toBe(201);
    const body = r.body as { ok: boolean; data: { agent_id: string; token: string } };
    expect(body.ok).toBe(true);
    expect(body.data.agent_id).toMatch(/^agent_/);
    expect(body.data.token).toHaveLength(64);
  });

  it('register requires hostname + machine_id', async () => {
    const r = await post(`${base}/api/agents/register`, { os_type: 'linux' });
    expect(r.status).toBe(400);
    const body = r.body as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
  });

  it('relay event without token is rejected with 401', async () => {
    const r = await post(`${base}/api/relay/event`, {
      agent_id: 'agent_x',
      status: { mode: 'protection' },
    });
    expect(r.status).toBe(401);
  });

  it('relay event with bad token is rejected with 401', async () => {
    const reg = await post(`${base}/api/agents/register`, {
      hostname: 'h',
      os_type: 'linux',
      panguard_version: '1.5.6',
      machine_id: 'm',
    });
    const { agent_id } = (reg.body as { data: { agent_id: string } }).data;
    const r = await post(
      `${base}/api/relay/event`,
      { agent_id, status: { mode: 'protection' } },
      { Authorization: 'Bearer bad-token' }
    );
    expect(r.status).toBe(401);
  });

  it('ingests a valid relay event and surfaces it via /api/status', async () => {
    const reg = await post(`${base}/api/agents/register`, {
      hostname: 'host-z',
      os_type: 'darwin',
      panguard_version: '1.5.6',
      machine_id: 'm-z',
    });
    const { agent_id, token } = (reg.body as { data: { agent_id: string; token: string } }).data;

    const r = await post(
      `${base}/api/relay/event`,
      {
        agent_id,
        event: {
          type: 'new_event',
          data: { description: 'first event' },
          timestamp: new Date().toISOString(),
        },
        threat_verdict: { classification: 'malicious', severity: 'high', reason: 'spotted' },
        status: { mode: 'protection', atr_rule_count: 336 },
      },
      { Authorization: `Bearer ${token}` }
    );
    expect(r.status).toBe(200);

    const status = (await getJson(`${base}/api/status`)) as {
      ok: boolean;
      data: {
        summary: {
          agents_total: number;
          agents_online: number;
          threats_24h: number;
          atr_rules_active: number;
        };
      };
    };
    expect(status.ok).toBe(true);
    expect(status.data.summary.agents_total).toBe(1);
    expect(status.data.summary.agents_online).toBe(1);
    expect(status.data.summary.threats_24h).toBe(1);
    expect(status.data.summary.atr_rules_active).toBe(336);

    const agents = (await getJson(`${base}/api/agents`)) as {
      data: { agents: ReadonlyArray<{ hostname: string; threats_24h: number }> };
    };
    expect(agents.data.agents).toHaveLength(1);
    expect(agents.data.agents[0]?.hostname).toBe('host-z');
    expect(agents.data.agents[0]?.threats_24h).toBe(1);
  });

  it('serves the dashboard HTML on /', async () => {
    const r = await fetch(`${base}/`);
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('PANGUARD');
    expect(html).toContain('Fleet');
    expect(html).not.toContain('__NONCE__');
  });

  it('returns 404 for unknown paths', async () => {
    const r = await fetch(`${base}/no/such/path`);
    expect(r.status).toBe(404);
  });
});
