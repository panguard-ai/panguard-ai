/**
 * End-to-end persistence: relay event → aggregator + events store → simulate
 * Manager restart → fresh aggregator hydrates from disk → dashboard shows the
 * same state.
 *
 * This is the highest-value test for Phase 2A — it pins the contract that
 * Pilot customers care about ("my dashboard still has yesterday's events
 * after I bounced the server").
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsStore } from '../src/agents-store.js';
import { OperatorStore } from '../src/operators-store.js';
import { EnrollmentTokenStore } from '../src/enrollment-store.js';
import { EventsStore } from '../src/events-store.js';
import { FleetAggregator } from '../src/aggregator.js';
import { ManagerServer } from '../src/server.js';

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

async function jsonPost(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: unknown }> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* leave */
  }
  return { status: r.status, body: parsed };
}

describe('events persistence roundtrip', () => {
  let tmp: string;
  let dbPath: string;
  let port: number;
  let base: string;
  let server: ManagerServer;
  let registry: AgentsStore;
  let operators: OperatorStore;
  let enrollment: EnrollmentTokenStore;
  let events: EventsStore;
  let aggregator: FleetAggregator;
  let adminCookie: string;
  let adminId: number;

  async function boot(opts: { hydrateFromStore?: boolean } = {}): Promise<void> {
    port = await getFreePort();
    base = `http://127.0.0.1:${port}`;
    registry = new AgentsStore({ dbPath });
    operators = new OperatorStore({ db: registry.getRawDb() });
    enrollment = new EnrollmentTokenStore({ db: registry.getRawDb() });
    events = new EventsStore({ db: registry.getRawDb() });
    // First boot creates the admin; later boots reuse the existing record.
    let admin = operators.listOperators().find((o) => o.username === 'admin');
    if (!admin) {
      admin = operators.createOperator({
        username: 'admin',
        password: 'test-pw-correct-horse',
        role: 'admin',
      });
    }
    adminId = admin.id;
    adminCookie = `pgm_session=${operators.createSession(adminId).token}`;
    aggregator = new FleetAggregator({ eventsStore: events });
    if (opts.hydrateFromStore) {
      for (const record of registry.list()) {
        aggregator.hydrateAgentFromStore(record, events.hydrateAgent(record.agent_id));
      }
    } else {
      aggregator.hydrateFromRegistry(registry.list());
    }
    server = new ManagerServer({
      port,
      host: '127.0.0.1',
      registry,
      aggregator,
      operators,
      enrollment,
    });
    await server.start();
  }

  async function shutdown(): Promise<void> {
    await server.stop();
    registry.close();
  }

  beforeEach(async () => {
    tmp = join(tmpdir(), `pgm-persist-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmp, { recursive: true });
    dbPath = join(tmp, 'manager.db');
    await boot();
  });

  afterEach(async () => {
    await shutdown();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('relay events written through to SQLite, survive a Manager restart', async () => {
    // Issue enrollment token + register an agent
    const enrollToken = enrollment.issue({ createdByOperatorId: adminId }).token;
    const reg = await jsonPost(
      `${base}/api/agents/register`,
      {
        hostname: 'host-A',
        os_type: 'linux',
        panguard_version: '1.5.6',
        machine_id: 'm-A',
      },
      { 'X-Enrollment-Token': enrollToken }
    );
    const { agent_id, token } = (
      reg.body as { data: { agent_id: string; token: string } }
    ).data;

    // Relay 1 event + 1 threat verdict + 1 status snapshot
    await jsonPost(
      `${base}/api/relay/event`,
      {
        agent_id,
        event: {
          type: 'new_event',
          data: { desc: 'persistence-test' },
          timestamp: new Date().toISOString(),
        },
        threat_verdict: { classification: 'malicious', severity: 'critical', reason: 'r' },
        status: { mode: 'protection', atr_rule_count: 336 },
      },
      { Authorization: `Bearer ${token}` }
    );

    // Confirm SQLite has the rows
    const rowsBeforeRestart = registry
      .getRawDb()
      .prepare('SELECT kind, is_threat FROM agent_events WHERE agent_id = ? ORDER BY kind')
      .all(agent_id) as Array<{ kind: string; is_threat: number }>;
    expect(rowsBeforeRestart.map((r) => r.kind).sort()).toEqual(['event', 'status', 'verdict']);

    // Now simulate restart: shut down the Manager, reopen the store, hydrate.
    await shutdown();
    await boot({ hydrateFromStore: true });

    // The fresh aggregator should show the agent online (last_seen rebuilt),
    // 1 threat in 24h, atr_rules_active=336, and an event in the drill-down.
    const detail = (await (
      await fetch(`${base}/api/agents/${agent_id}`, { headers: { Cookie: adminCookie } })
    ).json()) as {
      data: {
        threats_24h: number;
        events_total: number;
        atr_rules_active: number;
        mode: string;
        recent_events: ReadonlyArray<{ type: string }>;
        recent_verdicts: ReadonlyArray<unknown>;
      };
    };
    expect(detail.data.threats_24h).toBe(1);
    expect(detail.data.events_total).toBe(1);
    expect(detail.data.atr_rules_active).toBe(336);
    expect(detail.data.mode).toBe('protection');
    expect(detail.data.recent_events).toHaveLength(1);
    expect(detail.data.recent_events[0]?.type).toBe('new_event');
    expect(detail.data.recent_verdicts).toHaveLength(1);
  });

  it('threats older than 24h are excluded from the rolling counter on restart', async () => {
    const enrollToken = enrollment.issue({ createdByOperatorId: adminId }).token;
    const reg = await jsonPost(
      `${base}/api/agents/register`,
      {
        hostname: 'host-B',
        os_type: 'linux',
        panguard_version: '1.5.6',
        machine_id: 'm-B',
      },
      { 'X-Enrollment-Token': enrollToken }
    );
    const { agent_id } = (reg.body as { data: { agent_id: string } }).data;

    // Directly seed two threats via EventsStore — one 25h old, one 5min old
    const nowMs = Date.now();
    events.record(
      agent_id,
      {
        agent_id,
        threat_verdict: { classification: 'malicious' } as never,
      },
      nowMs - 25 * 60 * 60 * 1000
    );
    events.record(
      agent_id,
      {
        agent_id,
        threat_verdict: { severity: 'critical' } as never,
      },
      nowMs - 5 * 60 * 1000
    );

    await shutdown();
    await boot({ hydrateFromStore: true });

    const detail = (await (
      await fetch(`${base}/api/agents/${agent_id}`, { headers: { Cookie: adminCookie } })
    ).json()) as { data: { threats_24h: number } };
    expect(detail.data.threats_24h).toBe(1);
  });

  it('persistence failure does not crash the aggregator (best-effort)', async () => {
    // Close the DB out from under the EventsStore to force record() to throw.
    // Aggregator's in-memory state must still update.
    registry.getRawDb().close();
    aggregator.ingest(
      {
        agent_id: 'agent_synthetic',
        token: 't',
        hostname: 'h',
        os_type: 'linux',
        panguard_version: 'x',
        machine_id: 'm',
        registered_at: new Date().toISOString(),
        revoked: false,
      },
      {
        agent_id: 'agent_synthetic',
        event: { type: 'e', data: {}, timestamp: '' },
      }
    );
    // No throw is the assertion — the test passing means the catch swallowed
    // the DB error.
    expect(aggregator.listAgents().length).toBeGreaterThan(0);
  });
});
