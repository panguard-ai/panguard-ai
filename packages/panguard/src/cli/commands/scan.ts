/**
 * panguard scan - Security scanning command
 * panguard scan - 安全掃描命令
 */

import { Command } from 'commander';
import type { Language } from '@openclaw/core';
import {
  c, banner, spinner, statusPanel, divider, scoreDisplay,
  colorSeverity, table, box, symbols, formatDuration,
} from '@openclaw/core';
import { runScan } from '@openclaw/panguard-scan';
import { requireAuth } from '../auth-guard.js';

export function scanCommand(): Command {
  return new Command('scan')
    .description('Run a security scan / 執行安全掃描')
    .option('--quick', 'Quick scan mode (~30s) / 快速掃描模式', false)
    .option('--output <path>', 'Output PDF report path / 輸出 PDF 報告路徑')
    .option('--lang <language>', 'Language: en or zh-TW / 語言', 'en')
    .option('--verbose', 'Verbose output / 詳細輸出', false)
    .action(async (options: { quick: boolean; output?: string; lang: string; verbose: boolean }) => {
      // Auth: quick scan = free, full scan = starter
      const tier = options.quick ? 'free' : 'starter';
      const check = requireAuth(tier);
      if (!check.authenticated || !check.authorized) {
        const { withAuth } = await import('../auth-guard.js');
        await withAuth(tier, async () => {})(options);
        return;
      }
      const lang: Language = options.lang === 'zh-TW' ? 'zh-TW' : 'en';

      console.log(banner());
      const mode = options.quick ? 'Quick Scan' : 'Full Scan';
      console.log(`  ${symbols.scan} ${mode}`);
      console.log('');

      const sp = spinner('Scanning system security...');
      const result = await runScan({
        depth: options.quick ? 'quick' : 'full',
        lang,
        output: options.output,
        verbose: options.verbose,
      });
      sp.succeed(`Scan complete ${c.dim(`(${formatDuration(result.scanDuration)})`)}`);

      // Security Score
      const safetyScore = Math.max(0, 100 - result.riskScore);
      const grade = safetyScore >= 90 ? 'A' : safetyScore >= 75 ? 'B' : safetyScore >= 60 ? 'C' : safetyScore >= 40 ? 'D' : 'F';
      console.log(scoreDisplay(safetyScore, grade));

      // Status panel
      console.log(statusPanel('PANGUARD AI Security Status', [
        {
          label: 'Status',
          value: result.riskScore <= 25 ? c.safe('PROTECTED') : result.riskScore <= 50 ? c.caution('AT RISK') : c.critical('VULNERABLE'),
          status: result.riskScore <= 25 ? 'safe' : result.riskScore <= 50 ? 'caution' : 'critical',
        },
        {
          label: 'Risk Score',
          value: `${result.riskScore}/100`,
          status: result.riskScore <= 25 ? 'safe' : result.riskScore <= 50 ? 'caution' : 'critical',
        },
        {
          label: 'Issues Found',
          value: String(result.findings.length),
          status: result.findings.length === 0 ? 'safe' : 'caution',
        },
        { label: 'Scan Duration', value: formatDuration(result.scanDuration) },
      ]));

      // Findings
      if (result.findings.length > 0) {
        console.log(divider(`${result.findings.length} Finding(s)`));
        console.log('');

        const columns = [
          { header: '#', key: 'num', width: 4, align: 'right' as const },
          { header: 'Severity', key: 'severity', width: 10 },
          { header: 'Finding', key: 'title', width: 42 },
        ];

        const rows = result.findings.map((f, i) => ({
          num: String(i + 1),
          severity: colorSeverity(f.severity),
          title: f.title,
        }));

        console.log(table(columns, rows));
        console.log('');
      } else {
        console.log(box(
          `${symbols.pass} No security issues found!`,
          { borderColor: c.safe, title: 'All Clear' },
        ));
        console.log('');
      }

      // PDF report
      if (options.output) {
        const { generatePdfReport } = await import('@openclaw/panguard-scan');
        const reportSp = spinner('Generating PDF report...');
        try {
          await generatePdfReport(result, options.output, lang);
          reportSp.succeed(`Report saved: ${options.output}`);
        } catch (err) {
          reportSp.fail(`Error: ${err instanceof Error ? err.message : err}`);
        }
      }

      console.log(c.dim(`  Scan completed at ${new Date().toLocaleString()}`));
      console.log('');
    });
}
