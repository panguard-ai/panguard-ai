/**
 * Risk scoring engine
 *
 * Calculates a 0-100 risk score from audit findings.
 * Deduplicates findings by ID — only the highest severity instance counts.
 */

import type { AuditFinding, AuditReport } from './types.js';

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 25,
  high: 15,
  medium: 5,
  low: 1,
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
 * Deduplicates by finding ID — keeps the highest severity instance.
 *
 * @param findings - Audit findings to score
 * @param contextMultiplier - Optional multiplier from context signals (default 1.0).
 *   >1 = malicious context signals detected (boosts score).
 *   <1 = legitimate context signals detected (reduces score).
 */
export function calculateRiskScore(
  findings: AuditFinding[],
  contextMultiplier: number = 1.0
): {
  score: number;
  level: AuditReport['riskLevel'];
} {
  // Deduplicate: keep highest severity per finding ID
  const deduped = new Map<string, AuditFinding>();
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

  // Apply context multiplier to raw score
  const adjustedScore = Math.round(rawScore * contextMultiplier);
  const score = Math.min(100, adjustedScore);

  const hasCritical = [...deduped.values()].some((f) => f.severity === 'critical');

  // Critical-override behavior depends on context:
  // - Normal context (multiplier >= 0.6): critical finding forces at least HIGH
  // - Strong legitimate context (multiplier < 0.6): critical finding forces MEDIUM only
  //   (if 3+ reducer signals say "this is a legitimate tool", a single critical
  //    keyword alone is not sufficient evidence of malice)
  const weakenedCriticalOverride = contextMultiplier < 0.6;

  let level: AuditReport['riskLevel'];
  if (score >= 70 || (hasCritical && !weakenedCriticalOverride && score >= 25)) level = 'CRITICAL';
  else if (score >= 40 || (hasCritical && !weakenedCriticalOverride)) level = 'HIGH';
  else if (score >= 15 || (hasCritical && weakenedCriticalOverride)) level = 'MEDIUM';
  else level = 'LOW';

  return { score, level };
}
