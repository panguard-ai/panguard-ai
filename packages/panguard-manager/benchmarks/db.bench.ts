/**
 * Manager DB Operations Benchmark
 *
 * Measures CRUD performance with SQLite for agents, threats, and policies
 * with increasing data volumes (100, 1000, 10000 records).
 */

import { bench, describe, beforeEach, afterEach } from 'vitest';
import { ManagerDB } from '../src/db.js';
import type {
  AgentRegistration,
  AggregatedThreat,
  ThreatEvent,
  PolicyUpdate,
  PolicyRule,
} from '../src/types.js';

// ---------------------------------------------------------------------------
// Synthetic data factories
// ---------------------------------------------------------------------------

function makeAgent(index: number): AgentRegistration {
  return {
    agentId: `ag-bench-${index}`,
    hostname: `host-${index}`,
    platform: {
      os: index % 3 === 0 ? 'darwin' : index % 3 === 1 ? 'linux' : 'windows',
      arch: index % 2 === 0 ? 'x64' : 'arm64',
      ip: `192.168.${Math.floor(index / 256) % 256}.${index % 256}`,
    },
    version: '1.0.0',
    registeredAt: new Date(Date.now() - index * 60000).toISOString(),
    lastHeartbeat: new Date(Date.now() - (index % 300) * 1000).toISOString(),
    status: index % 5 === 0 ? 'offline' : index % 10 === 0 ? 'stale' : 'online',
    organizationId: `org-${index % 5}`,
  };
}

function makeThreatEvent(index: number): ThreatEvent {
  return {
    event: {
      id: `evt-${index}`,
      timestamp: new Date(Date.now() - index * 30000),
      source: 'network',
      severity: index % 4 === 0 ? 'critical' : index % 3 === 0 ? 'high' : 'medium',
      category: index % 2 === 0 ? 'intrusion' : 'brute_force',
      description: `Threat event ${index}`,
      raw: {
        src_ip: `10.0.${Math.floor(index / 256)}.${index % 256}`,
        dst_port: 4444 + (index % 100),
      },
      host: `host-${index % 100}`,
      metadata: { rule: `ET-RULE-${index % 50}` },
    },
    verdict: {
      conclusion: index % 3 === 0 ? 'malicious' : 'suspicious',
      confidence: 0.5 + (index % 50) * 0.01,
      action: index % 2 === 0 ? 'block' : 'alert',
    },
  };
}

function makeThreat(index: number, agentId: string): AggregatedThreat {
  return {
    id: `threat-bench-${index}`,
    originalThreat: makeThreatEvent(index),
    sourceAgentId: agentId,
    sourceHostname: `host-${index % 100}`,
    receivedAt: new Date(Date.now() - index * 30000).toISOString(),
    correlatedWith: index % 5 === 0 ? [`threat-bench-${index - 1}`] : [],
    organizationId: `org-${index % 5}`,
  };
}

function makePolicyRule(index: number): PolicyRule {
  return {
    ruleId: `rule-${index}`,
    type: index % 2 === 0 ? 'block_ip' : 'alert_threshold',
    condition: { threshold: 5 + index },
    action: index % 2 === 0 ? 'drop' : 'alert',
    severity: 'high',
    description: `Policy rule ${index}`,
  };
}

function makePolicy(index: number): PolicyUpdate {
  const rules: PolicyRule[] = [];
  for (let r = 0; r < 5; r++) {
    rules.push(makePolicyRule(index * 5 + r));
  }
  return {
    policyId: `pol-bench-${index}`,
    version: index + 1,
    rules,
    updatedAt: new Date(Date.now() - index * 60000).toISOString(),
    appliedTo: [`ag-bench-${index % 100}`, `ag-bench-${(index + 1) % 100}`],
    organizationId: `org-${index % 5}`,
  };
}

// ---------------------------------------------------------------------------
// Pre-generate data pools
// ---------------------------------------------------------------------------

const AGENTS_100 = Array.from({ length: 100 }, (_, i) => makeAgent(i));
const AGENTS_1000 = Array.from({ length: 1000 }, (_, i) => makeAgent(i));

const THREATS_100 = Array.from({ length: 100 }, (_, i) => makeThreat(i, `ag-bench-${i % 100}`));
const THREATS_1000 = Array.from({ length: 1000 }, (_, i) => makeThreat(i, `ag-bench-${i % 100}`));

const POLICIES_100 = Array.from({ length: 100 }, (_, i) => makePolicy(i));

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe('ManagerDB CRUD Operations', () => {
  let db: ManagerDB;

  beforeEach(() => {
    db = new ManagerDB(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  // -- Agent operations --

  describe('Agent insert', () => {
    bench('upsertAgent - single insert', () => {
      db.upsertAgent(makeAgent(Date.now() % 100000));
    });

    bench('upsertAgent - batch of 100 agents', () => {
      for (const agent of AGENTS_100) {
        db.upsertAgent(agent);
      }
    });

    bench('upsertAgent - batch of 1000 agents', () => {
      for (const agent of AGENTS_1000) {
        db.upsertAgent(agent);
      }
    });
  });

  describe('Agent query (pre-populated)', () => {
    beforeEach(() => {
      for (const agent of AGENTS_1000) {
        db.upsertAgent(agent);
      }
    });

    bench('getAgent by ID', () => {
      db.getAgent('ag-bench-500');
    });

    bench('getAllAgents (1000 records)', () => {
      db.getAllAgents();
    });

    bench('getAgentsByStatus - online', () => {
      db.getAgentsByStatus('online');
    });

    bench('getAgentsByOrg', () => {
      db.getAgentsByOrg('org-2');
    });

    bench('getAgentCount', () => {
      db.getAgentCount();
    });

    bench('updateAgentStatus', () => {
      db.updateAgentStatus('ag-bench-500', 'offline');
    });

    bench('updateHeartbeat', () => {
      db.updateHeartbeat('ag-bench-500', new Date().toISOString());
    });
  });

  // -- Threat operations --

  describe('Threat insert', () => {
    beforeEach(() => {
      // Agents must exist for foreign key constraint
      for (const agent of AGENTS_100) {
        db.upsertAgent(agent);
      }
    });

    bench('insertThreat - single insert', () => {
      const threat = makeThreat(Date.now() % 100000, `ag-bench-${Date.now() % 100}`);
      db.insertThreat(threat);
    });

    bench('insertThreat - batch of 100 threats', () => {
      for (const threat of THREATS_100) {
        db.insertThreat(threat);
      }
    });

    bench('insertThreat - batch of 1000 threats', () => {
      for (const threat of THREATS_1000) {
        db.insertThreat(threat);
      }
    });
  });

  describe('Threat query (pre-populated with 1000)', () => {
    beforeEach(() => {
      for (const agent of AGENTS_100) {
        db.upsertAgent(agent);
      }
      for (const threat of THREATS_1000) {
        db.insertThreat(threat);
      }
    });

    bench('getThreatsByAgent', () => {
      db.getThreatsByAgent('ag-bench-50');
    });

    bench('getRecentThreats (last hour)', () => {
      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      db.getRecentThreats(oneHourAgo);
    });

    bench('getThreatCount', () => {
      db.getThreatCount();
    });

    bench('getThreatsByOrg', () => {
      db.getThreatsByOrg('org-2');
    });

    bench('purgeOldThreats (30 days cutoff)', () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      db.purgeOldThreats(cutoff);
    });
  });

  // -- Policy operations --

  describe('Policy insert', () => {
    bench('insertPolicy - single active policy', () => {
      db.insertPolicy(makePolicy(Date.now() % 100000), true);
    });

    bench('insertPolicy - batch of 100 policies (inactive)', () => {
      for (const policy of POLICIES_100) {
        db.insertPolicy(policy, false);
      }
    });
  });

  describe('Policy query (pre-populated with 100)', () => {
    beforeEach(() => {
      for (let i = 0; i < POLICIES_100.length; i++) {
        db.insertPolicy(POLICIES_100[i]!, i === POLICIES_100.length - 1);
      }
    });

    bench('getActivePolicy', () => {
      db.getActivePolicy();
    });

    bench('getPolicyHistory', () => {
      db.getPolicyHistory();
    });

    bench('getActivePolicyForOrg', () => {
      db.getActivePolicyForOrg('org-2');
    });

    bench('deactivateAllPolicies', () => {
      db.deactivateAllPolicies();
    });
  });

  // -- Mixed workload --

  describe('Mixed workload simulation', () => {
    bench('insert 50 agents + 200 threats + 10 policies', () => {
      const localDb = new ManagerDB(':memory:');
      try {
        for (let i = 0; i < 50; i++) {
          localDb.upsertAgent(makeAgent(i));
        }
        for (let i = 0; i < 200; i++) {
          localDb.insertThreat(makeThreat(i, `ag-bench-${i % 50}`));
        }
        for (let i = 0; i < 10; i++) {
          localDb.insertPolicy(makePolicy(i), i === 9);
        }
      } finally {
        localDb.close();
      }
    });

    bench('read-heavy: 50 agent lookups + 50 threat queries', () => {
      const localDb = new ManagerDB(':memory:');
      try {
        for (let i = 0; i < 100; i++) {
          localDb.upsertAgent(makeAgent(i));
        }
        for (let i = 0; i < 500; i++) {
          localDb.insertThreat(makeThreat(i, `ag-bench-${i % 100}`));
        }
        for (let i = 0; i < 50; i++) {
          localDb.getAgent(`ag-bench-${i}`);
        }
        for (let i = 0; i < 50; i++) {
          localDb.getThreatsByAgent(`ag-bench-${i}`);
        }
      } finally {
        localDb.close();
      }
    });
  });
});
