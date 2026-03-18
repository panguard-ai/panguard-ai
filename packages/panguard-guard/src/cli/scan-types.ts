/**
 * Scan CLI output schema v1
 *
 * This schema defines the JSON output of `panguard-guard scan --json`.
 * GitHub Action and other CI tools depend on this format.
 * Breaking changes require a major version bump.
 *
 * @module @panguard-ai/panguard-guard/cli/scan-types
 */

/** Exit codes for the scan command */
export const SCAN_EXIT_CODES = {
  /** No skills found or all clean */
  CLEAN: 0,
  /** Findings detected (HIGH or CRITICAL) */
  FINDINGS: 1,
  /** Scan error (platform detection failed, etc.) */
  ERROR: 2,
} as const;

/** A single finding from a skill audit */
export interface ScanFinding {
  /** Finding ID (e.g., "atr-ATR-2026-001", "pi-ignore-previous") */
  readonly id: string;
  /** Short title */
  readonly title: string;
  /** Severity level */
  readonly severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Threat category */
  readonly category: string;
  /** Optional file/line location */
  readonly location?: string;
  /** Optional explanation context (only with --explain) */
  readonly explain?: {
    /** Human-readable explanation of why this is dangerous */
    readonly reason: string;
    /** Source code snippet around the finding (populated when source is available) */
    readonly snippet?: string;
  };
}

/** Audit result for a single skill */
export interface ScanSkillResult {
  /** Skill name (e.g., "@anthropic/mcp-server") */
  readonly name: string;
  /** Platform where the skill is installed (e.g., "claude-desktop", "cursor") */
  readonly platform: string;
  /** Risk score 0-100 */
  readonly riskScore: number;
  /** Risk level classification */
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** All findings for this skill */
  readonly findings: readonly ScanFinding[];
  /** Whether the skill was fully audited or skipped */
  readonly status: 'audited' | 'skipped';
  /** Reason for skipping (only when status=skipped) */
  readonly skipReason?: string;
}

/** Complete scan report (JSON output of `panguard-guard scan --json`) */
export interface ScanReport {
  /** Schema version for forward compatibility */
  readonly version: 1;
  /** ISO 8601 timestamp */
  readonly scannedAt: string;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Platforms detected */
  readonly platforms: readonly string[];
  /** Total skills found across all platforms */
  readonly totalSkills: number;
  /** Summary counts by risk level */
  readonly summary: {
    /** Skills with riskLevel=LOW and zero findings */
    readonly clean: number;
    /** Skills with riskLevel=LOW but has findings */
    readonly low: number;
    /** Skills with riskLevel=MEDIUM */
    readonly medium: number;
    /** Skills with riskLevel=HIGH */
    readonly high: number;
    /** Skills with riskLevel=CRITICAL */
    readonly critical: number;
    /** Skills that could not be audited (dir not found, audit error) */
    readonly skipped: number;
  };
  /** Per-skill results */
  readonly skills: readonly ScanSkillResult[];
  /** Highest risk level across all skills (for CI exit code decision) */
  readonly highestRisk: 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
