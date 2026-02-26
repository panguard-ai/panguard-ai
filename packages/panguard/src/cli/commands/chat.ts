/**
 * panguard chat - Notification system management
 * panguard chat - 通知系統管理
 */

import { Command } from 'commander';
import { runCLI } from '@openclaw/panguard-chat';
import { withAuth } from '../auth-guard.js';

export function chatCommand(): Command {
  const cmd = new Command('chat')
    .description('Notification system management / \u901A\u77E5\u7CFB\u7D71\u7BA1\u7406');

  cmd.command('setup')
    .description('Interactive notification setup / \u4E92\u52D5\u5F0F\u901A\u77E5\u8A2D\u5B9A')
    .option('--lang <lang>', 'Language: en or zh-TW / \u8A9E\u8A00', 'zh-TW')
    .option('--channel <type>', 'Channel type (line, telegram, slack, email, webhook)')
    .option('--user-type <type>', 'User type (developer, boss, it_admin)')
    .action(withAuth('starter', async (opts: Record<string, string | undefined>) => {
      const args = ['setup'];
      if (opts['lang']) args.push('--lang', opts['lang']);
      if (opts['channel']) args.push('--channel', opts['channel']);
      if (opts['userType']) args.push('--user-type', opts['userType']);
      await runCLI(args);
    }));

  cmd.command('test')
    .description('Send a test notification / 發送測試通知')
    .option('--channel <type>', 'Channel type', 'webhook')
    .option('--url <url>', 'Webhook URL')
    .option('--lang <lang>', 'Language', 'zh-TW')
    .action(withAuth('starter', async (opts: Record<string, string | undefined>) => {
      const args = ['test'];
      if (opts['channel']) args.push('--channel', opts['channel']);
      if (opts['url']) args.push('--url', opts['url']);
      if (opts['lang']) args.push('--lang', opts['lang']);
      await runCLI(args);
    }));

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
