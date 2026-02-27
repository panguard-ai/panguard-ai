/**
 * PDF Report Generator for PanguardScan
 * PanguardScan PDF 報告產生器
 *
 * Provides PDF report generation from scan results, including
 * compliance mapping against the Taiwan ISMS framework.
 * 提供從掃描結果產生 PDF 報告的功能，包括台灣資通安全管理法框架的合規對照。
 *
 * @module @panguard-ai/panguard-scan/report
 */

export { generatePdfReport } from './pdf-generator.js';
export { getComplianceEntries, mapFindingsToCompliance } from './compliance-map.js';
export type { ComplianceEntry, ComplianceStatus } from './compliance-map.js';
