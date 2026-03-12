/**
 * panguard guard - Guard engine management
 * panguard guard - 守護引擎管理
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { request as httpNodeRequest } from 'node:http';
import { execFileSync as nodeExecFileSync } from 'node:child_process';
import { Command } from 'commander';
import { runCLI } from '@panguard-ai/panguard-guard';
import { c, box, header, symbols, divider } from '@panguard-ai/core';

export function guardCommand(): Command {
  const cmd = new Command('guard')
    .description('Guard engine management / \u5B88\u8B77\u5F15\u64CE\u7BA1\u7406')
    .option(
      '--watch',
      'Start guard engine in foreground (alias for guard start) / 前景啟動守護引擎',
      false
    )
    .option('--dashboard', 'Enable live TUI dashboard / 啟用即時 TUI 儀表板', false)
    .action(async (opts: { watch?: boolean; dashboard?: boolean }) => {
      if (opts.watch) {
        const args = ['start'];
        if (opts.dashboard) args.push('--dashboard');
        await runCLI(args);
      }
    });

  cmd
    .command('start')
    .description('Start the guard engine / \u555F\u52D5\u5B88\u8B77\u5F15\u64CE')
    .option('--data-dir <path>', 'Data directory / \u8CC7\u6599\u76EE\u9304')
    .option('--verbose', 'Verbose output (show all event logs) / \u8A73\u7D30\u8F38\u51FA', false)
    .option(
      '--dashboard',
      'Enable live TUI dashboard / \u555F\u7528\u5373\u6642 TUI \u5100\u8868\u677F',
      false
    )
    .option(
      '--interactive',
      'Prompt for medium-confidence threats / \u4E2D\u4FE1\u5FC3\u5EA6\u5A01\u8105\u4E92\u52D5\u63D0\u793A',
      false
    )
    .option(
      '--manager <url>',
      'Manager URL for agent mode / Manager \u7DB2\u5740\uFF08Agent \u6A21\u5F0F\uFF09'
    )
    .action(
      async (opts: {
        dataDir?: string;
        verbose: boolean;
        dashboard: boolean;
        interactive: boolean;
        manager?: string;
      }) => {
        const args = ['start'];
        if (opts.dataDir) args.push('--data-dir', opts.dataDir);
        if (opts.verbose) args.push('--verbose');
        if (opts.dashboard) args.push('--dashboard');
        if (opts.interactive) args.push('--interactive');
        if (opts.manager) args.push('--manager', opts.manager);
        await runCLI(args);
      }
    );

  cmd
    .command('stop')
    .description('Stop the guard engine / \u505C\u6B62\u5B88\u8B77\u5F15\u64CE')
    .option('--data-dir <path>', 'Data directory / \u8CC7\u6599\u76EE\u9304')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['stop'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('restart')
    .description('Restart the guard engine / 重啟守護引擎')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .option('--verbose', 'Verbose output / 詳細輸出', false)
    .action(async (opts: { dataDir?: string; verbose: boolean }) => {
      const stopArgs = ['stop'];
      if (opts.dataDir) stopArgs.push('--data-dir', opts.dataDir);
      await runCLI(stopArgs);

      const startArgs = ['start'];
      if (opts.dataDir) startArgs.push('--data-dir', opts.dataDir);
      if (opts.verbose) startArgs.push('--verbose');
      await runCLI(startArgs);
    });

  cmd
    .command('status')
    .description('Show engine status / 顯示引擎狀態')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .option('--detailed', 'Show 3-layer health check / 顯示三層健康檢查', false)
    .action(async (opts: { dataDir?: string; detailed: boolean }) => {
      if (opts.detailed) {
        await showDetailedStatus(opts.dataDir);
        return;
      }
      const args = ['status'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('config')
    .description('Show current configuration / 顯示當前配置')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['config'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('generate-key [tier]')
    .description('Generate a test license key / 產生測試授權金鑰')
    .action(async (tier?: string) => {
      const args = ['generate-key'];
      if (tier) args.push(tier);
      await runCLI(args);
    });

  cmd
    .command('install')
    .description('Install as system service / 安裝為系統服務')
    .option('--data-dir <path>', 'Data directory / 資料目錄')
    .action(async (opts: { dataDir?: string }) => {
      const args = ['install'];
      if (opts.dataDir) args.push('--data-dir', opts.dataDir);
      await runCLI(args);
    });

  cmd
    .command('uninstall')
    .description('Remove system service / 移除系統服務')
    .action(async () => {
      await runCLI(['uninstall']);
    });

  cmd
    .command('setup-ai')
    .description('Interactive AI layer setup / 互動式 AI 層設定')
    .action(async () => {
      await commandSetupAi();
    });

  return cmd;
}

// ---------------------------------------------------------------------------
// setup-ai — Interactive AI layer configuration
// setup-ai — 互動式 AI 層設定
// ---------------------------------------------------------------------------

/** Check if Ollama is installed and reachable */
function isOllamaInstalled(): boolean {
  try {
    nodeExecFileSync('ollama', ['--version'], { encoding: 'utf-8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/** Validate API key format */
function validateApiKeyFormat(key: string): { valid: boolean; provider: string } {
  if (key.startsWith('sk-ant-')) {
    return { valid: true, provider: 'anthropic' };
  }
  if (key.startsWith('sk-') && !key.startsWith('sk-ant-')) {
    return { valid: true, provider: 'openai' };
  }
  return { valid: false, provider: 'unknown' };
}

/** Read a single line from stdin */
function readLine(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setEncoding('utf-8');
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY && wasRaw) {
      stdin.setRawMode(false);
    }
    stdin.resume();
    stdin.once('data', (data: string) => {
      stdin.pause();
      if (stdin.isTTY && wasRaw) {
        stdin.setRawMode(true);
      }
      resolve(data.trim());
    });
  });
}

/** Interactive AI setup command */
async function commandSetupAi(): Promise<void> {
  const configDir = join(homedir(), '.panguard');
  const configPath = join(configDir, 'config.json');

  console.log('');
  console.log(header('Guard AI Layer Setup / AI 偵測層設定'));
  console.log('');
  console.log(`  Panguard Guard uses a 3-layer detection architecture:`);
  console.log(`  Panguard Guard 使用三層偵測架構：`);
  console.log('');
  console.log(`    ${c.sage('Layer 1')} - Pattern Detection (regex rules, always active)`);
  console.log(`    ${c.dim('第一層')}   ${c.dim('模式偵測（正則規則，始終啟用）')}`);
  console.log('');
  console.log(`    ${c.sage('Layer 2')} - Local AI (Ollama - free, private, on-device)`);
  console.log(`    ${c.dim('第二層')}   ${c.dim('本地 AI（Ollama - 免費、私密、裝置端）')}`);
  console.log('');
  console.log(`    ${c.sage('Layer 3')} - Cloud AI (Anthropic/OpenAI - fastest, most accurate)`);
  console.log(`    ${c.dim('第三層')}   ${c.dim('雲端 AI（Anthropic/OpenAI - 最快、最準確）')}`);
  console.log('');
  console.log(divider());
  console.log('');

  // Check current state
  let existingConfig: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }
  }

  const existingAi = existingConfig['ai'] as Record<string, unknown> | undefined;
  if (existingAi?.['provider']) {
    console.log(
      `  ${symbols.info} Current AI config: ${c.sage(String(existingAi['provider']))} / ${c.sage(String(existingAi['model'] ?? 'default'))}`
    );
    console.log(
      `  ${c.dim('目前 AI 設定')}: ${String(existingAi['provider'])} / ${String(existingAi['model'] ?? 'default')}`
    );
    console.log('');
  }

  // Step 1: Ask which layer
  console.log(`  Which AI layer would you like to configure?`);
  console.log(`  您想要設定哪個 AI 層？`);
  console.log('');
  console.log(`    ${c.sage('1')} - Local AI (Ollama)      / 本地 AI（Ollama）`);
  console.log(`    ${c.sage('2')} - Cloud AI (API key)      / 雲端 AI（API 金鑰）`);
  console.log(`    ${c.sage('3')} - Both (Local + Cloud)    / 兩者皆用`);
  console.log(`    ${c.sage('q')} - Cancel / 取消`);
  console.log('');

  const choice = await readLine(`  Choice / 選擇 [1/2/3/q]: `);
  console.log('');

  if (choice === 'q' || choice === '') {
    console.log(`  ${symbols.info} Setup cancelled. / 設定已取消。`);
    console.log('');
    return;
  }

  const setupLocal = choice === '1' || choice === '3';
  const setupCloud = choice === '2' || choice === '3';

  // Ensure config directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Step 2a: Local AI (Ollama)
  if (setupLocal) {
    console.log(divider('Layer 2: Local AI / 第二層：本地 AI'));
    console.log('');

    const ollamaInstalled = isOllamaInstalled();
    if (ollamaInstalled) {
      console.log(`  ${symbols.pass} Ollama is installed / Ollama 已安裝`);

      // Check if a model is available
      try {
        const models = nodeExecFileSync('ollama', ['list'], {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        if (models && models.split('\n').length > 1) {
          console.log(`  ${symbols.pass} Available models / 可用模型:`);
          const modelLines = models.split('\n').slice(1, 6);
          for (const line of modelLines) {
            console.log(`    ${c.dim(line.trim())}`);
          }
        } else {
          console.log(`  ${symbols.warn} No models found. / 未找到模型。`);
          console.log(`    ${c.dim('Run: ollama pull llama3.2')}`);
        }
      } catch {
        console.log(`  ${symbols.warn} Could not list models / 無法列出模型`);
      }
    } else {
      console.log(`  ${symbols.warn} Ollama is not installed / Ollama 未安裝`);
      console.log(`    Install / 安裝: ${c.sage('curl -fsSL https://ollama.com/install.sh | sh')}`);
      console.log(`    Then pull a model / 然後下載模型: ${c.sage('ollama pull llama3.2')}`);
    }
    console.log('');

    const model = await readLine(`  Ollama model name / 模型名稱 [llama3.2]: `);
    const ollamaModel = model || 'llama3.2';
    const ollamaEndpoint = await readLine(`  Ollama URL [http://localhost:11434]: `);

    const aiConfig: Record<string, unknown> = {
      provider: 'ollama',
      model: ollamaModel,
    };
    if (ollamaEndpoint) {
      aiConfig['endpoint'] = ollamaEndpoint;
    }

    existingConfig = { ...existingConfig, ai: aiConfig };
    console.log('');
    console.log(`  ${symbols.pass} Local AI configured: ${c.sage(`ollama / ${ollamaModel}`)}`);
    console.log(`  ${c.dim('本地 AI 已設定')}: ollama / ${ollamaModel}`);
    console.log('');
  }

  // Step 2b: Cloud AI
  if (setupCloud) {
    console.log(divider('Layer 3: Cloud AI / 第三層：雲端 AI'));
    console.log('');

    const envKey =
      process.env['PANGUARD_AI_KEY'] ||
      process.env['ANTHROPIC_API_KEY'] ||
      process.env['OPENAI_API_KEY'];
    if (envKey) {
      const { provider } = validateApiKeyFormat(envKey);
      console.log(`  ${symbols.pass} API key found in environment: ${c.sage(provider)}`);
      console.log(`  ${c.dim('已在環境變數中找到 API 金鑰')}: ${provider}`);
      console.log('');
    }

    console.log(`  Enter your API key (Anthropic or OpenAI):`);
    console.log(`  ${c.dim('輸入您的 API 金鑰（Anthropic 或 OpenAI）：')}`);
    console.log(`  ${c.dim('  Anthropic: https://console.anthropic.com/')}`);
    console.log(`  ${c.dim('  OpenAI:    https://platform.openai.com/api-keys')}`);
    console.log('');

    const apiKey = await readLine(`  API Key: `);
    console.log('');

    if (apiKey) {
      const { valid, provider } = validateApiKeyFormat(apiKey);
      if (!valid) {
        console.log(
          `  ${symbols.warn} Unrecognized key format, saving as-is / 無法識別的金鑰格式，直接儲存`
        );
      }

      const cloudProvider =
        provider === 'anthropic' ? 'claude' : provider === 'openai' ? 'openai' : 'claude';
      const defaultModel = cloudProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o';

      const model = await readLine(`  Model / 模型 [${defaultModel}]: `);
      const cloudModel = model || defaultModel;

      // If we already set local AI, merge into a combined config
      const currentAi = (existingConfig['ai'] ?? {}) as Record<string, unknown>;
      if (setupLocal && currentAi['provider'] === 'ollama') {
        // Store cloud as the primary with local as fallback info
        existingConfig = {
          ...existingConfig,
          ai: {
            provider: cloudProvider,
            model: cloudModel,
            apiKey: apiKey,
          },
          aiLocal: {
            provider: currentAi['provider'],
            model: currentAi['model'],
            endpoint: currentAi['endpoint'],
          },
        };
      } else {
        existingConfig = {
          ...existingConfig,
          ai: {
            provider: cloudProvider,
            model: cloudModel,
            apiKey: apiKey,
          },
        };
      }

      console.log('');
      console.log(
        `  ${symbols.pass} Cloud AI configured: ${c.sage(`${cloudProvider} / ${cloudModel}`)}`
      );
      console.log(`  ${c.dim('雲端 AI 已設定')}: ${cloudProvider} / ${cloudModel}`);
    } else {
      console.log(`  ${symbols.info} Skipped cloud AI setup / 跳過雲端 AI 設定`);
    }
    console.log('');
  }

  // Save config
  try {
    writeFileSync(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
    console.log(`  ${symbols.pass} Configuration saved to ${c.sage(configPath)}`);
    console.log(`  ${c.dim('設定已儲存至')} ${configPath}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${symbols.fail} Failed to save config: ${msg}`);
    console.log(`  ${c.dim('儲存設定失敗')}: ${msg}`);
  }

  console.log('');
  console.log(
    `  ${symbols.info} Restart guard to apply changes: ${c.sage('panguard guard restart')}`
  );
  console.log(`  ${c.dim('重啟守護以套用變更')}: panguard guard restart`);
  console.log('');
}

// ---------------------------------------------------------------------------
// Detailed status helper — 3-layer health check
// 詳細狀態輔助函數 — 三層健康檢查
// ---------------------------------------------------------------------------

/** Read and parse a JSON file; returns null on any error */
function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Try to connect to the dashboard health endpoint with a 2-second timeout */
async function checkDashboardReachable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = httpNodeRequest(
      { hostname: 'localhost', port, path: '/api/health', method: 'GET', timeout: 2000 },
      (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
        res.resume();
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

/** Format uptime in seconds as a human-readable string */
function formatUptime(uptimeSeconds: number): string {
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${uptimeSeconds}s`;
}

/**
 * Parse recent stats from the guard log file.
 * Scans the last 200 lines for the most recent status summary line emitted
 * by the engine's quiet-mode callback (format: "Events: N | Threats: N | Uploaded: N").
 */
function parseLogStats(logPath: string): { events: number; threats: number } {
  if (!existsSync(logPath)) return { events: 0, threats: 0 };
  try {
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.split('\n');
    const recent = lines.slice(-200);
    for (let i = recent.length - 1; i >= 0; i--) {
      const line = recent[i] ?? '';
      const evMatch = line.match(/Events:\s*([\d,]+)/);
      const thMatch = line.match(/Threats:\s*([\d,]+)/);
      if (evMatch && thMatch) {
        return {
          events: parseInt((evMatch[1] ?? '0').replace(/,/g, ''), 10),
          threats: parseInt((thMatch[1] ?? '0').replace(/,/g, ''), 10),
        };
      }
    }
  } catch {
    // Ignore read errors
  }
  return { events: 0, threats: 0 };
}

/**
 * Show a 3-layer health check panel for the guard engine.
 *
 * Layer 1 — Process:   PID file + process.kill(pid, 0)
 * Layer 2 — Dashboard: HTTP health probe on configured port
 * Layer 3 — AI Layer:  AI provider/model from config
 *
 * 顯示守護引擎的三層健康檢查面板。
 */
async function showDetailedStatus(dataDirOverride?: string): Promise<void> {
  const dataDir = dataDirOverride ?? join(homedir(), '.panguard-guard');
  const pidPath = join(dataDir, 'panguard-guard.pid');
  const configPath = join(dataDir, 'config.json');
  const logPath = join(dataDir, 'panguard-guard.log');

  // ── Layer 1: Process ──────────────────────────────────────────────────────
  let pid: number | null = null;
  let processRunning = false;
  let uptimeStr = 'unknown';

  if (existsSync(pidPath)) {
    const raw = readFileSync(pidPath, 'utf-8').trim();
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      pid = parsed;
      try {
        process.kill(pid, 0);
        processRunning = true;
      } catch {
        processRunning = false;
      }
    }
  }

  // Attempt to derive uptime from the process start time (macOS / Linux)
  if (processRunning && pid !== null) {
    try {
      const out = nodeExecFileSync('ps', ['-p', String(pid), '-o', 'etime='], {
        encoding: 'utf-8',
        timeout: 2000,
      }).trim();
      // ps etime format: [[DD-]HH:]MM:SS
      const parts = out.split(/[-:]/).map(Number);
      let seconds = 0;
      if (parts.length === 4)
        seconds =
          (parts[0] ?? 0) * 86400 + (parts[1] ?? 0) * 3600 + (parts[2] ?? 0) * 60 + (parts[3] ?? 0);
      else if (parts.length === 3)
        seconds = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
      else if (parts.length === 2) seconds = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
      else seconds = parts[0] ?? 0;
      if (seconds > 0) uptimeStr = formatUptime(seconds);
    } catch {
      // ps not available or failed — leave uptimeStr as 'unknown'
    }
  }

  // ── Layer 2: Dashboard + config ───────────────────────────────────────────
  const config = readJsonFile(configPath);
  const dashboardPort =
    typeof config?.['dashboardPort'] === 'number' ? config['dashboardPort'] : 3100;
  const dashboardEnabled = config?.['dashboardEnabled'] !== false;
  const mode = typeof config?.['mode'] === 'string' ? config['mode'] : 'unknown';
  const cloudEndpoint =
    typeof config?.['threatCloudEndpoint'] === 'string'
      ? config['threatCloudEndpoint']
      : 'tc.panguard.ai';

  let dashboardStatus: string;
  if (!dashboardEnabled) {
    dashboardStatus = c.dim('disabled');
  } else if (!processRunning) {
    dashboardStatus = c.caution('not checked (engine stopped)');
  } else {
    const reachable = await checkDashboardReachable(dashboardPort);
    dashboardStatus = reachable
      ? c.safe(`http://localhost:${dashboardPort} (reachable)`)
      : c.caution(`http://localhost:${dashboardPort} (unreachable)`);
  }

  // ── Layer 3: AI provider ──────────────────────────────────────────────────
  let aiStatus: string;
  const aiConfig = config?.['ai'] as Record<string, unknown> | undefined;
  if (!aiConfig?.['provider']) {
    aiStatus = c.dim('not configured');
  } else {
    const provider = String(aiConfig['provider']);
    const model = typeof aiConfig['model'] === 'string' ? aiConfig['model'] : 'default';
    aiStatus = c.sage(`${provider} connected (${model})`);
  }

  // ── Log stats ─────────────────────────────────────────────────────────────
  const { events, threats } = parseLogStats(logPath);

  // ── Render ────────────────────────────────────────────────────────────────
  const processLine = processRunning
    ? c.safe(`running`) + c.dim(` (PID: ${pid ?? '?'}, uptime: ${uptimeStr})`)
    : c.critical('stopped');

  const cloudHost = cloudEndpoint.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const lines = [
    `${c.bold('Process:   ')} ${processLine}`,
    `${c.bold('Dashboard: ')} ${dashboardStatus}`,
    `${c.bold('AI Layer:  ')} ${aiStatus}`,
    `${c.bold('Events:    ')} ${c.sage(events.toLocaleString())} processed | ${threats > 0 ? c.caution(String(threats)) : c.dim(String(threats))} threats`,
    `${c.bold('Mode:      ')} ${c.sage(mode)}`,
    `${c.bold('Cloud:     ')} ${processRunning ? c.safe(`connected to ${cloudHost}`) : c.dim(cloudHost)}`,
  ].join('\n');

  process.stdout.write('\n');
  process.stdout.write(header('Guard Engine Status'));
  process.stdout.write(
    box(lines, {
      title: 'Guard Engine Status',
      borderColor: processRunning ? c.sage : c.caution,
    })
  );
  process.stdout.write('\n\n');
}
