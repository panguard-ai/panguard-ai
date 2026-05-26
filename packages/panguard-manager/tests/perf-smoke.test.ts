/**
 * Perf smoke: list + detail latency at Pilot-scale fleet sizes.
 *
 * Disabled by default — set PANGUARD_PERF=1 to run:
 *   PANGUARD_PERF=1 pnpm --filter @panguard-ai/panguard-manager \
 *     test --run tests/perf-smoke.test.ts
 *
 * The smoke seeds N agents + per-agent events directly via SQL (skipping
 * the HTTP register loop, which is bounded by enrollment-token issuance
 * cost, not by the dashboard path we care about here). Then it hammers
 * /api/agents and /api/agents/:id and asserts p99 latency stays under a
 * conservative budget so we notice when something obviously regresses.
 *
 * On a 2024 MacBook Pro M-class CPU we see numbers well below the budget
 * for N=10000 agents / ~50000 agent_events rows.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentsStore } from '../src/agents-store.js';
import { OperatorStore } from '../src/operators-store.js';
import { EnrollmentTokenStore } from '../src/enrollment-store.js';
import { EventsStore } from '../src/events-store.js';
import { FleetAggregator } from '../src/aggregator.js';
import { ManagerServer } from '../src/server.js';

const N_AGENTS = Number.parseInt(process.env['PANGUARD_PERF_AGENTS'] ?? '10000', 10);
const EVENTS_PER_AGENT = Number.parseInt(process.env['PANGUARD_PERF_EVENTS'] ?? '5', 10);
const LIST_BUDGET_MS = Number.parseInt(process.env['PANGUARD_PERF_LIST_BUDGET'] ?? '500', 10);
const DETAIL_BUDGET_MS = Number.parseInt(
  process.env['PANGUARD_PERF_DETAIL_BUDGET'] ?? '100',
  10
);

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

function percentile(samples: ReadonlyArray<number>, p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx] ?? 0;
}

describe.skipIf(!process.env['PANGUARD_PERF'])(
  `perf smoke: ${N_AGENTS} agents, ${EVENTS_PER_AGENT} events each`,
  () => {
    let tmp: string;
    let port: number;
    let base: string;
    let server: ManagerServer;
    let registry: AgentsStore;
    let cookie: string;
    let sampleAgentId: string;
    let dbSizeAfterSeedBytes = 0;

    beforeAll(async () => {
      tmp = join(tmpdir(), `pgm-perf-${Date.now()}`);
      mkdirSync(tmp, { recursive: true });
      const dbPath = join(tmp, 'manager.db');

      registry = new AgentsStore({ dbPath });
      const operators = new OperatorStore({ db: registry.getRawDb() });
      const enrollment = new EnrollmentTokenStore({ db: registry.getRawDb() });
      const events = new EventsStore({ db: registry.getRawDb() });
      const admin = operators.createOperator({
        username: 'admin',
        password: 'perf-test-pw-12345678',
        role: 'admin',
      });
      cookie = `pgm_session=${operators.createSession(admin.id).token}`;

      // Seed agents in batches via prepared INSERT inside a single
      // transaction — bypasses the HTTP register path which is bounded by
      // enrollment-token issuance, not the dashboard read path we care
      // about.
      const insertAgent = registry.getRawDb().prepare(
        `INSERT INTO agents (
           agent_id, token, hostname, os_type, panguard_version,
           machine_id, registered_at, last_seen, revoked
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
      );
      const seedAgents = registry.getRawDb().transaction((n: number) => {
        const baseTime = Date.now() - 60_000;
        for (let i = 0; i < n; i++) {
          insertAgent.run(
            `agent_${i.toString(36).padStart(8, '0')}`,
            `tok_${i}`,
            `host-${i}`,
            i % 2 === 0 ? 'linux' : 'darwin',
            '1.5.6',
            `m-${i}`,
            new Date(baseTime - i).toISOString(),
            new Date(baseTime + i).toISOString()
          );
        }
      });
      seedAgents(N_AGENTS);

      // Pick a sample agent in the middle for detail latency.
      sampleAgentId = `agent_${Math.floor(N_AGENTS / 2).toString(36).padStart(8, '0')}`;

      // Seed events for each agent.
      const insertEvent = registry.getRawDb().prepare(
        `INSERT INTO agent_events (
           agent_id, kind, payload_json, observed_at, is_threat
         ) VALUES (?, ?, ?, ?, ?)`
      );
      const seedEvents = registry.getRawDb().transaction(() => {
        for (let i = 0; i < N_AGENTS; i++) {
          const id = `agent_${i.toString(36).padStart(8, '0')}`;
          for (let j = 0; j < EVENTS_PER_AGENT; j++) {
            insertEvent.run(
              id,
              j % 3 === 0 ? 'event' : j % 3 === 1 ? 'verdict' : 'status',
              JSON.stringify({ desc: `seed ${i}-${j}` }),
              new Date(Date.now() - j * 1000).toISOString(),
              j % 7 === 0 ? 1 : 0
            );
          }
        }
      });
      seedEvents();

      dbSizeAfterSeedBytes = statSync(dbPath).size;

      const aggregator = new FleetAggregator({ eventsStore: events });
      for (const record of registry.list()) {
        aggregator.hydrateAgentFromStore(record, events.hydrateAgent(record.agent_id));
      }

      port = await getFreePort();
      base = `http://127.0.0.1:${port}`;
      server = new ManagerServer({
        port,
        host: '127.0.0.1',
        registry,
        aggregator,
        operators,
        enrollment,
      });
      await server.start();
    }, 300_000);

    afterAll(async () => {
      await server.stop();
      registry.close();
      rmSync(tmp, { recursive: true, force: true });
    });

    it('GET /api/agents p99 latency under budget', async () => {
      // Warm-up so we measure steady state, not first-call cost.
      for (let i = 0; i < 5; i++) {
        await fetch(`${base}/api/agents`, { headers: { Cookie: cookie } });
      }
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const t0 = performance.now();
        const r = await fetch(`${base}/api/agents`, { headers: { Cookie: cookie } });
        await r.text();
        samples.push(performance.now() - t0);
      }
      const p50 = percentile(samples, 0.5);
      const p99 = percentile(samples, 0.99);
      // eslint-disable-next-line no-console
      console.log(
        `  list:   p50=${p50.toFixed(1)}ms  p99=${p99.toFixed(1)}ms  ` +
          `(${N_AGENTS} agents, db=${(dbSizeAfterSeedBytes / 1024 / 1024).toFixed(1)}MB)`
      );
      expect(p99).toBeLessThan(LIST_BUDGET_MS);
    });

    it('GET /api/agents/:id p99 latency under budget', async () => {
      for (let i = 0; i < 5; i++) {
        await fetch(`${base}/api/agents/${sampleAgentId}`, { headers: { Cookie: cookie } });
      }
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const t0 = performance.now();
        const r = await fetch(`${base}/api/agents/${sampleAgentId}`, {
          headers: { Cookie: cookie },
        });
        await r.text();
        samples.push(performance.now() - t0);
      }
      const p50 = percentile(samples, 0.5);
      const p99 = percentile(samples, 0.99);
      // eslint-disable-next-line no-console
      console.log(`  detail: p50=${p50.toFixed(1)}ms  p99=${p99.toFixed(1)}ms`);
      expect(p99).toBeLessThan(DETAIL_BUDGET_MS);
    });

    it('GET /api/status p99 latency under budget', async () => {
      for (let i = 0; i < 5; i++) {
        await fetch(`${base}/api/status`, { headers: { Cookie: cookie } });
      }
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const t0 = performance.now();
        const r = await fetch(`${base}/api/status`, { headers: { Cookie: cookie } });
        await r.text();
        samples.push(performance.now() - t0);
      }
      const p50 = percentile(samples, 0.5);
      const p99 = percentile(samples, 0.99);
      // eslint-disable-next-line no-console
      console.log(`  status: p50=${p50.toFixed(1)}ms  p99=${p99.toFixed(1)}ms`);
      expect(p99).toBeLessThan(LIST_BUDGET_MS);
    });
  }
);
