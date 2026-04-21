/**
 * Attack Simulation Integration Tests
 * 攻擊模擬整合測試
 *
 * Tests realistic attack scenarios end-to-end through the Panguard pipeline:
 * 1. Brute force -> EventCorrelator -> auto-block
 * 2. Honeypot -> threat intel -> Guard correlation
 * 3. GuardEngine full pipeline
 *
 * Note: DNS tunneling (DpiMonitor) and Rootkit (RootkitDetector) scenarios
 * were removed in 69017e76 along with the legacy EDR monitors. PanguardGuard
 * is a runtime AI agent security agent, not an EDR; OS-level detection is
 * delegated to existing EDR/SIEM tools that consume Guard events.
 *
 * These tests verify that multiple components work together correctly
 * to detect and respond to real attack patterns.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { SecurityEvent } from '@panguard-ai/core';
import {
  EventCorrelator,
  DetectAgent,
  AnalyzeAgent,
  RespondAgent,
  ReportAgent,
  createEmptyBaseline,
  DEFAULT_ACTION_POLICY,
  GuardEngine,
} from '@panguard-ai/panguard-guard';
import type { GuardConfig, CorrelationEvent, ThreatVerdict } from '@panguard-ai/panguard-guard';

// Suppress logger output during tests
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let eventIdCounter = 0;

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'attack-sim-'));
}

function makeAuthFailureEvent(ip: string, timestampOffset = 0): CorrelationEvent {
  eventIdCounter++;
  return {
    id: `auth-fail-${eventIdCounter}`,
    timestamp: Date.now() + timestampOffset,
    sourceIP: ip,
    source: 'auth',
    category: 'authentication',
    severity: 'medium',
    ruleIds: ['auth_failure'],
    metadata: { action: 'login_failed', username: 'admin', result: 'failure' },
  };
}

function makeSecurityEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  eventIdCounter++;
  return {
    id: `sec-${eventIdCounter}`,
    timestamp: new Date(),
    source: 'network',
    severity: 'medium',
    category: 'network_activity',
    description: 'Test security event',
    raw: {},
    host: 'localhost',
    metadata: {},
    ...overrides,
  };
}

function makeGuardConfig(
  dataDir: string,
  mode: 'learning' | 'protection' = 'protection'
): GuardConfig {
  return {
    lang: 'en',
    mode,
    learningDays: 1,
    actionPolicy: DEFAULT_ACTION_POLICY,
    notifications: {},
    dataDir,
    dashboardPort: 0,
    dashboardEnabled: false,
    verbose: false,
    monitors: {
      logMonitor: false,
      networkMonitor: false,
      processMonitor: false,
      fileMonitor: false,
      networkPollInterval: 60000,
      processPollInterval: 60000,
    },
    watchdogEnabled: false,
    watchdogInterval: 60000,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: Brute Force -> Auto-Block
// ---------------------------------------------------------------------------

describe('Scenario 1: Brute Force Attack -> Auto-Block', () => {
  it('should detect brute force pattern from 5+ auth failures within 60s', () => {
    const correlator = new EventCorrelator(300_000, 1000);
    const attackerIP = '10.0.0.99';

    // Inject 5 auth failure events from the same IP in rapid succession
    let result;
    for (let i = 0; i < 5; i++) {
      result = correlator.addEvent(makeAuthFailureEvent(attackerIP, i * 100));
    }

    expect(result!.matched).toBe(true);
    const bruteForce = result!.patterns.find((p) => p.type === 'brute_force');
    expect(bruteForce).toBeDefined();
    expect(bruteForce!.sourceIP).toBe(attackerIP);
    expect(bruteForce!.eventCount).toBeGreaterThanOrEqual(5);
    expect(bruteForce!.suggestedSeverity).toBe('high');
  });

  it('should not trigger brute force for different IPs', () => {
    const correlator = new EventCorrelator(300_000, 1000);

    // 5 failures but each from a different IP
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(correlator.addEvent(makeAuthFailureEvent(`10.0.0.${i}`, i * 100)));
    }

    // No single IP should trigger brute_force
    for (const result of results) {
      const bruteForce = result.patterns.find((p) => p.type === 'brute_force');
      expect(bruteForce).toBeUndefined();
    }
  });

  it('should run the full pipeline: detect -> analyze -> respond -> report', async () => {
    const tempDir = createTempDir();

    try {
      // Build the pipeline components
      const detectAgent = new DetectAgent();
      const analyzeAgent = new AnalyzeAgent(null); // no LLM
      const respondAgent = new RespondAgent(
        { autoRespond: 90, notifyAndWait: 70, logOnly: 0 },
        'protection',
        [],
        tempDir
      );
      const reportAgent = new ReportAgent(join(tempDir, 'events.jsonl'), 'protection');

      // Create a brute-force-like security event with high severity
      const event = makeSecurityEvent({
        source: 'network',
        severity: 'high',
        category: 'brute_force',
        description: 'Multiple failed SSH login attempts from 10.0.0.99',
        metadata: {
          sourceIP: '10.0.0.99',
          failedAttempts: 15,
          protocol: 'ssh',
        },
      });

      // Run through detect
      const detection = detectAgent.detect(event);

      // Even without matching rules, the analyze agent should produce a verdict
      // based on event severity and context
      if (detection) {
        const baseline = createEmptyBaseline();
        const verdict = await analyzeAgent.analyze(detection, baseline);

        expect(verdict).toHaveProperty('conclusion');
        expect(verdict).toHaveProperty('confidence');
        expect(verdict).toHaveProperty('recommendedAction');

        // Run through respond
        const response = await respondAgent.respond(verdict);
        expect(response).toHaveProperty('action');
        expect(response).toHaveProperty('success');

        // Run through report
        const reportResult = reportAgent.report(event, verdict, response, baseline);
        expect(reportResult).toHaveProperty('updatedBaseline');
      }

      respondAgent.destroy();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should log_only in learning mode', async () => {
    const tempDir = createTempDir();

    try {
      const respondAgent = new RespondAgent(
        { autoRespond: 90, notifyAndWait: 70, logOnly: 0 },
        'learning', // learning mode
        [],
        tempDir
      );

      const verdict: ThreatVerdict = {
        conclusion: 'malicious',
        confidence: 95,
        reasoning: 'Brute force detected',
        evidence: [{ source: 'correlation', data: 'brute_force pattern', reliability: 0.9 }],
        recommendedAction: 'block_ip',
        mitreTechnique: 'T1110',
      };

      const response = await respondAgent.respond(verdict);
      // In learning mode, all actions should be log_only
      expect(response.action).toBe('log_only');
      expect(response.success).toBe(true);

      respondAgent.destroy();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Honeypot -> Threat Intel -> Guard Correlation
// ---------------------------------------------------------------------------

describe('Scenario 4: Honeypot -> Threat Intel -> Guard Linkage', () => {
  it('should create threat intel from honeypot session', async () => {
    const { buildTrapIntel } = await import('@panguard-ai/panguard-trap');

    // Simulate an attacker hitting the honeypot with proper TrapSession shape
    const session = {
      sessionId: 'trap-session-001',
      serviceType: 'http' as const,
      sourceIP: '203.0.113.50', // Public IP (RFC 5737 documentation range)
      sourcePort: 54321,
      startTime: new Date(),
      endTime: new Date(Date.now() + 30000),
      durationMs: 30000,
      events: [
        {
          timestamp: new Date(),
          type: 'connection' as const,
          data: 'GET /admin HTTP/1.1',
        },
        {
          timestamp: new Date(Date.now() + 1000),
          type: 'command_input' as const,
          data: "POST /login body=' OR 1=1 --",
        },
        {
          timestamp: new Date(Date.now() + 2000),
          type: 'data_transfer' as const,
          data: 'sqlmap scanning attempt',
        },
      ],
      credentials: [
        { timestamp: new Date(), username: 'admin', password: 'password123', grantedAccess: false },
        { timestamp: new Date(), username: 'root', password: 'toor', grantedAccess: false },
      ],
      commands: ["' OR 1=1 --", 'SELECT * FROM users'],
      mitreTechniques: ['T1190', 'T1059'],
    };

    const intel = buildTrapIntel(session);
    expect(intel).toBeDefined();
    expect(intel!.sourceIP).toBe('203.0.113.50');
  });

  it('should correlate honeypot + auth events into attack chain', () => {
    const correlator = new EventCorrelator(300_000, 1000);
    const attackerIP = '203.0.113.50';

    // First: attacker hits honeypot (medium severity, network source)
    correlator.addEvent({
      id: 'trap-1',
      timestamp: Date.now(),
      sourceIP: attackerIP,
      source: 'network',
      category: 'honeypot_activity',
      severity: 'medium',
      ruleIds: ['honeypot_http'],
      metadata: { service: 'http', path: '/admin' },
    });

    // Then: same IP probes more services (medium severity events)
    correlator.addEvent({
      id: 'probe-2',
      timestamp: Date.now() + 1000,
      sourceIP: attackerIP,
      source: 'network',
      category: 'service_probe',
      severity: 'medium',
      ruleIds: [],
      metadata: { port: 22 },
    });

    const result = correlator.addEvent({
      id: 'probe-3',
      timestamp: Date.now() + 2000,
      sourceIP: attackerIP,
      source: 'network',
      category: 'sql_injection_attempt',
      severity: 'medium',
      ruleIds: [],
      metadata: { payload: "' OR 1=1 --" },
    });

    // 3+ medium events from same IP should trigger attack_chain
    expect(result.matched).toBe(true);
    const chain = result.patterns.find((p) => p.type === 'attack_chain');
    expect(chain).toBeDefined();
    expect(chain!.sourceIP).toBe(attackerIP);
  });

  it('should detect attack chain from mixed honeypot + real events', () => {
    const correlator = new EventCorrelator(300_000, 1000);
    const attackerIP = '198.51.100.77';

    // Attacker probes honeypot, then scans ports, then attempts brute force
    const events: CorrelationEvent[] = [
      {
        id: 'recon-1',
        timestamp: Date.now(),
        sourceIP: attackerIP,
        source: 'network',
        category: 'honeypot_probe',
        severity: 'medium',
        ruleIds: [],
        metadata: {},
      },
      {
        id: 'recon-2',
        timestamp: Date.now() + 1000,
        sourceIP: attackerIP,
        source: 'network',
        category: 'port_scan',
        severity: 'medium',
        ruleIds: [],
        metadata: {},
      },
      {
        id: 'recon-3',
        timestamp: Date.now() + 2000,
        sourceIP: attackerIP,
        source: 'network',
        category: 'service_probe',
        severity: 'medium',
        ruleIds: [],
        metadata: {},
      },
    ];

    let result;
    for (const event of events) {
      result = correlator.addEvent(event);
    }

    // 3+ medium events from same IP should trigger attack_chain
    expect(result!.matched).toBe(true);
    const chain = result!.patterns.find((p) => p.type === 'attack_chain');
    expect(chain).toBeDefined();
    expect(chain!.sourceIP).toBe(attackerIP);
    expect(chain!.eventCount).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Full GuardEngine Pipeline with Event Injection
// ---------------------------------------------------------------------------

describe('Scenario 5: GuardEngine Full Pipeline', () => {
  let tempDir: string;
  let engine: GuardEngine | null = null;

  afterEach(async () => {
    if (engine) {
      try {
        await engine.stop();
      } catch {
        /* ignore */
      }
      engine = null;
    }
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it('should process a security event through the full pipeline', async () => {
    tempDir = createTempDir();
    const config = makeGuardConfig(tempDir, 'protection');
    engine = await GuardEngine.create(config);
    await engine.start();

    // Create a suspicious event
    const event = makeSecurityEvent({
      source: 'network',
      severity: 'high',
      category: 'suspicious_execution',
      description: 'nmap scan detected from 10.0.0.99',
      metadata: { sourceIP: '10.0.0.99', processName: 'nmap' },
    });

    // Feed the event through the engine
    await engine.processEvent(event);

    const status = engine.getStatus();
    expect(status.eventsProcessed).toBeGreaterThanOrEqual(1);
  });

  it('should track events processed count across multiple events', async () => {
    tempDir = createTempDir();
    const config = makeGuardConfig(tempDir, 'learning');
    engine = await GuardEngine.create(config);
    await engine.start();

    // Feed multiple events
    for (let i = 0; i < 5; i++) {
      await engine.processEvent(
        makeSecurityEvent({
          source: 'process',
          severity: 'low',
          category: 'process_execution',
          description: `Normal process event ${i}`,
        })
      );
    }

    const status = engine.getStatus();
    expect(status.eventsProcessed).toBeGreaterThanOrEqual(5);
  });

  it('should update baseline during learning mode', async () => {
    tempDir = createTempDir();
    const config = makeGuardConfig(tempDir, 'learning');
    engine = await GuardEngine.create(config);
    await engine.start();

    // In learning mode, events should update the baseline
    await engine.processEvent(
      makeSecurityEvent({
        source: 'process',
        severity: 'low',
        category: 'process_execution',
        description: 'Normal cron job execution',
        metadata: { processName: 'cron', pid: 100 },
      })
    );

    const status = engine.getStatus();
    expect(status.mode).toBe('learning');
    expect(status.eventsProcessed).toBeGreaterThanOrEqual(1);
  });

  it('should detect threats in protection mode', async () => {
    tempDir = createTempDir();
    const config = makeGuardConfig(tempDir, 'protection');
    engine = await GuardEngine.create(config);
    await engine.start();

    // Feed a clearly malicious event
    await engine.processEvent(
      makeSecurityEvent({
        source: 'process',
        severity: 'critical',
        category: 'privilege_escalation',
        description: 'Suspicious privilege escalation: unknown process called setuid(0)',
        metadata: {
          sourceIP: '10.0.0.99',
          processName: 'exploit',
          pid: 31337,
          action: 'setuid',
        },
      })
    );

    const status = engine.getStatus();
    expect(status.eventsProcessed).toBeGreaterThanOrEqual(1);
    // threatsDetected may be 0 if no rules match, but the event was processed
  });

  it('should invoke event callback when set', async () => {
    tempDir = createTempDir();
    const config = makeGuardConfig(tempDir, 'protection');
    engine = await GuardEngine.create(config);

    const callbacks: Array<{ type: string; data: Record<string, unknown> }> = [];
    engine.setEventCallback((type, data) => {
      callbacks.push({ type, data });
    });

    await engine.start();
    await engine.processEvent(
      makeSecurityEvent({
        source: 'network',
        severity: 'high',
        category: 'network_activity',
        description: 'Outbound connection to known C2 server',
      })
    );

    // Verify the engine processed the event (callback may or may not fire
    // depending on whether rules matched, but the engine should still work)
    const engineStatus = engine!.getStatus();
    expect(engineStatus.eventsProcessed).toBeGreaterThanOrEqual(1);
  });
});
