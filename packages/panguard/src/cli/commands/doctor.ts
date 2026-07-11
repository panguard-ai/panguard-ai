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
import { readHookProtectionStatus } from './hook.js';
import { lastScanAt, readFlaggedSkills } from '../flagged-skills.js';
import { SERVICE_PLIST_BASENAME } from './persist.js';
import { fetchDaemonStatus } from '../daemon-status.js';
import { verifyConfigIntegrity, checkSelfState } from '@panguard-ai/panguard-guard';

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
// `pga setup` writes the canonical config to ~/.panguard-guard/config.json, not
// ~/.panguard/config.json. Doctor must check the guard config path so a freshly
// configured install is not reported as broken.
const GUARD_DIR = join(HOME, '.panguard-guard');
const GUARD_CONFIG_PATH = join(GUARD_DIR, 'config.json');
const LAST_SCAN_PATH = join(PANGUARD_DIR, 'last-scan.json');
const GUARD_PID_PATH = join(GUARD_DIR, 'panguard-guard.pid');
// Derive from persist.ts's single source of truth — a hard-coded name here drifts
// from what `pga up` actually installs and makes the service check always fail.
const LAUNCHD_PLIST_PATH = join(HOME, 'Library', 'LaunchAgents', SERVICE_PLIST_BASENAME);
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
  // The canonical config `pga setup` writes is ~/.panguard-guard/config.json.
  // Prefer it; fall back to the legacy ~/.panguard/config.json so installs that
  // only have the master config still pass. A configured install must never be
  // reported as broken just because the legacy path is absent.
  const candidate = existsSync(GUARD_CONFIG_PATH)
    ? GUARD_CONFIG_PATH
    : existsSync(CONFIG_PATH)
      ? CONFIG_PATH
      : null;

  if (!candidate) {
    return {
      status: 'fail',
      label: 'Configuration valid',
      detail: '~/.panguard-guard/config.json not found',
      fix: 'Run "pga setup" to create your configuration',
    };
  }

  const display =
    candidate === GUARD_CONFIG_PATH ? '~/.panguard-guard/config.json' : '~/.panguard/config.json';

  try {
    const raw = readFileSync(candidate, 'utf-8');
    JSON.parse(raw);
    return {
      status: 'pass',
      label: 'Configuration valid',
      detail: display,
    };
  } catch {
    return {
      status: 'fail',
      label: 'Configuration valid',
      detail: `${display} is not valid JSON`,
      fix: 'Run "pga setup" to regenerate the configuration file',
    };
  }
}

function checkConfigIntegrity(): CheckResult {
  // S5: detect tampering of the guard config + silent removal of its hooks / service.
  // Tamper-EVIDENCE only (a same-user attacker can re-seal) — surfaces unauthorized
  // changes the guard did not make, so this never reads as a false "all clear".
  if (!existsSync(GUARD_CONFIG_PATH)) {
    return {
      status: 'pass',
      label: 'Config integrity',
      detail: 'no guard config yet (run "pga up")',
    };
  }
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(readFileSync(GUARD_CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {
      status: 'fail',
      label: 'Config integrity',
      detail: 'guard config is not valid JSON',
      fix: 'Run "pga setup" to regenerate the configuration',
    };
  }
  try {
    const verdict = verifyConfigIntegrity(config, GUARD_DIR);
    const self = checkSelfState(GUARD_DIR);
    if (verdict.status === 'unsealed') {
      return {
        status: 'warn',
        label: 'Config integrity',
        detail: 'integrity baseline not established',
        fix: 'Run "pga up" to seal the current configuration',
      };
    }
    if (verdict.status === 'sealed' && self.ok) {
      return {
        status: 'pass',
        label: 'Config integrity',
        detail: 'config sealed; hooks + service intact',
      };
    }
    const parts: string[] = [];
    if (verdict.status !== 'sealed') {
      // Field NAMES only — never the values (config can hold secrets).
      const fields = verdict.findings.map((f) => f.field).join(', ');
      parts.push(`config ${verdict.status}${fields ? ` (${fields})` : ''}`);
    }
    if (!self.ok) {
      parts.push(`removed: ${self.findings.map((f) => `${f.kind} ${f.reason}`).join(', ')}`);
    }
    return {
      status: 'fail',
      label: 'Config integrity',
      detail: parts.join('; '),
      fix: 'If this change was yours, run "pga up" to re-seal. Otherwise protection may have been weakened — review the config and reinstall.',
    };
  } catch {
    return { status: 'warn', label: 'Config integrity', detail: 'integrity check unavailable' };
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

/**
 * Ask the live daemon for its actual loaded rule count via its own
 * `/api/status` (the same source the dashboard's Layer A health uses) rather
 * than inferring health from process liveness alone. Resolves to `null` on
 * ANY failure — token missing, dashboard disabled, timeout, unreachable —
 * so a host with the dashboard turned off (an unrelated feature) is never
 * penalized for a signal it never opted into.
 */
async function fetchDaemonAtrRuleCount(): Promise<number | null> {
  const status = await fetchDaemonStatus();
  return typeof status?.atrRuleCount === 'number' ? status.atrRuleCount : null;
}

async function checkGuardEngine(): Promise<CheckResult> {
  if (!existsSync(GUARD_PID_PATH)) {
    return {
      status: 'fail',
      label: 'Guard engine',
      detail: 'Daemon not running (no PID file)',
      fix: 'Run "pga guard start" to start the guard daemon',
    };
  }

  let pid: number;
  try {
    const pidStr = readFileSync(GUARD_PID_PATH, 'utf-8').trim();
    pid = parseInt(pidStr, 10);
    if (isNaN(pid)) throw new Error('Invalid PID');
    process.kill(pid, 0); // signal 0 checks existence without killing
  } catch {
    return {
      status: 'fail',
      label: 'Guard engine',
      detail: 'PID file exists but daemon is not running',
      fix: 'Run "pga guard start" to restart the guard daemon',
    };
  }

  // A live PID alone does not prove detection is active — a daemon can be up
  // with 0 loaded rules (checkHookProtection already treats that as degraded
  // for the built-in-tool hook; this check previously had no equivalent for
  // the daemon itself, so it always read PASS regardless of rule count).
  const ruleCount = await fetchDaemonAtrRuleCount();
  if (ruleCount !== null && ruleCount <= 0) {
    return {
      status: 'fail',
      label: 'Guard engine',
      detail: `Daemon running (PID ${pid}) but 0 detection rules loaded — protection is NOT active`,
      fix: 'Reinstall @panguard-ai/atr or run "pga upgrade"',
    };
  }

  return {
    status: 'pass',
    label: 'Guard engine',
    detail:
      ruleCount !== null
        ? `Daemon running (PID ${pid}), ${ruleCount} rules loaded`
        : `Daemon running (PID ${pid})`,
  };
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
  // Authoritative source: the flagged-skills store, which `pga up` / `pga scan`
  // write on every scan (the legacy LAST_SCAN_PATH was never populated, so this
  // check always said "No scan result found" — even right after a scan flagged a
  // CRITICAL skill). Fall back to LAST_SCAN_PATH only for older installs.
  let scannedAtIso = lastScanAt();
  if (!scannedAtIso && existsSync(LAST_SCAN_PATH)) {
    try {
      scannedAtIso =
        (JSON.parse(readFileSync(LAST_SCAN_PATH, 'utf-8')) as { scannedAt?: string }).scannedAt ??
        null;
    } catch {
      /* fall through to the no-scan branch */
    }
  }

  if (!scannedAtIso) {
    return {
      status: 'warn',
      label: 'Last scan',
      detail: 'No scan result found',
      fix: 'Run "pga scan" to perform your first scan',
    };
  }

  const scannedAt = new Date(scannedAtIso);
  if (isNaN(scannedAt.getTime())) {
    return {
      status: 'warn',
      label: 'Last scan',
      detail: 'Scan record found but timestamp is invalid',
      fix: 'Run "pga scan" to perform a fresh scan',
    };
  }

  const flaggedCount = readFlaggedSkills().length;
  const threatNote =
    flaggedCount > 0
      ? ` — ${flaggedCount} skill(s) flagged: run "pga status" or "pga scan"`
      : ' — all scanned skills clean';
  const diffDays = Math.floor((Date.now() - scannedAt.getTime()) / 86_400_000);

  if (diffDays > 7) {
    return {
      status: 'warn',
      label: 'Last scan',
      detail: `${diffDays} days ago (recommend weekly)${threatNote}`,
      fix: 'Run "pga scan" to perform a fresh scan',
    };
  }

  const when = diffDays === 0 ? 'Today' : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  // A fresh scan that FOUND threats is not a clean bill of health — warn so the
  // flagged skills are not lost in a sea of green checks.
  return {
    status: flaggedCount > 0 ? 'warn' : 'pass',
    label: 'Last scan',
    detail: `${when}${threatNote}`,
    ...(flaggedCount > 0 ? { fix: 'Review flagged skills: "pga status" (or remove them)' } : {}),
  };
}

const DEFAULT_TC_ENDPOINT = 'https://tc.panguard.ai';

function checkThreatCloud(): CheckResult {
  // Threat Cloud is OPT-IN and defaults to OFF. The single source of truth is the
  // guard config's threatCloudUploadEnabled flag (the same gate the upload path
  // checks with `=== true`). Nothing is shared unless the user explicitly opts in,
  // so doctor must not imply sharing happens "by default".
  let endpoint = DEFAULT_TC_ENDPOINT;
  let uploadEnabled = false;
  if (existsSync(GUARD_CONFIG_PATH)) {
    try {
      const raw = readFileSync(GUARD_CONFIG_PATH, 'utf-8');
      const cfg = JSON.parse(raw) as {
        threatCloudUploadEnabled?: boolean;
        threatCloudEndpoint?: string;
      };
      uploadEnabled = cfg.threatCloudUploadEnabled === true;
      if (cfg.threatCloudEndpoint) endpoint = cfg.threatCloudEndpoint;
    } catch {
      // Config parse error → treat as not enabled (privacy-safe default)
    }
  }

  if (uploadEnabled) {
    return {
      status: 'pass',
      label: 'Threat Cloud',
      detail: `Enabled (opted in) — sharing anonymized findings with ${endpoint.replace(/^https?:\/\//, '')}`,
    };
  }

  return {
    status: 'pass',
    label: 'Threat Cloud',
    detail: 'opt-in, currently OFF (enable: pga config set threat-cloud true)',
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

function checkHookProtection(): CheckResult {
  // The built-in-tool PreToolUse hook fails OPEN when it loads 0 rules (correct:
  // it must never brick the agent). But silent permanent no-protection is not
  // acceptable — the hook records a degraded marker we surface here. A recorded
  // `reason` means the OPPOSITE failure mode: a contract/protocol failure where
  // the hook failed CLOSED (blocked the tool call) — report that accurately
  // instead of claiming tool calls were allowed.
  const status = readHookProtectionStatus();
  if (!status) {
    return {
      status: 'pass',
      label: 'Built-in-tool hook',
      detail: 'No degraded protection recorded',
    };
  }
  if (status.degraded && status.reason) {
    // A contract/protocol failure. Word from the ACTUAL disposition: a
    // fail-closed marker blocked the call; under advisory posture the same
    // unrecognized outcome is ALLOWED (advisory blocks nothing) — reporting
    // "blocked" there would be a false claim in the opposite direction.
    const allowed = status.disposition === 'allowed';
    return {
      status: 'fail',
      label: 'Built-in-tool hook',
      detail: allowed
        ? `Hook could not trust its verdict and ALLOWED a tool call (advisory posture) — ${
            status.reason
          } on host protocol "${status.platform || 'unknown'}"${
            status.at ? ` at ${status.at}` : ''
          }`
        : `Hook failed CLOSED (blocked a tool call) — ${status.reason} on host protocol "${
            status.platform || 'unknown'
          }"${status.at ? ` at ${status.at}` : ''}`,
      fix: 'If PanGuard or the host agent was updated, re-register the hook with "pga hook install". A manual or test invocation also records this; the marker clears on the next healthy run',
    };
  }
  if (status.degraded) {
    return {
      status: 'fail',
      label: 'Built-in-tool hook',
      detail: `Hook loaded 0 rules — protection DEGRADED (allowing all tool calls)${
        status.at ? ` since ${status.at}` : ''
      }`,
      fix: 'Run "pga upgrade" (or reinstall) to restore detection rules, then restart the host agent',
    };
  }
  return {
    status: 'pass',
    label: 'Built-in-tool hook',
    detail: `Active (${status.ruleCount} rules at last run)`,
  };
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
    fix: 'Shell tab-completion is not bundled yet (cosmetic; safe to ignore)',
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

async function runAllChecks(): Promise<CheckResult[]> {
  return [
    checkInstallation(),
    checkConfiguration(),
    checkConfigIntegrity(),
    checkCredentials(),
    checkAiProvider(),
    checkAiLayerLocal(),
    checkAiLayerCloud(),
    await checkGuardEngine(),
    checkHookProtection(),
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
  const results = await runAllChecks();

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
      const results = await runAllChecks();

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
