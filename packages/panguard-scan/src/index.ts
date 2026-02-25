/**
 * PanguardScan - Security Scanning CLI Tool
 * PanguardScan - 資安健檢命令列工具
 *
 * Performs comprehensive security scans and generates PDF reports.
 * 執行全面的安全掃描並產生 PDF 報告。
 *
 * @module @openclaw/panguard-scan
 */

/** PanguardScan version / PanguardScan 版本 */
export const PANGUARD_SCAN_VERSION = '0.1.0';

/** PanguardScan product name / PanguardScan 產品名稱 */
export const CLAWSCAN_NAME = 'PanguardScan';

// Scanner exports / 掃描器匯出
export { runScan } from './scanners/index.js';
export type { ScanConfig, ScanResult, Finding } from './scanners/types.js';
export { sortBySeverity, SEVERITY_ORDER } from './scanners/types.js';

// Report exports / 報告匯出
export { generatePdfReport } from './report/index.js';
