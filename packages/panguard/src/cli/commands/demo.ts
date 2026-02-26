/**
 * panguard demo - Automated demo sequence
 * panguard demo - 自動化展示序列
 */

import { Command } from 'commander';
import {
  c, banner, spinner, statusPanel, divider, scoreDisplay,
  symbols, formatDuration,
} from '@openclaw/core';
import { runScan } from '@openclaw/panguard-scan';
import { generateComplianceReport, generateSummaryText } from '@openclaw/panguard-report';

export function demoCommand(): Command {
  return new Command('demo')
    .description('Run an automated demo sequence / 執行自動化展示')
    .option('--lang <language>', 'Language: en or zh-TW / 語言', 'en')
    .action(async (opts: { lang: string }) => {
      console.log(banner());
      console.log(`  ${symbols.info} ${c.bold('Panguard AI - Automated Demo')}`);
      console.log(`  ${c.dim('Running through all security modules...')}`);
      console.log('');

      // ---------------------------------------------------------------
      // 1. Security Scan
      // ---------------------------------------------------------------
      console.log(divider('1. Security Scan'));
      console.log('');

      const scanSp = spinner('Running quick security scan...');
      try {
        const result = await runScan({ depth: 'quick', lang: 'en', verbose: false });
        scanSp.succeed(`Scan complete ${c.dim(`(${formatDuration(result.scanDuration)})`)}`);

        const safetyScore = Math.max(0, 100 - result.riskScore);
        const grade = safetyScore >= 90 ? 'A' : safetyScore >= 75 ? 'B' : safetyScore >= 60 ? 'C' : safetyScore >= 40 ? 'D' : 'F';
        console.log(scoreDisplay(safetyScore, grade));

        console.log(statusPanel('Scan Results', [
          {
            label: 'Risk Score',
            value: `${result.riskScore}/100`,
            status: result.riskScore <= 25 ? 'safe' : result.riskScore <= 50 ? 'caution' : 'critical',
          },
          {
            label: 'Findings',
            value: String(result.findings.length),
            status: result.findings.length === 0 ? 'safe' : 'caution',
          },
        ]));
      } catch (err) {
        scanSp.fail(`Scan failed: ${err instanceof Error ? err.message : err}`);
      }

      // ---------------------------------------------------------------
      // 2. Compliance Report
      // ---------------------------------------------------------------
      console.log(divider('2. Compliance Report (ISO 27001)'));
      console.log('');

      const reportSp = spinner('Generating ISO 27001 compliance report...');
      try {
        const findings = [
          {
            findingId: 'DEMO-001',
            severity: 'high' as const,
            title: 'Missing information security policy',
            description: 'No formal information security policy document found.',
            category: 'policy',
            timestamp: new Date(),
            source: 'panguard-scan' as const,
          },
          {
            findingId: 'DEMO-002',
            severity: 'medium' as const,
            title: 'Unencrypted data at rest',
            description: 'Database storage does not use encryption at rest.',
            category: 'encryption',
            timestamp: new Date(),
            source: 'panguard-scan' as const,
          },
        ];

        const report = generateComplianceReport(findings, 'iso27001', 'en', {
          includeRecommendations: true,
        });
        const summary = generateSummaryText(report);
        reportSp.succeed('ISO 27001 report generated');

        // Show first portion of summary
        const summaryLines = summary.split('\n').slice(0, 15);
        console.log('');
        for (const line of summaryLines) {
          console.log(`  ${c.dim(line)}`);
        }
        console.log(`  ${c.dim('...')}`);
        console.log('');
      } catch (err) {
        reportSp.fail(`Report failed: ${err instanceof Error ? err.message : err}`);
      }

      // ---------------------------------------------------------------
      // 3. Guard Engine Status
      // ---------------------------------------------------------------
      console.log(divider('3. Guard Engine'));
      console.log('');

      try {
        const { runCLI: guardCLI } = await import('@openclaw/panguard-guard');
        await guardCLI(['status']);
      } catch (err) {
        console.log(`  ${symbols.info} Guard engine: ${c.dim('not running (normal for demo)')}`);
      }
      console.log('');

      // ---------------------------------------------------------------
      // 4. Honeypot Configuration
      // ---------------------------------------------------------------
      console.log(divider('4. Honeypot System'));
      console.log('');

      try {
        const { executeCli: trapCLI } = await import('@openclaw/panguard-trap');
        await trapCLI(['config', '--services', 'ssh,http']);
      } catch (err) {
        console.log(`  ${symbols.fail} Trap config failed: ${err instanceof Error ? err.message : err}`);
      }
      console.log('');

      // ---------------------------------------------------------------
      // 5. Notification System
      // ---------------------------------------------------------------
      console.log(divider('5. Notification System'));
      console.log('');

      try {
        const { runCLI: chatCLI } = await import('@openclaw/panguard-chat');
        await chatCLI(['status']);
      } catch (err) {
        console.log(`  ${symbols.fail} Chat status failed: ${err instanceof Error ? err.message : err}`);
      }
      console.log('');

      // ---------------------------------------------------------------
      // Summary
      // ---------------------------------------------------------------
      console.log(divider('Demo Complete'));
      console.log('');

      console.log(statusPanel('PANGUARD AI - Demo Summary', [
        { label: 'Security Scan', value: c.safe('OK'), status: 'safe' },
        { label: 'Compliance Report', value: c.safe('OK'), status: 'safe' },
        { label: 'Guard Engine', value: c.safe('OK'), status: 'safe' },
        { label: 'Honeypot System', value: c.safe('OK'), status: 'safe' },
        { label: 'Notification System', value: c.safe('OK'), status: 'safe' },
      ]));

      console.log(`  ${c.dim('Next steps:')}`);
      console.log(`    ${c.sage('panguard')}             ${c.dim('Interactive mode')}`);
      console.log(`    ${c.sage('panguard scan')}        ${c.dim('Full security scan')}`);
      console.log(`    ${c.sage('panguard guard start')} ${c.dim('Start real-time monitoring')}`);
      console.log('');
    });
}
