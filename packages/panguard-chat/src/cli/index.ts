/**
 * PanguardChat CLI
 * PanguardChat 命令列介面
 *
 * Commands:
 * - setup: Interactive notification setup / 互動式通知設定
 * - test: Send a test notification / 發送測試通知
 * - status: Show channel status / 顯示管道狀態
 * - config: Show current configuration / 顯示當前配置
 *
 * @module @openclaw/panguard-chat/cli
 */

import { SETUP_STEPS, getWelcomeMessage } from '../onboarding/index.js';
import type { MessageLanguage, ChannelType, UserType } from '../types.js';

/** CLI version / CLI 版本 */
export const CLI_VERSION = '0.1.0';

/**
 * Parse and execute CLI commands / 解析並執行 CLI 命令
 *
 * @param args - Command line arguments (process.argv.slice(2)) / 命令列引數
 */
export async function runCLI(args: string[]): Promise<void> {
  const command = args[0] ?? 'help';

  switch (command) {
    case 'setup':
      await commandSetup(args);
      break;
    case 'test':
      await commandTest(args);
      break;
    case 'status':
      commandStatus();
      break;
    case 'config':
      commandConfig();
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

// ---------------------------------------------------------------------------
// Commands
// 命令
// ---------------------------------------------------------------------------

/**
 * Interactive notification setup / 互動式通知設定
 */
async function commandSetup(args: string[]): Promise<void> {
  const lang: MessageLanguage = extractOption(args, '--lang') === 'en' ? 'en' : 'zh-TW';

  console.log('');
  console.log(lang === 'zh-TW'
    ? 'Panguard AI - 通知管道設定精靈'
    : 'Panguard AI - Notification Setup Wizard');
  console.log('='.repeat(40));

  // Display available steps
  for (const step of SETUP_STEPS) {
    console.log('');
    console.log(`[${step.id}] ${step.title[lang]}`);
    console.log(`  ${step.description[lang]}`);
    if (step.options) {
      for (const opt of step.options) {
        console.log(`    - ${opt.label[lang]}: ${opt.description[lang]}`);
      }
    }
  }

  console.log('');
  console.log(lang === 'zh-TW'
    ? '使用 --channel, --user-type, --language 選項進行非互動式設定'
    : 'Use --channel, --user-type, --language options for non-interactive setup');

  // Non-interactive mode
  const channel = extractOption(args, '--channel') as ChannelType | undefined;
  const userType = extractOption(args, '--user-type') as UserType | undefined;

  if (channel && userType) {
    console.log('');
    console.log(lang === 'zh-TW'
      ? `配置: 管道=${channel}, 用戶類型=${userType}, 語言=${lang}`
      : `Config: channel=${channel}, userType=${userType}, language=${lang}`);
    console.log('');
    console.log(getWelcomeMessage(lang));
  }
}

/**
 * Send a test notification / 發送測試通知
 */
async function commandTest(args: string[]): Promise<void> {
  const channel = extractOption(args, '--channel') ?? 'line';
  console.log(`Sending test notification to ${channel}... / 正在發送測試通知到 ${channel}...`);
  console.log('Test notification sent / 測試通知已發送');
  console.log('(In production, this would send a real test message via the configured channel)');
}

/**
 * Show channel status / 顯示管道狀態
 */
function commandStatus(): void {
  console.log('PanguardChat Status / PanguardChat 狀態');
  console.log('================================');
  console.log('Configured channels: (none)');
  console.log('Active conversations: 0');
  console.log('Pending confirmations: 0');
  console.log('');
  console.log('Run "panguard-chat setup" to configure notification channels.');
  console.log('執行 "panguard-chat setup" 來配置通知管道。');
}

/**
 * Show current configuration / 顯示當前配置
 */
function commandConfig(): void {
  console.log('PanguardChat Configuration / PanguardChat 配置');
  console.log('========================================');
  console.log('No configuration found. Run "panguard-chat setup" first.');
  console.log('找不到配置。請先執行 "panguard-chat setup"。');
}

/**
 * Print help message / 列印幫助訊息
 */
function printHelp(): void {
  console.log(`
PanguardChat - AI Security Communication Assistant
PanguardChat - AI 資安通訊助手

Usage: panguard-chat <command> [options]

Commands:
  setup             Interactive notification setup / 互動式通知設定
  test              Send a test notification / 發送測試通知
  status            Show channel status / 顯示管道狀態
  config            Show current configuration / 顯示當前配置
  help              Show this help / 顯示此說明

Options:
  --channel <type>    Channel type (line, telegram, slack, email, webhook)
  --user-type <type>  User type (developer, boss, it_admin)
  --lang <lang>       Language (zh-TW, en) / 語言
  --data-dir <path>   Data directory / 資料目錄

Version: ${CLI_VERSION}
`);
}

// ---------------------------------------------------------------------------
// Helpers
// 輔助函式
// ---------------------------------------------------------------------------

/**
 * Extract option value from args / 從引數中提取選項值
 */
function extractOption(args: string[], option: string): string | undefined {
  const idx = args.indexOf(option);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}
