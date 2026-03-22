/**
 * Panguard Skill Auditor - Type definitions
 *
 * Re-exports core scan types from @panguard-ai/scan-core
 * and adds CLI-specific types (AuditReport, AuditOptions).
 *
 * @module @panguard-ai/panguard-skill-auditor/types
 */

// Re-export canonical types from scan-core
export type {
  Severity,
  FindingCategory,
  SkillManifest,
  SkillMetadata,
  RiskLevel,
} from '@panguard-ai/scan-core';

import type {
  Finding,
  Severity,
  FindingCategory,
  RiskLevel,
} from '@panguard-ai/scan-core';

// ---------------------------------------------------------------------------
// CLI-specific types (backward compatible aliases)
// ---------------------------------------------------------------------------

/** Single audit finding (alias for scan-core Finding) */
export type AuditFinding = Finding;

/** Result of a single check category */
export interface CheckResult {
  status: 'pass' | 'warn' | 'fail' | 'info';
  label: string;
  findings: AuditFinding[];
}

/** Options for auditSkill */
export interface AuditOptions {
  /**
   * LLM provider for AI semantic analysis (Layer 2).
   * When omitted, the auditor auto-detects an available provider.
   */
  llm?: import('./checks/ai-check.js').SkillAnalysisLLM;
  /** Skip AI analysis entirely */
  skipAI?: boolean;
  /** Skip ATR pattern detection */
  skipATR?: boolean;
  /** Additional ATR rules fetched from Threat Cloud */
  cloudRules?: Array<{ id: string; title: string; detection: unknown; [key: string]: unknown }>;
}

/** Complete audit report */
export interface AuditReport {
  skillPath: string;
  manifest: import('@panguard-ai/scan-core').SkillManifest | null;
  riskScore: number;
  riskLevel: RiskLevel;
  checks: CheckResult[];
  findings: AuditFinding[];
  /** Context signals that adjusted the risk score */
  contextSignals?: {
    signals: ReadonlyArray<{
      id: string;
      type: 'booster' | 'reducer';
      label: string;
      weight: number;
    }>;
    multiplier: number;
  };
  auditedAt: string;
  durationMs: number;
}
