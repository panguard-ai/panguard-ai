/**
 * GuardConfig loader and defaults
 * GuardConfig 載入器與預設值
 * @module @panguard-ai/panguard-guard/config
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';
import { createLogger } from '@panguard-ai/core';
import type { GuardConfig } from './types.js';
import { DEFAULT_ACTION_POLICY } from './types.js';
import {
  sealConfigManifest,
  readSelfStateRefs,
  collectSelfState,
  mergeSelfState,
  checkSelfState,
} from './integrity.js';

const logger = createLogger('panguard-guard:config');

/**
 * Zod schema for validating loaded config files.
 * All fields are optional since they merge with defaults.
 */
const GuardConfigFileSchema = z
  .object({
    lang: z.enum(['en', 'zh-TW', 'ja']).optional(),
    // 'report-only' is the recommended default for new deployments: detection
    // runs and verdicts are logged, but no OS-level action executes. Operators
    // verify detection quality on real traffic before granting OS authority
    // to a model. See agent/respond/safety-rules.ts:DEFAULT_ENFORCEMENT_POLICY.
    mode: z.enum(['learning', 'report-only', 'protection']).optional(),
    learningDays: z.number().int().min(1).max(365).optional(),
    // Per-action enforcement policy. Required only when mode === 'protection'.
    // If absent, falls back to the conservative DEFAULT_ENFORCEMENT_POLICY
    // (all OS actions OFF). Misconfigured policies fail validation here
    // rather than producing undefined behaviour at the OS-action layer.
    enforcementPolicy: z
      .object({
        blockIPs: z.object({ enabled: z.boolean() }),
        killProcesses: z.object({
          enabled: z.boolean(),
          // Glob patterns; empty array = no processes allowed even when enabled.
          allowedProcessNames: z.array(z.string()),
        }),
        isolateFiles: z.object({
          enabled: z.boolean(),
          // Explicit subdirectories; `$HOME`-wide isolation is rejected.
          // Use absolute paths or `~/...` form.
          allowedPaths: z.array(z.string()),
        }),
        disableAccounts: z.object({ enabled: z.boolean() }),
      })
      .optional(),
    actionPolicy: z
      .object({
        autoRespond: z.number().min(0).max(100),
        notifyAndWait: z.number().min(0).max(100),
        logOnly: z.number().min(0).max(100),
      })
      .optional(),
    dashboardPort: z.number().int().min(1).max(65535).optional(),
    dashboardEnabled: z.boolean().optional(),
    verbose: z.boolean().optional(),
    dataDir: z.string().min(1).optional(),
    monitors: z
      .object({
        logMonitor: z.boolean().optional(),
        networkMonitor: z.boolean().optional(),
        processMonitor: z.boolean().optional(),
        fileMonitor: z.boolean().optional(),
        networkPollInterval: z.number().int().min(1000).optional(),
        processPollInterval: z.number().int().min(1000).optional(),
        logCollector: z
          .object({
            enabled: z.boolean(),
            filePaths: z.array(z.string()).optional(),
            syslogPort: z.number().int().min(1).max(65535).optional(),
          })
          .optional(),
      })
      .optional(),
    watchdogEnabled: z.boolean().optional(),
    watchdogInterval: z.number().int().min(5000).optional(),
    ai: z
      .object({
        provider: z.enum([
          'ollama',
          'claude',
          'openai',
          'gemini',
          'groq',
          'mistral',
          'deepseek',
          'lmstudio',
        ]),
        model: z.string().min(1),
        endpoint: z.string().optional(),
        apiKey: z.string().optional(),
        byokApiKey: z.string().optional(),
      })
      .optional(),
    threatCloudEndpoint: z.string().url().optional(),
    threatCloudApiKey: z.string().optional(),
    threatCloudUploadEnabled: z.boolean().optional(),
    // Receive new ATR detection rules from Threat Cloud. OPT-IN, OFF by default:
    // detection rules are executable trust and are loaded only from the signed
    // package unless the user explicitly enables this AND signed-rule
    // infrastructure is available. Leaving it off keeps detection pinned to the
    // bundled rules without disabling IP/domain blocklist feeds.
    threatCloudRuleSyncEnabled: z.boolean().optional(),
    // Gap A: auto-pull the latest agent-threat-rules bundle from npm (integrity-
    // verified) and hot-reload it, so detection stays fresh with no user action.
    // Opt-in. Auto-pulled rules DETECT (advise) only — they never gain BLOCK
    // power until the user trusts an update (see docs/design/gap-a-auto-rule-update.md).
    autoUpdateRules: z.boolean().optional(),
    // Gap A slice 2: the auto-pulled bundle version the user has TRUSTED to
    // enforce. Auto-pulled rules from a version <= this may hard-deny; newer
    // ones only advise until `pga guard trust-updates` bumps this. Absent =>
    // no auto-pulled rule can block (safest default).
    autoUpdateTrustedVersion: z.string().optional(),
    telemetryEnabled: z.boolean().optional(),
    trustedSkills: z.array(z.string()).optional(),
  })
  .passthrough();

/** Default data directory / 預設資料目錄 */
export const DEFAULT_DATA_DIR = join(homedir(), '.panguard-guard');

/** Default configuration / 預設配置 */
export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  lang: 'en',
  mode: 'protection',
  learningDays: 7,
  actionPolicy: DEFAULT_ACTION_POLICY,
  notifications: {},
  dataDir: DEFAULT_DATA_DIR,
  dashboardPort: 3100,
  dashboardEnabled: true,
  verbose: false,
  monitors: {
    logMonitor: true,
    networkMonitor: true,
    processMonitor: true,
    fileMonitor: true,
    networkPollInterval: 30000,
    processPollInterval: 15000,
  },
  watchdogEnabled: true,
  watchdogInterval: 60000,
  threatCloudEndpoint: 'https://tc.panguard.ai',
  // OPT-IN, OFF by default. Made explicit so config dumps show the real default.
  threatCloudRuleSyncEnabled: false,
};

/** Master config path written by `panguard init` / `panguard init` 寫入的主配置路徑 */
const MASTER_CONFIG_DIR = join(homedir(), '.panguard');
const MASTER_CONFIG_PATH = join(MASTER_CONFIG_DIR, 'config.json');

/**
 * Load configuration from JSON file / 從 JSON 檔案載入配置
 *
 * Resolution order:
 * 1. Explicit configPath (if provided)
 * 2. ~/.panguard-guard/config.json (guard-specific config)
 * 3. ~/.panguard/config.json (master config from `panguard init`, auto-converted)
 * 4. Built-in defaults
 */
export function loadConfig(configPath?: string): GuardConfig {
  const guardPath = configPath ?? join(DEFAULT_DATA_DIR, 'config.json');

  // Try guard-specific config first
  if (existsSync(guardPath)) {
    return loadGuardConfigFile(guardPath);
  }

  // Fall back to master config from `panguard init`
  if (existsSync(MASTER_CONFIG_PATH)) {
    logger.debug(`No guard config at ${guardPath}, loading from master config`);
    return loadFromMasterConfig(MASTER_CONFIG_PATH);
  }

  logger.debug(`No config file found, using defaults`);
  return { ...DEFAULT_GUARD_CONFIG };
}

/**
 * Load and merge a guard-specific config file.
 */
function loadGuardConfigFile(path: string): GuardConfig {
  try {
    const raw = readFileSync(path, 'utf-8');
    const jsonData = JSON.parse(raw) as Record<string, unknown>;

    // Validate against schema before merging
    const validation = GuardConfigFileSchema.safeParse(jsonData);
    if (!validation.success) {
      const issues = validation.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      logger.warn(`Config validation warnings: ${issues}`);
      // Continue with raw data — schema is advisory, not blocking
    }

    const parsed = jsonData as Partial<GuardConfig> & {
      actionThresholds?: Partial<GuardConfig['actionPolicy']>;
    };
    // Support legacy `actionThresholds` key from older deploy writes
    const policySource = parsed.actionPolicy ?? parsed.actionThresholds ?? {};
    const merged: GuardConfig = {
      ...DEFAULT_GUARD_CONFIG,
      ...parsed,
      actionPolicy: { ...DEFAULT_ACTION_POLICY, ...policySource },
      notifications: { ...DEFAULT_GUARD_CONFIG.notifications, ...(parsed.notifications ?? {}) },
      monitors: { ...DEFAULT_GUARD_CONFIG.monitors, ...(parsed.monitors ?? {}) },
    };
    logger.debug(`Loaded config from ${path}`);
    return merged;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to load config: ${msg}`);
    // A parse failure means the user's settings — INCLUDING any telemetry /
    // upload opt-out — could not be read. Silently inheriting
    // DEFAULT_GUARD_CONFIG (mode: protection) would (a) hide the failure and
    // (b) grant OS-action authority the operator may never have enabled, while
    // discarding a privacy opt-out they did set. So: warn loudly on stderr
    // regardless of log level, and fail safe to the most conservative posture
    // (report-only, no telemetry, no upload). The corrupt file is left in place
    // at `path` for the operator to inspect and repair.
    process.stderr.write(
      `\nCONFIG INVALID (${msg}) — running with built-in defaults; ` +
        `your settings (including any telemetry opt-out) are NOT applied. ` +
        `Fail-safe posture: report-only, telemetry off, uploads off. ` +
        `Corrupt file kept at ${path}.\n\n`
    );
    return {
      ...DEFAULT_GUARD_CONFIG,
      mode: 'report-only',
      telemetryEnabled: false,
      threatCloudUploadEnabled: false,
    };
  }
}

/**
 * Convert master PanguardConfig (from `panguard init`) to GuardConfig.
 * 將 `panguard init` 的主配置轉換為 GuardConfig。
 */
function loadFromMasterConfig(masterPath: string): GuardConfig {
  try {
    const raw = readFileSync(masterPath, 'utf-8');
    const master = JSON.parse(raw) as Record<string, unknown>;

    const guard = (master['guard'] ?? {}) as Record<string, unknown>;
    const ai = (master['ai'] ?? {}) as Record<string, unknown>;
    const notifications = (master['notifications'] ?? {}) as Record<string, unknown>;
    const meta = (master['meta'] ?? {}) as Record<string, unknown>;
    const monitors = (guard['monitors'] ?? {}) as Record<string, boolean>;
    const policy = (guard['actionPolicy'] ?? {}) as Record<string, number>;

    // Map notification channel config from master format to guard format
    const notifConfig = buildNotificationConfig(
      notifications['channel'] as string | undefined,
      (notifications['config'] ?? {}) as Record<string, string>
    );

    const config: GuardConfig = {
      ...DEFAULT_GUARD_CONFIG,
      lang: (meta['language'] as GuardConfig['lang']) ?? DEFAULT_GUARD_CONFIG.lang,
      mode: (guard['mode'] as GuardConfig['mode']) ?? DEFAULT_GUARD_CONFIG.mode,
      learningDays: (guard['learningDays'] as number) ?? DEFAULT_GUARD_CONFIG.learningDays,
      actionPolicy: {
        ...DEFAULT_ACTION_POLICY,
        ...policy,
      },
      notifications: notifConfig,
      monitors: {
        ...DEFAULT_GUARD_CONFIG.monitors,
        ...monitors,
      },
    };

    // Map threat cloud API key from master config or env
    const tcKey = (master['threatCloudApiKey'] as string | undefined) ?? process.env['TC_API_KEY'];
    if (tcKey) {
      config.threatCloudApiKey = tcKey;
    }

    // Map AI settings
    if (ai['provider']) {
      config.ai = {
        provider: ai['provider'] as 'ollama' | 'claude' | 'openai',
        model: (ai['model'] as string) ?? 'default',
        endpoint: ai['endpoint'] as string | undefined,
        apiKey: ai['apiKey'] as string | undefined,
      };
    }

    logger.debug(`Loaded and converted master config from ${masterPath}`);
    return config;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to load master config: ${msg}`);
    // Same fail-safe rationale as loadGuardConfigFile: a parse failure here also
    // discards the operator's settings, so warn loudly and drop to the most
    // conservative posture rather than inheriting protection mode silently.
    process.stderr.write(
      `\nCONFIG INVALID (${msg}) — running with built-in defaults; ` +
        `your settings (including any telemetry opt-out) are NOT applied. ` +
        `Fail-safe posture: report-only, telemetry off, uploads off. ` +
        `Corrupt file kept at ${masterPath}.\n\n`
    );
    return {
      ...DEFAULT_GUARD_CONFIG,
      mode: 'report-only',
      telemetryEnabled: false,
      threatCloudUploadEnabled: false,
    };
  }
}

/**
 * Build NotificationConfig from master config channel/config pair.
 */
function buildNotificationConfig(
  channel: string | undefined,
  cfg: Record<string, string>
): GuardConfig['notifications'] {
  if (!channel || channel === 'none') return {};

  switch (channel) {
    case 'telegram':
      return cfg['botToken'] && cfg['chatId']
        ? { telegram: { botToken: cfg['botToken'], chatId: cfg['chatId'] } }
        : {};
    case 'slack':
      return cfg['webhookUrl'] ? { slack: { webhookUrl: cfg['webhookUrl'] } } : {};
    case 'email':
      return cfg['host']
        ? {
            email: {
              host: cfg['host'],
              port: Number(cfg['port'] ?? 587),
              secure: cfg['secure'] === 'true',
              auth: { user: cfg['user'] ?? '', pass: cfg['pass'] ?? '' },
              from: cfg['from'] ?? '',
              to: (cfg['to'] ?? '').split(',').filter(Boolean),
            },
          }
        : {};
    case 'webhook':
      return cfg['url'] ? { webhook: { url: cfg['url'], secret: cfg['secret'] } } : {};
    case 'line':
      return cfg['accessToken'] ? { line: { accessToken: cfg['accessToken'] } } : {};
    default:
      return {};
  }
}

/**
 * Save configuration to JSON file / 儲存配置到 JSON 檔案
 */
export function saveConfig(config: GuardConfig, configPath?: string): void {
  const path = configPath ?? join(config.dataDir, 'config.json');
  const dir = join(path, '..');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  // 0o600: the config can hold ai.apiKey, threatCloudApiKey, and webhook
  // secrets — never world/group-readable on shared machines. chmod also
  // tightens a pre-existing file created under a looser umask.
  writeFileSync(path, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    /* best effort — platforms without POSIX permissions */
  }
  logger.info(`Saved config to ${path}`);
  resealConfigManifest(config as unknown as Record<string, unknown>, dir);
}

/**
 * Re-seal the integrity manifest so a LEGITIMATE config write re-establishes trust,
 * rather than later reading as tampering on the next start. Merge the recorded
 * self-state refs with the guard's currently-present artifacts: this preserves a
 * recorded-but-now-missing artifact (so its removal is still flagged) while folding
 * in any newly-installed one. Best-effort: a seal failure must never fail the caller.
 *
 * Exported so CLI-side config writers that do their own file write (e.g. the
 * `panguard` wrapper's updateGuardConfig / telemetry-consent path) can re-seal
 * WITHOUT re-writing config.json — a plain write left the manifest stale and made
 * the next `pga doctor` falsely report "config tampered".
 */
export function resealConfigManifest(config: Record<string, unknown>, dir: string): void {
  try {
    // Re-baselining self-state from the CURRENT artifacts is only safe when they
    // are untampered. If checkSelfState reports an active tamper (e.g. a hijacked
    // LaunchAgent ProgramArguments), folding the current contentHash in would
    // silently launder the attacker's change as legitimate. In that case keep the
    // sealed baseline so the tamper stays detectable on the next start — a config
    // write must never re-bless a live self-state tamper.
    const selfVerdict = checkSelfState(dir);
    const tampered = !selfVerdict.ok && selfVerdict.findings.some((f) => f.reason === 'tampered');
    const selfState = tampered
      ? readSelfStateRefs(dir)
      : mergeSelfState(readSelfStateRefs(dir), collectSelfState());
    sealConfigManifest(config, selfState, dir);
  } catch {
    /* best-effort — integrity sealing must not block a config save */
  }
}

/**
 * Ensure data directory exists / 確保資料目錄存在
 */
export function ensureDataDir(dataDir: string): void {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    logger.info(`Created data directory: ${dataDir}`);
  }
}
