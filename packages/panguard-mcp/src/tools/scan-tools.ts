/**
 * Panguard MCP - Scan Tools
 * Panguard MCP - 掃描工具
 *
 * Implements panguard_scan and panguard_scan_code MCP tools.
 * 實作 panguard_scan 和 panguard_scan_code MCP 工具。
 *
 * @module @panguard-ai/panguard-mcp/tools/scan-tools
 */

import type { Finding } from '@panguard-ai/panguard-scan';
import { runScan, generatePdfReport } from '@panguard-ai/panguard-scan';

/**
 * Attempt to import SAST functions, graceful fallback if not yet exported.
 * 嘗試匯入 SAST 函數，若尚未匯出則優雅地退回。
 */
let checkSourceCode: ((dir: string) => Promise<Finding[]>) | null = null;
let checkHardcodedSecrets: ((dir: string) => Promise<Finding[]>) | null = null;

try {
  const sast = await import('@panguard-ai/panguard-scan');
  const module = sast as Record<string, unknown>;
  if (typeof module['checkSourceCode'] === 'function') {
    checkSourceCode = module['checkSourceCode'] as (dir: string) => Promise<Finding[]>;
  }
  if (typeof module['checkHardcodedSecrets'] === 'function') {
    checkHardcodedSecrets = module['checkHardcodedSecrets'] as (dir: string) => Promise<Finding[]>;
  }
} catch {
  // SAST not available yet — will use placeholder response
}

/**
 * Convert a numeric risk score (0-100) to a letter grade (A-F).
 * 將數字風險分數（0-100）轉換為字母等級（A-F）。
 *
 * The grade reflects security posture (inverse of risk):
 * A = 90–100% safe, F = very high risk.
 */
function scoreToGrade(score: number): string {
  const safety = 100 - score;
  if (safety >= 90) return 'A';
  if (safety >= 75) return 'B';
  if (safety >= 60) return 'C';
  if (safety >= 40) return 'D';
  return 'F';
}

/**
 * Execute panguard_scan — system security health check.
 * 執行 panguard_scan — 系統安全健檢。
 */
export async function executeScan(args: Record<string, unknown>) {
  const depth = (args['depth'] as 'quick' | 'full') ?? 'quick';
  const lang = (args['lang'] as 'en' | 'zh-TW') ?? 'en';

  try {
    const result = await runScan({ depth, lang });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              risk_score: result.riskScore,
              risk_level: result.riskLevel,
              grade: scoreToGrade(result.riskScore),
              findings_count: result.findings.length,
              scan_duration_ms: result.scanDuration,
              scanned_at: result.scannedAt,
              findings: result.findings.slice(0, 20).map((f) => ({
                id: f.id,
                severity: f.severity,
                title: f.title,
                category: f.category,
                remediation: f.remediation,
              })),
              summary: `Risk Score: ${result.riskScore}/100 (${result.riskLevel}). ${result.findings.length} findings detected.`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}

/**
 * Execute panguard_scan_code — SAST source code scan.
 * 執行 panguard_scan_code — SAST 原始碼掃描。
 */
export async function executeScanCode(args: Record<string, unknown>) {
  const dir = (args['dir'] as string) ?? '.';

  // If SAST functions are not available yet, return a clear message
  if (!checkSourceCode && !checkHardcodedSecrets) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              scan_type: 'sast',
              target: dir,
              status: 'unavailable',
              message:
                'SAST scanning (checkSourceCode / checkHardcodedSecrets) is not yet available in this build of @panguard-ai/panguard-scan. Please upgrade to the latest version.',
            },
            null,
            2,
          ),
        },
      ],
      isError: false,
    };
  }

  try {
    const [codeFindings, secretFindings] = await Promise.all([
      checkSourceCode ? checkSourceCode(dir) : Promise.resolve([] as Finding[]),
      checkHardcodedSecrets ? checkHardcodedSecrets(dir) : Promise.resolve([] as Finding[]),
    ]);

    const allFindings = [...codeFindings, ...secretFindings];

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              scan_type: 'sast',
              target: dir,
              findings_count: allFindings.length,
              critical: allFindings.filter((f) => f.severity === 'critical').length,
              high: allFindings.filter((f) => f.severity === 'high').length,
              medium: allFindings.filter((f) => f.severity === 'medium').length,
              low: allFindings.filter((f) => f.severity === 'low').length,
              findings: allFindings.map((f) => ({
                id: f.id,
                severity: f.severity,
                title: f.title,
                category: f.category,
                description: f.description,
                remediation: f.remediation,
                details: f.details,
              })),
              summary:
                allFindings.length === 0
                  ? 'No security issues found in the code.'
                  : `Found ${allFindings.length} security issues (${allFindings.filter((f) => f.severity === 'critical').length} critical, ${allFindings.filter((f) => f.severity === 'high').length} high).`,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}

export { runScan, generatePdfReport };
