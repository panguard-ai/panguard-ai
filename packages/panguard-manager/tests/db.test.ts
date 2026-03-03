/**
 * ManagerDB comprehensive tests
 * ManagerDB SQLite 資料庫層完整測試
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManagerDB } from '../src/db.js';
import type {
  AgentRegistration,
  AggregatedThreat,
  PolicyUpdate,
  ThreatEvent,
  PolicyRule,
} from '../src/types.js';

// =========================================================================
// Test data helpers / 測試資料工廠函式
// =========================================================================

function makeAgent(overrides?: Partial<AgentRegistration>): AgentRegistration {
  return {
    agentId: 'ag-test001',
    hostname: 'test-host',
    platform: { os: 'linux', arch: 'x64', ip: '192.168.1.10' },
    version: '1.0.0',
    registeredAt: '2026-01-01T00:00:00.000Z',
    lastHeartbeat: '2026-01-01T00:00:00.000Z',
    status: 'online',
    ...overrides,
  };
}

function makeThreatEvent(overrides?: Partial<ThreatEvent>): ThreatEvent {
  return {
    event: {
      id: 'evt-001',
      timestamp: new Date('2026-01-15T12:00:00.000Z'),
      source: 'network',
      severity: 'high',
      category: 'intrusion',
      description: 'Suspicious network connection detected',
      raw: { src_ip: '10.0.0.99', dst_port: 4444 },
      host: 'test-host',
      metadata: { rule: 'ET TROJAN' },
    },
    verdict: {
      conclusion: 'malicious',
      confidence: 0.95,
      action: 'block',
    },
    ...overrides,
  };
}

function makeThreat(overrides?: Partial<AggregatedThreat>): AggregatedThreat {
  return {
    id: 'threat-001',
    originalThreat: makeThreatEvent(),
    sourceAgentId: 'ag-test001',
    sourceHostname: 'test-host',
    receivedAt: '2026-01-15T12:00:00.000Z',
    correlatedWith: [],
    ...overrides,
  };
}

function makePolicyRule(overrides?: Partial<PolicyRule>): PolicyRule {
  return {
    ruleId: 'rule-001',
    type: 'block_ip',
    condition: { ip: '10.0.0.99' },
    action: 'drop',
    severity: 'high',
    description: 'Block known malicious IP',
    ...overrides,
  };
}

function makePolicy(overrides?: Partial<PolicyUpdate>): PolicyUpdate {
  return {
    policyId: 'pol-001',
    version: 1,
    rules: [makePolicyRule()],
    updatedAt: '2026-01-20T00:00:00.000Z',
    appliedTo: ['ag-test001', 'ag-test002'],
    ...overrides,
  };
}

// =========================================================================
// Tests
// =========================================================================

describe('ManagerDB', () => {
  let db: ManagerDB;

  beforeEach(() => {
    db = new ManagerDB(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  // ── Agent CRUD ────────────────────────────────────────────────

  describe('Agent CRUD', () => {
    describe('upsertAgent', () => {
      it('should insert a new agent and retrieve it', () => {
        const agent = makeAgent();
        db.upsertAgent(agent);

        const retrieved = db.getAgent('ag-test001');
        expect(retrieved).toBeDefined();
        expect(retrieved!.agentId).toBe('ag-test001');
        expect(retrieved!.hostname).toBe('test-host');
        expect(retrieved!.platform.os).toBe('linux');
        expect(retrieved!.platform.arch).toBe('x64');
        expect(retrieved!.platform.ip).toBe('192.168.1.10');
        expect(retrieved!.version).toBe('1.0.0');
        expect(retrieved!.status).toBe('online');
        expect(retrieved!.registeredAt).toBe('2026-01-01T00:00:00.000Z');
        expect(retrieved!.lastHeartbeat).toBe('2026-01-01T00:00:00.000Z');
      });

      it('should handle agent without optional ip field', () => {
        const agent = makeAgent({
          agentId: 'ag-noip',
          platform: { os: 'darwin', arch: 'arm64' },
        });
        db.upsertAgent(agent);

        const retrieved = db.getAgent('ag-noip');
        expect(retrieved).toBeDefined();
        expect(retrieved!.platform.ip).toBeUndefined();
      });

      it('should update existing agent on upsert (conflict on agent_id)', () => {
        const agent = makeAgent();
        db.upsertAgent(agent);

        const updated = makeAgent({
          hostname: 'updated-host',
          version: '2.0.0',
          status: 'offline',
          lastHeartbeat: '2026-02-01T00:00:00.000Z',
        });
        db.upsertAgent(updated);

        const retrieved = db.getAgent('ag-test001');
        expect(retrieved).toBeDefined();
        expect(retrieved!.hostname).toBe('updated-host');
        expect(retrieved!.version).toBe('2.0.0');
        expect(retrieved!.status).toBe('offline');
        expect(retrieved!.lastHeartbeat).toBe('2026-02-01T00:00:00.000Z');
        // registeredAt should NOT be updated by the ON CONFLICT clause
        expect(retrieved!.registeredAt).toBe('2026-01-01T00:00:00.000Z');
      });

      it('should not create duplicate entries on upsert', () => {
        db.upsertAgent(makeAgent());
        db.upsertAgent(makeAgent({ hostname: 'changed' }));

        expect(db.getAgentCount()).toBe(1);
      });
    });

    describe('getAgent', () => {
      it('should return undefined for nonexistent agent ID', () => {
        const result = db.getAgent('ag-nonexistent');
        expect(result).toBeUndefined();
      });
    });

    describe('getAllAgents', () => {
      it('should return all agents ordered by registration date descending', () => {
        db.upsertAgent(makeAgent({
          agentId: 'ag-oldest',
          hostname: 'oldest',
          registeredAt: '2026-01-01T00:00:00.000Z',
        }));
        db.upsertAgent(makeAgent({
          agentId: 'ag-newest',
          hostname: 'newest',
          registeredAt: '2026-03-01T00:00:00.000Z',
        }));
        db.upsertAgent(makeAgent({
          agentId: 'ag-middle',
          hostname: 'middle',
          registeredAt: '2026-02-01T00:00:00.000Z',
        }));

        const agents = db.getAllAgents();
        expect(agents).toHaveLength(3);
        expect(agents[0]!.agentId).toBe('ag-newest');
        expect(agents[1]!.agentId).toBe('ag-middle');
        expect(agents[2]!.agentId).toBe('ag-oldest');
      });

      it('should return empty array when no agents exist', () => {
        const agents = db.getAllAgents();
        expect(agents).toEqual([]);
      });
    });

    describe('getAgentsByStatus', () => {
      it('should filter agents by online status', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-on1', status: 'online' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-on2', status: 'online' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-off', status: 'offline' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-stale', status: 'stale' }));

        const online = db.getAgentsByStatus('online');
        expect(online).toHaveLength(2);
        expect(online.map((a) => a.agentId).sort()).toEqual(['ag-on1', 'ag-on2']);
      });

      it('should filter agents by offline status', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-on', status: 'online' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-off', status: 'offline' }));

        const offline = db.getAgentsByStatus('offline');
        expect(offline).toHaveLength(1);
        expect(offline[0]!.agentId).toBe('ag-off');
      });

      it('should filter agents by stale status', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-on', status: 'online' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-stale', status: 'stale' }));

        const stale = db.getAgentsByStatus('stale');
        expect(stale).toHaveLength(1);
        expect(stale[0]!.agentId).toBe('ag-stale');
      });

      it('should return empty array when no agents match status', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-on', status: 'online' }));

        const stale = db.getAgentsByStatus('stale');
        expect(stale).toEqual([]);
      });

      it('should order results by last_heartbeat descending', () => {
        db.upsertAgent(makeAgent({
          agentId: 'ag-old-hb',
          status: 'online',
          lastHeartbeat: '2026-01-01T00:00:00.000Z',
        }));
        db.upsertAgent(makeAgent({
          agentId: 'ag-new-hb',
          status: 'online',
          lastHeartbeat: '2026-03-01T00:00:00.000Z',
        }));

        const online = db.getAgentsByStatus('online');
        expect(online[0]!.agentId).toBe('ag-new-hb');
        expect(online[1]!.agentId).toBe('ag-old-hb');
      });
    });

    describe('updateAgentStatus', () => {
      it('should change agent status and return true', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-status', status: 'online' }));

        const result = db.updateAgentStatus('ag-status', 'offline');
        expect(result).toBe(true);

        const agent = db.getAgent('ag-status');
        expect(agent!.status).toBe('offline');
      });

      it('should return false for nonexistent agent', () => {
        const result = db.updateAgentStatus('ag-nonexistent', 'offline');
        expect(result).toBe(false);
      });
    });

    describe('updateHeartbeat', () => {
      it('should update timestamp and set status to online', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-hb', status: 'stale' }));

        const newTimestamp = '2026-06-15T10:30:00.000Z';
        const result = db.updateHeartbeat('ag-hb', newTimestamp);
        expect(result).toBe(true);

        const agent = db.getAgent('ag-hb');
        expect(agent!.lastHeartbeat).toBe(newTimestamp);
        expect(agent!.status).toBe('online');
      });

      it('should return false for nonexistent agent', () => {
        const result = db.updateHeartbeat('ag-nonexistent', '2026-06-15T10:30:00.000Z');
        expect(result).toBe(false);
      });
    });

    describe('deleteAgent', () => {
      it('should remove an agent and return true', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-delete' }));
        expect(db.getAgentCount()).toBe(1);

        const result = db.deleteAgent('ag-delete');
        expect(result).toBe(true);
        expect(db.getAgent('ag-delete')).toBeUndefined();
        expect(db.getAgentCount()).toBe(0);
      });

      it('should return false for nonexistent agent', () => {
        const result = db.deleteAgent('ag-nonexistent');
        expect(result).toBe(false);
      });

      it('should only remove the targeted agent', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-keep' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-remove' }));

        db.deleteAgent('ag-remove');

        expect(db.getAgent('ag-keep')).toBeDefined();
        expect(db.getAgent('ag-remove')).toBeUndefined();
        expect(db.getAgentCount()).toBe(1);
      });
    });

    describe('getAgentCount', () => {
      it('should return 0 for empty database', () => {
        expect(db.getAgentCount()).toBe(0);
      });

      it('should return correct count after insertions', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-1' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-2' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-3' }));

        expect(db.getAgentCount()).toBe(3);
      });

      it('should return correct count after deletion', () => {
        db.upsertAgent(makeAgent({ agentId: 'ag-1' }));
        db.upsertAgent(makeAgent({ agentId: 'ag-2' }));
        db.deleteAgent('ag-1');

        expect(db.getAgentCount()).toBe(1);
      });
    });
  });

  // ── Threat CRUD ───────────────────────────────────────────────

  describe('Threat CRUD', () => {
    // Threats have a foreign key to agents, so we need an agent first
    beforeEach(() => {
      db.upsertAgent(makeAgent({ agentId: 'ag-test001' }));
      db.upsertAgent(makeAgent({ agentId: 'ag-test002', hostname: 'host-2' }));
    });

    describe('insertThreat', () => {
      it('should store a threat with JSON serialization and retrieve it', () => {
        const threat = makeThreat();
        db.insertThreat(threat);

        const threats = db.getThreatsByAgent('ag-test001');
        expect(threats).toHaveLength(1);

        const retrieved = threats[0]!;
        expect(retrieved.id).toBe('threat-001');
        expect(retrieved.sourceAgentId).toBe('ag-test001');
        expect(retrieved.sourceHostname).toBe('test-host');
        expect(retrieved.receivedAt).toBe('2026-01-15T12:00:00.000Z');
        expect(retrieved.correlatedWith).toEqual([]);

        // Verify JSON deserialization of originalThreat
        expect(retrieved.originalThreat.verdict.conclusion).toBe('malicious');
        expect(retrieved.originalThreat.verdict.confidence).toBe(0.95);
        expect(retrieved.originalThreat.verdict.action).toBe('block');
        expect(retrieved.originalThreat.event.severity).toBe('high');
        expect(retrieved.originalThreat.event.category).toBe('intrusion');
      });

      it('should preserve correlatedWith array through serialization', () => {
        const threat = makeThreat({
          id: 'threat-correlated',
          correlatedWith: ['threat-002', 'threat-003'],
        });
        db.insertThreat(threat);

        const threats = db.getThreatsByAgent('ag-test001');
        expect(threats[0]!.correlatedWith).toEqual(['threat-002', 'threat-003']);
      });
    });

    describe('getThreatsByAgent', () => {
      it('should return threats for a specific agent only', () => {
        db.insertThreat(makeThreat({
          id: 'threat-a1',
          sourceAgentId: 'ag-test001',
          receivedAt: '2026-01-15T12:00:00.000Z',
        }));
        db.insertThreat(makeThreat({
          id: 'threat-a2',
          sourceAgentId: 'ag-test001',
          receivedAt: '2026-01-16T12:00:00.000Z',
        }));
        db.insertThreat(makeThreat({
          id: 'threat-b1',
          sourceAgentId: 'ag-test002',
          sourceHostname: 'host-2',
          receivedAt: '2026-01-15T12:00:00.000Z',
        }));

        const agent1Threats = db.getThreatsByAgent('ag-test001');
        expect(agent1Threats).toHaveLength(2);
        expect(agent1Threats.every((t) => t.sourceAgentId === 'ag-test001')).toBe(true);

        const agent2Threats = db.getThreatsByAgent('ag-test002');
        expect(agent2Threats).toHaveLength(1);
        expect(agent2Threats[0]!.sourceAgentId).toBe('ag-test002');
      });

      it('should return threats ordered by received_at descending', () => {
        db.insertThreat(makeThreat({
          id: 'threat-old',
          receivedAt: '2026-01-10T12:00:00.000Z',
        }));
        db.insertThreat(makeThreat({
          id: 'threat-new',
          receivedAt: '2026-01-20T12:00:00.000Z',
        }));

        const threats = db.getThreatsByAgent('ag-test001');
        expect(threats[0]!.id).toBe('threat-new');
        expect(threats[1]!.id).toBe('threat-old');
      });

      it('should return empty array for agent with no threats', () => {
        const threats = db.getThreatsByAgent('ag-test002');
        expect(threats).toEqual([]);
      });
    });

    describe('getRecentThreats', () => {
      it('should return threats received after the given timestamp', () => {
        db.insertThreat(makeThreat({
          id: 'threat-old',
          receivedAt: '2026-01-01T00:00:00.000Z',
        }));
        db.insertThreat(makeThreat({
          id: 'threat-recent',
          receivedAt: '2026-02-01T00:00:00.000Z',
        }));
        db.insertThreat(makeThreat({
          id: 'threat-newest',
          receivedAt: '2026-03-01T00:00:00.000Z',
        }));

        const recent = db.getRecentThreats('2026-01-15T00:00:00.000Z');
        expect(recent).toHaveLength(2);
        // Ordered by received_at DESC
        expect(recent[0]!.id).toBe('threat-newest');
        expect(recent[1]!.id).toBe('threat-recent');
      });

      it('should include threats at exactly the given timestamp', () => {
        db.insertThreat(makeThreat({
          id: 'threat-exact',
          receivedAt: '2026-02-01T00:00:00.000Z',
        }));

        const recent = db.getRecentThreats('2026-02-01T00:00:00.000Z');
        expect(recent).toHaveLength(1);
        expect(recent[0]!.id).toBe('threat-exact');
      });

      it('should return empty array when no threats are recent enough', () => {
        db.insertThreat(makeThreat({
          id: 'threat-old',
          receivedAt: '2026-01-01T00:00:00.000Z',
        }));

        const recent = db.getRecentThreats('2026-12-01T00:00:00.000Z');
        expect(recent).toEqual([]);
      });
    });

    describe('getThreatCount', () => {
      it('should return 0 for empty database', () => {
        expect(db.getThreatCount()).toBe(0);
      });

      it('should return correct total count across all agents', () => {
        db.insertThreat(makeThreat({ id: 'threat-1', sourceAgentId: 'ag-test001' }));
        db.insertThreat(makeThreat({ id: 'threat-2', sourceAgentId: 'ag-test001' }));
        db.insertThreat(makeThreat({
          id: 'threat-3',
          sourceAgentId: 'ag-test002',
          sourceHostname: 'host-2',
        }));

        expect(db.getThreatCount()).toBe(3);
      });
    });

    describe('purgeOldThreats', () => {
      it('should remove threats older than the given date and return count', () => {
        db.insertThreat(makeThreat({
          id: 'threat-old-1',
          receivedAt: '2026-01-01T00:00:00.000Z',
        }));
        db.insertThreat(makeThreat({
          id: 'threat-old-2',
          receivedAt: '2026-01-05T00:00:00.000Z',
        }));
        db.insertThreat(makeThreat({
          id: 'threat-keep',
          receivedAt: '2026-03-01T00:00:00.000Z',
        }));

        const purged = db.purgeOldThreats('2026-02-01T00:00:00.000Z');
        expect(purged).toBe(2);
        expect(db.getThreatCount()).toBe(1);

        const remaining = db.getThreatsByAgent('ag-test001');
        expect(remaining[0]!.id).toBe('threat-keep');
      });

      it('should return 0 when no threats are old enough to purge', () => {
        db.insertThreat(makeThreat({
          id: 'threat-recent',
          receivedAt: '2026-06-01T00:00:00.000Z',
        }));

        const purged = db.purgeOldThreats('2026-01-01T00:00:00.000Z');
        expect(purged).toBe(0);
        expect(db.getThreatCount()).toBe(1);
      });

      it('should return 0 on empty database', () => {
        const purged = db.purgeOldThreats('2026-12-31T00:00:00.000Z');
        expect(purged).toBe(0);
      });
    });
  });

  // ── Policy CRUD ───────────────────────────────────────────────

  describe('Policy CRUD', () => {
    describe('insertPolicy', () => {
      it('should insert an active policy and deactivate others', () => {
        db.insertPolicy(makePolicy({
          policyId: 'pol-v1',
          version: 1,
        }), true);

        db.insertPolicy(makePolicy({
          policyId: 'pol-v2',
          version: 2,
          updatedAt: '2026-02-01T00:00:00.000Z',
        }), true);

        const active = db.getActivePolicy();
        expect(active).not.toBeNull();
        expect(active!.policyId).toBe('pol-v2');
        expect(active!.version).toBe(2);

        // The history should show both policies, but only v2 is active
        const history = db.getPolicyHistory();
        expect(history).toHaveLength(2);
      });

      it('should insert an inactive policy without deactivating others', () => {
        db.insertPolicy(makePolicy({
          policyId: 'pol-active',
          version: 1,
        }), true);

        db.insertPolicy(makePolicy({
          policyId: 'pol-draft',
          version: 2,
          updatedAt: '2026-02-01T00:00:00.000Z',
        }), false);

        const active = db.getActivePolicy();
        expect(active).not.toBeNull();
        expect(active!.policyId).toBe('pol-active');
      });

      it('should serialize and deserialize rules JSON correctly', () => {
        const rules: PolicyRule[] = [
          makePolicyRule({ ruleId: 'rule-1', type: 'block_ip' }),
          makePolicyRule({ ruleId: 'rule-2', type: 'alert_threshold', condition: { threshold: 100 } }),
        ];

        db.insertPolicy(makePolicy({
          policyId: 'pol-rules',
          rules,
        }), true);

        const active = db.getActivePolicy();
        expect(active!.rules).toHaveLength(2);
        expect(active!.rules[0]!.ruleId).toBe('rule-1');
        expect(active!.rules[0]!.type).toBe('block_ip');
        expect(active!.rules[1]!.ruleId).toBe('rule-2');
        expect(active!.rules[1]!.type).toBe('alert_threshold');
        expect(active!.rules[1]!.condition).toEqual({ threshold: 100 });
      });

      it('should serialize and deserialize appliedTo array correctly', () => {
        const appliedTo = ['ag-001', 'ag-002', 'ag-003'];

        db.insertPolicy(makePolicy({
          policyId: 'pol-applied',
          appliedTo,
        }), true);

        const active = db.getActivePolicy();
        expect(active!.appliedTo).toEqual(['ag-001', 'ag-002', 'ag-003']);
      });
    });

    describe('getActivePolicy', () => {
      it('should return null when no policies exist', () => {
        const active = db.getActivePolicy();
        expect(active).toBeNull();
      });

      it('should return null when all policies are inactive', () => {
        db.insertPolicy(makePolicy({ policyId: 'pol-1' }), false);
        db.insertPolicy(makePolicy({ policyId: 'pol-2', version: 2 }), false);

        const active = db.getActivePolicy();
        expect(active).toBeNull();
      });

      it('should return the highest-version active policy', () => {
        // Insert two active policies manually (bypassing deactivation logic)
        // to verify ORDER BY version DESC LIMIT 1
        db.insertPolicy(makePolicy({
          policyId: 'pol-v1',
          version: 1,
        }), true);

        // This will deactivate pol-v1 and activate pol-v3
        db.insertPolicy(makePolicy({
          policyId: 'pol-v3',
          version: 3,
          updatedAt: '2026-03-01T00:00:00.000Z',
        }), true);

        const active = db.getActivePolicy();
        expect(active!.policyId).toBe('pol-v3');
        expect(active!.version).toBe(3);
      });
    });

    describe('getPolicyHistory', () => {
      it('should return all policies ordered by version descending', () => {
        db.insertPolicy(makePolicy({ policyId: 'pol-v1', version: 1 }), true);
        db.insertPolicy(makePolicy({ policyId: 'pol-v3', version: 3 }), false);
        db.insertPolicy(makePolicy({ policyId: 'pol-v2', version: 2 }), false);

        const history = db.getPolicyHistory();
        expect(history).toHaveLength(3);
        expect(history[0]!.version).toBe(3);
        expect(history[1]!.version).toBe(2);
        expect(history[2]!.version).toBe(1);
      });

      it('should return empty array when no policies exist', () => {
        const history = db.getPolicyHistory();
        expect(history).toEqual([]);
      });
    });

    describe('deactivateAllPolicies', () => {
      it('should set all policies to inactive', () => {
        db.insertPolicy(makePolicy({ policyId: 'pol-1', version: 1 }), true);
        db.insertPolicy(makePolicy({ policyId: 'pol-2', version: 2 }), true);

        // At this point pol-2 is active (pol-1 was deactivated by the second insert)
        expect(db.getActivePolicy()).not.toBeNull();

        db.deactivateAllPolicies();

        expect(db.getActivePolicy()).toBeNull();
      });

      it('should not throw when no policies exist', () => {
        expect(() => db.deactivateAllPolicies()).not.toThrow();
      });
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('should return empty arrays and zero counts on fresh database', () => {
      expect(db.getAllAgents()).toEqual([]);
      expect(db.getAgentsByStatus('online')).toEqual([]);
      expect(db.getAgentCount()).toBe(0);
      expect(db.getThreatCount()).toBe(0);
      expect(db.getPolicyHistory()).toEqual([]);
      expect(db.getActivePolicy()).toBeNull();
    });

    it('should not throw when closing the database', () => {
      // Create a separate DB instance to close without affecting other tests
      const tempDb = new ManagerDB(':memory:');
      expect(() => tempDb.close()).not.toThrow();
    });

    it('should handle agent with empty string ip via platform field', () => {
      const agent = makeAgent({
        agentId: 'ag-emptyip',
        platform: { os: 'windows', arch: 'x64', ip: '' },
      });
      db.upsertAgent(agent);

      const retrieved = db.getAgent('ag-emptyip');
      expect(retrieved).toBeDefined();
      // Empty string is stored as empty string (not null/undefined)
      expect(retrieved!.platform.ip).toBe('');
    });

    it('should handle threat with empty correlatedWith array', () => {
      db.upsertAgent(makeAgent({ agentId: 'ag-edge' }));
      db.insertThreat(makeThreat({
        id: 'threat-empty-corr',
        sourceAgentId: 'ag-edge',
        correlatedWith: [],
      }));

      const threats = db.getThreatsByAgent('ag-edge');
      expect(threats[0]!.correlatedWith).toEqual([]);
    });

    it('should handle policy with empty rules array', () => {
      db.insertPolicy(makePolicy({
        policyId: 'pol-empty-rules',
        rules: [],
        appliedTo: [],
      }), true);

      const active = db.getActivePolicy();
      expect(active).not.toBeNull();
      expect(active!.rules).toEqual([]);
      expect(active!.appliedTo).toEqual([]);
    });

    it('should handle multiple upsert-then-delete cycles', () => {
      db.upsertAgent(makeAgent({ agentId: 'ag-cycle' }));
      expect(db.getAgentCount()).toBe(1);

      db.deleteAgent('ag-cycle');
      expect(db.getAgentCount()).toBe(0);

      db.upsertAgent(makeAgent({ agentId: 'ag-cycle', hostname: 're-registered' }));
      expect(db.getAgentCount()).toBe(1);
      expect(db.getAgent('ag-cycle')!.hostname).toBe('re-registered');
    });
  });
});
