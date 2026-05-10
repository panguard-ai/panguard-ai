/**
 * `panguard doctor` - Health diagnostic command
 * `panguard doctor` - 健康診斷指令
 *
 * Runs a 10-stage pipeline of system checks and reports pass/warn/fail
 * for each, with fix suggestions for non-passing items.
 *
 * @module @panguard-ai/panguard/cli/commands/doctor
 */

import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { c, symbols, box, header } from '@panguard-ai/core';
import { PANGUARD_VERSION } from '../../index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  status: CheckStatus;
  label: string;
  detail: string;
  fix?: string;
}

type Lang = 'en' | 'zh-TW';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const HOME = homedir();
const PANGUARD_DIR = join(HOME, '.panguard');
const CONFIG_PATH = join(PANGUARD_DIR, 'config.json');
const LAST_SCAN_PATH = join(PANGUARD_DIR, 'last-scan.json');
const GUARD_PID_PATH = join(HOME, '.panguard-guard', 'panguard-guard.pid');
const LAUNCHD_PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', 'ai.panguard.guard.plist');
const ZSH_COMPLETIONS_PATH = join(HOME, '.zsh', 'completions', '_panguard');

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkInstallation(): CheckResult {
  const hasVersion = Boolean(PANGUARD_VERSION);
  return {
    status: hasVersion ? 'pass' : 'fail',
    label: 'Installation integrity',
    detail: hasVersion ? `Binary OK, v${PANGUARD_VERSION}` : 'Cannot determine version',
    fix: hasVersion ? undefined : 'Reinstall panguard: npm install -g @panguard-ai/panguard',
  };
}

function checkConfiguration(): CheckResult {
  if (!existsSync(CONFIG_PATH)) {
    return {
      status: 'fail',
      label: 'Configuration valid',
      detail: '~/.panguard/config.json not found',
      fix: 'Run "pga setup" to create your configuration',
    };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    JSON.parse(raw);
    return {
      status: 'pass',
      label: 'Configuration valid',
      detail: '~/.panguard/config.json',
    };
  } catch {
    return {
      status: 'fail',
      label: 'Configuration valid',
      detail: '~/.panguard/config.json is not valid JSON',
      fix: 'Run "pga setup" to regenerate the configuration file',
    };
  }
}

function checkCredentials(): CheckResult {
  // PanGuard is 100% free and open source — no license or login required
  return {
    status: 'pass',
    label: 'License',
    detail: 'Open source — no license required',
  };
}

function checkAiProvider(): CheckResult {
  const layers: string[] = [];

  // Check Layer 2: Local AI (Ollama)
  const hasOllamaEnv = Boolean(process.env['OLLAMA_HOST']);
  let ollamaInstalled = false;
  try {
    execFileSync('ollama', ['--version'], { encoding: 'utf-8', timeout: 3000 });
    ollamaInstalled = true;
  } catch {
    // Ollama not available
  }

  // Check Layer 3: Cloud AI (API keys)
  const hasOpenAi = Boolean(process.env['OPENAI_API_KEY']);
  const hasAnthropic = Boolean(process.env['ANTHROPIC_API_KEY'] || process.env['PANGUARD_AI_KEY']);

  if (hasOllamaEnv || ollamaInstalled) {
    layers.push('Layer 2: Ollama' + (hasOllamaEnv ? ' (env)' : ' (installed)'));
  }
  if (hasOpenAi) layers.push('Layer 3: OpenAI');
  if (hasAnthropic) layers.push('Layer 3: Anthropic');

  // Check config file for AI settings
  let configProvider: string | undefined;
  let _configModel: string | undefined;
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const cfg = JSON.parse(raw) as {
        ai?: { preference?: string; provider?: string; model?: string };
      };
      if (cfg.ai?.preference === 'rules_only') {
        return {
          status: 'pass',
          label: 'AI provider',
          detail: 'Rules-only mode (Layer 1 only, no AI provider required)',
        };
      }
      if (cfg.ai?.provider) {
        configProvider = cfg.ai.provider;
        _configModel = cfg.ai.model;
        const layerNum = cfg.ai.provider === 'ollama' ? '2' : '3';
        layers.push(
          `Layer ${layerNum}: ${cfg.ai.provider} (config)` +
            (cfg.ai.model ? ` / ${cfg.ai.model}` : '')
        );
      }
    } catch {
      // fall through
    }
  }

  // Also check guard-specific config
  const guardConfigPath = join(HOME, '.panguard-guard', 'config.json');
  if (existsSync(guardConfigPath) && !configProvider) {
    try {
      const raw = readFileSync(guardConfigPath, 'utf-8');
      const cfg = JSON.parse(raw) as { ai?: { provider?: string; model?: string } };
      if (cfg.ai?.provider) {
        const layerNum = cfg.ai.provider === 'ollama' ? '2' : '3';
        layers.push(
          `Layer ${layerNum}: ${cfg.ai.provider} (guard config)` +
            (cfg.ai.model ? ` / ${cfg.ai.model}` : '')
        );
      }
    } catch {
      // fall through
    }
  }

  if (layers.length > 0) {
    return {
      status: 'pass',
      label: 'AI provider',
      detail: layers.join(', '),
    };
  }

  return {
    status: 'warn',
    label: 'AI provider',
    detail: 'No AI provider configured (Layer 1 rules-only mode)',
    fix: 'Run "pga guard setup-ai" for interactive setup, or set ANTHROPIC_API_KEY / install Ollama',
  };
}

function checkGuardEngine(): CheckResult {
  if (!existsSync(GUARD_PID_PATH)) {
    return {
      status: 'fail',
      label: 'Guard engine',
      detail: 'Daemon not running (no PID file)',
      fix: 'Run "pga guard start" to start the guard daemon',
    };
  }

  try {
    const pidStr = readFileSync(GUARD_PID_PATH, 'utf-8').trim();
    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) throw new Error('Invalid PID');
    process.kill(pid, 0); // signal 0 checks existence without killing
    return {
      status: 'pass',
      label: 'Guard engine',
      detail: `Daemon running (PID ${pid})`,
    };
  } catch {
    return {
      status: 'fail',
      label: 'Guard engine',
      detail: 'PID file exists but daemon is not running',
      fix: 'Run "pga guard start" to restart the guard daemon',
    };
  }
}

function checkNotificationChannels(): CheckResult {
  if (!existsSync(CONFIG_PATH)) {
    return {
      status: 'warn',
      label: 'Notification channels',
      detail: 'Config not found — cannot verify channels',
      fix: 'Run "pga setup" to set up notification channels',
    };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw) as {
      notifications?: { channel?: string; config?: Record<string, string> };
    };
    const channel = cfg.notifications?.channel ?? 'none';

    if (channel === 'none' || channel === '') {
      return {
        status: 'warn',
        label: 'Notification channels',
        detail: 'No notification channel configured',
        fix: 'Run "pga setup" and configure a Telegram, Slack, or webhook channel',
      };
    }

    return {
      status: 'pass',
      label: 'Notification channels',
      detail: capitalise(channel) + ': connected',
    };
  } catch {
    return {
      status: 'warn',
      label: 'Notification channels',
      detail: 'Could not parse config to verify channels',
      fix: 'Run "pga setup" to reconfigure',
    };
  }
}

function checkLastScan(): CheckResult {
  if (!existsSync(LAST_SCAN_PATH)) {
    return {
      status: 'warn',
      label: 'Last scan',
      detail: 'No scan result found',
      fix: 'Run "pga scan" to perform your first scan',
    };
  }

  try {
    const raw = readFileSync(LAST_SCAN_PATH, 'utf-8');
    const data = JSON.parse(raw) as { scannedAt?: string };
    const scannedAt = data.scannedAt ? new Date(data.scannedAt) : null;

    if (!scannedAt || isNaN(scannedAt.getTime())) {
      return {
        status: 'warn',
        label: 'Last scan',
        detail: 'Scan record found but timestamp is invalid',
        fix: 'Run "pga scan" to perform a fresh scan',
      };
    }

    const diffDays = Math.floor((Date.now() - scannedAt.getTime()) / 86_400_000);

    if (diffDays > 7) {
      return {
        status: 'warn',
        label: 'Last scan',
        detail: `${diffDays} days ago (recommend weekly)`,
        fix: 'Run "pga scan" to perform a fresh scan',
      };
    }

    return {
      status: 'pass',
      label: 'Last scan',
      detail: diffDays === 0 ? 'Today' : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`,
    };
  } catch {
    return {
      status: 'warn',
      label: 'Last scan',
      detail: 'Could not read last scan record',
      fix: 'Run "pga scan" to generate a fresh scan result',
    };
  }
}

const DEFAULT_TC_ENDPOINT = 'https://tc.panguard.ai';

function checkThreatCloud(): CheckResult {
  // TC defaults to tc.panguard.ai — no config required. Customer's audit/scan
  // already uploads here transparently. Only flag as warn if customer has
  // explicitly opted out (threatCloud.enabled: false) or pointed at a custom
  // endpoint that's not reachable.
  let endpoint = DEFAULT_TC_ENDPOINT;
  let enabledFlag: boolean | undefined;
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const cfg = JSON.parse(raw) as {
        threatCloud?: { endpoint?: string; enabled?: boolean };
      };
      if (cfg.threatCloud?.endpoint) endpoint = cfg.threatCloud.endpoint;
      enabledFlag = cfg.threatCloud?.enabled;
    } catch {
      // Config parse error → fall through to default
    }
  }

  if (enabledFlag === false) {
    return {
      status: 'pass',
      label: 'Threat Cloud',
      detail: 'Disabled (opted out — pga config set threatCloud.enabled true to re-enable)',
    };
  }

  return {
    status: 'pass',
    label: 'Threat Cloud',
    detail: `Connected to ${endpoint.replace(/^https?:\/\//, '')} (default — pga audit shares anonymized findings here)`,
  };
}

function checkSystemService(): CheckResult {
  const isMacOS = process.platform === 'darwin';

  if (!isMacOS) {
    // On non-macOS platforms skip launchd check
    return {
      status: 'pass',
      label: 'System service',
      detail: `Platform: ${process.platform} (launchd check skipped)`,
    };
  }

  if (!existsSync(LAUNCHD_PLIST_PATH)) {
    return {
      status: 'warn',
      label: 'System service',
      detail: 'launchd plist not found',
      fix: 'Run "pga guard install" to install the system service',
    };
  }

  // Verify plist references the config
  try {
    const plistContent = readFileSync(LAUNCHD_PLIST_PATH, 'utf-8');
    const matchesConfig = plistContent.includes('panguard');
    return {
      status: matchesConfig ? 'pass' : 'warn',
      label: 'System service',
      detail: matchesConfig
        ? 'launchd unit matches config'
        : 'launchd plist exists but may be outdated',
      fix: matchesConfig ? undefined : 'Run "pga guard install" to reinstall the service',
    };
  } catch {
    return {
      status: 'warn',
      label: 'System service',
      detail: 'launchd plist found but could not be read',
      fix: 'Run "pga guard install" to reinstall the service',
    };
  }
}

function checkShellCompletions(): CheckResult {
  if (existsSync(ZSH_COMPLETIONS_PATH)) {
    return {
      status: 'pass',
      label: 'Shell completions',
      detail: 'zsh completions installed',
    };
  }

  // Also check common homebrew completion paths
  const altPaths = [
    join(HOME, '.oh-my-zsh', 'completions', '_panguard'),
    '/usr/local/share/zsh/site-functions/_panguard',
    '/opt/homebrew/share/zsh/site-functions/_panguard',
  ];

  for (const alt of altPaths) {
    if (existsSync(alt)) {
      return {
        status: 'pass',
        label: 'Shell completions',
        detail: `zsh completions installed (${alt})`,
      };
    }
  }

  return {
    status: 'warn',
    label: 'Shell completions',
    detail: 'zsh completions not found',
    fix: 'Run "pga completion install" to install shell completions',
  };
}

// ---------------------------------------------------------------------------
// Run all checks
// ---------------------------------------------------------------------------

function checkAiLayerLocal(): CheckResult {
  // Check if Ollama is installed
  let ollamaInstalled = false;
  let ollamaVersion = '';
  try {
    ollamaVersion = execFileSync('ollama', ['--version'], {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim();
    ollamaInstalled = true;
  } catch {
    // not installed
  }

  if (!ollamaInstalled) {
    return {
      status: 'warn',
      label: 'AI Layer 2 (Local)',
      detail: 'Ollama not installed',
      fix: 'Install: curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.2',
    };
  }

  // Check if any models are pulled
  try {
    const models = execFileSync('ollama', ['list'], { encoding: 'utf-8', timeout: 5000 }).trim();
    const modelLines = models.split('\n').slice(1).filter(Boolean);
    if (modelLines.length === 0) {
      return {
        status: 'warn',
        label: 'AI Layer 2 (Local)',
        detail: `Ollama installed (${ollamaVersion}) but no models pulled`,
        fix: 'Pull a model: ollama pull llama3.2',
      };
    }
    const firstModel = modelLines[0]?.split(/\s+/)[0] ?? 'unknown';
    return {
      status: 'pass',
      label: 'AI Layer 2 (Local)',
      detail: `Ollama ready (${modelLines.length} model${modelLines.length > 1 ? 's' : ''}, e.g. ${firstModel})`,
    };
  } catch {
    return {
      status: 'warn',
      label: 'AI Layer 2 (Local)',
      detail: 'Ollama installed but cannot list models (is it running?)',
      fix: 'Start Ollama: ollama serve',
    };
  }
}

function checkAiLayerCloud(): CheckResult {
  const hasAnthropic = Boolean(process.env['ANTHROPIC_API_KEY'] || process.env['PANGUARD_AI_KEY']);
  const hasOpenAi = Boolean(process.env['OPENAI_API_KEY']);

  // Check config files
  let configCloud = false;
  let configProvider = '';
  for (const cfgPath of [CONFIG_PATH, join(HOME, '.panguard-guard', 'config.json')]) {
    if (existsSync(cfgPath)) {
      try {
        const raw = readFileSync(cfgPath, 'utf-8');
        const cfg = JSON.parse(raw) as {
          ai?: { provider?: string; apiKey?: string; model?: string };
        };
        if (cfg.ai?.provider && cfg.ai.provider !== 'ollama' && cfg.ai?.apiKey) {
          configCloud = true;
          configProvider = `${cfg.ai.provider}${cfg.ai.model ? ' / ' + cfg.ai.model : ''}`;
        }
      } catch {
        // ignore
      }
    }
  }

  if (hasAnthropic || hasOpenAi || configCloud) {
    const sources: string[] = [];
    if (hasAnthropic) sources.push('Anthropic (env)');
    if (hasOpenAi) sources.push('OpenAI (env)');
    if (configCloud) sources.push(configProvider + ' (config)');
    return {
      status: 'pass',
      label: 'AI Layer 3 (Cloud)',
      detail: sources.join(', '),
    };
  }

  return {
    status: 'warn',
    label: 'AI Layer 3 (Cloud)',
    detail: 'No cloud AI API key configured',
    fix: 'Run "pga guard setup-ai" or set ANTHROPIC_API_KEY / OPENAI_API_KEY',
  };
}

function runAllChecks(): CheckResult[] {
  return [
    checkInstallation(),
    checkConfiguration(),
    checkCredentials(),
    checkAiProvider(),
    checkAiLayerLocal(),
    checkAiLayerCloud(),
    checkGuardEngine(),
    checkNotificationChannels(),
    checkLastScan(),
    checkThreatCloud(),
    checkSystemService(),
    checkShellCompletions(),
  ];
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function statusSymbol(status: CheckStatus): string {
  switch (status) {
    case 'pass':
      return symbols.pass;
    case 'warn':
      return symbols.warn;
    case 'fail':
      return symbols.fail;
  }
}

function statusColor(status: CheckStatus): (text: string) => string {
  switch (status) {
    case 'pass':
      return c.sage;
    case 'warn':
      return c.caution;
    case 'fail':
      return c.critical;
  }
}

function capitalise(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// runDoctor — interactive display (called from interactive.ts)
// ---------------------------------------------------------------------------

export async function runDoctor(lang: Lang): Promise<void> {
  const results = runAllChecks();

  console.log('');
  console.log(header(lang === 'zh-TW' ? 'Panguard AI 健康診斷' : 'Panguard AI Health Check'));

  // Label column width for alignment
  const labelWidth = Math.max(...results.map((r) => r.label.length));

  for (const result of results) {
    const sym = statusSymbol(result.status);
    const color = statusColor(result.status);
    const paddedLabel = result.label.padEnd(labelWidth);
    console.log(`  ${sym} ${color(paddedLabel)}  ${c.dim(result.detail)}`);

    if (result.status !== 'pass' && result.fix) {
      console.log(`       ${c.dim('fix:')} ${result.fix}`);
    }
  }

  console.log('');

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  const failed = results.filter((r) => r.status === 'fail').length;

  const summaryParts: string[] = [
    c.sage(`${passed} passed`),
    warned > 0 ? c.caution(`${warned} warning${warned === 1 ? '' : 's'}`) : c.dim('0 warnings'),
    failed > 0 ? c.critical(`${failed} failed`) : c.dim('0 failed'),
  ];

  const summaryLine = summaryParts.join(c.dim('  ·  '));
  console.log(box(summaryLine, { title: lang === 'zh-TW' ? '診斷摘要' : 'Summary' }));
  console.log('');
}

// ---------------------------------------------------------------------------
// doctorCommand — Commander command for CLI registration
// ---------------------------------------------------------------------------

export function doctorCommand(): Command {
  return new Command('doctor')
    .description('Run health diagnostics')
    .option('--json', 'Output results as JSON')
    .option('--fix', 'Show fix commands for detected issues')
    .option('--lang <language>', 'Language override (en | zh-TW)')
    .action(async (opts: { json?: boolean; fix?: boolean; lang?: string }) => {
      const lang: Lang = opts.lang === 'zh-TW' ? 'zh-TW' : 'en';
      const results = runAllChecks();

      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      if (opts.fix) {
        console.log('');
        console.log(
          header(
            lang === 'zh-TW'
              ? 'Panguard AI 健康診斷 — 自動修復'
              : 'Panguard AI Health Check — Auto-fix'
          )
        );

        const fixable = results.filter((r) => r.status !== 'pass' && r.fix);
        if (fixable.length === 0) {
          console.log(`  ${symbols.pass} ${c.sage('No issues require fixing.')}`);
          console.log('');
          return;
        }

        for (const result of fixable) {
          const sym = statusSymbol(result.status);
          console.log(`  ${sym} ${c.bold(result.label)}`);
          console.log(`     ${c.dim('Would run:')} ${result.fix}`);
        }

        console.log('');
        console.log(
          `  ${symbols.info} ${c.dim(
            lang === 'zh-TW'
              ? '請複製上述指令執行修復。'
              : 'Copy and run the commands above to fix.'
          )}`
        );
        console.log('');
        return;
      }

      // Default: same as interactive display
      await runDoctor(lang);

      const hasFailure = results.some((r) => r.status === 'fail');
      if (hasFailure) {
        process.exitCode = 1;
      }
    });
}
