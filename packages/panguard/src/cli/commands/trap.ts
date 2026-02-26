/**
 * panguard trap - Honeypot system management
 * panguard trap - 蜜罐系統管理
 */

import { Command } from 'commander';
import { executeCli } from '@openclaw/panguard-trap';

export function trapCommand(): Command {
  const cmd = new Command('trap')
    .description('Honeypot system management / 蜜罐系統管理');

  cmd.command('start')
    .description('Start honeypot services / 啟動蜜罐服務')
    .option('--services <types>', 'Comma-separated service types (ssh,http,ftp,...)')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .option('--no-cloud', 'Disable Threat Cloud upload')
    .action(async (opts: Record<string, string | undefined>) => {
      const args = ['start'];
      if (opts['services']) args.push('--services', opts['services']);
      if (opts['dataDir']) args.push('--data-dir', opts['dataDir']);
      if (opts['cloud'] === 'false') args.push('--no-cloud');
      await executeCli(args);
    });

  cmd.command('stop')
    .description('Stop honeypot services / 停止蜜罐服務')
    .action(async () => {
      await executeCli(['stop']);
    });

  cmd.command('status')
    .description('Show current status / 顯示目前狀態')
    .action(async () => {
      await executeCli(['status']);
    });

  cmd.command('config')
    .description('Show configuration / 顯示配置')
    .option('--services <types>', 'Comma-separated service types')
    .action(async (opts: Record<string, string | undefined>) => {
      const args = ['config'];
      if (opts['services']) args.push('--services', opts['services']);
      await executeCli(args);
    });

  cmd.command('profiles')
    .description('Show attacker profiles / 顯示攻擊者 profiles')
    .action(async () => {
      await executeCli(['profiles']);
    });

  cmd.command('intel')
    .description('Show threat intelligence / 顯示威脅情報')
    .action(async () => {
      await executeCli(['intel']);
    });

  return cmd;
}
