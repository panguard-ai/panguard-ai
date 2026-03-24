/**
 * Risk scoring engine
 *
 * Calculates a 0-100 risk score from findings.
 * Deduplicates findings by ID - only the highest severity instance counts.
 */

import type { Finding, RiskLevel } from './types.js';

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 25,
  high: 15,
  medium: 5,
  low: 1,
  info: 0,
};

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/**
 * Calculate risk score (0-100) from findings.
 * Deduplicates by finding ID - keeps the highest severity instance.
 *
 * @param findings - Scan findings to score
 * @param contextMultiplier - Multiplier from context signals (default 1.0).
 *   >1 = malicious context (boosts score).
 *   <1 = legitimate context (reduces score).
 */
export function calculateRiskScore(
  findings: readonly Finding[],
  contextMultiplier: number = 1.0
): {
  score: number;
  level: RiskLevel;
} {
  // Deduplicate: keep highest severity per finding ID
  const deduped = new Map<string, Finding>();
  for (const finding of findings) {
    const existing = deduped.get(finding.id);
    if (
      !existing ||
      (SEVERITY_RANK[finding.severity] ?? 0) > (SEVERITY_RANK[existing.severity] ?? 0)
    ) {
      deduped.set(finding.id, finding);
    }
  }

  let rawScore = 0;
  for (const finding of deduped.values()) {
    rawScore += SEVERITY_WEIGHTS[finding.severity] ?? 0;
  }

  // Apply context multiplier
  const adjustedScore = Math.round(rawScore * contextMultiplier);
  const score = Math.min(100, adjustedScore);

  const hasCritical = [...deduped.values()].some((f) => f.severity === 'critical');

  // Critical-override behavior depends on context:
  // - Normal context (multiplier >= 0.6): critical finding forces at least HIGH
  // - Strong legitimate context (multiplier < 0.6): critical finding forces MEDIUM only
  const weakenedCriticalOverride = contextMultiplier < 0.6;

  let level: RiskLevel;
  if (score >= 70 || (hasCritical && !weakenedCriticalOverride && score >= 25)) level = 'CRITICAL';
  else if (score >= 40 || (hasCritical && !weakenedCriticalOverride)) level = 'HIGH';
  else if (score >= 15 || (hasCritical && weakenedCriticalOverride)) level = 'MEDIUM';
  else level = 'LOW';

  return { score, level };
}
