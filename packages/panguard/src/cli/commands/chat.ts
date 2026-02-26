/**
 * panguard chat - Notification system management
 * panguard chat - 通知系統管理
 */

import { Command } from 'commander';
import { runCLI } from '@openclaw/panguard-chat';

export function chatCommand(): Command {
  const cmd = new Command('chat')
    .description('Notification system management / 通知系統管理');

  cmd.command('setup')
    .description('Interactive notification setup / 互動式通知設定')
    .option('--lang <lang>', 'Language: en or zh-TW / 語言', 'zh-TW')
    .option('--channel <type>', 'Channel type (line, telegram, slack, email, webhook)')
    .option('--user-type <type>', 'User type (developer, boss, it_admin)')
    .action(async (opts: Record<string, string | undefined>) => {
      const args = ['setup'];
      if (opts['lang']) args.push('--lang', opts['lang']);
      if (opts['channel']) args.push('--channel', opts['channel']);
      if (opts['userType']) args.push('--user-type', opts['userType']);
      await runCLI(args);
    });

  cmd.command('test')
    .description('Send a test notification / 發送測試通知')
    .option('--channel <type>', 'Channel type', 'webhook')
    .option('--url <url>', 'Webhook URL')
    .option('--lang <lang>', 'Language', 'zh-TW')
    .action(async (opts: Record<string, string | undefined>) => {
      const args = ['test'];
      if (opts['channel']) args.push('--channel', opts['channel']);
      if (opts['url']) args.push('--url', opts['url']);
      if (opts['lang']) args.push('--lang', opts['lang']);
      await runCLI(args);
    });

  cmd.command('status')
    .description('Show channel status / 顯示管道狀態')
    .action(async () => {
      await runCLI(['status']);
    });

  cmd.command('config')
    .description('Show current configuration / 顯示當前配置')
    .action(async () => {
      await runCLI(['config']);
    });

  return cmd;
}
