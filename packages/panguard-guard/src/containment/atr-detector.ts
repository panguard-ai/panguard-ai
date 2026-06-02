/**
 * ATRContentDetector — adapts the existing GuardATREngine (the full ATR rule
 * corpus + behavioral session tracking + skill fingerprinting) into the
 * ContentDetector that the async brain (RiskAnalyzer) consumes.
 *
 * This runs in Layer 2 (off the hot path). The inline gate never calls it.
 *
 * @module @panguard-ai/panguard-guard/containment/atr-detector
 */
import type { Severity, SecurityEvent } from '@panguard-ai/core';
import type { ContentDetector, DetectionMatch } from './types.js';

/** The subset of an ATR match this adapter reads (decoupled from ATRMatch). */
interface ATRMatchLike {
  readonly rule: {
    readonly id: string;
    readonly severity: string;
    readonly tags?: { readonly category?: string };
  };
  readonly confidence: number;
}

/** The subset of GuardATREngine this adapter needs. GuardATREngine satisfies it. */
export interface ATREngineLike {
  evaluate(event: SecurityEvent): readonly ATRMatchLike[];
}

/** ATR uses 'informational'; core Severity uses 'info'. Normalize. */
const SEVERITY_MAP: Record<string, Severity> = {
  informational: 'info',
  info: 'info',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

export class ATRContentDetector implements ContentDetector {
  constructor(private readonly engine: ATREngineLike) {}

  detect(event: SecurityEvent): readonly DetectionMatch[] {
    return this.engine.evaluate(event).map((m) => ({
      ruleId: m.rule.id,
      severity: SEVERITY_MAP[m.rule.severity] ?? 'medium',
      confidence: m.confidence,
      category: m.rule.tags?.category,
    }));
  }
}
