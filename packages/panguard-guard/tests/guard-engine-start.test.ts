/**
 * GuardEngine.start(): host monitors and Threat Cloud sync follow the config.
 * - the monitor flags reach MonitorEngine unchanged
 * - ProcessWatcher (ps/tasklist poller) only starts when monitors.processMonitor is true
 * - no Threat Cloud sync timer, initial sync or public feed download without consent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EnvironmentBaseline, GuardConfig } from '../src/types.js';

// ---------------------------------------------------------------------------
// Mocks - must be set up before importing the module under test
// ---------------------------------------------------------------------------

const {
  monitorEngineCtor,
  feedStart,
  feedStop,
  goOffline,
  processWatcherStart,
  processWatcherCtor,
  syncSpy,
  timerSpy,
} = vi.hoisted(() => ({
  monitorEngineCtor: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  feedStart: vi.fn().mockResolvedValue(undefined),
  feedStop: vi.fn(),
  goOffline: vi.fn(),
  processWatcherStart: vi.fn().mockResolvedValue(undefined),
  processWatcherCtor: vi.fn(),
  syncSpy: vi.fn().mockResolvedValue(undefined),
  timerSpy: vi.fn().mockReturnValue(setTimeout(() => undefined, 0)),
}));

vi.mock('../src/watchers/process-watcher.js', () => ({
  ProcessWatcher: vi.fn().mockImplementation(() => {
    processWatcherCtor();
    return {
      checkAvailability: vi.fn().mockResolvedValue(true),
      start: processWatcherStart,
      stop: vi.fn(),
      on: vi.fn(),
    };
  }),
}));

vi.mock('../src/rule-sync.js', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../src/rule-sync.js');
  return { ...actual, syncThreatCloud: syncSpy, setupCloudSyncTimer: timerSpy };
});

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
    MonitorEngine: monitorEngineCtor,
    ThreatIntelFeedManager: vi.fn().mockImplementation(() => ({
      start: feedStart,
      stop: feedStop,
      getIoCCount: vi.fn().mockReturnValue(0),
      getIPCount: vi.fn().mockReturnValue(0),
      addExternalIPs: vi.fn().mockReturnValue(0),
    })),
    setFeedManager: vi.fn(),
  };
});

// Mock security-hardening
vi.mock('@panguard-ai/security-hardening', () => ({
  loadSecurityPolicy: vi.fn().mockReturnValue({}),
  runSecurityAudit: vi.fn().mockReturnValue({ findings: [], riskScore: 0 }),
  logAuditEvent: vi.fn(),
  SyslogAdapter: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
}));

// Mock memory
vi.mock('../src/memory/index.js', () => ({
  loadBaseline: vi.fn().mockReturnValue({
    normalProcesses: [],
    normalConnections: [],
    normalLoginPatterns: [],
    normalServicePorts: [],
    learningStarted: new Date().toISOString(),
    learningComplete: false,
    confidenceLevel: 0,
    lastUpdated: new Date().toISOString(),
    eventCount: 0,
  }),
  saveBaseline: vi.fn(),
  isLearningComplete: vi.fn().mockReturnValue(false),
  getLearningProgress: vi.fn().mockReturnValue(50),
  switchToProtectionMode: vi.fn().mockImplementation((b: EnvironmentBaseline) => ({
    ...b,
    learningComplete: true,
  })),
}));

// Mock memory/baseline.js dynamic import
vi.mock('../src/memory/baseline.js', () => ({
  updateBaseline: vi.fn().mockImplementation((b: EnvironmentBaseline) => b),
  continuousBaselineUpdate: vi.fn().mockImplementation((b: EnvironmentBaseline) => b),
  pruneStalePatterns: vi.fn().mockImplementation((b: EnvironmentBaseline) => b),
  createEmptyBaseline: vi.fn().mockReturnValue({
    normalProcesses: [],
    normalConnections: [],
    normalLoginPatterns: [],
    normalServicePorts: [],
    learningStarted: new Date().toISOString(),
    learningComplete: false,
    confidenceLevel: 0,
    lastUpdated: new Date().toISOString(),
    eventCount: 0,
  }),
}));

// Mock DetectAgent, AnalyzeAgent, RespondAgent, ReportAgent
const mockDetect = vi.fn().mockReturnValue(null);
const mockAnalyze = vi.fn().mockResolvedValue({
  conclusion: 'suspicious',
  confidence: 75,
  reasoning: 'Test reasoning',
  evidence: [{ source: 'rule_match', description: 'test', confidence: 75 }],
  recommendedAction: 'notify',
});
const mockRespond = vi.fn().mockResolvedValue({
  action: 'notify',
  success: true,
  details: 'Notification sent',
  timestamp: new Date().toISOString(),
});
const mockReport = vi.fn().mockReturnValue({
  updatedBaseline: {
    normalProcesses: [],
    normalConnections: [],
    normalLoginPatterns: [],
    normalServicePorts: [],
    learningStarted: new Date().toISOString(),
    learningComplete: false,
    confidenceLevel: 0,
    lastUpdated: new Date().toISOString(),
    eventCount: 1,
  },
  anonymizedData: null,
});
const mockSetModeRespond = vi.fn();
const mockSetModeReport = vi.fn();
const mockAddBlockedIP = vi.fn().mockResolvedValue({
  action: 'block_ip',
  success: true,
  details: 'Blocked',
  timestamp: new Date().toISOString(),
});
const mockUpdateActionPolicy = vi.fn();

vi.mock('../src/agent/index.js', () => ({
  DetectAgent: vi.fn().mockImplementation(() => ({
    detect: mockDetect,
  })),
  AnalyzeAgent: vi.fn().mockImplementation(() => ({
    analyze: mockAnalyze,
  })),
  RespondAgent: vi.fn().mockImplementation(() => ({
    respond: mockRespond,
    setMode: mockSetModeRespond,
    addBlockedIP: mockAddBlockedIP,
    updateActionPolicy: mockUpdateActionPolicy,
    setWhitelistManager: vi.fn(),
    setPlaybookEngine: vi.fn(),
  })),
  ReportAgent: vi.fn().mockImplementation(() => ({
    report: mockReport,
    setMode: mockSetModeReport,
  })),
}));

// Mock investigation engine
const mockInvestigate = vi.fn().mockResolvedValue({
  steps: [],
  reasoning: 'Investigation reasoning',
});

vi.mock('../src/investigation/index.js', () => ({
  InvestigationEngine: vi.fn().mockImplementation(() => ({
    investigate: mockInvestigate,
  })),
}));

// Mock notify
vi.mock('../src/notify/index.js', () => ({
  sendNotifications: vi.fn().mockResolvedValue([]),
}));

// Mock threat cloud
// Hoisted to run before vi.mock factory (which itself is hoisted to module top).
// Without vi.hoisted, the factory below would reference `mockUpload` before it's
// initialised and throw ReferenceError.
const { mockUpload, mockFetchRules, mockFetchBlocklist, mockFlushQueue } = vi.hoisted(() => ({
  mockUpload: vi.fn().mockResolvedValue(true),
  mockFetchRules: vi.fn().mockResolvedValue([]),
  mockFetchBlocklist: vi.fn().mockResolvedValue([]),
  mockFlushQueue: vi.fn().mockResolvedValue(0),
}));

vi.mock('../src/threat-cloud/index.js', () => {
  const mockInstance = {
    upload: mockUpload,
    fetchRules: mockFetchRules,
    fetchBlocklist: mockFetchBlocklist,
    flushQueue: mockFlushQueue,
    getStatus: vi.fn().mockReturnValue('connected'),
    stopFlushTimer: vi.fn(),
    goOffline,
  };
  const MockedClient = vi.fn().mockImplementation(() => mockInstance);
  // Static async factory used by initEngines() for auto-provisioning TC sensor keys
  (MockedClient as unknown as { create: typeof vi.fn }).create = vi
    .fn()
    .mockResolvedValue(mockInstance);
  return { ThreatCloudClient: MockedClient };
});

// Mock dashboard
vi.mock('../src/dashboard/index.js', () => ({
  DashboardServer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    addVerdict: vi.fn(),
    pushEvent: vi.fn(),
    updateStatus: vi.fn(),
    setConfigGetter: vi.fn(),
    addThreatMapEntry: vi.fn(),
  })),
}));

// Mock daemon
vi.mock('../src/daemon/index.js', () => ({
  PidFile: vi.fn().mockImplementation(() => ({
    write: vi.fn(),
    remove: vi.fn(),
  })),
  Watchdog: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    heartbeat: vi.fn(),
  })),
}));

// Mock license
vi.mock('../src/license/index.js', () => ({
  validateLicense: vi.fn().mockReturnValue({
    key: '',
    tier: 'free',
    isValid: true,
    features: ['basic_monitoring', 'rule_matching', 'auto_respond', 'threat_cloud_upload'],
  }),
  hasFeature: vi.fn().mockReturnValue(false),
}));

// Mock builtin rules
vi.mock('../src/rules/builtin-rules.js', () => ({
  BUILTIN_RULES: [],
}));

// Mock agent client
vi.mock('../src/agent-client/index.js', () => ({
  PanguardAgentClient: vi.fn().mockImplementation(() => ({
    register: vi.fn().mockResolvedValue({ agentId: 'test-agent-1' }),
    startHeartbeat: vi.fn(),
    stopHeartbeat: vi.fn(),
    isRegistered: vi.fn().mockReturnValue(false),
    pullPolicy: vi.fn().mockResolvedValue(null),
    reportEvent: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { GuardEngine } from '../src/guard-engine.js';
import { DEFAULT_GUARD_CONFIG } from '../src/config.js';

function makeConfig(overrides: Partial<GuardConfig> = {}): GuardConfig {
  return {
    ...DEFAULT_GUARD_CONFIG,
    dataDir: '/tmp/panguard-test-start',
    dashboardEnabled: false,
    watchdogEnabled: false,
    ...overrides,
  };
}

async function startEngine(overrides: Partial<GuardConfig>): Promise<GuardEngine> {
  const engine = await GuardEngine.create(makeConfig(overrides));
  await engine.start();
  return engine;
}

describe('GuardEngine.start() follows the config', () => {
  let engine: GuardEngine | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = null;
  });

  afterEach(async () => {
    await engine?.stop().catch(() => undefined);
  });

  it('passes the monitor flags to MonitorEngine', async () => {
    engine = await startEngine({
      monitors: {
        ...DEFAULT_GUARD_CONFIG.monitors,
        logMonitor: true,
        networkMonitor: false,
        processMonitor: true,
        fileMonitor: false,
        networkPollInterval: 7000,
        processPollInterval: 9000,
      },
    });
    expect(monitorEngineCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        logMonitor: true,
        networkMonitor: false,
        processMonitor: true,
        fileMonitor: false,
        networkPollInterval: 7000,
        processPollInterval: 9000,
      })
    );
  });

  it('passes all monitors off with the default config', async () => {
    engine = await startEngine({});
    expect(monitorEngineCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        logMonitor: false,
        networkMonitor: false,
        processMonitor: false,
        fileMonitor: false,
      })
    );
  });

  it('does not start ProcessWatcher when processMonitor is false', async () => {
    engine = await startEngine({});
    expect(processWatcherCtor).not.toHaveBeenCalled();
    expect(processWatcherStart).not.toHaveBeenCalled();
  });

  it('starts ProcessWatcher when processMonitor is true', async () => {
    engine = await startEngine({
      monitors: { ...DEFAULT_GUARD_CONFIG.monitors, processMonitor: true },
    });
    expect(processWatcherCtor).toHaveBeenCalledTimes(1);
    expect(processWatcherStart).toHaveBeenCalledTimes(1);
  });

  it('makes no Threat Cloud sync or public feed download without consent', async () => {
    engine = await startEngine({ threatCloudUploadEnabled: false });
    expect(timerSpy).not.toHaveBeenCalled();
    expect(syncSpy).not.toHaveBeenCalled();
    expect(feedStart).not.toHaveBeenCalled();
  });

  it('syncs and downloads feeds once consent is on', async () => {
    engine = await startEngine({ threatCloudUploadEnabled: true });
    expect(timerSpy).toHaveBeenCalledTimes(1);
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(feedStart).toHaveBeenCalledTimes(1);
  });

  it('withdrawing consent on a running instance stops sync, feeds and the client', async () => {
    engine = await startEngine({ threatCloudUploadEnabled: true });
    feedStop.mockClear();
    goOffline.mockClear();

    engine.applyConfig({ ...engine.getConfig(), threatCloudUploadEnabled: false });

    expect(feedStop).toHaveBeenCalledTimes(1);
    expect(goOffline).toHaveBeenCalledTimes(1);
    expect(engine.getConfig().threatCloudUploadEnabled).toBe(false);
  });

  it('applying a config that keeps sharing on changes nothing', async () => {
    engine = await startEngine({ threatCloudUploadEnabled: true });
    feedStop.mockClear();
    goOffline.mockClear();
    engine.applyConfig({ ...engine.getConfig(), mode: 'learning' });
    expect(feedStop).not.toHaveBeenCalled();
    expect(goOffline).not.toHaveBeenCalled();
  });
});
