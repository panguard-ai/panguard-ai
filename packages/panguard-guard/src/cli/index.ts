#!/usr/bin/env node
/**
 * PanguardGuard CLI
 * PanguardGuard 命令列介面
 *
 * Uses brand-standard colors and layout from Panguard AI brand system.
 * Brand: Sage Green #8B9A8E, Cream #F5F1E8, Charcoal #1A1614
 *
 * @module @panguard-ai/panguard-guard/cli
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  c,
  banner,
  header,
  symbols,
  divider,
  statusPanel,
  spinner,
  setLogLevel,
} from '@panguard-ai/core';
import type { StatusItem } from '@panguard-ai/core';
import { GuardEngine } from '../guard-engine.js';
import { loadConfig, DEFAULT_DATA_DIR } from '../config.js';
import { PidFile } from '../daemon/index.js';
import { installService, uninstallService } from '../daemon/index.js';
import { generateTestLicenseKey } from '../license/index.js';
import { generateInstallScript } from '../install/index.js';

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../../package.json') as { version: string };
/** CLI version / CLI 版本 */
export const CLI_VERSION: string = _pkg.version;

/**
 * Parse and execute CLI commands / 解析並執行 CLI 命令
 */
export async function runCLI(args: string[]): Promise<void> {
  const command = args[0] ?? 'help';
  const dataDir = extractOption(args, '--data-dir') ?? DEFAULT_DATA_DIR;
  const verbose = args.includes('--verbose');
  const managerUrl = extractOption(args, '--manager');
  const noTelemetry = args.includes('--no-telemetry');
  const showUploadData = args.includes('--show-upload-data');

  switch (command) {
    case 'start':
      await commandStart(dataDir, verbose, managerUrl, noTelemetry, showUploadData);
      break;
    case 'stop':
      commandStop(dataDir);
      break;
    case 'status':
      commandStatus(dataDir);
      break;
    case 'install':
      await commandInstall(dataDir);
      break;
    case 'uninstall':
      await commandUninstall();
      break;
    case 'config':
      commandConfig(dataDir);
      break;
    case 'generate-key': {
      const tier = (args[1] ?? 'pro') as 'free' | 'pro' | 'enterprise';
      const key = generateTestLicenseKey(tier);
      console.log(`  ${symbols.pass} Generated ${c.bold(tier)} license key: ${c.sage(key)}`);
      break;
    }
    case 'install-script': {
      const licenseKey = extractOption(args, '--license-key');
      const script = generateInstallScript({ dataDir, licenseKey });
      console.log(script);
      break;
    }
    case 'help':
    default:
      printHelp();
      break;
  }
}

/** Start the guard engine / 啟動守護引擎 */
async function commandStart(
  dataDir: string,
  verbose = false,
  managerUrl?: string,
  noTelemetry = false,
  showUploadData = false,
): Promise<void> {
  // Default quiet mode: suppress structured JSON logs
  if (!verbose) {
    setLogLevel('silent');
  }

  console.log(banner(CLI_VERSION));

  const pidFile = new PidFile(dataDir);
  if (pidFile.isRunning()) {
    console.log(`  ${symbols.warn} PanguardGuard is already running`);
    return;
  }

  const sp = spinner('Starting PanguardGuard...');
  const config = loadConfig(join(dataDir, 'config.json'));

  // Pass --manager URL to config for distributed architecture
  if (managerUrl) {
    config.managerUrl = managerUrl;
  }
  if (noTelemetry) {
    config.telemetryEnabled = false;
  }
  if (showUploadData) {
    config.showUploadData = true;
  }

  const engine = new GuardEngine(config);

  const shutdown = async () => {
    console.log(`\n  ${symbols.info} Shutting down PanguardGuard...`);
    await engine.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await engine.start();
  sp.succeed('PanguardGuard started');

  // Status box
  console.log(
    statusPanel('PANGUARD AI Guard Active', [
      { label: 'Status', value: c.safe('PROTECTED'), status: 'safe' },
      { label: 'PID', value: c.sage(String(process.pid)) },
      { label: 'Mode', value: c.sage(config.mode) },
      { label: 'Data Dir', value: c.dim(dataDir) },
    ])
  );

  // Threat intelligence sharing transparency message
  if (config.telemetryEnabled === false) {
    console.log(`  ${symbols.info} Threat intelligence sharing: ${c.dim('disabled')}`);
    console.log(`  ${c.dim('  No data will be uploaded to Panguard Threat Cloud')}`);
  } else {
    console.log(`  ${symbols.info} Threat intelligence sharing: ${c.safe('enabled')}`);
    console.log(`  ${c.dim('  Detected threats are anonymously uploaded to Panguard Threat Cloud')}`);
    console.log(`  ${c.dim('  Disable: panguard-guard start --no-telemetry')}`);
  }
  if (config.showUploadData) {
    console.log(`  ${symbols.info} Upload data preview: ${c.safe('enabled')}`);
  }
  console.log('');

  // Free tier: show what's enabled/disabled
  console.log(`  ${c.safe('\u2713')} Auto-blocking: known attack patterns (Layer 1 rules)`);

  // Show AI layer status and setup guide if not configured
  const hasLocalAi = config.ai?.provider === 'ollama';
  const hasCloudAi = config.ai?.provider === 'claude' || config.ai?.provider === 'openai';
  const hasAnyAi = Boolean(config.ai?.provider);
  const hasEnvKey = Boolean(process.env['PANGUARD_AI_KEY'] || process.env['ANTHROPIC_API_KEY'] || process.env['OPENAI_API_KEY']);

  if (hasLocalAi) {
    console.log(`  ${c.safe('\u2713')} Layer 2 Local AI: ${c.sage(config.ai?.provider + ' / ' + (config.ai?.model ?? 'default'))}`);
  }
  if (hasCloudAi || hasEnvKey) {
    const provider = config.ai?.provider ?? (process.env['ANTHROPIC_API_KEY'] ? 'anthropic' : 'openai');
    console.log(`  ${c.safe('\u2713')} Layer 3 Cloud AI: ${c.sage(provider + ' connected')}`);
  }

  if (!hasAnyAi && !hasEnvKey) {
    console.log('');
    console.log(`  ${symbols.info} Guard started with ${c.sage('Layer 1 (Pattern Detection)')} active.`);
    console.log('');
    printAiSetupGuide();
  }

  console.log(`  ${symbols.info} Monitoring...`);
  console.log('');

  // Quiet mode: register human-friendly event callback
  // Status summary every 60s, threat alerts immediately
  if (!verbose) {
    let lastStatusTime = 0;
    engine.setEventCallback((type, data) => {
      if (type === 'status') {
        const now = Date.now();
        if (now - lastStatusTime < 60_000) return; // Throttle: 60s between status lines
        lastStatusTime = now;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const events = Number(data['eventsProcessed'] ?? 0);
        const threats = Number(data['threatsDetected'] ?? 0);
        const uploaded = Number(data['uploaded'] ?? 0);
        console.log(
          c.dim(
            `  [${time}] Events: ${events.toLocaleString()} | Threats: ${threats} | Uploaded: ${uploaded}`
          )
        );
      } else if (type === 'threat') {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        console.log('');
        console.log(`  ${symbols.warn} ${c.caution(`[${time}]`)} Threat detected`);
        console.log(`      Type: ${c.bold(String(data['category'] ?? 'unknown'))}`);
        console.log(`      Source: ${c.sage(String(data['sourceIP'] ?? 'unknown'))}`);
        console.log(`      Confidence: ${data['confidence']}%`);
        console.log(`      Action: ${data['action']}`);
        console.log('');
      }
    });
  }

  console.log(c.dim('  Press Ctrl+C to stop'));
  console.log('');
}

// ---------------------------------------------------------------------------
// AI setup guide — shown when no AI layers are configured
// AI 設定指南 — 當沒有配置 AI 層時顯示
// ---------------------------------------------------------------------------

/** Print bilingual AI layer setup instructions */
function printAiSetupGuide(): void {
  const configDir = join(homedir(), '.panguard');

  console.log(`  To enable AI-powered detection layers:`);
  console.log('');
  console.log(`  ${c.sage('Layer 2')} -- Local AI (Free, Private)`);
  console.log(`    1. Install Ollama: ${c.dim('curl -fsSL https://ollama.com/install.sh | sh')}`);
  console.log(`    2. Pull a model:   ${c.dim('ollama pull llama3.2')}`);
  console.log(`    3. Set in config:`);
  console.log(`       ${c.dim(`echo '{"ai":{"provider":"ollama","model":"llama3.2"}}' > ${configDir}/guard-ai.json`)}`);
  console.log('');
  console.log(`  ${c.sage('Layer 3')} -- Cloud AI (Fastest, Most Accurate)`);
  console.log(`    1. Get API key: ${c.dim('https://console.anthropic.com/')}`);
  console.log(`    2. Set in config:`);
  console.log(`       ${c.dim('export PANGUARD_AI_KEY=sk-ant-your-key-here')}`);
  console.log(`       ${c.dim(`# or add to ${configDir}/config.json:`)}`);
  console.log(`       ${c.dim(`# {"ai":{"provider":"claude","apiKey":"sk-ant-...","model":"claude-sonnet-4-20250514"}}`)}`);
  console.log('');
  console.log(c.dim(`  ${divider()}`));
  console.log('');
  console.log(`  ${c.sage('\u5553\u7528 AI \u5075\u6E2C\u5C64\uFF1A')}`);
  console.log('');
  console.log(`  ${c.sage('\u7B2C\u4E8C\u5C64')} -- \u672C\u5730 AI\uFF08\u514D\u8CBB\u3001\u79C1\u5BC6\uFF09`);
  console.log(`    1. \u5B89\u88DD Ollama: ${c.dim('curl -fsSL https://ollama.com/install.sh | sh')}`);
  console.log(`    2. \u4E0B\u8F09\u6A21\u578B: ${c.dim('ollama pull llama3.2')}`);
  console.log(`    3. \u8A2D\u5B9A:`);
  console.log(`       ${c.dim(`echo '{"ai":{"provider":"ollama","model":"llama3.2"}}' > ${configDir}/guard-ai.json`)}`);
  console.log('');
  console.log(`  ${c.sage('\u7B2C\u4E09\u5C64')} -- \u96F2\u7AEF AI\uFF08\u6700\u5FEB\u3001\u6700\u6E96\u78BA\uFF09`);
  console.log(`    1. \u53D6\u5F97 API key: ${c.dim('https://console.anthropic.com/')}`);
  console.log(`    2. \u8A2D\u5B9A:`);
  console.log(`       ${c.dim('export PANGUARD_AI_KEY=sk-ant-your-key-here')}`);
  console.log('');
  console.log(`  ${c.dim(`Run "panguard guard setup-ai" for interactive setup`)}`);
  console.log(`  ${c.dim(`\u57F7\u884C "panguard guard setup-ai" \u9032\u884C\u4E92\u52D5\u5F0F\u8A2D\u5B9A`)}`);
  console.log('');
}

/** Stop the guard engine / 停止守護引擎 */
function commandStop(dataDir: string): void {
  const pidFile = new PidFile(dataDir);
  const pid = pidFile.read();

  if (!pid) {
    console.log(`  ${symbols.info} PanguardGuard is not running`);
    return;
  }

  if (!pidFile.isRunning()) {
    console.log(`  ${symbols.warn} Process not found, cleaning up PID file`);
    pidFile.remove();
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    console.log(`  ${symbols.pass} PanguardGuard stopped ${c.dim(`(PID: ${pid})`)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ${symbols.fail} Failed to stop: ${msg}`);
  }
}

/** Show engine status / 顯示引擎狀態 */
function commandStatus(dataDir: string): void {
  console.log(header());

  const pidFile = new PidFile(dataDir);
  const pid = pidFile.read();
  const running = pidFile.isRunning();

  const items: StatusItem[] = [
    {
      label: 'Status',
      value: running ? c.safe('RUNNING') : c.critical('STOPPED'),
      status: running ? ('safe' as const) : ('critical' as const),
    },
    ...(pid ? [{ label: 'PID', value: c.sage(String(pid)) }] : []),
    { label: 'Data Dir', value: c.dim(dataDir) },
  ];

  try {
    const config = loadConfig(join(dataDir, 'config.json'));
    items.push({ label: 'Mode', value: c.sage(config.mode) });
    items.push({
      label: 'Dashboard',
      value: config.dashboardEnabled
        ? c.underline(`http://localhost:${config.dashboardPort}`)
        : c.dim('disabled'),
    });
    items.push({
      label: 'License',
      value: config.licenseKey ? c.safe('configured') : c.caution('free tier'),
      status: config.licenseKey ? ('safe' as const) : ('caution' as const),
    });
  } catch {
    items.push({ label: 'Config', value: c.critical('not found'), status: 'critical' as const });
  }

  console.log(statusPanel('PANGUARD AI Security Status', items));
}

/** Install as system service / 安裝為系統服務 */
async function commandInstall(dataDir: string): Promise<void> {
  const sp = spinner('Installing PanguardGuard as system service...');
  try {
    const execPath = process.argv[1] ?? join(homedir(), '.npm-global', 'bin', 'panguard-guard');
    const result = await installService(execPath, dataDir);
    sp.succeed(`Service installed: ${c.sage(result)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sp.fail(`Install failed: ${msg}`);
    console.error(c.dim('  You may need to run with elevated privileges (sudo/admin).'));
  }
}

/** Uninstall system service / 解除安裝系統服務 */
async function commandUninstall(): Promise<void> {
  const sp = spinner('Uninstalling PanguardGuard service...');
  try {
    const result = await uninstallService();
    sp.succeed(`Service uninstalled: ${c.sage(result)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sp.fail(`Uninstall failed: ${msg}`);
  }
}

/** Show current configuration / 顯示當前配置 */
function commandConfig(dataDir: string): void {
  console.log(header('Configuration'));
  try {
    const config = loadConfig(join(dataDir, 'config.json'));
    console.log(JSON.stringify(config, null, 2));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ${symbols.fail} Failed to load config: ${msg}`);
  }
}

/** Print help message / 列印幫助訊息 */
function printHelp(): void {
  console.log(banner(CLI_VERSION));

  console.log(`  ${c.bold('Usage:')} panguard-guard <command> [options]`);
  console.log('');
  console.log(divider('Commands'));
  console.log('');

  const commands = [
    { cmd: 'start', desc: 'Start the guard engine' },
    { cmd: 'stop', desc: 'Stop the guard engine' },
    { cmd: 'status', desc: 'Show engine status' },
    { cmd: 'install', desc: 'Install as system service' },
    { cmd: 'uninstall', desc: 'Remove system service' },
    { cmd: 'config', desc: 'Show current configuration' },
    { cmd: 'generate-key', desc: 'Generate a test license key' },
    { cmd: 'install-script', desc: 'Generate install script' },
    { cmd: 'help', desc: 'Show this help' },
  ];

  for (const { cmd, desc } of commands) {
    console.log(`  ${c.sage(cmd.padEnd(18))} ${desc}`);
  }

  console.log('');
  console.log(divider('Options'));
  console.log('');
  console.log(
    `  ${c.sage('--data-dir <path>'.padEnd(22))} Data directory ${c.dim('(default: ~/.panguard-guard)')}`
  );
  console.log(
    `  ${c.sage('--verbose'.padEnd(22))} Show all event logs ${c.dim('(default: quiet mode)')}`
  );
  console.log(
    `  ${c.sage('--manager <url>'.padEnd(22))} Manager URL for distributed mode`
  );
  console.log(
    `  ${c.sage('--no-telemetry'.padEnd(22))} Disable threat intelligence sharing`
  );
  console.log(
    `  ${c.sage('--show-upload-data'.padEnd(22))} Show anonymized data before upload`
  );
  console.log(`  ${c.sage('--license-key <key>'.padEnd(22))} License key for install-script`);
  console.log('');
  console.log(c.dim(`  Version: ${CLI_VERSION}`));
  console.log('');
}

/** Extract and validate option value from args */
function extractOption(args: string[], option: string): string | undefined {
  const idx = args.indexOf(option);
  if (idx !== -1 && idx + 1 < args.length) {
    const value = args[idx + 1];
    if (value === undefined) return undefined;
    if (value.startsWith('-')) return undefined;
    if (option === '--data-dir') {
      if (/\.\.[\\/]/.test(value) || /[;&|`$]/.test(value)) {
        console.error(`  ${symbols.fail} Invalid ${option} value: unsafe characters`);
        return undefined;
      }
    }
    return value;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// CLI entry point (when run directly)
// CLI 進入點（直接執行時）
// ---------------------------------------------------------------------------

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('/panguard-guard') ||
    process.argv[1].includes('panguard-guard/dist/cli'));

if (isDirectRun) {
  runCLI(process.argv.slice(2)).catch((err) => {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
