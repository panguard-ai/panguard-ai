/**
 * 1.8.2 audit — finding L (event-processor "Threats Detected" honesty) regression
 * suite.
 *
 * The bug: `state.threatsDetected` was incremented as soon as ANY detection
 * object existed — a rule match, threat-intel match, correlation match, OR an
 * advisory-only baseline deviation — BEFORE `analyzeAgent.analyze()` ran. If
 * analyze() subsequently concluded the event was benign, threatsDetected was
 * never decremented or reclassified, so the dashboard's "Threats Detected" KPI
 * (dashboard.html `v-threats`) and the posture-score deduction derived from it
 * (up to -40 points as "N unresolved threats") permanently over-counted events
 * the system itself judged safe.
 *
 * The fix (packages/panguard-guard/src/event-processor.ts, processEvent()):
 * `state.threatsDetected++` now fires ONLY after `analyzeAgent.analyze()`
 * returns a verdict whose `conclusion !== 'benign'`. A raw detection candidate
 * (rule match / advisory deviation) that analyze downgrades to benign must
 * never move the counter.
 *
 * These tests pin the honesty invariant directly against the exported
 * `processEvent()` so a future edit cannot silently move the increment back
 * before the analyze stage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SecurityEvent } from '@panguard-ai/core';
import type {
  DetectionResult,
  EnvironmentBaseline,
  GuardConfig,
  ResponseResult,
  ThreatVerdict,
} from '../src/types.js';
import { DEFAULT_ACTION_POLICY } from '../src/types.js';
import { processEvent } from '../src/event-processor.js';
import type { EventProcessorDeps, EventProcessorState } from '../src/event-processor.js';
import type { DetectAgent, AnalyzeAgent, RespondAgent, ReportAgent } from '../src/agent/index.js';
import type { GuardATREngine } from '../src/engines/atr-engine.js';
import type { InvestigationEngine } from '../src/investigation/index.js';
import type { ThreatCloudClient } from '../src/threat-cloud/index.js';

vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  };
});

vi.mock('@panguard-ai/security-hardening', () => ({
  logAuditEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    source: 'network',
    severity: 'high',
    category: 'brute_force',
    description: 'SSH brute force attempt',
    host: 'test-host',
    metadata: { sourceIP: '203.0.113.50' },
    ...overrides,
  };
}

function makeBaseline(): EnvironmentBaseline {
  return {
    normalProcesses: [],
    normalConnections: [],
    normalLoginPatterns: [],
    normalServicePorts: [],
    learningStarted: new Date().toISOString(),
    learningComplete: true,
    confidenceLevel: 1,
    lastUpdated: new Date().toISOString(),
    eventCount: 0,
  };
}

function makeConfig(overrides: Partial<GuardConfig> = {}): GuardConfig {
  return {
    lang: 'en',
    mode: 'protection',
    learningDays: 7,
    actionPolicy: DEFAULT_ACTION_POLICY,
    notifications: {},
    dataDir: '/tmp/panguard-guard-test-L',
    dashboardPort: 9001,
    dashboardEnabled: false,
    verbose: false,
    monitors: {
      logMonitor: false,
      networkMonitor: false,
      processMonitor: false,
      fileMonitor: false,
      networkPollInterval: 5000,
      processPollInterval: 5000,
    },
    watchdogEnabled: false,
    watchdogInterval: 30000,
    ...overrides,
  };
}

function makeState(overrides: Partial<EventProcessorState> = {}): EventProcessorState {
  return {
    mode: 'protection',
    baseline: makeBaseline(),
    eventsProcessed: 0,
    threatsDetected: 0,
    actionsExecuted: 0,
    threatCloudUploaded: 0,
    baselinePath: '/tmp/panguard-guard-test-L/baseline.json',
    config: makeConfig(),
    ...overrides,
  };
}

/** A ruleMatches-bearing detection — the deterministic "candidate" path. */
function makeRuleDetection(event: SecurityEvent): DetectionResult {
  return {
    event,
    ruleMatches: [{ ruleId: 'r1', ruleName: 'Test Rule', severity: 'medium' }],
    timestamp: new Date().toISOString(),
  };
}

function makeVerdict(overrides: Partial<ThreatVerdict> = {}): ThreatVerdict {
  return {
    conclusion: 'benign',
    confidence: 20,
    reasoning: 'test reasoning',
    evidence: [],
    recommendedAction: 'log_only',
    ...overrides,
  };
}

function makeResponse(overrides: Partial<ResponseResult> = {}): ResponseResult {
  return {
    action: 'log_only',
    success: true,
    details: 'logged',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

interface Deps {
  deps: EventProcessorDeps;
  analyze: ReturnType<typeof vi.fn>;
  respond: ReturnType<typeof vi.fn>;
  report: ReturnType<typeof vi.fn>;
  detect: ReturnType<typeof vi.fn>;
}

/** Build a minimal, fully-stubbed EventProcessorDeps. Every optional dep is null. */
function makeDeps(overrides: { verdict?: ThreatVerdict; response?: ResponseResult } = {}): Deps {
  const detect = vi.fn();
  const analyze = vi.fn().mockResolvedValue(overrides.verdict ?? makeVerdict());
  const respond = vi.fn().mockResolvedValue(overrides.response ?? makeResponse());
  const report = vi.fn().mockReturnValue({ updatedBaseline: makeBaseline() });

  const detectAgent = { detect } as unknown as DetectAgent;
  const analyzeAgent = { analyze } as unknown as AnalyzeAgent;
  const respondAgent = { respond } as unknown as RespondAgent;
  const reportAgent = { report } as unknown as ReportAgent;
  const atrEngine = {
    evaluate: vi.fn().mockReturnValue([]),
    isSkillWhitelisted: vi.fn().mockReturnValue(false),
  } as unknown as GuardATREngine;
  const investigationEngine = {
    investigate: vi.fn().mockResolvedValue({ steps: [], reasoning: '' }),
  } as unknown as InvestigationEngine;
  const threatCloud = { upload: vi.fn().mockResolvedValue(true) } as unknown as ThreatCloudClient;

  const deps: EventProcessorDeps = {
    atrEngine,
    detectAgent,
    analyzeAgent,
    respondAgent,
    reportAgent,
    investigationEngine,
    threatCloud,
    smartRouter: null,
    knowledgeDistiller: null,
    atrDrafter: null,
    dashboard: null,
    syslogAdapter: null,
    agentClient: null,
  };

  return { deps, analyze, respond, report, detect };
}

const noopSelfProcessEvent = (): void => {
  // no-op: processEvent's fourth arg is only used by the real engine to
  // requeue synthetic events; not exercised by these unit tests.
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processEvent — threatsDetected only counts CONFIRMED threats', () => {
  it('does NOT increment threatsDetected when a rule match exists but analyze concludes benign', async () => {
    const event = makeEvent();
    const state = makeState();
    const { deps, detect, analyze } = makeDeps({ verdict: makeVerdict({ conclusion: 'benign' }) });
    detect.mockReturnValue(makeRuleDetection(event));

    await processEvent(event, state, deps, noopSelfProcessEvent);

    // The regression: a rule/candidate match existed (detect returned non-null)
    // and analyze WAS invoked, but the verdict was benign — threatsDetected
    // must stay at 0. This is the exact scenario the audit finding described.
    expect(analyze).toHaveBeenCalled();
    expect(state.threatsDetected).toBe(0);
  });

  it('increments threatsDetected exactly once when analyze confirms suspicious', async () => {
    const event = makeEvent();
    const state = makeState();
    const { deps, detect } = makeDeps({
      verdict: makeVerdict({ conclusion: 'suspicious', confidence: 60 }),
    });
    detect.mockReturnValue(makeRuleDetection(event));

    await processEvent(event, state, deps, noopSelfProcessEvent);

    expect(state.threatsDetected).toBe(1);
  });

  it('increments threatsDetected exactly once when analyze confirms malicious', async () => {
    const event = makeEvent();
    const state = makeState();
    const { deps, detect } = makeDeps({
      verdict: makeVerdict({ conclusion: 'malicious', confidence: 95 }),
    });
    detect.mockReturnValue(makeRuleDetection(event));

    await processEvent(event, state, deps, noopSelfProcessEvent);

    expect(state.threatsDetected).toBe(1);
  });

  it('never calls analyze (and never increments) when detect finds nothing and no advisory fires', async () => {
    const event = makeEvent();
    const state = makeState({ config: makeConfig({ threatCloudUploadEnabled: false }) });
    const { deps, detect, analyze } = makeDeps();
    detect.mockReturnValue(null);

    await processEvent(event, state, deps, noopSelfProcessEvent);

    expect(analyze).not.toHaveBeenCalled();
    expect(state.threatsDetected).toBe(0);
  });

  it('does not double count across repeated benign candidates (mixed with one confirmed threat)', async () => {
    const state = makeState();
    const { deps, detect, analyze } = makeDeps();
    detect.mockReturnValue(makeRuleDetection(makeEvent()));

    // Three candidates, analyze downgrades two to benign and confirms one.
    analyze
      .mockResolvedValueOnce(makeVerdict({ conclusion: 'benign' }))
      .mockResolvedValueOnce(makeVerdict({ conclusion: 'suspicious', confidence: 55 }))
      .mockResolvedValueOnce(makeVerdict({ conclusion: 'benign' }));

    await processEvent(makeEvent(), state, deps, noopSelfProcessEvent);
    await processEvent(makeEvent(), state, deps, noopSelfProcessEvent);
    await processEvent(makeEvent(), state, deps, noopSelfProcessEvent);

    expect(state.threatsDetected).toBe(1);
  });

  it('counts an advisory (baseline-deviation) candidate only when analyze confirms it non-benign', async () => {
    // No rule/threat-intel/correlation match at all — forces the code down the
    // maybeAdvisoryDetection() path, the other source of "candidate" objects
    // the original bug over-counted. event-processor.ts loads memory/baseline.js
    // via a lazy `await import()` at call time, so vi.doMock (unhoisted) can
    // swap it in per-test without affecting the other tests in this file.
    const event = makeEvent({ category: 'unknown_behavior' });
    const state = makeState({
      mode: 'protection',
      config: makeConfig({ threatCloudUploadEnabled: true, mode: 'protection' }),
    });
    const { deps, detect, analyze } = makeDeps({
      verdict: makeVerdict({ conclusion: 'suspicious', confidence: 60 }),
    });
    detect.mockReturnValue(null);

    vi.doMock('../src/memory/baseline.js', () => ({
      checkDeviation: vi.fn().mockReturnValue({
        isDeviation: true,
        deviationType: 'new_process',
        confidence: 80,
        description: 'never-seen-before process',
      }),
      updateBaseline: vi.fn().mockImplementation((b: EnvironmentBaseline) => b),
      continuousBaselineUpdate: vi.fn().mockImplementation((b: EnvironmentBaseline) => b),
    }));

    try {
      await processEvent(event, state, deps, noopSelfProcessEvent);

      expect(analyze).toHaveBeenCalled();
      expect(state.threatsDetected).toBe(1);
    } finally {
      vi.doUnmock('../src/memory/baseline.js');
    }
  });
});
