/**
 * EventsStore unit tests — write-through, recent reads, threat counting,
 * hydration, retention sweep.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { openDatabase } from '../src/db/connection.js';
import { AgentsStore } from '../src/agents-store.js';
import { EventsStore, isThreatVerdict } from '../src/events-store.js';

describe('EventsStore', () => {
  let db: Database.Database;
  let agents: AgentsStore;
  let events: EventsStore;
  let agentId: string;

  beforeEach(() => {
    db = openDatabase({ path: ':memory:' });
    // Need at least one row in `agents` because agent_events has an FK.
    agents = new AgentsStore({ dbPath: ':memory:', db });
    const reg = agents.register({
      hostname: 'h1',
      os_type: 'linux',
      panguard_version: '1.0.0',
      machine_id: 'm1',
    });
    agentId = reg.agent_id;
    events = new EventsStore({ db });
  });

  afterEach(() => {
    db.close();
  });

  describe('isThreatVerdict', () => {
    it('classifies by classification field', () => {
      expect(isThreatVerdict({ classification: 'malicious' } as never)).toBe(true);
      expect(isThreatVerdict({ classification: 'suspicious' } as never)).toBe(true);
      expect(isThreatVerdict({ classification: 'benign' } as never)).toBe(false);
    });
    it('classifies by severity field', () => {
      expect(isThreatVerdict({ severity: 'critical' } as never)).toBe(true);
      expect(isThreatVerdict({ severity: 'high' } as never)).toBe(true);
      expect(isThreatVerdict({ severity: 'low' } as never)).toBe(false);
    });
  });

  describe('record', () => {
    it('persists event, verdict, and status as separate rows', () => {
      events.record(agentId, {
        agent_id: agentId,
        event: { type: 'new_event', data: { description: 'x' }, timestamp: new Date().toISOString() },
        threat_verdict: { classification: 'malicious', severity: 'high', reason: 'r' } as never,
        status: { mode: 'protection', atr_rule_count: 42 },
      });
      const rows = db
        .prepare('SELECT kind, is_threat FROM agent_events WHERE agent_id = ? ORDER BY kind')
        .all(agentId) as Array<{ kind: string; is_threat: number }>;
      expect(rows.map((r) => r.kind).sort()).toEqual(['event', 'status', 'verdict']);
      const verdict = rows.find((r) => r.kind === 'verdict');
      expect(verdict?.is_threat).toBe(1);
    });

    it('skips bodies with no relayed fields', () => {
      events.record(agentId, { agent_id: agentId });
      const count = (db.prepare('SELECT COUNT(*) AS n FROM agent_events').get() as { n: number })
        .n;
      expect(count).toBe(0);
    });

    it('skips when agent_id is empty', () => {
      events.record('', { agent_id: '', status: { mode: 'protection' } });
      const count = (db.prepare('SELECT COUNT(*) AS n FROM agent_events').get() as { n: number })
        .n;
      expect(count).toBe(0);
    });

    it('benign verdict has is_threat = 0', () => {
      events.record(agentId, {
        agent_id: agentId,
        threat_verdict: { classification: 'benign', severity: 'low' } as never,
      });
      const r = db.prepare('SELECT is_threat FROM agent_events').get() as { is_threat: number };
      expect(r.is_threat).toBe(0);
    });
  });

  describe('recentEvents / recentVerdicts', () => {
    it('returns rows oldest-first up to the limit', () => {
      for (let i = 0; i < 5; i++) {
        events.record(
          agentId,
          {
            agent_id: agentId,
            event: { type: `evt-${i}`, data: { i }, timestamp: new Date().toISOString() },
          },
          1_000_000 + i // monotonic timestamps so ordering is deterministic
        );
      }
      const recent = events.recentEvents(agentId, 3);
      expect(recent).toHaveLength(3);
      // recentEvents reverses the DESC-from-DB result so callers see chronological order.
      expect((recent as Array<{ type: string }>).map((e) => e.type)).toEqual([
        'evt-2',
        'evt-3',
        'evt-4',
      ]);
    });

    it('honors per-kind isolation (events vs verdicts)', () => {
      events.record(agentId, {
        agent_id: agentId,
        event: { type: 'e1', data: {}, timestamp: '' },
        threat_verdict: { classification: 'benign' } as never,
      });
      expect(events.recentEvents(agentId)).toHaveLength(1);
      expect(events.recentVerdicts(agentId)).toHaveLength(1);
    });
  });

  describe('threat counting', () => {
    it('counts per-agent threats since a timestamp', () => {
      const nowMs = Date.now();
      events.record(
        agentId,
        {
          agent_id: agentId,
          threat_verdict: { classification: 'malicious' } as never,
        },
        nowMs - 60_000
      );
      events.record(
        agentId,
        {
          agent_id: agentId,
          threat_verdict: { classification: 'benign' } as never,
        },
        nowMs - 30_000
      );
      events.record(
        agentId,
        {
          agent_id: agentId,
          threat_verdict: { classification: 'suspicious' } as never,
        },
        nowMs - 10_000
      );
      const since = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
      expect(events.threatCountSince(agentId, since)).toBe(2);
    });

    it('respects window cutoff', () => {
      const nowMs = Date.now();
      events.record(
        agentId,
        {
          agent_id: agentId,
          threat_verdict: { severity: 'critical' } as never,
        },
        nowMs - 48 * 60 * 60 * 1000 // 48h ago
      );
      const since24h = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
      expect(events.threatCountSince(agentId, since24h)).toBe(0);
    });

    it('global count aggregates across agents', () => {
      const reg2 = agents.register({
        hostname: 'h2',
        os_type: 'linux',
        panguard_version: '1.0.0',
        machine_id: 'm2',
      });
      events.record(agentId, {
        agent_id: agentId,
        threat_verdict: { classification: 'malicious' } as never,
      });
      events.record(reg2.agent_id, {
        agent_id: reg2.agent_id,
        threat_verdict: { severity: 'high' } as never,
      });
      const since = new Date(0).toISOString();
      expect(events.globalThreatCountSince(since)).toBe(2);
    });
  });

  describe('hydrateAgent', () => {
    it('returns empty/defaulted record for an agent with no history', () => {
      const h = events.hydrateAgent(agentId);
      expect(h.events).toHaveLength(0);
      expect(h.verdicts).toHaveLength(0);
      expect(h.threat_times_ms).toHaveLength(0);
      expect(h.events_total).toBe(0);
      expect(h.last_seen_ms).toBeUndefined();
      expect(h.mode).toBe('unknown');
      expect(h.atr_rules_active).toBe(0);
    });

    it('reconstructs events/verdicts/status from persisted rows', () => {
      const t0 = Date.now() - 5_000;
      events.record(
        agentId,
        {
          agent_id: agentId,
          event: { type: 'old', data: {}, timestamp: '' },
        },
        t0
      );
      events.record(
        agentId,
        {
          agent_id: agentId,
          event: { type: 'new', data: {}, timestamp: '' },
          threat_verdict: { classification: 'malicious' } as never,
          status: { mode: 'protection', atr_rule_count: 336 },
        },
        t0 + 1000
      );
      const h = events.hydrateAgent(agentId);
      expect(h.events_total).toBe(2);
      expect(h.events).toHaveLength(2);
      expect(h.verdicts).toHaveLength(1);
      expect(h.threat_times_ms).toHaveLength(1);
      expect(h.last_seen_ms).toBeGreaterThanOrEqual(t0);
      expect(h.mode).toBe('protection');
      expect(h.atr_rules_active).toBe(336);
    });

    it('excludes threats older than 24h from threat_times_ms', () => {
      const nowMs = Date.now();
      events.record(
        agentId,
        {
          agent_id: agentId,
          threat_verdict: { severity: 'critical' } as never,
        },
        nowMs - 25 * 60 * 60 * 1000
      );
      events.record(
        agentId,
        {
          agent_id: agentId,
          threat_verdict: { severity: 'critical' } as never,
        },
        nowMs - 5 * 60 * 1000
      );
      const h = events.hydrateAgent(agentId);
      expect(h.threat_times_ms).toHaveLength(1);
    });
  });

  describe('sweep', () => {
    it('deletes rows older than retentionMs', () => {
      const nowMs = Date.now();
      events.record(
        agentId,
        {
          agent_id: agentId,
          event: { type: 'old', data: {}, timestamp: '' },
        },
        nowMs - 31 * 24 * 60 * 60 * 1000
      );
      events.record(
        agentId,
        {
          agent_id: agentId,
          event: { type: 'fresh', data: {}, timestamp: '' },
        },
        nowMs - 1_000
      );
      const deleted = events.sweep(30 * 24 * 60 * 60 * 1000);
      expect(deleted).toBe(1);
      expect(events.countEventsForAgent(agentId)).toBe(1);
    });

    it('with retention=0 deletes everything that is not strictly future-dated', () => {
      events.record(agentId, {
        agent_id: agentId,
        event: { type: 'now', data: {}, timestamp: '' },
      });
      // tiny sleep so cutoff > inserted observed_at
      const start = Date.now();
      while (Date.now() - start < 5) {
        /* spin */
      }
      const deleted = events.sweep(0);
      expect(deleted).toBeGreaterThanOrEqual(1);
    });
  });
});
