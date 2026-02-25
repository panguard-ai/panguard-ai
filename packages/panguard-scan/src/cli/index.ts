#!/usr/bin/env node
/**
 * PanguardScan CLI Entry Point
 * PanguardScan 命令列介面進入點
 *
 * @module @openclaw/panguard-scan/cli
 */

import { Command } from 'commander';
import type { Language } from '@openclaw/core';
import { PANGUARD_SCAN_VERSION } from '../index.js';
import { executeScan } from './commands.js';

const program = new Command();

program
  .name('panguard-scan')
  .description('PanguardScan - 60-second security health check tool / 60 秒資安健檢工具')
  .version(PANGUARD_SCAN_VERSION)
  .option('--quick', 'Quick scan mode (~30 seconds) / 快速掃描模式', false)
  .option('--output <path>', 'Output PDF report path / 輸出 PDF 報告路徑', 'panguard-scan-report.pdf')
  .option('--lang <language>', 'Language: en or zh-TW / 語言', 'en')
  .option('--verbose', 'Verbose output / 詳細輸出', false)
  .action(async (options: { quick: boolean; output: string; lang: string; verbose: boolean }) => {
    const lang: Language = options.lang === 'zh-TW' ? 'zh-TW' : 'en';
    await executeScan({
      depth: options.quick ? 'quick' : 'full',
      lang,
      output: options.output,
      verbose: options.verbose,
    });
  });

program.parseAsync().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
