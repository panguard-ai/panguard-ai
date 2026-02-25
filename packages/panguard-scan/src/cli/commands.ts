/**
 * PanguardScan CLI command implementations
 * PanguardScan CLI 指令實作
 *
 * @module @openclaw/panguard-scan/cli/commands
 */

import { initI18n, t, createLogger } from '@openclaw/core';
import { runScan } from '../scanners/index.js';
import { generatePdfReport } from '../report/index.js';
import type { ScanConfig } from '../scanners/types.js';

const logger = createLogger('panguard-scan:cli');

/**
 * Execute a security scan and generate a report
 * 執行安全掃描並產生報告
 */
export async function executeScan(config: ScanConfig): Promise<void> {
  // Initialize i18n
  await initI18n(config.lang);

  // Print scan mode
  if (config.depth === 'quick') {
    console.log(t('panguard-scan:cli.quickMode'));
  } else {
    console.log(t('panguard-scan:cli.fullMode'));
  }

  // Run scan
  const result = await runScan(config);

  // Print results
  console.log(t('panguard-scan:cli.complete'));
  console.log(`${t('panguard-scan:report.riskScore')}: ${result.riskScore}/100 (${t(`panguard-scan:severity.${result.riskLevel}`)})`);
  console.log(t('panguard-scan:cli.duration', { seconds: (result.scanDuration / 1000).toFixed(1) }));

  if (result.findings.length > 0) {
    console.log(t('panguard-scan:cli.findingsCount', { count: result.findings.length }));
    // Show top 3 findings
    const top3 = result.findings.slice(0, 3);
    for (const finding of top3) {
      console.log(`  [${finding.severity.toUpperCase()}] ${finding.title}`);
    }
  } else {
    console.log(t('panguard-scan:cli.noFindings'));
  }

  // Generate PDF report
  if (config.output) {
    console.log(t('panguard-scan:cli.generating'));
    try {
      await generatePdfReport(result, config.output, config.lang);
      console.log(t('panguard-scan:cli.reportSaved', { path: config.output }));
    } catch (err) {
      logger.error('Failed to generate PDF report', { error: err instanceof Error ? err.message : String(err) });
      console.error(`Error generating report: ${err instanceof Error ? err.message : err}`);
    }
  }
}
