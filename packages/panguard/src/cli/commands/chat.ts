/**
 * panguard chat - Notification system management
 * panguard chat - 通知系統管理
 */

import { Command } from 'commander';
import { runCLI } from '@panguard-ai/panguard-chat';
import { withAuth } from '../auth-guard.js';

export function chatCommand(): Command {
  const cmd = new Command('chat').description('Notification system management');

  cmd
    .command('setup')
    .description('Interactive notification setup')
    .option('--lang <lang>', 'Language: en or zh-TW', 'zh-TW')
    .option('--channel <type>', 'Channel type (telegram, slack, email, webhook)')
    .option('--user-type <type>', 'User type (developer, boss, it_admin)')
    .action(
      withAuth('solo', async (opts: Record<string, string | undefined>) => {
        const args = ['setup'];
        if (opts['lang']) args.push('--lang', opts['lang']);
        if (opts['channel']) args.push('--channel', opts['channel']);
        if (opts['userType']) args.push('--user-type', opts['userType']);
        await runCLI(args);
      })
    );

  cmd
    .command('test')
    .description('Send a test notification')
    .option('--channel <type>', 'Channel type', 'webhook')
    .option('--url <url>', 'Webhook URL')
    .option('--lang <lang>', 'Language', 'zh-TW')
    .action(
      withAuth('solo', async (opts: Record<string, string | undefined>) => {
        const args = ['test'];
        if (opts['channel']) args.push('--channel', opts['channel']);
        if (opts['url']) args.push('--url', opts['url']);
        if (opts['lang']) args.push('--lang', opts['lang']);
        await runCLI(args);
      })
    );

  cmd
    .command('status')
    .description('Show channel status')
    .action(async () => {
      await runCLI(['status']);
    });

  cmd
    .command('config')
    .description('Show current configuration')
    .action(async () => {
      await runCLI(['config']);
    });

  cmd
    .command('prefs')
    .description('View/update notification preferences')
    .option('--critical <on|off>', 'Critical alerts')
    .option('--daily <on|off>', 'Daily summary')
    .option('--weekly <on|off>', 'Weekly summary')
    .option('--peaceful <on|off>', 'Peaceful report')
    .action(
      withAuth('solo', async (opts: Record<string, string | undefined>) => {
        const args = ['prefs'];
        if (opts['critical']) args.push('--critical', opts['critical']);
        if (opts['daily']) args.push('--daily', opts['daily']);
        if (opts['weekly']) args.push('--weekly', opts['weekly']);
        if (opts['peaceful']) args.push('--peaceful', opts['peaceful']);
        await runCLI(args);
      })
    );

  return cmd;
}
