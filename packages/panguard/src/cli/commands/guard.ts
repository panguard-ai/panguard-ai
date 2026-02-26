/**
 * panguard guard - Guard engine management
 * panguard guard - 守護引擎管理
 */

import { Command } from 'commander';
import { runCLI } from '@openclaw/panguard-guard';

export function guardCommand(): Command {
  const cmd = new Command('guard')
    .description('Guard engine management / 守護引擎管理');

  cmd.command('start')
    .description('Start the guard engine / 啟動守護引擎')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['start'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd.command('stop')
    .description('Stop the guard engine / 停止守護引擎')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['stop'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd.command('status')
    .description('Show engine status / 顯示引擎狀態')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['status'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd.command('config')
    .description('Show current configuration / 顯示當前配置')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['config'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd.command('generate-key [tier]')
    .description('Generate a test license key / 產生測試授權金鑰')
    .action(async (tier?: string) => {
      const args = ['generate-key'];
      if (tier) args.push(tier);
      await runCLI(args);
    });

  cmd.command('install')
    .description('Install as system service / 安裝為系統服務')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['install'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd.command('uninstall')
    .description('Remove system service / 移除系統服務')
    .action(async () => {
      await runCLI(['uninstall']);
    });

  return cmd;
}
