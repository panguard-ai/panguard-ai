/**
 * PanguardTrap CLI
 * PanguardTrap 命令列介面
 *
 * @module @openclaw/panguard-trap/cli
 */

import type { TrapConfig, TrapServiceType, TrapStatistics } from '../types.js';
import { DEFAULT_TRAP_CONFIG, DEFAULT_SERVICE_CONFIGS } from '../types.js';

/** Available CLI commands / 可用的 CLI 命令 */
export type TrapCliCommand = 'start' | 'stop' | 'status' | 'deploy' | 'profiles' | 'intel' | 'config' | 'help';

/** CLI options / CLI 選項 */
export interface TrapCliOptions {
  command: TrapCliCommand;
  services?: TrapServiceType[];
  port?: number;
  dataDir?: string;
  noCloud?: boolean;
  verbose?: boolean;
}

/**
 * Parse CLI arguments
 * 解析 CLI 參數
 */
export function parseCliArgs(args: string[]): TrapCliOptions {
  const command = (args[0] as TrapCliCommand) || 'help';
  const options: TrapCliOptions = { command };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--services' && args[i + 1]) {
      options.services = args[i + 1]!.split(',') as TrapServiceType[];
      i++;
    } else if (arg === '--port' && args[i + 1]) {
      options.port = parseInt(args[i + 1]!, 10);
      i++;
    } else if (arg === '--data-dir' && args[i + 1]) {
      options.dataDir = args[i + 1];
      i++;
    } else if (arg === '--no-cloud') {
      options.noCloud = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

/**
 * Build trap config from CLI options
 * 從 CLI 選項建立蜜罐配置
 */
export function buildConfigFromOptions(options: TrapCliOptions): TrapConfig {
  const config = { ...DEFAULT_TRAP_CONFIG };

  if (options.dataDir) {
    config.dataDir = options.dataDir;
  }

  if (options.noCloud) {
    config.feedThreatCloud = false;
  }

  // Enable only specified services
  if (options.services && options.services.length > 0) {
    config.services = options.services.map((type) => ({
      ...DEFAULT_SERVICE_CONFIGS[type],
      enabled: true,
    }));
  }

  return config;
}

/**
 * Format statistics for display
 * 格式化統計資料以供顯示
 */
export function formatStatistics(stats: TrapStatistics): string {
  const lines: string[] = [];

  lines.push('=== PanguardTrap Status / PanguardTrap 狀態 ===');
  lines.push('');
  lines.push(`Total Sessions / 總連線數: ${stats.totalSessions}`);
  lines.push(`Active Sessions / 活動中連線: ${stats.activeSessions}`);
  lines.push(`Unique Source IPs / 不重複 IP: ${stats.uniqueSourceIPs}`);
  lines.push(`Credential Attempts / 認證嘗試: ${stats.totalCredentialAttempts}`);
  lines.push(`Commands Captured / 捕獲指令: ${stats.totalCommandsCaptured}`);
  lines.push(`Uptime / 運作時間: ${formatDuration(stats.uptimeMs)}`);
  lines.push('');

  // Sessions by service
  lines.push('--- Sessions by Service / 依服務分類 ---');
  for (const [service, count] of Object.entries(stats.sessionsByService)) {
    if (count > 0) {
      lines.push(`  ${service}: ${count}`);
    }
  }
  lines.push('');

  // Top attacker IPs
  if (stats.topAttackerIPs.length > 0) {
    lines.push('--- Top Attacker IPs / 前幾名攻擊者 ---');
    for (const entry of stats.topAttackerIPs.slice(0, 5)) {
      lines.push(`  ${entry.ip}: ${entry.sessions} sessions (risk=${entry.riskScore})`);
    }
    lines.push('');
  }

  // Top credentials
  if (stats.topUsernames.length > 0) {
    lines.push('--- Top Usernames / 前幾名使用者名稱 ---');
    for (const entry of stats.topUsernames.slice(0, 5)) {
      lines.push(`  ${entry.username}: ${entry.count}`);
    }
    lines.push('');
  }

  // Skill distribution
  lines.push('--- Attacker Skill Distribution / 攻擊者技術分布 ---');
  for (const [skill, count] of Object.entries(stats.skillDistribution)) {
    if (count > 0) {
      lines.push(`  ${skill}: ${count}`);
    }
  }

  return lines.join('\n');
}

/**
 * Get help text
 * 取得說明文字
 */
export function getHelpText(): string {
  return `
PanguardTrap - Smart Honeypot System / 智慧蜜罐系統
Panguard AI (https://panguard.ai)

Usage / 用法:
  panguard-trap <command> [options]

Commands / 命令:
  start       Start honeypot services / 啟動蜜罐服務
  stop        Stop honeypot services / 停止蜜罐服務
  status      Show current status and statistics / 顯示目前狀態和統計
  deploy      Deploy specific trap services / 部署特定蜜罐服務
  profiles    Show attacker profiles / 顯示攻擊者 profiles
  intel       Show threat intelligence summary / 顯示威脅情報摘要
  config      Show current configuration / 顯示目前配置
  help        Show this help message / 顯示此說明

Options / 選項:
  --services <types>   Comma-separated service types / 逗號分隔的服務類型
                       (ssh,http,ftp,telnet,mysql,redis,smb,rdp)
  --port <number>      Override port for single service / 覆寫單一服務的埠
  --data-dir <path>    Data directory for logs / 日誌資料目錄
  --no-cloud           Disable Threat Cloud upload / 停用 Threat Cloud 上傳
  --verbose, -v        Verbose output / 詳細輸出

Examples / 範例:
  panguard-trap start --services ssh,http
  panguard-trap status
  panguard-trap profiles
  panguard-trap intel
`.trim();
}

/** Format duration / 格式化持續時間 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Execute CLI command
 * 執行 CLI 命令
 */
export async function executeCli(args: string[]): Promise<void> {
  const options = parseCliArgs(args);

  switch (options.command) {
    case 'help':
      console.log(getHelpText());
      break;

    case 'config': {
      const config = buildConfigFromOptions(options);
      console.log('=== PanguardTrap Configuration / PanguardTrap 配置 ===');
      console.log('');
      console.log(`Data Directory / 資料目錄: ${config.dataDir}`);
      console.log(`Threat Cloud / 威脅雲端: ${config.feedThreatCloud ? 'enabled / 啟用' : 'disabled / 停用'}`);
      console.log(`Fake Access / 假存取: ${config.grantFakeAccess ? `after ${config.fakeAccessAfterAttempts} attempts` : 'disabled'}`);
      console.log('');
      console.log('Enabled Services / 已啟用服務:');
      for (const svc of config.services.filter((s) => s.enabled)) {
        console.log(`  ${svc.type}: port ${svc.port}`);
      }
      break;
    }

    case 'start':
      console.log('Starting PanguardTrap... / 啟動 PanguardTrap...');
      console.log('Use panguard-trap status to check / 使用 panguard-trap status 查看狀態');
      break;

    case 'stop':
      console.log('Stopping PanguardTrap... / 停止 PanguardTrap...');
      break;

    case 'status':
      console.log('PanguardTrap is not running. Use panguard-trap start to begin.');
      console.log('PanguardTrap 未運行。使用 panguard-trap start 開始。');
      break;

    case 'deploy':
      console.log('Deploying trap services... / 部署蜜罐服務...');
      break;

    case 'profiles':
      console.log('No attacker profiles yet. Start PanguardTrap first.');
      console.log('尚無攻擊者 profiles。請先啟動 PanguardTrap。');
      break;

    case 'intel':
      console.log('No intel reports yet. Start PanguardTrap first.');
      console.log('尚無情報報告。請先啟動 PanguardTrap。');
      break;

    default:
      console.log(`Unknown command: ${options.command}`);
      console.log(getHelpText());
  }
}
