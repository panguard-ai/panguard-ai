/**
 * Shared helpers for scan/audit commands
 * 掃描/審計命令的共用工具函數
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Safety grade based on risk score */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Compute safety score and letter grade from a risk score (0-100).
 */
export function computeGrade(riskScore: number): { safetyScore: number; grade: Grade } {
  const safetyScore = Math.max(0, 100 - riskScore);
  const grade: Grade =
    safetyScore >= 90
      ? 'A'
      : safetyScore >= 75
        ? 'B'
        : safetyScore >= 60
          ? 'C'
          : safetyScore >= 40
            ? 'D'
            : 'F';
  return { safetyScore, grade };
}

/** Finding entry in JSON output */
export interface ScanOutputFinding {
  id: number;
  severity: string;
  title: string;
  category: string;
  description: string;
  remediation: string;
  manual_fix?: string[] | null;
}

/** System info in JSON output */
export interface ScanOutputSystem {
  os: string;
  arch: string;
  open_ports: number;
  running_services: number;
  firewall_enabled: boolean;
  security_tools_detected: number;
}

/** Full JSON output structure */
export interface ScanOutput {
  version: string;
  timestamp: string;
  target: string;
  risk_score: number;
  risk_level: string;
  grade: Grade;
  scan_duration_ms: number;
  findings_count: number;
  findings: ScanOutputFinding[];
  system: ScanOutputSystem;
  powered_by: string;
  agent_friendly: boolean;
}

/** Options for building scan output */
export interface BuildScanOutputOptions {
  version: string;
  timestamp: string;
  target: string;
  riskScore: number;
  riskLevel: string;
  scanDuration: number;
  findings: ReadonlyArray<{
    severity: string;
    title: string;
    category: string;
    description: string;
    remediation: string;
    manualFix?: string[];
  }>;
  system: ScanOutputSystem;
  includeManualFix?: boolean;
}

/**
 * Build standardized JSON output for scan results.
 */
export function buildScanOutput(opts: BuildScanOutputOptions): ScanOutput {
  const { safetyScore: _, grade } = computeGrade(opts.riskScore);
  return {
    version: opts.version,
    timestamp: opts.timestamp,
    target: opts.target,
    risk_score: opts.riskScore,
    risk_level: opts.riskLevel,
    grade,
    scan_duration_ms: opts.scanDuration,
    findings_count: opts.findings.length,
    findings: opts.findings.map((f, i) => ({
      id: i + 1,
      severity: f.severity,
      title: f.title,
      category: f.category,
      description: f.description,
      remediation: f.remediation,
      ...(opts.includeManualFix ? { manual_fix: f.manualFix ?? null } : {}),
    })),
    system: opts.system,
    powered_by: 'Panguard AI',
    agent_friendly: true,
  };
}

/**
 * Save JSON results to a file. Creates parent directories if needed.
 */
export async function saveResults(path: string, data: ScanOutput): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
}
