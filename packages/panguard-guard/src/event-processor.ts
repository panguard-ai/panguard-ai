/**
 * event-processor.ts - Event processing pipeline extracted from GuardEngine
 *
 * Contains:
 * - processEvent() - the full detection-analysis-response pipeline
 * - Sub-functions: evaluateATR, runSmartRouter,
 *   runKnowledgeDistillation, reportAndNotify
 *
 * @module @panguard-ai/panguard-guard/event-processor
 */

import { createLogger } from '@panguard-ai/core';
import type { SmartRouter, KnowledgeDistiller, SecurityEvent, Severity } from '@panguard-ai/core';
import type {
  GuardMode,
  EnvironmentBaseline,
  ThreatVerdict,
  ResponseResult,
  GuardConfig,
} from './types.js';
import type { DetectAgent, AnalyzeAgent, RespondAgent, ReportAgent } from './agent/index.js';
import type { DetectionResult } from './types.js';
import type { InvestigationEngine } from './investigation/index.js';
import type { ThreatCloudClient } from './threat-cloud/index.js';
import type { DashboardServer } from './dashboard/index.js';
import type { SyslogAdapter } from '@panguard-ai/security-hardening';
import type { PanguardAgentClient } from './agent-client/index.js';
import type { GuardATREngine } from './engines/atr-engine.js';
import type { ATRDrafter } from './engines/atr-drafter.js';
import { sendNotifications } from './notify/index.js';
import { saveBaseline } from './memory/index.js';
import { logAuditEvent } from '@panguard-ai/security-hardening';

const logger = createLogger('panguard-guard:event-processor');

/** Mutable state that the event processor reads and writes */
export interface EventProcessorState {
  mode: GuardMode;
  baseline: EnvironmentBaseline;
  eventsProcessed: number;
  threatsDetected: number;
  actionsExecuted: number;
  threatCloudUploaded: number;
  readonly baselinePath: string;
  readonly config: GuardConfig;
  eventCallback?: (type: string, data: Record<string, unknown>) => void;
}

/** Engine dependencies for event processing (all readonly references) */
export interface EventProcessorDeps {
  readonly atrEngine: GuardATREngine;
  readonly detectAgent: DetectAgent;
  readonly analyzeAgent: AnalyzeAgent;
  readonly respondAgent: RespondAgent;
  readonly reportAgent: ReportAgent;
  readonly investigationEngine: InvestigationEngine;
  readonly threatCloud: ThreatCloudClient;
  readonly smartRouter: SmartRouter | null;
  readonly knowledgeDistiller: KnowledgeDistiller | null;
  readonly atrDrafter: ATRDrafter | null;
  readonly dashboard: DashboardServer | null;
  readonly syslogAdapter: SyslogAdapter | null;
  readonly agentClient: PanguardAgentClient | null;
}

/**
 * Evaluate ATR rules and merge matches into the detection result.
 */
function evaluateATR(
  event: SecurityEvent,
  detection: DetectionResult | null,
  atrEngine: GuardATREngine
): DetectionResult | null {
  const atrMatches = atrEngine.evaluate(event);

  if (atrMatches.length === 0) {
    return detection;
  }

  const atrRuleMatches = atrMatches.map((m) => ({
    ruleId: m.rule.id,
    ruleName: m.rule.title,
    severity: (m.rule.severity === 'informational' ? 'info' : m.rule.severity) as Severity,
  }));
  const atrMatchData = atrMatches.map((m) => ({
    ruleId: m.rule.id,
    category: m.rule.tags?.category ?? 'agent-threat',
    severity: m.rule.severity,
    responseActions: m.rule.response?.actions ?? [],
    confidence: m.confidence,
  }));

  if (detection) {
    // Merge ATR matches into existing detection (return new object)
    return {
      ...detection,
      ruleMatches: [...detection.ruleMatches, ...atrRuleMatches],
      atrMatches: atrMatchData,
    };
  }

  // Create detection from ATR matches alone
  return {
    event,
    ruleMatches: atrRuleMatches,
    atrMatches: atrMatchData,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run SmartRouter assessment to determine whether AI analysis can be skipped.
 */
function runSmartRouter(detection: DetectionResult, smartRouter: SmartRouter | null): void {
  if (!smartRouter) return;

  const maxRuleConfidence = Math.max(
    ...detection.ruleMatches.map((m) => {
      const severityToConfidence: Record<string, number> = {
        critical: 95,
        high: 85,
        medium: 70,
        low: 50,
        info: 30,
      };
      return severityToConfidence[m.severity] ?? 60;
    })
  );
  const hasChain = !!detection.attackChain;
  const complexity = smartRouter.assessComplexity(maxRuleConfidence, hasChain);

  if (complexity === 'skip') {
    logger.info(
      `SmartRouter: skipping AI for high-confidence rule match (${maxRuleConfidence}%) / ` +
        `SmartRouter: 高信心規則匹配跳過 AI (${maxRuleConfidence}%)`
    );
  }
}

/**
 * Run knowledge distillation to log AI verdicts for potential future rule creation.
 * (ATR Engine is used for detection.)
 */
function runKnowledgeDistillation(
  event: SecurityEvent,
  verdict: ThreatVerdict,
  knowledgeDistiller: KnowledgeDistiller
): void {
  if (verdict.conclusion === 'benign' || verdict.confidence < 70) return;

  const indicators: Record<string, string> = {};
  const ip =
    (event.metadata?.['sourceIP'] as string) ?? (event.metadata?.['remoteAddress'] as string);
  if (ip) indicators['sourceIP'] = ip;
  const proc = event.metadata?.['processName'] as string;
  if (proc) indicators['processName'] = proc;
  const port = event.metadata?.['destinationPort'] as string;
  if (port) indicators['destinationPort'] = port;
  const path = event.metadata?.['filePath'] as string;
  if (path) indicators['filePath'] = path;
  const cmd = event.metadata?.['commandLine'] as string;
  if (cmd) indicators['commandLine'] = cmd.slice(0, 200);

  const distilled = knowledgeDistiller.distill({
    eventCategory: event.category,
    eventSource: event.source,
    eventSeverity:
      verdict.confidence >= 90 ? 'critical' : verdict.confidence >= 75 ? 'high' : 'medium',
    mitreTechnique: verdict.mitreTechnique,
    indicators,
    aiResult: {
      summary: verdict.reasoning,
      severity:
        verdict.confidence >= 90 ? 'critical' : verdict.confidence >= 75 ? 'high' : 'medium',
      confidence: verdict.confidence / 100,
      recommendations: verdict.evidence.map((e) => e.description).slice(0, 3),
    },
  });

  if (distilled) {
    logger.info(
      `Knowledge distilled from AI: ${distilled.ruleId} / AI 蒸餾規則: ${distilled.ruleId}`
    );
  }
}

/**
 * Report verdict, send notifications, update dashboard and cloud.
 */
async function reportAndNotify(
  event: SecurityEvent,
  verdict: ThreatVerdict,
  response: ResponseResult,
  state: EventProcessorState,
  deps: EventProcessorDeps
): Promise<void> {
  // Send notifications if needed
  if (
    response.action === 'notify' ||
    verdict.confidence >= state.config.actionPolicy.notifyAndWait
  ) {
    await sendNotifications(state.config.notifications, verdict, event.description);
  }

  // Stage 4: Report
  const { updatedBaseline, anonymizedData } = deps.reportAgent.report(
    event,
    verdict,
    response,
    state.baseline
  );
  state.baseline = updatedBaseline;

  // Report to Manager if in agent mode
  if (deps.agentClient?.isRegistered()) {
    deps.agentClient
      .reportEvent({
        event,
        verdict: {
          conclusion: verdict.conclusion,
          confidence: verdict.confidence,
          action: response.action,
        },
      })
      .catch((err: unknown) => {
        logger.warn(
          `Agent event report failed: ${err instanceof Error ? err.message : String(err)}`
        );
      });
  }

  // Upload to threat cloud
  if (
    anonymizedData &&
    state.config.threatCloudUploadEnabled !== false &&
    state.config.telemetryEnabled !== false
  ) {
    if (state.config.showUploadData) {
      logger.info(`[upload-preview] Anonymized data: ${JSON.stringify(anonymizedData, null, 2)}`);
    }
    await deps.threatCloud.upload(anonymizedData);
    state.threatCloudUploaded++;
  }

  // Notify event callback (for CLI quiet mode display)
  state.eventCallback?.('threat', {
    category: event.category,
    description: event.description,
    conclusion: verdict.conclusion,
    confidence: verdict.confidence,
    action: response.action,
    sourceIP:
      (event.metadata?.['sourceIP'] as string) ??
      (event.metadata?.['remoteAddress'] as string) ??
      'unknown',
  });

  // Update dashboard
  if (deps.dashboard) {
    deps.dashboard.addVerdict(verdict);
    deps.dashboard.pushEvent({
      type: 'new_event',
      data: { event: event.id, verdict: verdict.conclusion, confidence: verdict.confidence },
      timestamp: new Date().toISOString(),
    });

    // Update threat map if we have IP
    const sourceIP =
      (event.metadata?.['sourceIP'] as string) ?? (event.metadata?.['remoteAddress'] as string);
    if (sourceIP && verdict.conclusion !== 'benign') {
      deps.dashboard.addThreatMapEntry({
        sourceIP,
        attackType: event.category,
        count: 1,
        lastSeen: new Date().toISOString(),
      });
    }
  }

  // Save baseline periodically
  if (state.eventsProcessed % 100 === 0) {
    saveBaseline(state.baselinePath, state.baseline);
  }
}

/**
 * Process a single security event through the full detection-analysis-response pipeline.
 *
 * This is the main event handler extracted from GuardEngine.processEvent().
 * It mutates the state counters and baseline in-place on the provided state object.
 */
export async function processEvent(
  event: SecurityEvent,
  state: EventProcessorState,
  deps: EventProcessorDeps,
  _selfProcessEvent: (e: SecurityEvent) => void
): Promise<void> {
  state.eventsProcessed++;

  // Audit log every event
  logAuditEvent({
    level: 'info',
    action: 'policy_check',
    target: event.id,
    result: 'success',
    context: { source: event.source, category: event.category },
  });
  if (deps.syslogAdapter) {
    deps.syslogAdapter.send({
      level: 'info',
      action: 'policy_check',
      target: event.id,
      result: 'success',
      module: 'panguard-guard',
      context: { source: event.source, description: event.description },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // ATR evaluation
    let detection = deps.detectAgent.detect(event);
    detection = evaluateATR(event, detection, deps.atrEngine);

    if (!detection) {
      // No threat detected - update baseline based on mode
      if (state.mode === 'learning') {
        const { updateBaseline } = await import('./memory/baseline.js');
        state.baseline = updateBaseline(state.baseline, event);
      } else {
        const { continuousBaselineUpdate } = await import('./memory/baseline.js');
        state.baseline = continuousBaselineUpdate(state.baseline, event, 'benign');
      }
      return;
    }

    state.threatsDetected++;

    // Skill Whitelist check
    const toolName = event.metadata?.['tool_name'] as string | undefined;
    const isWhitelisted = toolName ? deps.atrEngine.isSkillWhitelisted(toolName) : false;
    if (isWhitelisted && !detection.atrMatches?.length) {
      logger.info(
        `Whitelist skip: ${toolName} is trusted, no ATR match / ` +
          `白名單跳過: ${toolName} 為信任 skill，無 ATR 匹配`
      );
      return;
    }

    // SmartRouter assessment
    runSmartRouter(detection, deps.smartRouter);

    // Stage 2: Analyze
    const verdict: ThreatVerdict = await deps.analyzeAgent.analyze(detection, state.baseline);

    // Knowledge Distillation
    if (deps.knowledgeDistiller && verdict.conclusion !== 'benign' && verdict.confidence >= 70) {
      runKnowledgeDistillation(event, verdict, deps.knowledgeDistiller);
    }

    // Record detection for ATR Drafter with full analyzeAgent context
    if (deps.atrDrafter && verdict.conclusion !== 'benign') {
      deps.atrDrafter.recordDetection(event, {
        conclusion: verdict.conclusion,
        confidence: verdict.confidence,
        mitreTechniques: verdict.mitreTechnique ? [verdict.mitreTechnique] : undefined,
        atrRulesMatched: detection.atrMatches?.map((m) => m.ruleId),
        reasoning: verdict.reasoning,
        evidenceDescriptions: verdict.evidence.map((e) => `[${e.source}] ${e.description}`),
      });
    }

    // Run investigation for suspicious/malicious verdicts
    if (verdict.conclusion !== 'benign') {
      const investigation = await deps.investigationEngine.investigate(event);
      verdict.investigationSteps = investigation.steps;
    }

    // Stage 3: Respond
    const response: ResponseResult = await deps.respondAgent.respond(verdict);
    if (response.action !== 'log_only') {
      state.actionsExecuted++;
    }

    // Report, notify, upload, dashboard
    await reportAndNotify(event, verdict, response, state, deps);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Event processing failed: ${msg} / 事件處理失敗: ${msg}`);
  }
}
