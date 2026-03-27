/**
 * Scan -> Report Bridge
 * 掃描 -> 報告橋接
 *
 * Converts panguard-scan Finding[] to panguard-report ComplianceFinding[]
 * so scan results can be fed directly into compliance report generation.
 *
 * @module @panguard-ai/panguard/bridges/scan-to-report
 */

// Type-only import — erased at runtime, no dependency on panguard-report
interface ComplianceFinding {
  findingId: string;
  severity: string;
  title: string;
  description: string;
  category: string;
  timestamp: Date;
  source: string;
}

/** Minimal Finding interface matching panguard-scan output */
export interface ScanFinding {
  /** Finding identifier / 發現識別碼 */
  id: string;
  /** Title / 標題 */
  title: string;
  /** Description / 描述 */
  description: string;
  /** Severity level / 嚴重等級 */
  severity: string;
  /** Category / 分類 */
  category: string;
  /** Remediation recommendation / 修復建議 */
  remediation?: string;
}

/**
 * Convert scan findings to compliance findings for report generation.
 * 將掃描發現轉換為合規發現以用於報告產生。
 *
 * @param findings - Array of scan findings / 掃描發現陣列
 * @returns Array of compliance findings / 合規發現陣列
 */
export function scanFindingsToComplianceFindings(
  findings: readonly ScanFinding[]
): ComplianceFinding[] {
  return findings.map((f) => ({
    findingId: f.id,
    severity: f.severity as ComplianceFinding['severity'],
    title: f.title,
    description: f.description,
    category: f.category,
    timestamp: new Date(),
    source: 'panguard-scan' as const,
  }));
}
