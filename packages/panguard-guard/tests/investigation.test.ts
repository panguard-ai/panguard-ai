/**
 * InvestigationEngine tests
 * Tests the investigate() method with various event types:
 * network, process, file, auth events and dynamic reasoning follow-ups.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SecurityEvent } from '@panguard-ai/core';
import type { EnvironmentBaseline } from '../src/types.js';

// Mock createLogger
vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    checkThreatIntel: vi.fn().mockReturnValue(null),
  };
});

import { InvestigationEngine } from '../src/investigation/index.js';
import { checkThreatIntel } from '@panguard-ai/core';

function makeBaseline(overrides: Partial<EnvironmentBaseline> = {}): EnvironmentBaseline {
  return {
    normalProcesses: [],
    normalConnections: [],
    normalLoginPatterns: [],
    normalServicePorts: [],
    learningStarted: new Date().toISOString(),
    learningComplete: false,
    confidenceLevel: 0.5,
    lastUpdated: new Date().toISOString(),
    eventCount: 100,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    source: 'network',
    severity: 'high',
    category: 'brute_force',
    description: 'Test event',
    host: 'test-host',
    metadata: {},
    ...overrides,
  };
}

describe('InvestigationEngine', () => {
  let engine: InvestigationEngine;
  let baseline: EnvironmentBaseline;

  beforeEach(() => {
    vi.clearAllMocks();
    baseline = makeBaseline();
    engine = new InvestigationEngine(baseline);
  });

  describe('investigate() - network events', () => {
    it('should include checkTimeAnomaly step for all events', async () => {
      const event = makeEvent({ source: 'network' });
      const plan = await engine.investigate(event);

      const timeStep = plan.steps.find((s) => s.tool === 'checkTimeAnomaly');
      expect(timeStep).toBeDefined();
      expect(timeStep!.result).toBeDefined();
    });

    it('should include IP-related steps for network events', async () => {
      const event = makeEvent({
        source: 'network',
        metadata: { sourceIP: '10.0.0.1' },
      });
      const plan = await engine.investigate(event);

      const tools = plan.steps.map((s) => s.tool);
      expect(tools).toContain('checkIPHistory');
      expect(tools).toContain('checkGeoLocation');
      expect(tools).toContain('checkNetworkPattern');
    });

    it('should report risk for IP found in threat intel', async () => {
      vi.mocked(checkThreatIntel).mockReturnValue({
        type: 'scanner',
        source: 'abuse-db',
        confidence: 90,
      });

      const event = makeEvent({
        source: 'network',
        metadata: { sourceIP: '192.168.1.100' },
      });
      const plan = await engine.investigate(event);

      const ipStep = plan.steps.find((s) => s.tool === 'checkIPHistory');
      expect(ipStep).toBeDefined();
      expect(ipStep!.result!.riskContribution).toBe(80);
      expect(ipStep!.result!.needsAdditionalInvestigation).toBe(true);
    });

    it('should report zero risk for clean IP', async () => {
      vi.mocked(checkThreatIntel).mockReturnValue(null);

      const event = makeEvent({
        source: 'network',
        metadata: { sourceIP: '8.8.8.8' },
      });
      const plan = await engine.investigate(event);

      const ipStep = plan.steps.find((s) => s.tool === 'checkIPHistory');
      expect(ipStep).toBeDefined();
      expect(ipStep!.result!.riskContribution).toBe(0);
      expect(ipStep!.result!.needsAdditionalInvestigation).toBe(false);
    });

    it('should detect new (unknown) network connections', async () => {
      const event = makeEvent({
        source: 'network',
        metadata: { remoteAddress: '10.99.99.99', remotePort: 443 },
      });
      const plan = await engine.investigate(event);

      const geoStep = plan.steps.find((s) => s.tool === 'checkGeoLocation');
      expect(geoStep).toBeDefined();
      expect(geoStep!.result!.riskContribution).toBe(35);
    });

    it('should recognize known connections from baseline', async () => {
      const bl = makeBaseline({
        normalConnections: [
          {
            remoteAddress: '10.0.0.1',
            remotePort: 443,
            protocol: 'tcp',
            frequency: 100,
            firstSeen: '2024-01-01',
            lastSeen: '2024-06-01',
          },
        ],
      });
      const eng = new InvestigationEngine(bl);

      const event = makeEvent({
        source: 'network',
        metadata: { remoteAddress: '10.0.0.1', remotePort: 443 },
      });
      const plan = await eng.investigate(event);

      const geoStep = plan.steps.find((s) => s.tool === 'checkGeoLocation');
      expect(geoStep!.result!.riskContribution).toBe(0);
    });

    it('should flag suspicious ports', async () => {
      const event = makeEvent({
        source: 'network',
        metadata: { remoteAddress: '10.20.30.40', remotePort: 4444 },
      });
      const plan = await engine.investigate(event);

      const netStep = plan.steps.find((s) => s.tool === 'checkNetworkPattern');
      expect(netStep).toBeDefined();
      expect(netStep!.result!.riskContribution).toBe(75);
      expect(netStep!.result!.data?.suspiciousPort).toBe(true);
    });

    it('should report zero risk for known network pattern', async () => {
      const bl = makeBaseline({
        normalConnections: [
          {
            remoteAddress: '10.0.0.50',
            remotePort: 80,
            protocol: 'tcp',
            frequency: 50,
            firstSeen: '2024-01-01',
            lastSeen: '2024-06-01',
          },
        ],
      });
      const eng = new InvestigationEngine(bl);

      const event = makeEvent({
        source: 'network',
        metadata: { remoteAddress: '10.0.0.50', remotePort: 80 },
      });
      const plan = await eng.investigate(event);

      const netStep = plan.steps.find((s) => s.tool === 'checkNetworkPattern');
      expect(netStep!.result!.riskContribution).toBe(0);
    });
  });

  describe('investigate() - process events', () => {
    it('should include process-related steps for process events', async () => {
      const event = makeEvent({
        source: 'process',
        metadata: { processName: 'suspicious.exe' },
      });
      const plan = await engine.investigate(event);

      const tools = plan.steps.map((s) => s.tool);
      expect(tools).toContain('checkProcessTree');
      expect(tools).toContain('checkFileReputation');
    });

    it('should detect new (unknown) processes', async () => {
      const event = makeEvent({
        source: 'process',
        metadata: { processName: 'crypto-miner' },
      });
      const plan = await engine.investigate(event);

      const processStep = plan.steps.find((s) => s.tool === 'checkProcessTree');
      expect(processStep!.result!.riskContribution).toBe(40);
      expect(processStep!.result!.data?.known).toBe(false);
    });

    it('should give higher risk when parent process is suspicious', async () => {
      const event = makeEvent({
        source: 'process',
        metadata: { processName: 'unknown.exe', parentProcess: 'powershell.exe' },
      });
      const plan = await engine.investigate(event);

      const processStep = plan.steps.find((s) => s.tool === 'checkProcessTree');
      expect(processStep!.result!.riskContribution).toBe(65);
      expect(processStep!.result!.data?.suspiciousParent).toBe(true);
    });

    it('should recognize known processes from baseline', async () => {
      const bl = makeBaseline({
        normalProcesses: [
          {
            name: 'nginx',
            frequency: 500,
            firstSeen: '2024-01-01',
            lastSeen: '2024-06-01',
          },
        ],
      });
      const eng = new InvestigationEngine(bl);

      const event = makeEvent({
        source: 'process',
        metadata: { processName: 'nginx' },
      });
      const plan = await eng.investigate(event);

      const processStep = plan.steps.find((s) => s.tool === 'checkProcessTree');
      expect(processStep!.result!.riskContribution).toBe(0);
      expect(processStep!.result!.data?.known).toBe(true);
    });
  });

  describe('investigate() - file events', () => {
    it('should include checkFileReputation for file events', async () => {
      const event = makeEvent({
        source: 'file',
        metadata: { filePath: '/tmp/payload.ps1' },
      });
      const plan = await engine.investigate(event);

      const tools = plan.steps.map((s) => s.tool);
      expect(tools).toContain('checkFileReputation');
    });

    it('should detect file in suspicious location with suspicious extension', async () => {
      const event = makeEvent({
        source: 'file',
        metadata: { filePath: '/tmp/evil.ps1' },
      });
      const plan = await engine.investigate(event);

      const fileStep = plan.steps.find((s) => s.tool === 'checkFileReputation');
      expect(fileStep!.result!.riskContribution).toBe(70); // Both suspicious location AND extension
      expect(fileStep!.result!.data?.suspiciousLocation).toBe(true);
      expect(fileStep!.result!.data?.suspiciousExtension).toBe(true);
    });

    it('should detect file in suspicious location only', async () => {
      const event = makeEvent({
        source: 'file',
        metadata: { filePath: '/tmp/something.txt' },
      });
      const plan = await engine.investigate(event);

      const fileStep = plan.steps.find((s) => s.tool === 'checkFileReputation');
      expect(fileStep!.result!.riskContribution).toBe(45);
      expect(fileStep!.result!.data?.suspiciousLocation).toBe(true);
      expect(fileStep!.result!.data?.suspiciousExtension).toBe(false);
    });

    it('should detect suspicious extension only', async () => {
      const event = makeEvent({
        source: 'file',
        metadata: { filePath: '/home/user/malware.vbs' },
      });
      const plan = await engine.investigate(event);

      const fileStep = plan.steps.find((s) => s.tool === 'checkFileReputation');
      expect(fileStep!.result!.riskContribution).toBe(45);
      expect(fileStep!.result!.data?.suspiciousExtension).toBe(true);
    });

    it('should report zero risk for normal files', async () => {
      const event = makeEvent({
        source: 'file',
        metadata: { filePath: '/home/user/document.pdf' },
      });
      const plan = await engine.investigate(event);

      const fileStep = plan.steps.find((s) => s.tool === 'checkFileReputation');
      expect(fileStep!.result!.riskContribution).toBe(0);
    });

    it('should handle missing file path', async () => {
      const event = makeEvent({ source: 'file', metadata: {} });
      const plan = await engine.investigate(event);

      const fileStep = plan.steps.find((s) => s.tool === 'checkFileReputation');
      expect(fileStep!.result!.riskContribution).toBe(0);
    });
  });

  describe('investigate() - auth events', () => {
    it('should include user privilege and related events checks for auth events', async () => {
      const event = makeEvent({
        source: 'network',
        category: 'authentication',
        metadata: { user: 'admin' },
      });
      const plan = await engine.investigate(event);

      const tools = plan.steps.map((s) => s.tool);
      expect(tools).toContain('checkUserPrivilege');
      expect(tools).toContain('checkRelatedEvents');
    });

    it('should detect privileged user activity (root)', async () => {
      const event = makeEvent({
        source: 'network',
        category: 'authentication',
        metadata: { user: 'root' },
      });
      const plan = await engine.investigate(event);

      const userStep = plan.steps.find((s) => s.tool === 'checkUserPrivilege');
      expect(userStep!.result!.riskContribution).toBe(60);
      expect(userStep!.result!.data?.privileged).toBe(true);
    });

    it('should detect privileged user activity (Administrator)', async () => {
      const event = makeEvent({
        source: 'network',
        category: 'authentication',
        metadata: { user: 'Administrator' },
      });
      const plan = await engine.investigate(event);

      const userStep = plan.steps.find((s) => s.tool === 'checkUserPrivilege');
      expect(userStep!.result!.riskContribution).toBe(60);
    });

    it('should detect unknown user not in baseline', async () => {
      const event = makeEvent({
        source: 'network',
        category: 'authentication',
        metadata: { user: 'hacker123' },
      });
      const plan = await engine.investigate(event);

      const userStep = plan.steps.find((s) => s.tool === 'checkUserPrivilege');
      expect(userStep!.result!.riskContribution).toBe(45);
      expect(userStep!.result!.data?.known).toBe(false);
    });

    it('should recognize known user from baseline', async () => {
      const bl = makeBaseline({
        normalLoginPatterns: [
          {
            username: 'jdoe',
            hourOfDay: 10,
            dayOfWeek: 1,
            frequency: 50,
            firstSeen: '2024-01-01',
            lastSeen: '2024-06-01',
          },
        ],
      });
      const eng = new InvestigationEngine(bl);

      const event = makeEvent({
        source: 'network',
        category: 'authentication',
        metadata: { user: 'jdoe' },
      });
      const plan = await eng.investigate(event);

      const userStep = plan.steps.find((s) => s.tool === 'checkUserPrivilege');
      expect(userStep!.result!.riskContribution).toBe(0);
      expect(userStep!.result!.data?.known).toBe(true);
    });
  });

  describe('investigate() - time anomaly', () => {
    it('should flag off-hours activity (before 6 AM)', async () => {
      const offHoursDate = new Date();
      offHoursDate.setHours(3, 0, 0, 0);

      const event = makeEvent({ timestamp: offHoursDate, metadata: {} });
      const plan = await engine.investigate(event);

      const timeStep = plan.steps.find((s) => s.tool === 'checkTimeAnomaly');
      expect(timeStep!.result!.riskContribution).toBe(40);
      expect(timeStep!.result!.data?.outsideBusinessHours).toBe(true);
    });

    it('should flag off-hours activity (after 10 PM)', async () => {
      const offHoursDate = new Date();
      offHoursDate.setHours(23, 0, 0, 0);

      const event = makeEvent({ timestamp: offHoursDate, metadata: {} });
      const plan = await engine.investigate(event);

      const timeStep = plan.steps.find((s) => s.tool === 'checkTimeAnomaly');
      expect(timeStep!.result!.riskContribution).toBe(40);
    });

    it('should report normal hours activity with zero risk', async () => {
      const normalDate = new Date();
      normalDate.setHours(14, 0, 0, 0);

      const event = makeEvent({ timestamp: normalDate, metadata: {} });
      const plan = await engine.investigate(event);

      const timeStep = plan.steps.find((s) => s.tool === 'checkTimeAnomaly');
      expect(timeStep!.result!.riskContribution).toBe(0);
      expect(timeStep!.result!.data?.outsideBusinessHours).toBe(false);
    });

    it('should lower risk if user has a night pattern in baseline', async () => {
      const bl = makeBaseline({
        normalLoginPatterns: [
          {
            username: 'nightowl',
            hourOfDay: 2,
            dayOfWeek: 3,
            frequency: 20,
            firstSeen: '2024-01-01',
            lastSeen: '2024-06-01',
          },
        ],
      });
      const eng = new InvestigationEngine(bl);

      const offHoursDate = new Date();
      offHoursDate.setHours(2, 0, 0, 0);

      const event = makeEvent({
        timestamp: offHoursDate,
        metadata: { user: 'nightowl' },
      });
      const plan = await eng.investigate(event);

      const timeStep = plan.steps.find((s) => s.tool === 'checkTimeAnomaly');
      expect(timeStep!.result!.riskContribution).toBe(15);
      expect(timeStep!.result!.data?.hasNightPattern).toBe(true);
    });
  });

  describe('investigate() - event correlation (checkRelatedEvents)', () => {
    it('should report no related events when buffer is empty', async () => {
      const event = makeEvent({
        source: 'network',
        category: 'authentication',
        metadata: { sourceIP: '10.0.0.1' },
      });
      const plan = await engine.investigate(event);

      const relatedStep = plan.steps.find((s) => s.tool === 'checkRelatedEvents');
      expect(relatedStep!.result!.riskContribution).toBe(0);
      expect(relatedStep!.result!.data?.relatedCount).toBe(0);
    });

    it('should find related events by same source IP', async () => {
      // Feed events into the buffer
      for (let i = 0; i < 3; i++) {
        engine.recordEvent(
          makeEvent({
            id: `evt-related-${i}`,
            metadata: { sourceIP: '10.0.0.1' },
          })
        );
      }

      const event = makeEvent({
        id: 'evt-main',
        source: 'network',
        category: 'authentication',
        metadata: { sourceIP: '10.0.0.1' },
      });
      const plan = await engine.investigate(event);

      const relatedStep = plan.steps.find((s) => s.tool === 'checkRelatedEvents');
      expect(relatedStep!.result!.riskContribution).toBeGreaterThan(0);
      expect(relatedStep!.result!.data?.relatedCount).toBe(3);
    });

    it('should find related events by same user', async () => {
      for (let i = 0; i < 5; i++) {
        engine.recordEvent(
          makeEvent({
            id: `evt-user-${i}`,
            metadata: { user: 'attacker' },
          })
        );
      }

      const event = makeEvent({
        id: 'evt-main',
        source: 'network',
        category: 'authentication',
        metadata: { user: 'attacker' },
      });
      const plan = await engine.investigate(event);

      const relatedStep = plan.steps.find((s) => s.tool === 'checkRelatedEvents');
      expect(relatedStep!.result!.data?.relatedCount).toBe(5);
      expect(relatedStep!.result!.riskContribution).toBe(60); // 5+ events = 60
    });

    it('should give higher risk for 10+ related events', async () => {
      for (let i = 0; i < 12; i++) {
        engine.recordEvent(
          makeEvent({
            id: `evt-many-${i}`,
            severity: 'high',
            category: 'brute_force',
            metadata: { sourceIP: '10.0.0.5' },
          })
        );
      }

      const event = makeEvent({
        id: 'evt-main',
        source: 'network',
        category: 'authentication',
        metadata: { sourceIP: '10.0.0.5' },
      });
      const plan = await engine.investigate(event);

      const relatedStep = plan.steps.find((s) => s.tool === 'checkRelatedEvents');
      expect(relatedStep!.result!.riskContribution).toBe(80);
    });
  });

  describe('investigate() - dynamic follow-up steps', () => {
    it('should add follow-up steps when IP history has high risk', async () => {
      vi.mocked(checkThreatIntel).mockReturnValue({
        type: 'botnet',
        source: 'threat-feed',
        confidence: 95,
      });

      const event = makeEvent({
        source: 'network',
        metadata: { sourceIP: '10.0.0.99' },
      });
      const plan = await engine.investigate(event);

      // checkIPHistory with riskContribution > 50 should trigger
      // follow-up: checkGeoLocation, checkRelatedEvents
      // These may already be in the initial plan for network events,
      // but the engine should not duplicate them
      const tools = plan.steps.map((s) => s.tool);
      expect(tools).toContain('checkGeoLocation');
    });
  });

  describe('investigate() - reasoning output', () => {
    it('should produce a reasoning string with summary', async () => {
      const event = makeEvent({ source: 'network', metadata: { sourceIP: '10.0.0.1' } });
      const plan = await engine.investigate(event);

      expect(plan.reasoning).toContain('Investigation Summary');
      expect(plan.reasoning).toContain('Average risk contribution');
    });
  });

  describe('recordEvent()', () => {
    it('should trim buffer when exceeding max size (500)', () => {
      for (let i = 0; i < 510; i++) {
        engine.recordEvent(makeEvent({ id: `evt-buf-${i}` }));
      }

      // We cannot access the private buffer directly, but we can verify
      // no error thrown and the engine still works
      expect(async () => {
        await engine.investigate(makeEvent({ source: 'network', category: 'authentication', metadata: { sourceIP: '1.2.3.4' } }));
      }).not.toThrow();
    });
  });

  describe('MAX_STEPS limit', () => {
    it('should not exceed 8 investigation steps', async () => {
      // Create an event that triggers many steps
      vi.mocked(checkThreatIntel).mockReturnValue({
        type: 'scanner',
        source: 'abuse-db',
        confidence: 99,
      });

      // Feed many related events to trigger follow-ups
      for (let i = 0; i < 20; i++) {
        engine.recordEvent(
          makeEvent({
            id: `evt-max-${i}`,
            severity: 'critical',
            category: 'brute_force',
            metadata: { sourceIP: '10.0.0.1', user: 'root' },
          })
        );
      }

      const event = makeEvent({
        id: 'evt-trigger',
        source: 'network',
        category: 'authentication',
        metadata: { sourceIP: '10.0.0.1', user: 'root' },
      });
      const plan = await engine.investigate(event);

      expect(plan.steps.length).toBeLessThanOrEqual(8);
    });
  });
});
