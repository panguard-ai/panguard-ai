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
  promptConfirm,
  promptSelect,
  promptText,
} from '@panguard-ai/core';
import type { StatusItem } from '@panguard-ai/core';
import { GuardEngine } from '../guard-engine.js';
import { loadConfig, saveConfig, DEFAULT_DATA_DIR } from '../config.js';
import { PidFile } from '../daemon/index.js';
import { installService, uninstallService } from '../daemon/index.js';
import { generateTestLicenseKey } from '../license/index.js';
import { generateInstallScript } from '../install/index.js';
import { DashboardRenderer } from './dashboard-renderer.js';
import type { DashboardState } from './dashboard-renderer.js';
import { SkillWatcher } from '../engines/skill-watcher.js';
import { commandScan } from './scan-command.js';
import {
  classifyThreatResponse,
  renderAutoResponse,
  renderLowConfidenceNote,
  InteractiveThreatQueue,
} from './interactive-handler.js';
import type { ThreatContext } from './interactive-handler.js';
import { DailySummaryCollector } from '../summary/daily-summary.js';

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
  const dashboard = args.includes('--dashboard');
  const interactive = args.includes('--interactive');
  const managerUrl = extractOption(args, '--manager');
  const noTelemetry = args.includes('--no-telemetry');
  const showUploadData = args.includes('--show-upload-data');

  switch (command) {
    case 'start':
      await commandStart(
        dataDir,
        verbose,
        managerUrl,
        noTelemetry,
        showUploadData,
        dashboard,
        interactive
      );
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
    case 'setup-ai':
      await commandSetupAI(dataDir);
      break;
    case 'scan':
      await commandScan(args.slice(1));
      break;
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
  dashboardMode = false,
  interactiveMode = false
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

  // Rule counts
  const rules = engine.getRuleCounts();
  const rulesSummary = `ATR: ${rules.atr}`;

  // Status box
  console.log(
    statusPanel('PANGUARD AI Guard Active', [
      { label: 'Status', value: c.safe('PROTECTED'), status: 'safe' },
      { label: 'PID', value: c.sage(String(process.pid)) },
      { label: 'Mode', value: c.sage(config.mode) },
      { label: 'Rules', value: c.sage(rulesSummary) },
      { label: 'Data Dir', value: c.dim(dataDir) },
      ...(config.dashboardEnabled
        ? [{ label: 'Dashboard', value: c.underline(`http://localhost:${config.dashboardPort}`) }]
        : []),
      ...(config.threatCloudEndpoint
        ? [{ label: 'Threat Cloud', value: c.dim(config.threatCloudEndpoint) }]
        : []),
    ])
  );

  // Threat intelligence sharing transparency message
  if (config.telemetryEnabled === false) {
    console.log(`  ${symbols.info} Threat intelligence sharing: ${c.dim('disabled')}`);
    console.log(`  ${c.dim('  No data will be uploaded to Panguard Threat Cloud')}`);
  } else {
    console.log(`  ${symbols.info} Threat intelligence sharing: ${c.safe('enabled')}`);
    console.log(
      `  ${c.dim('  Detected threats are anonymously uploaded to Panguard Threat Cloud')}`
    );
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
  const hasEnvKey = Boolean(
    process.env['PANGUARD_AI_KEY'] ||
    process.env['ANTHROPIC_API_KEY'] ||
    process.env['OPENAI_API_KEY']
  );

  if (hasLocalAi) {
    console.log(
      `  ${c.safe('\u2713')} Layer 2 Local AI: ${c.sage(config.ai?.provider + ' / ' + (config.ai?.model ?? 'default'))}`
    );
  }
  if (hasCloudAi || hasEnvKey) {
    const provider =
      config.ai?.provider ?? (process.env['ANTHROPIC_API_KEY'] ? 'anthropic' : 'openai');
    console.log(`  ${c.safe('\u2713')} Layer 3 Cloud AI: ${c.sage(provider + ' connected')}`);
  }

  if (!hasAnyAi && !hasEnvKey) {
    console.log('');
    console.log(
      `  ${symbols.info} Guard started with ${c.sage('Layer 1 (Pattern Detection)')} active.`
    );
    console.log('');
    printAiSetupGuide();
  }

  // ── First-run welcome / 首次啟動歡迎 ──────────────────────────────
  await showFirstRunWelcome(config.dashboardPort);

  console.log(`  ${symbols.info} Monitoring...`);
  console.log('');

  // ── TUI Dashboard mode ──────────────────────────────────────────────
  const dashboardRenderer = dashboardMode ? new DashboardRenderer(5000) : null;

  // ── Skill Install Watcher ────────────────────────────────────────────
  const skillWatcher = new SkillWatcher({
    pollInterval: 10_000,
    submitThreat: engine.getSkillThreatSubmitter(),
    submitATRProposal: engine.getATRProposalSubmitter(),
  });

  skillWatcher.on('skill-added', (change: { name: string; platformId: string }) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    if (dashboardRenderer) {
      dashboardRenderer.pushEvent({
        time,
        icon: symbols.info,
        message: `skill-install: ${change.name} on ${change.platformId}`,
      });
    } else if (!verbose) {
      console.log(
        `  ${symbols.info} ${c.sage(`[${time}]`)} New skill: ${c.bold(change.name)} on ${change.platformId}`
      );
    }
  });

  skillWatcher.on('skill-removed', (change: { name: string; platformId: string }) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    if (dashboardRenderer) {
      dashboardRenderer.pushEvent({
        time,
        icon: symbols.warn,
        message: `skill-removed: ${change.name} from ${change.platformId}`,
      });
    } else if (!verbose) {
      console.log(
        `  ${symbols.warn} ${c.dim(`[${time}]`)} Skill removed: ${change.name} from ${change.platformId}`
      );
    }
  });

  skillWatcher.on(
    'skill-audit-complete',
    (result: { name: string; riskLevel: string; riskScore: number; autoWhitelisted: boolean }) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const icon =
        result.riskLevel === 'LOW'
          ? symbols.pass
          : result.riskLevel === 'MEDIUM'
            ? symbols.warn
            : symbols.fail;
      const riskColor =
        result.riskLevel === 'LOW'
          ? c.safe
          : result.riskLevel === 'MEDIUM'
            ? c.caution
            : c.critical;

      if (dashboardRenderer) {
        const statusMsg = result.autoWhitelisted
          ? 'SAFE (whitelisted)'
          : riskColor(result.riskLevel);
        dashboardRenderer.pushEvent({
          time,
          icon,
          message: `skill-audit: ${result.name} ${String.fromCharCode(8594)} ${statusMsg}`,
        });
      } else if (!verbose) {
        console.log(
          `  ${icon} ${c.sage(`[${time}]`)} Audit: ${result.name} = ${riskColor(result.riskLevel)} (${result.riskScore}/100)`
        );
        if (result.autoWhitelisted) {
          console.log(`    ${symbols.pass} Auto-whitelisted`);
        }
      }
    }
  );

  void skillWatcher.start();

  // ── Daily Summary Collector ────────────────────────────────────────
  const dailySummary = new DailySummaryCollector(dataDir);
  dailySummary.start();

  // ── Interactive Threat Queue ────────────────────────────────────────
  const threatQueue = interactiveMode ? new InteractiveThreatQueue() : null;

  // Update shutdown handler to also stop skill watcher, dashboard, summary
  const originalShutdown = shutdown;
  const enhancedShutdown = async () => {
    skillWatcher.stop();
    dailySummary.stop();
    if (dashboardRenderer) dashboardRenderer.stop();
    await originalShutdown();
  };
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.on('SIGINT', () => void enhancedShutdown());
  process.on('SIGTERM', () => void enhancedShutdown());

  // ── Dashboard or Quiet mode event callback ──────────────────────────
  if (dashboardRenderer) {
    // Dashboard mode: feed events to TUI renderer
    const getState = (): DashboardState => {
      const status = engine.getStatus();
      const rules = engine.getRuleCounts();
      return {
        status: status.running
          ? status.mode === 'learning'
            ? 'learning'
            : 'protected'
          : 'stopped',
        uptime: status.uptime,
        eventsProcessed: status.eventsProcessed,
        threatsDetected: status.threatsDetected,
        actionsExecuted: status.actionsExecuted,
        mode: status.mode,
        ruleCounts: rules,
        whitelistedSkills: status.whitelistedSkills ?? 0,
        trackedSkills: status.trackedSkills ?? 0,
        aiProvider: config.ai?.provider,
        aiModel: config.ai?.model,
        learningProgress: status.learningProgress,
      };
    };

    engine.setEventCallback((type, data) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      if (type === 'threat') {
        dashboardRenderer.pushThreat({
          time,
          category: String(data['category'] ?? 'unknown'),
          source: String(data['sourceIP'] ?? 'unknown'),
          confidence: Number(data['confidence'] ?? 0),
          action: String(data['action'] ?? 'none'),
        });
      } else if (type === 'status') {
        dashboardRenderer.pushEvent({
          time,
          icon: symbols.pass,
          message: `heartbeat: ${Number(data['eventsProcessed'] ?? 0).toLocaleString()} events`,
        });
      }
    });

    dashboardRenderer.start(getState);
  } else if (!verbose) {
    // Quiet mode: status summary every 60s, threat alerts with interactive routing
    let lastStatusTime = 0;
    engine.setEventCallback((type, data) => {
      if (type === 'status') {
        const now = Date.now();
        if (now - lastStatusTime < 60_000) return;
        lastStatusTime = now;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const events = Number(data['eventsProcessed'] ?? 0);
        const threats = Number(data['threatsDetected'] ?? 0);
        const uploaded = Number(data['uploaded'] ?? 0);

        // Feed daily summary
        dailySummary.recordEvent();

        console.log(
          c.dim(
            `  [${time}] Events: ${events.toLocaleString()} | Threats: ${threats} | Uploaded: ${uploaded}`
          )
        );
      } else if (type === 'threat') {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const confidence = Number(data['confidence'] ?? 0);
        const category = String(data['category'] ?? 'unknown');
        const sourceIP = String(data['sourceIP'] ?? 'unknown');
        const action = String(data['action'] ?? 'none');

        // Feed daily summary
        dailySummary.recordThreat(category, action === 'blocked', sourceIP);

        // Route based on confidence
        const responseType = classifyThreatResponse(confidence);
        const context: ThreatContext = {
          category,
          sourceIP,
          confidence,
          details: String(data['details'] ?? ''),
          timestamp: time,
        };

        if (responseType === 'auto') {
          renderAutoResponse(context, action);
        } else if (responseType === 'interactive' && threatQueue) {
          void threatQueue.enqueue(context);
        } else if (responseType === 'log') {
          renderLowConfidenceNote(context);
        } else {
          // Non-interactive mode with medium confidence: show as regular threat
          console.log('');
          console.log(`  ${symbols.warn} ${c.caution(`[${time}]`)} Threat detected`);
          console.log(`      Type: ${c.bold(category)}`);
          console.log(`      Source: ${c.sage(sourceIP)}`);
          console.log(`      Confidence: ${confidence}%`);
          console.log(`      Action: ${action}`);
          console.log('');
        }
      }
    });

    console.log(c.dim('  Press Ctrl+C to stop'));
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// AI setup guide — shown when no AI layers are configured
// AI 設定指南 — 當沒有配置 AI 層時顯示
// ---------------------------------------------------------------------------

/**
 * Show first-run welcome with onboarding guidance.
 * Only shown once — writes a marker file after display.
 */
async function showFirstRunWelcome(dashboardPort: number): Promise<void> {
  const { existsSync, writeFileSync, mkdirSync } = await import('node:fs');
  const markerPath = join(homedir(), '.panguard', '.guard-onboarded');

  if (existsSync(markerPath)) return;

  console.log('');
  console.log(divider());
  console.log('');
  console.log(`  ${c.sage(c.bold('Welcome to Panguard AI Guard!'))}`);
  console.log(`  ${c.sage(c.bold('Panguard AI Guard!'))}`);
  console.log('');
  console.log(`  Your agent security protection is now active.`);
  console.log(`  AI Agent`);
  console.log('');
  console.log(`  ${c.bold('Dashboard / :')}`);
  console.log(`    ${c.underline(`http://localhost:${dashboardPort}`)}`);
  console.log('');
  console.log(`  ${c.bold('Quick commands / :')}`);
  console.log(`    ${c.sage('pg')}              Open interactive menu /`);
  console.log(`    ${c.sage('pg up')}           Start protection + dashboard /  + `);
  console.log(`    ${c.sage('pg status')}       Check protection status / `);
  console.log(`    ${c.sage('pg scan')}         Scan all installed skills / `);
  console.log(`    ${c.sage('pg audit <dir>')}  Audit a skill before installing / `);
  console.log('');
  console.log(`  ${c.bold('What Guard does / Guard :')}`);
  console.log(`    ${symbols.pass} Monitors new skill installations in real-time`);
  console.log(`    ${symbols.pass} Auto-audits skills with 61+ ATR threat rules`);
  console.log(`    ${symbols.pass} Blocks critical threats, alerts on suspicious ones`);
  console.log(`    ${symbols.pass} Syncs community threat intelligence via Threat Cloud`);
  console.log('');
  console.log(divider());
  console.log('');

  // Write marker so this only shows once
  try {
    const dir = join(homedir(), '.panguard');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(markerPath, new Date().toISOString(), 'utf-8');
  } catch {
    // Non-critical — will just show again next time
  }
}

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
  console.log(
    `       ${c.dim(`echo '{"ai":{"provider":"ollama","model":"llama3.2"}}' > ${configDir}/guard-ai.json`)}`
  );
  console.log('');
  console.log(`  ${c.sage('Layer 3')} -- Cloud AI (Fastest, Most Accurate)`);
  console.log(`    1. Get API key: ${c.dim('https://console.anthropic.com/')}`);
  console.log(`    2. Set in config:`);
  console.log(`       ${c.dim('export PANGUARD_AI_KEY=sk-ant-your-key-here')}`);
  console.log(`       ${c.dim(`# or add to ${configDir}/config.json:`)}`);
  console.log(
    `       ${c.dim(`# {"ai":{"provider":"claude","apiKey":"sk-ant-...","model":"claude-sonnet-4-20250514"}}`)}`
  );
  console.log('');
  console.log(c.dim(`  ${divider()}`));
  console.log('');
  console.log(`  ${c.sage('\u5553\u7528 AI \u5075\u6E2C\u5C64\uFF1A')}`);
  console.log('');
  console.log(
    `  ${c.sage('\u7B2C\u4E8C\u5C64')} -- \u672C\u5730 AI\uFF08\u514D\u8CBB\u3001\u79C1\u5BC6\uFF09`
  );
  console.log(
    `    1. \u5B89\u88DD Ollama: ${c.dim('curl -fsSL https://ollama.com/install.sh | sh')}`
  );
  console.log(`    2. \u4E0B\u8F09\u6A21\u578B: ${c.dim('ollama pull llama3.2')}`);
  console.log(`    3. \u8A2D\u5B9A:`);
  console.log(
    `       ${c.dim(`echo '{"ai":{"provider":"ollama","model":"llama3.2"}}' > ${configDir}/guard-ai.json`)}`
  );
  console.log('');
  console.log(
    `  ${c.sage('\u7B2C\u4E09\u5C64')} -- \u96F2\u7AEF AI\uFF08\u6700\u5FEB\u3001\u6700\u6E96\u78BA\uFF09`
  );
  console.log(`    1. \u53D6\u5F97 API key: ${c.dim('https://console.anthropic.com/')}`);
  console.log(`    2. \u8A2D\u5B9A:`);
  console.log(`       ${c.dim('export PANGUARD_AI_KEY=sk-ant-your-key-here')}`);
  console.log('');
  console.log(`  ${c.dim(`Run "panguard guard setup-ai" for interactive setup`)}`);
  console.log(
    `  ${c.dim(`\u57F7\u884C "panguard guard setup-ai" \u9032\u884C\u4E92\u52D5\u5F0F\u8A2D\u5B9A`)}`
  );
  console.log('');
}

/** Interactive AI setup wizard / 互動式 AI 設定精靈 */
async function commandSetupAI(_dataDir: string): Promise<void> {
  const lang = 'en' as const;
  const l = (en: string, zh: string) => ({ en, 'zh-TW': zh });

  console.log(header());
  console.log('');
  console.log(`  ${c.sage('AI Detection Layer Setup')}`);
  console.log(`  ${c.dim(divider())}`);
  console.log('');

  const provider = await promptSelect<'ollama' | 'claude' | 'openai' | 'skip'>({
    title: l('Select AI provider', '\u9078\u64C7 AI \u63D0\u4F9B\u8005'),
    lang,
    options: [
      { value: 'ollama' as const, label: l('Ollama (local, free, private)', 'Ollama (\u672C\u5730\u514D\u8CBB)') },
      { value: 'claude' as const, label: l('Claude API (most accurate)', 'Claude API (\u6700\u6E96\u78BA)') },
      { value: 'openai' as const, label: l('OpenAI API', 'OpenAI API') },
      { value: 'skip' as const, label: l('Skip for now', '\u7A0D\u5F8C\u8A2D\u5B9A') },
    ],
  });

  if (!provider || provider === 'skip') {
    console.log(`\n  ${symbols.info} Skipped. Guard will use regex-only detection (Layer 1).`);
    console.log(`  ${c.dim('Re-run "panguard-guard setup-ai" anytime to enable AI.')}`);
    return;
  }

  let model = '';
  let apiKey = '';
  let endpoint = '';

  if (provider === 'ollama') {
    console.log('');
    console.log(`  ${symbols.info} Ollama runs locally -- no API key needed.`);
    console.log(`  ${c.dim('Make sure Ollama is installed: curl -fsSL https://ollama.com/install.sh | sh')}`);
    console.log('');

    const modelChoice = await promptSelect<string>({
      title: l('Select model', '\u9078\u64C7\u6A21\u578B'),
      lang,
      options: [
        { value: 'llama3.2', label: l('Llama 3.2 (recommended, 3B)', 'Llama 3.2 (\u63A8\u85A6)') },
        { value: 'llama3.1', label: l('Llama 3.1 (8B, more accurate)', 'Llama 3.1 (\u66F4\u6E96\u78BA)') },
        { value: 'mistral', label: l('Mistral 7B', 'Mistral 7B') },
        { value: 'custom', label: l('Custom model', '\u81EA\u8A02\u6A21\u578B') },
      ],
    });

    if (modelChoice === 'custom') {
      const custom = await promptText({
        title: l('Model name', '\u6A21\u578B\u540D\u7A31'),
        placeholder: 'llama3.2',
        lang,
      });
      model = custom ?? 'llama3.2';
    } else {
      model = modelChoice ?? 'llama3.2';
    }

    endpoint = 'http://127.0.0.1:11434';
  } else {
    // Claude or OpenAI
    const keyName = provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
    const consolUrl = provider === 'claude'
      ? 'https://console.anthropic.com/'
      : 'https://platform.openai.com/api-keys';

    console.log('');
    console.log(`  ${symbols.info} Get your API key from: ${c.dim(consolUrl)}`);
    console.log('');

    const inputKey = await promptText({
      title: l(`API Key (${keyName})`, `API Key (${keyName})`),
      placeholder: provider === 'claude' ? 'sk-ant-...' : 'sk-...',
      sensitive: true,
      lang,
    });

    if (!inputKey || inputKey.trim().length < 10) {
      console.log(`\n  ${symbols.fail} Invalid API key. Setup cancelled.`);
      return;
    }

    apiKey = inputKey.trim();
    model = provider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o-mini';
  }

  // Save config
  const { existsSync, writeFileSync, mkdirSync } = await import('node:fs');
  const configDir = join(homedir(), '.panguard');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Read existing master config or create new
  const masterPath = join(configDir, 'config.json');
  let masterConfig: Record<string, unknown> = {};
  if (existsSync(masterPath)) {
    try {
      const { readFileSync } = await import('node:fs');
      masterConfig = JSON.parse(readFileSync(masterPath, 'utf-8')) as Record<string, unknown>;
    } catch { /* start fresh */ }
  }

  const aiConfig: Record<string, string> = { provider, model };
  if (apiKey) aiConfig['apiKey'] = apiKey;
  if (endpoint) aiConfig['endpoint'] = endpoint;

  masterConfig['ai'] = aiConfig;
  writeFileSync(masterPath, JSON.stringify(masterConfig, null, 2) + '\n');

  // Also set env var for current session
  if (apiKey && provider === 'claude') {
    process.env['PANGUARD_AI_KEY'] = apiKey;
  }

  console.log('');
  console.log(`  ${symbols.pass} AI configured: ${c.sage(provider)} / ${c.sage(model)}`);
  console.log(`  ${c.dim(`Config saved to ${masterPath}`)}`);
  console.log('');

  if (provider === 'ollama') {
    console.log(`  ${symbols.info} Next: pull the model if you haven't:`);
    console.log(`    ${c.dim(`ollama pull ${model}`)}`);
    console.log('');
  }

  console.log(`  ${symbols.info} Restart Guard to activate AI detection:`);
  console.log(`    ${c.dim('panguard-guard start')}`);
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
    return;
  }

  // ── Threat Cloud setup / 設定 Threat Cloud ──
  console.log('');
  const configPath = join(dataDir, 'config.json');
  const config = loadConfig(configPath);
  const uiLang = (config.lang === 'zh-TW' ? 'zh-TW' : 'en') as 'en' | 'zh-TW';

  const enableTC = await promptConfirm({
    message: {
      en: 'Enable Threat Cloud collective defense?',
      'zh-TW': '啟用 Threat Cloud 集體防禦？',
    },
    defaultValue: true,
    lang: uiLang,
  });

  const updated = {
    ...config,
    threatCloudUploadEnabled: enableTC,
    threatCloudEndpoint: enableTC
      ? (config.threatCloudEndpoint ?? 'https://tc.panguard.ai/api')
      : config.threatCloudEndpoint,
  };
  try {
    saveConfig(updated, configPath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(c.dim(`  Warning: could not save config: ${msg}`));
    return;
  }

  if (enableTC) {
    console.log(
      `  ${symbols.pass} Threat Cloud enabled: ${c.sage(updated.threatCloudEndpoint ?? 'https://tc.panguard.ai/api')}`
    );
    console.log(c.dim('    Every scan strengthens the collective defense network.'));
    console.log(c.dim('    每次掃描都會強化集體防禦網路。'));
  } else {
    console.log(`  ${symbols.info} Threat Cloud disabled (offline mode).`);
    console.log(
      c.dim(
        '    You can enable it later: panguard-guard config --set threatCloudUploadEnabled=true'
      )
    );
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
    { cmd: 'scan', desc: 'Scan all installed MCP skills for threats' },
    { cmd: 'start', desc: 'Start the guard engine' },
    { cmd: 'stop', desc: 'Stop the guard engine' },
    { cmd: 'status', desc: 'Show engine status' },
    { cmd: 'setup-ai', desc: 'Configure AI detection layer' },
    { cmd: 'install', desc: 'Install as system service' },
    { cmd: 'uninstall', desc: 'Remove system service' },
    { cmd: 'config', desc: 'Show current configuration' },
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
  console.log(`  ${c.sage('--manager <url>'.padEnd(22))} Manager URL for distributed mode`);
  console.log(`  ${c.sage('--no-telemetry'.padEnd(22))} Disable threat intelligence sharing`);
  console.log(`  ${c.sage('--show-upload-data'.padEnd(22))} Show anonymized data before upload`);
  console.log(
    `  ${c.sage('--dashboard'.padEnd(22))} Enable live TUI dashboard ${c.dim('(default: quiet mode)')}`
  );
  console.log(`  ${c.sage('--interactive'.padEnd(22))} Prompt for medium-confidence threats`);
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
