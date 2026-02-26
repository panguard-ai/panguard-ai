/**
 * panguard report - Compliance report generation
 * panguard report - 合規報告產生
 */

import { Command } from 'commander';
import { executeCli } from '@openclaw/panguard-report';

export function reportCommand(): Command {
  const cmd = new Command('report')
    .description('Compliance report generation / 合規報告產生');

  cmd.command('generate')
    .description('Generate a compliance report / 產生合規報告')
    .option('--framework <name>', 'Compliance framework (iso27001, soc2, tw_cyber_security_act)')
    .option('--language <lang>', 'Report language (en, zh-TW)')
    .option('--format <fmt>', 'Output format (json, pdf)')
    .option('--output-dir <path>', 'Output directory / 輸出目錄')
    .option('--org <name>', 'Organization name / 組織名稱')
    .option('--input <file>', 'Findings input file (JSON)')
    .action(async (opts: Record<string, string | undefined>) => {
      const args = ['generate'];
      if (opts['framework']) args.push('--framework', opts['framework']);
      if (opts['language']) args.push('--language', opts['language']);
      if (opts['format']) args.push('--format', opts['format']);
      if (opts['outputDir']) args.push('--output-dir', opts['outputDir']);
      if (opts['org']) args.push('--org', opts['org']);
      if (opts['input']) args.push('--input', opts['input']);
      await executeCli(args);
    });

  cmd.command('summary')
    .description('Show brief compliance summary / 顯示簡短合規摘要')
    .option('--framework <name>', 'Compliance framework')
    .option('--language <lang>', 'Report language')
    .option('--input <file>', 'Findings input file (JSON)')
    .action(async (opts: Record<string, string | undefined>) => {
      const args = ['summary'];
      if (opts['framework']) args.push('--framework', opts['framework']);
      if (opts['language']) args.push('--language', opts['language']);
      if (opts['input']) args.push('--input', opts['input']);
      await executeCli(args);
    });

  cmd.command('list-frameworks')
    .description('List supported compliance frameworks / 列出支援的合規框架')
    .action(async () => {
      await executeCli(['list-frameworks']);
    });

  cmd.command('validate')
    .description('Validate findings input file / 驗證發現輸入檔案')
    .option('--input <file>', 'Input file path')
    .action(async (opts: Record<string, string | undefined>) => {
      const args = ['validate'];
      if (opts['input']) args.push('--input', opts['input']);
      await executeCli(args);
    });

  return cmd;
}
