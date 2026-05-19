/**
 * FleetAggregator unit tests
 * FleetAggregator 單元測試
 */

import { describe, it, expect } from 'vitest';
import { FleetAggregator } from '../src/aggregator.js';
import type { AgentRecord, RelayEventBody } from '../src/types.js';

function makeRecord(overrides: Partial<AgentRecord> = {}): AgentRecord {
  return {
    agent_id: 'agent_test',
    token: 't',
    hostname: 'host-a',
    os_type: 'linux',
    panguard_version: '1.5.6',
    machine_id: 'm-a',
    registered_at: new Date(0).toISOString(),
    revoked: false,
    ...overrides,
  };
}

describe('FleetAggregator', () => {
  it('reports empty fleet when no agents are ingested', () => {
    const agg = new FleetAggregator();
    const s = agg.getFleetSummary();
    expect(s.agents_total).toBe(0);
    expect(s.agents_online).toBe(0);
    expect(s.agents_offline).toBe(0);
    expect(s.threats_24h).toBe(0);
  });

  it('hydrateFromRegistry adds known agents as offline', () => {
    const now = 10_000_000;
    const agg = new FleetAggregator({ nowMs: () => now });
    agg.hydrateFromRegistry([makeRecord({ agent_id: 'a1' })]);
    const s = agg.getFleetSummary();
    expect(s.agents_total).toBe(1);
    expect(s.agents_online).toBe(0);
    expect(s.agents_offline).toBe(1);
  });

  it('ingest marks an agent online and records events', () => {
    const now = 1_000_000;
    const agg = new FleetAggregator({ nowMs: () => now });
    const record = makeRecord({ agent_id: 'a1' });

    const body: RelayEventBody = {
      agent_id: 'a1',
      event: {
        type: 'new_event',
        data: { description: 'test event' },
        timestamp: new Date(now).toISOString(),
      },
      status: { mode: 'protection', atr_rule_count: 336 },
    };
    agg.ingest(record, body);

    const detail = agg.getAgentDetail('a1');
    expect(detail).toBeDefined();
    expect(detail?.online).toBe(true);
    expect(detail?.mode).toBe('protection');
    expect(detail?.events_total).toBe(1);
    expect(detail?.atr_rules_active).toBe(336);
    expect(detail?.recent_events).toHaveLength(1);

    const summary = agg.getFleetSummary();
    expect(summary.agents_total).toBe(1);
    expect(summary.agents_online).toBe(1);
    expect(summary.events_total).toBe(1);
    expect(summary.atr_rules_active).toBe(336);
  });

  it('counts malicious verdicts in threats_24h', () => {
    const now = 1_000_000;
    const agg = new FleetAggregator({ nowMs: () => now });
    const record = makeRecord({ agent_id: 'a1' });
    for (let i = 0; i < 3; i++) {
      agg.ingest(record, {
        agent_id: 'a1',
        threat_verdict: { classification: 'malicious', severity: 'high', reason: 'r' } as never,
      });
    }
    const summary = agg.getFleetSummary();
    expect(summary.threats_24h).toBe(3);
  });

  it('drops threats older than 24h from the rolling window', () => {
    let now = 1_000_000_000;
    const agg = new FleetAggregator({ nowMs: () => now });
    const record = makeRecord({ agent_id: 'a1' });
    agg.ingest(record, {
      agent_id: 'a1',
      threat_verdict: { classification: 'malicious', severity: 'high', reason: 'old' } as never,
    });
    // Jump 25 hours forward
    now += 25 * 60 * 60 * 1000;
    agg.ingest(record, {
      agent_id: 'a1',
      threat_verdict: { classification: 'malicious', severity: 'high', reason: 'new' } as never,
    });
    expect(agg.getFleetSummary().threats_24h).toBe(1);
  });

  it('marks agents offline after the threshold elapses', () => {
    let now = 1_000_000;
    const agg = new FleetAggregator({ onlineThresholdMs: 5_000, nowMs: () => now });
    const record = makeRecord({ agent_id: 'a1' });
    agg.ingest(record, { agent_id: 'a1', status: { mode: 'learning' } });
    expect(agg.getAgentDetail('a1')?.online).toBe(true);
    now += 10_000;
    expect(agg.getAgentDetail('a1')?.online).toBe(false);
    expect(agg.getFleetSummary().agents_online).toBe(0);
  });

  it('caps buffered events per agent', () => {
    const agg = new FleetAggregator();
    const record = makeRecord({ agent_id: 'a1' });
    for (let i = 0; i < 600; i++) {
      agg.ingest(record, {
        agent_id: 'a1',
        event: { type: 'new_event', data: { i }, timestamp: new Date().toISOString() },
      });
    }
    const detail = agg.getAgentDetail('a1');
    expect(detail?.events_total).toBe(600);
    // recent_events is sliced to last 50 in the snapshot
    expect(detail?.recent_events.length).toBeLessThanOrEqual(50);
  });

  it('drop() removes an agent from the aggregator', () => {
    const agg = new FleetAggregator();
    const record = makeRecord({ agent_id: 'a1' });
    agg.ingest(record, { agent_id: 'a1', status: { mode: 'learning' } });
    expect(agg.getAgentDetail('a1')).toBeDefined();
    agg.drop('a1');
    expect(agg.getAgentDetail('a1')).toBeUndefined();
  });

  it('returns undefined for unknown agent detail lookup', () => {
    const agg = new FleetAggregator();
    expect(agg.getAgentDetail('does-not-exist')).toBeUndefined();
  });

  it('aggregates fleet atr_rules_active as the max across agents', () => {
    const agg = new FleetAggregator();
    agg.ingest(makeRecord({ agent_id: 'a1' }), {
      agent_id: 'a1',
      status: { atr_rule_count: 100 },
    });
    agg.ingest(makeRecord({ agent_id: 'a2', machine_id: 'm-b', hostname: 'b' }), {
      agent_id: 'a2',
      status: { atr_rule_count: 336 },
    });
    expect(agg.getFleetSummary().atr_rules_active).toBe(336);
  });
});
