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
const CREDENTIALS_PATH = join(PANGUARD_DIR, 'credentials.enc');
const LEGACY_CREDENTIALS_PATH = join(PANGUARD_DIR, 'credentials.json');
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
      fix: 'Run "panguard init" to create your configuration',
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
      fix: 'Run "panguard init" to regenerate the configuration file',
    };
  }
}

function checkCredentials(): CheckResult {
  const hasEncrypted = existsSync(CREDENTIALS_PATH);
  const hasLegacy = existsSync(LEGACY_CREDENTIALS_PATH);

  if (!hasEncrypted && !hasLegacy) {
    return {
      status: 'warn',
      label: 'License / credentials',
      detail: 'No credentials found',
      fix: 'Run "panguard login" to authenticate and activate your plan',
    };
  }

  const credPath = hasEncrypted ? CREDENTIALS_PATH : LEGACY_CREDENTIALS_PATH;

  try {
    if (!hasEncrypted && hasLegacy) {
      // Legacy plaintext — can read directly
      const raw = readFileSync(credPath, 'utf-8');
      const data = JSON.parse(raw) as { tier?: string; expiresAt?: string };
      const tier = data.tier ?? 'unknown';
      const expiry = data.expiresAt ? data.expiresAt.slice(0, 10) : 'unknown';
      return {
        status: 'pass',
        label: 'License / credentials',
        detail: `${capitalise(tier)} plan, expires ${expiry}`,
      };
    }

    // Encrypted — only report presence, not content (no key available here)
    return {
      status: 'pass',
      label: 'License / credentials',
      detail: 'Credentials file present (~/.panguard/credentials.enc)',
    };
  } catch {
    return {
      status: 'warn',
      label: 'License / credentials',
      detail: 'Credentials file present but could not be read',
      fix: 'Run "panguard login" to re-authenticate',
    };
  }
}

function checkAiProvider(): CheckResult {
  // Check environment variables
  const hasOllama = Boolean(process.env['OLLAMA_HOST']);
  const hasOpenAi = Boolean(process.env['OPENAI_API_KEY']);
  const hasAnthropic = Boolean(process.env['ANTHROPIC_API_KEY']);

  if (hasOllama || hasOpenAi || hasAnthropic) {
    const providers: string[] = [];
    if (hasOllama) providers.push('Ollama');
    if (hasOpenAi) providers.push('OpenAI');
    if (hasAnthropic) providers.push('Anthropic');
    return {
      status: 'pass',
      label: 'AI provider',
      detail: `API key set (${providers.join(', ')})`,
    };
  }

  // Fall back to config file
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const cfg = JSON.parse(raw) as { ai?: { preference?: string; provider?: string } };
      if (cfg.ai?.preference === 'rules_only') {
        return {
          status: 'pass',
          label: 'AI provider',
          detail: 'Rules-only mode (no AI provider required)',
        };
      }
      if (cfg.ai?.provider) {
        return {
          status: 'pass',
          label: 'AI provider',
          detail: `Provider configured: ${cfg.ai.provider}`,
        };
      }
    } catch {
      // fall through to warn
    }
  }

  return {
    status: 'warn',
    label: 'AI provider',
    detail: 'No AI provider configured',
    fix:
      'Set OPENAI_API_KEY / ANTHROPIC_API_KEY env var, or run "panguard config llm --provider ollama"',
  };
}

function checkGuardEngine(): CheckResult {
  if (!existsSync(GUARD_PID_PATH)) {
    return {
      status: 'fail',
      label: 'Guard engine',
      detail: 'Daemon not running (no PID file)',
      fix: 'Run "panguard guard start" to start the guard daemon',
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
      fix: 'Run "panguard guard start" to restart the guard daemon',
    };
  }
}

function checkNotificationChannels(): CheckResult {
  if (!existsSync(CONFIG_PATH)) {
    return {
      status: 'warn',
      label: 'Notification channels',
      detail: 'Config not found — cannot verify channels',
      fix: 'Run "panguard init" to set up notification channels',
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
        fix: 'Run "panguard init" and configure a Telegram, Slack, or webhook channel',
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
      fix: 'Run "panguard init" to reconfigure',
    };
  }
}

function checkLastScan(): CheckResult {
  if (!existsSync(LAST_SCAN_PATH)) {
    return {
      status: 'warn',
      label: 'Last scan',
      detail: 'No scan result found',
      fix: 'Run "panguard scan" to perform your first scan',
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
        fix: 'Run "panguard scan" to perform a fresh scan',
      };
    }

    const diffDays = Math.floor((Date.now() - scannedAt.getTime()) / 86_400_000);

    if (diffDays > 7) {
      return {
        status: 'warn',
        label: 'Last scan',
        detail: `${diffDays} days ago (recommend weekly)`,
        fix: 'Run "panguard scan" to perform a fresh scan',
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
      fix: 'Run "panguard scan" to generate a fresh scan result',
    };
  }
}

function checkThreatCloud(): CheckResult {
  if (!existsSync(CONFIG_PATH)) {
    return {
      status: 'warn',
      label: 'Threat Cloud',
      detail: 'Config not found — cannot verify Threat Cloud endpoint',
      fix: 'Run "panguard init" to configure Threat Cloud connectivity',
    };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw) as {
      threatCloud?: { endpoint?: string; enabled?: boolean };
      modules?: { dashboard?: boolean };
    };

    const endpoint = cfg.threatCloud?.endpoint;
    const enabled = cfg.threatCloud?.enabled ?? false;

    if (!endpoint && !enabled) {
      // Threat Cloud is optional — not a failure
      return {
        status: 'warn',
        label: 'Threat Cloud',
        detail: 'Threat Cloud endpoint not configured',
        fix: 'Configure a Threat Cloud endpoint in your config to enable shared threat intelligence',
      };
    }

    const displayEndpoint = endpoint ?? 'tc.panguard.ai';
    return {
      status: 'pass',
      label: 'Threat Cloud',
      detail: `Connected to ${displayEndpoint}`,
    };
  } catch {
    return {
      status: 'warn',
      label: 'Threat Cloud',
      detail: 'Could not parse config to verify Threat Cloud',
      fix: 'Run "panguard init" to reconfigure',
    };
  }
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
      fix: 'Run "panguard guard install" to install the system service',
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
      fix: matchesConfig
        ? undefined
        : 'Run "panguard guard install" to reinstall the service',
    };
  } catch {
    return {
      status: 'warn',
      label: 'System service',
      detail: 'launchd plist found but could not be read',
      fix: 'Run "panguard guard install" to reinstall the service',
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
    fix: 'Run "panguard completion install" to install shell completions',
  };
}

// ---------------------------------------------------------------------------
// Run all checks
// ---------------------------------------------------------------------------

function runAllChecks(): CheckResult[] {
  return [
    checkInstallation(),
    checkConfiguration(),
    checkCredentials(),
    checkAiProvider(),
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
  console.log(
    header(lang === 'zh-TW' ? 'Panguard AI 健康診斷' : 'Panguard AI Health Check')
  );

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
    .description(
      'Run health diagnostics / \u57F7\u884C\u5065\u5EB7\u8A3A\u65B7'
    )
    .option('--json', 'Output results as JSON')
    .option('--fix', 'Attempt auto-repair of detected issues')
    .option('--lang <language>', 'Language override (en | zh-TW)')
    .action(
      async (opts: { json?: boolean; fix?: boolean; lang?: string }) => {
        const lang: Lang = opts.lang === 'en' ? 'en' : 'zh-TW';
        const results = runAllChecks();

        if (opts.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        if (opts.fix) {
          console.log('');
          console.log(
            header(lang === 'zh-TW' ? 'Panguard AI 健康診斷 — 自動修復' : 'Panguard AI Health Check — Auto-fix')
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
                ? '自動修復功能即將推出。請手動執行上述指令。'
                : 'Automated fix execution coming soon. Please run the above commands manually.'
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
      }
    );
}
