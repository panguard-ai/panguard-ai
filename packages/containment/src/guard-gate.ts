/**
 * GuardGate — orchestrates the dual-path model. onAction is the synchronous
 * hot path (inline gate only); onSessionActivity is the async brain plus
 * escalation. The two are decoupled through the RiskStore: the brain writes
 * risk, the gate reads it.
 *
 * @module @panguard-ai/panguard-guard/containment/guard-gate
 */
import type { SecurityEvent } from '@panguard-ai/core';
import type { ActionContext, ContainmentMode, GateDecision } from './types.js';
import type { RiskStore } from './risk-store.js';
import type { InlineGate } from './inline-gate.js';
import type { RiskAnalyzer, RiskAssessment } from './risk-analyzer.js';

/** Layer 3 controller — applies containment to a session. Rare. */
export interface ContainmentController {
  escalate(sessionId: string, mode: ContainmentMode): Promise<void>;
}

export interface GuardGateDeps {
  readonly gate: InlineGate;
  readonly analyzer: RiskAnalyzer;
  readonly riskStore: RiskStore;
  readonly containment: ContainmentController;
}

export class GuardGate {
  constructor(private readonly deps: GuardGateDeps) {}

  /**
   * HOT PATH. Synchronous and fast — reads the session's cached risk and runs
   * the inline gate. Does NOT run the brain. Returns the decision; the
   * chokepoint enforces it (allow / return denyMessage / route to controller).
   */
  onAction(ctx: ActionContext): GateDecision {
    const risk = this.deps.riskStore.get(ctx.sessionId);
    return this.deps.gate.decide(ctx, risk);
  }

  /** Clean, actionable denial message for a blocked action. */
  denyMessage(ctx: ActionContext): string {
    return this.deps.gate.denyMessage(ctx);
  }

  /**
   * OFF the hot path. Runs the brain over recent session events, updates the
   * risk store, and escalates containment when warranted. Returns the
   * assessment whose signals feed the feedback loop.
   */
  async onSessionActivity(
    sessionId: string,
    events: readonly SecurityEvent[],
  ): Promise<RiskAssessment> {
    const assessment = this.deps.analyzer.analyze(sessionId, events);
    this.deps.riskStore.set(sessionId, assessment.risk);

    if (assessment.risk.level === 'confirmed_malicious') {
      await this.deps.containment.escalate(sessionId, 'kill');
    } else if (assessment.risk.level === 'high') {
      await this.deps.containment.escalate(sessionId, 'quarantine');
    }
    return assessment;
  }
}

/** A no-op controller for environments without containment wired yet. */
export class NoopContainmentController implements ContainmentController {
  async escalate(): Promise<void> {
    /* intentionally no-op until the response/ primitives are wired */
  }
}
