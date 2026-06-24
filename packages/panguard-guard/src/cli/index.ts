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
} from '@panguard-ai/core';
import type { StatusItem } from '@panguard-ai/core';
import { GuardEngine } from '../guard-engine.js';
import { loadConfig, saveConfig, DEFAULT_DATA_DIR } from '../config.js';
import { redactSecrets } from '../redact.js';
import { PidFile } from '../daemon/index.js';
import { installService, uninstallService } from '../daemon/index.js';
import { generateTestLicenseKey } from '../license/index.js';
import { generateInstallScript } from '../install/index.js';
import { DashboardRenderer } from './dashboard-renderer.js';
import type { DashboardState } from './dashboard-renderer.js';
import { removeDashboardToken } from '../dashboard/index.js';
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
import { isSafeOutboundUrl } from '../net/validate-outbound-url.js';

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../../package.json') as { version: string };
/** CLI version / CLI 版本 */
export const CLI_VERSION: string = _pkg.version;

/**
 * Compute the honest startup status from the actual mode AND loaded rule count.
 * A user in report-only mode, or in protection mode with zero loaded rules,
 * must NEVER see "PROTECTED" — that would misrepresent the security posture.
 */
export function computeStartupStatus(
  mode: string,
  ruleCount: number
): { label: string; status: 'safe' | 'caution' | 'critical' } {
  if (mode === 'learning') return { label: 'LEARNING', status: 'caution' };
  if (mode === 'report-only') return { label: 'REPORT-ONLY', status: 'caution' };
  // protection mode
  if (ruleCount <= 0) return { label: 'DEGRADED', status: 'critical' };
  return { label: 'PROTECTED', status: 'safe' };
}

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
    case 'scan':
      await commandScan(args.slice(1));
      break;
    case 'validate':
      await commandValidate(args.slice(1));
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

/**
 * Dry-run validate a rules directory. Used by the
 * `pga migrate ... --deploy-to-guard` workflow to verify a candidate rules
 * dir before pushing it into a running Guard.
 *
 * Usage:
 *   panguard-guard validate <rules-dir>
 *   panguard-guard validate <rules-dir> --json     (machine-readable)
 *
 * Exit 0 = every rule passed. Exit 1 = any rule failed (or dir missing).
 */
async function commandValidate(args: string[]): Promise<void> {
  const positional = args.filter((a) => !a.startsWith('--'));
  const dir = positional[0];
  const jsonMode = args.includes('--json');

  if (!dir) {
    console.error(`  ${symbols.fail} usage: panguard-guard validate <rules-dir> [--json]`);
    process.exit(1);
    return;
  }

  const { validateRulesDir } = await import('./validate-rules.js');
  let report;
  try {
    report = validateRulesDir(dir);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ${symbols.fail} ${msg}`);
    process.exit(1);
    return;
  }

  if (jsonMode) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    process.exit(report.failed === 0 ? 0 : 1);
    return;
  }

  console.log(banner(CLI_VERSION));
  console.log(header('Validating ATR rules directory'));
  console.log(`  ${symbols.info} ${report.directory}`);
  console.log(divider());
  console.log(
    `  ${symbols.pass} passed: ${c.sage(String(report.passed))}` +
      `    ${symbols.fail} failed: ${report.failed > 0 ? c.alert(String(report.failed)) : '0'}` +
      `    total: ${report.totalRules}`
  );

  if (report.failed > 0) {
    console.log(divider());
    console.log(`  ${symbols.fail} ${c.bold('failures:')}`);
    for (const r of report.failures) {
      console.log(`\n  ${c.bold(r.ruleId ?? '<no id>')}  ${c.dim(r.file)}`);
      for (const reason of r.failures) {
        console.log(`    ${symbols.fail} ${reason}`);
      }
    }
  }

  process.exit(report.failed === 0 ? 0 : 1);
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

  // When called from pga up, suppress the banner (pga up has its own output)
  if (!process.env['PANGUARD_QUIET_GUARD']) {
    console.log(banner(CLI_VERSION));
  }

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
    config.threatCloudUploadEnabled = false;
    config.telemetryEnabled = false;
  }
  if (showUploadData) {
    config.showUploadData = true;
  }

  // Auto-provision a TC client key — ONLY when the user has opted into uploads,
  // and NEVER block daemon startup on it. threatCloudEndpoint defaults to
  // tc.panguard.ai, so without these guards a fresh daemon makes a blocking
  // network call to Threat Cloud before the dashboard binds — and a slow /
  // firewalled / unreachable (e.g. dead IPv6) route hangs it for ~75s (the
  // request's idle-timeout does not cover the TCP/TLS connect phase). Gate on
  // opt-in (default OFF = no call = instant start) and cap the wait so even an
  // opted-in user with a bad network still gets a working daemon + dashboard.
  if (
    !config.threatCloudApiKey &&
    config.threatCloudEndpoint &&
    config.threatCloudUploadEnabled === true
  ) {
    try {
      const { loadOrProvisionTCKey } = await import('../threat-cloud/tc-key-provisioner.js');
      const { getAnonymousClientId } = await import('../threat-cloud/client-id.js');
      const provisionedKey = await Promise.race([
        loadOrProvisionTCKey(config.threatCloudEndpoint, getAnonymousClientId()),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 4000)),
      ]);
      if (provisionedKey) {
        config.threatCloudApiKey = provisionedKey;
      }
    } catch {
      // Never let TC provisioning block or crash startup.
    }
  }

  // S5: verify config integrity + self-state before the engine starts. On a genuine
  // first run, establish the seal. On tamper / self-removal, start anyway but warn
  // LOUDLY — never silently honor a weakened config as if PROTECTED (the S2 invariant).
  try {
    const { verifyConfigIntegrity, checkSelfState, sealConfigManifest, wasInitialized } =
      await import('../integrity.js');
    const cfgRecord = config as unknown as Record<string, unknown>;
    let verdict = verifyConfigIntegrity(cfgRecord, dataDir);
    const selfState = checkSelfState(dataDir);
    if (verdict.status === 'unsealed' && !wasInitialized(dataDir)) {
      sealConfigManifest(cfgRecord, [], dataDir); // true first run — establish trust
      verdict = { status: 'sealed', findings: [], checkedAt: verdict.checkedAt };
    }
    if (verdict.status !== 'sealed' || !selfState.ok) {
      process.stderr.write(
        `\n[panguard-guard] INTEGRITY: ${verdict.status.toUpperCase()} — protection state may have been changed outside the guard.\n`
      );
      // Field NAME only, never the value — config can hold secrets.
      for (const f of verdict.findings) {
        process.stderr.write(`  - config.${f.field} changed (${f.severity})\n`);
      }
      for (const f of selfState.findings) {
        process.stderr.write(`  - ${f.kind} ${f.reason}${f.label ? ` (${f.label})` : ''}\n`);
      }
      process.stderr.write(
        '  Run "pga doctor" to review. If you made this change, re-run "pga up" to re-seal.\n\n'
      );
    }
  } catch {
    /* integrity is best-effort — never block daemon startup (consistent with TC provisioning) */
  }

  const engine = await GuardEngine.create(config);

  const shutdown = async () => {
    console.log(`\n  ${symbols.info} Shutting down PanguardGuard...`);
    await engine.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // SIGHUP triggers live rule reload without process restart. Lets
  // `pga migrate-pro --deploy-to-guard` deploy new rules with zero
  // detection downtime. Atomicity: see GuardATREngine.reloadRules() docs.
  process.on('SIGHUP', () => {
    void (async () => {
      try {
        const result = await engine.reloadRules();
        console.log(
          `  ${symbols.pass} Rules reloaded: ${result.total} (${result.bundled} bundled + ${result.custom} custom)`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ${symbols.fail} Reload failed: ${msg}`);
      }
    })();
  });

  // Optional fsnotify watcher on the ATR rules dir. Triggers reload on any
  // .yaml / .yml file change (debounced 500ms). Opt-in via env:
  //   PANGUARD_WATCH_RULES=1
  // Rules dir is derived from dataDir (consistent with rule-loader.ts).
  const watchRules = process.env['PANGUARD_WATCH_RULES'] === '1';
  if (watchRules) {
    try {
      const { watch } = await import('node:fs');
      const rulesDir = join(config.dataDir, 'atr-rules');
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const watcher = watch(
        rulesDir,
        { recursive: true },
        (eventType: string, filename: string | null) => {
          if (!filename) return;
          if (!filename.endsWith('.yaml') && !filename.endsWith('.yml')) return;
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            void engine
              .reloadRules()
              .then((result) => {
                console.log(
                  `  ${symbols.pass} Rules auto-reloaded (${eventType} ${filename}): ${result.total}`
                );
              })
              .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`  ${symbols.fail} Auto-reload failed: ${msg}`);
              });
          }, 500);
        }
      );
      process.once('SIGINT', () => watcher.close());
      process.once('SIGTERM', () => watcher.close());
      console.log(`  ${symbols.info} Watching ${rulesDir} for rule changes`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ${symbols.warn} fs.watch failed: ${msg} (live reload disabled)`);
    }
  }

  await engine.start();
  sp.succeed('PanguardGuard started');

  // Rule counts
  const rules = engine.getRuleCounts();
  const rulesSummary = `ATR: ${rules.atr}`;

  // Zero loaded rules = detection is silently off. The engine's no-rules
  // warning goes through the structured logger, which `commandStart` mutes to
  // 'silent' in non-verbose mode — so a degraded Guard would otherwise start up
  // looking healthy. Surface it loudly on stderr regardless of log level and in
  // both the quiet (pga up) and normal output paths.
  if (rules.atr <= 0) {
    console.error(
      `  ${c.critical(symbols.fail)} ${c.critical('DEGRADED')}: 0 ATR rules loaded — ` +
        `pattern detection is OFF. Reinstall the @panguard-ai/atr package to restore detection.`
    );
  }

  // Status box (suppressed when called from pga up which has its own summary)
  if (process.env['PANGUARD_QUIET_GUARD']) {
    // Minimal output for pga up integration
    console.log(`  ${c.safe(symbols.pass)} Guard started (PID ${process.pid})`);
  } else {
    const startupStatus = computeStartupStatus(config.mode, rules.atr);
    const statusColor =
      startupStatus.status === 'safe'
        ? c.safe
        : startupStatus.status === 'caution'
          ? c.caution
          : c.critical;
    console.log(
      statusPanel('PANGUARD AI Guard Active', [
        {
          label: 'Status',
          value: statusColor(startupStatus.label),
          status: startupStatus.status,
        },
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

    // Threat intelligence sharing transparency message — OPT-IN, default OFF.
    // Only "enabled" when the user explicitly turned it on (=== true).
    if (config.threatCloudUploadEnabled === true) {
      console.log(`  ${symbols.info} Threat intelligence sharing: ${c.safe('enabled')}`);
      console.log(
        `  ${c.dim('  Detected threats are anonymously uploaded to Panguard Threat Cloud')}`
      );
      console.log(`  ${c.dim('  Disable: panguard-guard start --no-telemetry')}`);
    } else {
      console.log(`  ${symbols.info} Threat intelligence sharing: ${c.dim('disabled')}`);
      console.log(`  ${c.dim('  No data will be uploaded to Panguard Threat Cloud')}`);
    }
    if (config.showUploadData) {
      console.log(`  ${symbols.info} Upload data preview: ${c.safe('enabled')}`);
    }
    console.log('');

    // Free tier: show what's enabled/disabled. With zero loaded ATR rules,
    // pattern matching cannot fire \u2014 never paint a green checkmark over a
    // non-functional detection layer. Show a red DEGRADED line instead so the
    // banner matches the DEGRADED Status above.
    if (rules.atr > 0) {
      console.log(
        `  ${c.safe('\u2713')} Pattern matching + heuristic correlation on every event (Layer A + B)`
      );
    } else {
      console.log(
        `  ${c.critical(symbols.fail)} ${c.critical('Layer A DEGRADED')}: 0 ATR rules loaded \u2014 pattern detection is OFF. ` +
          `Reinstall the @panguard-ai/atr package to restore detection.`
      );
    }

    console.log('');
    const semanticOn = Boolean(
      config.ai?.provider ||
      process.env['PANGUARD_AI_KEY'] ||
      process.env['ANTHROPIC_API_KEY'] ||
      process.env['OPENAI_API_KEY'] ||
      process.env['PANGUARD_LLM_ENDPOINT']
    );
    if (semanticOn) {
      const provider = config.ai?.provider ?? 'configured LLM';
      console.log(
        `  ${c.safe('\u2713')} Layer C Semantic (advisory): ${c.sage(provider)} \u2014 flags for review, never auto-blocks`
      );
    } else {
      console.log(
        `  ${symbols.info} Layer C Semantic is off. Optional: connect your own LLM (cloud API or local Ollama) for advisory analysis \u2014 it never auto-blocks.`
      );
    }
  } // end of PANGUARD_QUIET_GUARD else block

  // ── First-run welcome / 首次啟動歡迎 ──────────────────────────────
  if (!process.env['PANGUARD_QUIET_GUARD']) {
    await showFirstRunWelcome(config.dashboardPort);
    console.log(`  ${symbols.info} Monitoring...`);
  }
  console.log('');

  // ── TUI Dashboard mode ──────────────────────────────────────────────
  const dashboardRenderer = dashboardMode ? new DashboardRenderer(5000) : null;

  // ── Telemetry batch + notification debounce ────────────────────────
  const TC_ENDPOINT = config.threatCloudEndpoint ?? 'https://tc.panguard.ai';
  const telemetryBatch: Array<{
    event: string;
    platform: string;
    skillCount: number;
    findingCount: number;
    severity: string;
  }> = [];
  let telemetryFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let notificationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingNotifications: string[] = [];

  function flushTelemetryBatch(): void {
    if (telemetryBatch.length === 0) return;
    const batch = [...telemetryBatch];
    telemetryBatch.length = 0;
    const telemetryUrl = `${TC_ENDPOINT}/api/telemetry`;
    // SSRF guard: reject non-https / private / metadata endpoints, and refuse
    // to follow redirects (a redirect could point telemetry at an internal host).
    if (!isSafeOutboundUrl(telemetryUrl)) {
      return;
    }
    for (const evt of batch) {
      try {
        void fetch(telemetryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...evt, ts: new Date().toISOString() }),
          signal: AbortSignal.timeout(3000),
          redirect: 'error',
        }).catch(() => {
          /* best effort */
        });
      } catch {
        // Never block guard for telemetry
      }
    }
  }

  function scheduleTelemetryFlush(): void {
    if (telemetryFlushTimer) return;
    telemetryFlushTimer = setTimeout(() => {
      telemetryFlushTimer = null;
      flushTelemetryBatch();
    }, 30_000); // flush every 30s
  }

  function pushTelemetryEvent(event: string, findingCount: number, severity: string): void {
    // Opt-in, default OFF: only queue telemetry when explicitly enabled.
    if (config.threatCloudUploadEnabled !== true) return;
    telemetryBatch.push({
      event,
      platform: `${process.platform}-${process.arch}`,
      skillCount: 0, // will be populated async later if needed
      findingCount,
      severity,
    });
    scheduleTelemetryFlush();
  }

  function pushNotification(title: string, message: string): void {
    if (process.platform !== 'darwin') return;
    pendingNotifications.push(`${title}: ${message}`);
    if (notificationDebounceTimer) clearTimeout(notificationDebounceTimer);
    notificationDebounceTimer = setTimeout(() => {
      notificationDebounceTimer = null;
      const msgs = pendingNotifications.splice(0, pendingNotifications.length);
      if (msgs.length === 0) return;
      const combined = msgs.length === 1 ? msgs[0] : `${msgs.length} skill audit results`;
      void import('node:child_process')
        .then(({ execFileSync }) => {
          try {
            // execFileSync (no shell) prevents shell injection; escaping the
            // AppleScript string literal prevents a skill name with quotes or
            // backslashes from breaking out of the notification text.
            const safe = (combined ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            execFileSync(
              'osascript',
              ['-e', `display notification "${safe}" with title "PanGuard"`],
              { timeout: 2000 }
            );
          } catch {
            // Notification failed — non-critical
          }
        })
        .catch(() => {});
    }, 5_000); // debounce 5s
  }

  // ── Skill Install Watcher ────────────────────────────────────────────
  // Local detection always runs (dashboard alerts, blacklist checks). The
  // OUTBOUND flywheel submitters (skill threat + ATR proposal) carry a skill
  // name and findings to Threat Cloud, so they are collective-defense sharing:
  // wire them ONLY when the user has explicitly opted in (=== true, never
  // !== false). Opted out => submitters stay undefined => SkillWatcher uploads
  // nothing.
  const sharingOptedIn = config.threatCloudUploadEnabled === true;
  const skillWatcher = new SkillWatcher({
    pollInterval: 10_000,
    submitThreat: sharingOptedIn ? engine.getSkillThreatSubmitter() : undefined,
    submitATRProposal: sharingOptedIn ? engine.getATRProposalSubmitter() : undefined,
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

      // Telemetry + macOS notification
      pushTelemetryEvent('skill_audit', result.riskScore, result.riskLevel);
      if (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') {
        pushNotification(
          'Skill Audit',
          `${result.name}: ${result.riskLevel} (${result.riskScore}/100)`
        );
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
    if (telemetryFlushTimer) clearTimeout(telemetryFlushTimer);
    flushTelemetryBatch();
    if (notificationDebounceTimer) clearTimeout(notificationDebounceTimer);
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
      // Honest posture: only report 'protected' when actually enforcing
      // (protection mode WITH loaded rules). Learning, report-only, and the
      // degraded 0-rules case must never render as PROTECTED — they fall back
      // to the cautionary 'learning' label until a 'report-only'/'degraded'
      // variant is added to DashboardState (see dashboard-renderer.ts).
      const tuiStatus: DashboardState['status'] = !status.running
        ? 'stopped'
        : status.mode === 'protection' && rules.atr > 0
          ? 'protected'
          : 'learning';
      return {
        status: tuiStatus,
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

        if (!process.env['PANGUARD_QUIET_GUARD']) {
          console.log(
            c.dim(
              `  [${time}] Events: ${events.toLocaleString()} | Threats: ${threats} | Uploaded: ${uploaded}`
            )
          );
        }
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

    if (!process.env['PANGUARD_QUIET_GUARD']) {
      console.log(c.dim('  Press Ctrl+C to stop'));
      console.log('');
    }
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
  console.log(`    ${c.sage('pga')}              Open interactive menu /`);
  console.log(`    ${c.sage('pga up')}           Start protection + dashboard /  + `);
  console.log(`    ${c.sage('pga status')}       Check protection status / `);
  console.log(`    ${c.sage('pga scan')}         Scan all installed skills / `);
  console.log(`    ${c.sage('pga audit <dir>')}  Audit a skill before installing / `);
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
    // The dead daemon never ran its graceful dashboard.stop(), so its launch
    // token may be orphaned on disk — remove it so it cannot outlive the daemon.
    removeDashboardToken();
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    console.log(`  ${symbols.pass} PanguardGuard stopped ${c.dim(`(PID: ${pid})`)}`);
    // The daemon removes its own token in dashboard.stop() on SIGTERM, but that
    // is async; clean up here too so the secret is gone the moment stop returns.
    removeDashboardToken();
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
    // node + script as discrete argv parts: never whitespace-split, and robust
    // on Windows where the script has no shebang to self-execute.
    const result = await installService([process.execPath, execPath], dataDir);
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
      en: 'Enable Threat Cloud collective defense? (optional, off by default)',
      'zh-TW': '啟用 Threat Cloud 集體防禦？（選用，預設關閉）',
    },
    // Opt-in: default OFF so a bare Enter declines and nothing is shared.
    defaultValue: false,
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
  // Remove the persisted dashboard launch token so the secret never lingers
  // after the service is gone.
  removeDashboardToken();
}

/** Show current configuration / 顯示當前配置 */
function commandConfig(dataDir: string): void {
  console.log(header('Configuration'));
  try {
    const config = loadConfig(join(dataDir, 'config.json'));
    // Redact secret-bearing fields (ai.apiKey, threatCloudApiKey, license key,
    // notification botToken / webhook secret / smtp pass) before printing —
    // a plaintext config dump must never expose a stored secret to the terminal
    // or scrollback. Shared redactor — see ../redact.ts.
    console.log(JSON.stringify(redactSecrets(config), null, 2));
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
