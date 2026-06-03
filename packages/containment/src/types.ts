/**
 * Containment closed-loop types — the dual-path agent containment model.
 * See docs/architecture/agent-containment-closed-loop.md (v2).
 *
 * @module @panguard-ai/panguard-guard/containment/types
 */
import type { Severity, SecurityEvent } from '@panguard-ai/core';

/** The kind of action an agent is attempting, observed at a chokepoint. */
export type ActionKind =
  | 'tool_call'
  | 'command'
  | 'file_write'
  | 'network_egress'
  | 'agent_message';

/**
 * An action an agent is ATTEMPTING (pre-execution), as seen at a PanGuard
 * chokepoint (MCP gateway, tool broker, FS shim, egress proxy). This is the
 * input to the inline gate. Distinct from SecurityEvent, which is a post-hoc
 * observed event fed to the async brain.
 */
export interface ActionContext {
  readonly agentId: string;
  readonly sessionId: string;
  readonly kind: ActionKind;
  /** Tool name / command / path / egress host / peer agentId. */
  readonly target: string;
  /** The content: command line, tool args (serialized), message body. */
  readonly payload: string;
  /** Capabilities this agent was granted (Layer 0 least-privilege scope). */
  readonly capabilities: ReadonlySet<string>;
}

/** Session risk level, written by the async brain, read by the inline gate. */
export type RiskLevel = 'normal' | 'elevated' | 'high' | 'confirmed_malicious';

export interface SessionRisk {
  readonly level: RiskLevel;
  /** Distilled reasons (rule IDs / signal names) — never raw payload content. */
  readonly reasons: readonly string[];
}

/** The default risk for an unseen session. */
export const NORMAL_RISK: SessionRisk = { level: 'normal', reasons: [] };

/** Inline gate decision. ALLOW is the default; ESCALATE hands to containment. */
export type GateDecision = 'ALLOW' | 'DENY' | 'ESCALATE';

/** Layer 3 containment modes, applied to a session on escalation (rare). */
export type ContainmentMode = 'branch' | 'quarantine' | 'hitl' | 'deceive' | 'kill';

/**
 * A distilled decision/containment signal for the feedback loop. Carries the
 * decision and an action-class, never the raw payload (privacy + the
 * corroboration contract in the sibling design doc).
 */
export interface ContainmentEvent {
  readonly sessionId: string;
  readonly decision: GateDecision;
  readonly actionClass: string;
  readonly ruleIds: readonly string[];
}

/** Minimal detection-match shape the brain needs (decoupled from ATRMatch). */
export interface DetectionMatch {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly confidence: number;
  readonly category?: string;
}

/**
 * Content/behavioral detector the async brain depends on. GuardATREngine
 * satisfies this via the adapter in risk-analyzer.ts.
 */
export interface ContentDetector {
  detect(event: SecurityEvent): readonly DetectionMatch[];
}
