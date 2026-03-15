/**
 * GuardContext - Shared state interface for the guard engine refactor
 *
 * Instead of each module being a method on a massive GuardEngine class,
 * extracted modules become functions that accept GuardContext as their
 * first parameter. This decouples state from behavior and enables
 * easier testing and composition.
 *
 * @module @panguard-ai/panguard-guard/guard-context
 */

import type {
  RuleEngine,
  ThreatIntelFeedManager,
  YaraScanner,
  SmartRouter,
  KnowledgeDistiller,
  Logger,
} from '@panguard-ai/core';
import type {
  GuardConfig,
  GuardMode,
  EnvironmentBaseline,
} from './types.js';
import type { DetectAgent, AnalyzeAgent, RespondAgent, ReportAgent } from './agent/index.js';
import type { InvestigationEngine } from './investigation/index.js';
import type { ThreatCloudClient } from './threat-cloud/index.js';
import type { DashboardServer } from './dashboard/index.js';
import type { SyslogAdapter } from '@panguard-ai/security-hardening';
import type { PanguardAgentClient } from './agent-client/index.js';
import type { GuardATREngine } from './engines/atr-engine.js';
import type { ATRDrafter } from './engines/atr-drafter.js';

/**
 * GuardContext contains all shared state that extracted modules need.
 *
 * Fields marked `readonly` are immutable after initialization.
 * Mutable fields are updated by specific modules (e.g. event-processor
 * increments counters, lifecycle toggles mode).
 */
export interface GuardContext {
  // -- Config (immutable after init) --
  readonly config: GuardConfig;

  // -- Mutable operating state --
  mode: GuardMode;
  baseline: EnvironmentBaseline;
  readonly baselinePath: string;

  // -- Counters (mutated by event-processor, read by lifecycle / dashboard) --
  eventsProcessed: number;
  threatsDetected: number;
  actionsExecuted: number;
  threatCloudUploaded: number;

  // -- Engine instances (initialized once, shared across modules) --
  readonly ruleEngine: RuleEngine;
  readonly yaraScanner: YaraScanner;
  readonly atrEngine: GuardATREngine;
  readonly detectAgent: DetectAgent;
  readonly analyzeAgent: AnalyzeAgent;
  readonly respondAgent: RespondAgent;
  readonly reportAgent: ReportAgent;
  readonly investigationEngine: InvestigationEngine;
  readonly threatCloud: ThreatCloudClient;
  readonly feedManager: ThreatIntelFeedManager;
  readonly smartRouter: SmartRouter | null;
  readonly knowledgeDistiller: KnowledgeDistiller | null;
  readonly atrDrafter: ATRDrafter | null;

  // -- Optional infrastructure (may be null if not configured) --
  dashboard: DashboardServer | null;
  syslogAdapter: SyslogAdapter | null;
  agentClient: PanguardAgentClient | null;

  // -- Logger --
  readonly logger: Logger;

  // -- Callback for external event consumers --
  eventCallback?: (type: string, data: Record<string, unknown>) => void;

  // -- Memory monitoring --
  consecutiveCriticalChecks: number;
}

/** Parameters for creating a GuardContext via the factory function */
export interface CreateGuardContextParams {
  readonly config: GuardConfig;
  readonly mode: GuardMode;
  readonly baseline: EnvironmentBaseline;
  readonly baselinePath: string;
  readonly ruleEngine: RuleEngine;
  readonly yaraScanner: YaraScanner;
  readonly atrEngine: GuardATREngine;
  readonly detectAgent: DetectAgent;
  readonly analyzeAgent: AnalyzeAgent;
  readonly respondAgent: RespondAgent;
  readonly reportAgent: ReportAgent;
  readonly investigationEngine: InvestigationEngine;
  readonly threatCloud: ThreatCloudClient;
  readonly feedManager: ThreatIntelFeedManager;
  readonly logger: Logger;
  readonly smartRouter?: SmartRouter | null;
  readonly knowledgeDistiller?: KnowledgeDistiller | null;
  readonly atrDrafter?: ATRDrafter | null;
  readonly dashboard?: DashboardServer | null;
  readonly syslogAdapter?: SyslogAdapter | null;
  readonly agentClient?: PanguardAgentClient | null;
  readonly eventCallback?: (type: string, data: Record<string, unknown>) => void;
}

/**
 * Create a properly initialized GuardContext.
 *
 * Accepts all required engine instances and optional infrastructure,
 * returning an object that satisfies the GuardContext interface with
 * sensible defaults for optional / mutable fields.
 */
export function createGuardContext(params: CreateGuardContextParams): GuardContext {
  return {
    config: params.config,
    mode: params.mode,
    baseline: params.baseline,
    baselinePath: params.baselinePath,

    eventsProcessed: 0,
    threatsDetected: 0,
    actionsExecuted: 0,
    threatCloudUploaded: 0,

    ruleEngine: params.ruleEngine,
    yaraScanner: params.yaraScanner,
    atrEngine: params.atrEngine,
    detectAgent: params.detectAgent,
    analyzeAgent: params.analyzeAgent,
    respondAgent: params.respondAgent,
    reportAgent: params.reportAgent,
    investigationEngine: params.investigationEngine,
    threatCloud: params.threatCloud,
    feedManager: params.feedManager,
    smartRouter: params.smartRouter ?? null,
    knowledgeDistiller: params.knowledgeDistiller ?? null,
    atrDrafter: params.atrDrafter ?? null,

    dashboard: params.dashboard ?? null,
    syslogAdapter: params.syslogAdapter ?? null,
    agentClient: params.agentClient ?? null,

    logger: params.logger,

    eventCallback: params.eventCallback,

    consecutiveCriticalChecks: 0,
  };
}
