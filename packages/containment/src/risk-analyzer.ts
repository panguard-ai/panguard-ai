/**
 * RiskAnalyzer — Layer 2 of the dual-path model: the async brain.
 *
 * Runs OUT of the hot path. Wraps the existing content/behavioral detector
 * (the full ATR corpus via GuardATREngine) to compute a SESSION risk level and
 * emit distilled signals for the feedback loop. Never blocks an action — the
 * caller writes the result to the RiskStore for the inline gate to read.
 *
 * @module @panguard-ai/panguard-guard/containment/risk-analyzer
 */
import type { Severity, SecurityEvent } from '@panguard-ai/core';
import type {
  ContainmentEvent,
  ContentDetector,
  DetectionMatch,
  GateDecision,
  RiskLevel,
  SessionRisk,
} from './types.js';

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const RISK_RANK: Record<RiskLevel, number> = {
  normal: 0,
  elevated: 1,
  high: 2,
  confirmed_malicious: 3,
};

/** Confidence at/above which a critical match is treated as confirmed-malicious. */
const CONFIRMED_CONFIDENCE = 90;

export interface RiskAssessment {
  readonly risk: SessionRisk;
  /** Distilled signals (no raw payload) for the feedback loop. */
  readonly signals: readonly ContainmentEvent[];
}

export class RiskAnalyzer {
  constructor(private readonly detector: ContentDetector) {}

  /**
   * Assess a session's recent attempted/observed events. Pure (no side
   * effects) so it is trivial to test; the caller persists the result.
   */
  analyze(sessionId: string, events: readonly SecurityEvent[]): RiskAssessment {
    const matches: DetectionMatch[] = [];
    for (const event of events) {
      for (const m of this.detector.detect(event)) matches.push(m);
    }

    const level = scoreRisk(matches);
    const reasons = dedupe(matches.map((m) => m.ruleId));
    const decision = levelToDecision(level);
    const signals: readonly ContainmentEvent[] = matches.map((m) => ({
      sessionId,
      decision,
      actionClass: m.category ?? 'unknown',
      ruleIds: [m.ruleId],
    }));

    return { risk: { level, reasons }, signals };
  }
}

function scoreRisk(matches: readonly DetectionMatch[]): RiskLevel {
  let worst: RiskLevel = 'normal';
  for (const m of matches) {
    const rank = SEVERITY_RANK[m.severity] ?? 0;
    if (rank >= SEVERITY_RANK.critical) {
      if (m.confidence >= CONFIRMED_CONFIDENCE) return 'confirmed_malicious';
      worst = raise(worst, 'high');
    } else if (rank >= SEVERITY_RANK.high) {
      worst = raise(worst, 'elevated');
    }
  }
  return worst;
}

function raise(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_RANK[b] > RISK_RANK[a] ? b : a;
}

function levelToDecision(level: RiskLevel): GateDecision {
  if (level === 'confirmed_malicious') return 'DENY';
  if (level === 'high') return 'ESCALATE';
  return 'ALLOW';
}

function dedupe(items: readonly string[]): string[] {
  return [...new Set(items)];
}
