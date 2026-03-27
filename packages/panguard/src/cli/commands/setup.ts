/**
 * panguard setup - One-command platform setup with skill scanning
 * panguard setup - 一行指令平台安裝並掃描技能
 *
 * Detects installed AI agent platforms, injects MCP config,
 * scans and audits all installed skills, and optionally starts Guard.
 * 偵測已安裝的 AI Agent 平台，注入 MCP 設定，掃描審核所有已安裝技能，可選啟動 Guard。
 */

import { Command } from 'commander';
import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { createRequire } from 'node:module';
import { c, banner, divider, symbols, promptConfirm } from '@panguard-ai/core';
import { PANGUARD_VERSION } from '../../index.js';
import {
  scanInstalledSkills,
  renderSkillScanResults,
  reviewFlaggedSkills,
} from './setup-skill-scan.js';

/** Open URL in the default browser (cross-platform) */
function openBrowser(url: string): void {
  const os = platform();
  const cmd = os === 'darwin' ? 'open' : os === 'win32' ? 'start' : 'xdg-open';
  execFile(cmd, [url], () => {
    // Ignore errors — browser open is best-effort
  });
}

/** Persist skill names into the Guard whitelist JSON file */
function persistToWhitelist(skillNames: readonly string[], source: 'manual' | 'static'): void {
  const guardDir = join(homedir(), '.panguard-guard');
  const whitelistPath = join(guardDir, 'skill-whitelist.json');

  if (!existsSync(guardDir)) {
    mkdirSync(guardDir, { recursive: true });
  }

  // Load existing whitelist if present
  let existing: {
    whitelist: Array<{
      name: string;
      normalizedName: string;
      source: string;
      addedAt: string;
      fingerprintHash?: string;
      reason?: string;
    }>;
    revoked: string[];
  } = { whitelist: [], revoked: [] };

  if (existsSync(whitelistPath)) {
    try {
      existing = JSON.parse(readFileSync(whitelistPath, 'utf-8')) as typeof existing;
    } catch {
      console.warn(c.yellow(`  ${symbols.warn} Whitelist file was corrupt and has been reset.`));
    }
  }

  const existingNames = new Set(existing.whitelist.map((e) => e.normalizedName));
  const now = new Date().toISOString();

  for (const name of skillNames) {
    const normalized = name.toLowerCase().trim().replace(/\s+/g, '-');
    if (existingNames.has(normalized)) continue;

    existing.whitelist.push({
      name,
      normalizedName: normalized,
      source,
      addedAt: now,
      reason:
        source === 'manual' ? 'User-approved during setup' : 'Auto-whitelisted during setup (safe)',
    });
    existingNames.add(normalized);
  }

  writeFileSync(whitelistPath, JSON.stringify(existing, null, 2), 'utf-8');
}

/** Platform-specific restart instructions */
const PLATFORM_RESTART_HINTS: Record<string, string> = {
  'claude-code': 'Close and reopen your terminal',
  'claude-desktop': 'Quit and reopen Claude Desktop',
  cursor: 'Cmd+Shift+P (or Ctrl+Shift+P) > "Reload Window"',
  openclaw: 'Close and reopen OpenClaw',
  codex: 'Restart the Codex CLI session',
  workbuddy: 'Close and reopen WorkBuddy',
  nemoclaw: 'Close and reopen NemoClaw',
  arkclaw: 'Close and reopen ArkClaw',
};

export function setupCommand(): Command {
  const cmd = new Command('setup')
    .description(
      'Auto-detect AI agent platforms and configure Panguard MCP / 自動偵測 AI Agent 平台並設定 Panguard MCP'
    )
    .option(
      '--platform <name>',
      'Target a specific platform (claude-code, cursor, openclaw, codex, workbuddy, nemoclaw, claude-desktop)'
    )
    .option('--remove', 'Remove Panguard MCP config from platforms / 移除設定', false)
    .option('--json', 'Output as JSON / 以 JSON 格式輸出', false)
    .option('--yes', 'Skip confirmation prompts / 跳過確認提示', false)
    .option('--skip-scan', 'Skip skill scanning / 跳過技能掃描', false)
    .option('--skip-guard', 'Skip guard start prompt / 跳過 Guard 啟動', false)
    .option('--lang <lang>', 'UI language: en or zh-TW (auto-detect if omitted)')
    .action(
      async (options: {
        platform?: string;
        remove: boolean;
        json: boolean;
        yes: boolean;
        skipScan: boolean;
        skipGuard: boolean;
        lang?: string;
      }) => {
        // Detect UI language: --lang flag > system locale > default zh-TW
        const sysLang = (process.env['LANG'] ?? process.env['LC_ALL'] ?? '').toLowerCase();
        const isSystemChinese = sysLang.includes('zh') || sysLang.includes('chinese');
        const detectedLang: 'en' | 'zh-TW' =
          options.lang === 'en'
            ? 'en'
            : options.lang === 'zh-TW'
              ? 'zh-TW'
              : isSystemChinese
                ? 'zh-TW'
                : 'en';
        const L = detectedLang;

        const mcpConfig = await (import('@panguard-ai/panguard-mcp/config' as string) as Promise<{
          detectPlatforms: () => Promise<
            Array<{ id: string; name: string; detected: boolean; alreadyConfigured: boolean }>
          >;
          injectMCPConfig: (platformId: string) => {
            success: boolean;
            platformId: string;
            configPath?: string;
            error?: string;
          };
          removeMCPConfig: (platformId: string) => {
            success: boolean;
            platformId: string;
            configPath?: string;
            error?: string;
          };
        }>);
        const { detectPlatforms, injectMCPConfig, removeMCPConfig } = mcpConfig;

        if (!options.json) {
          banner('Panguard Setup');
          console.log();
        }

        // 1. Detect platforms
        if (!options.json) {
          console.log(c.dim('  Scanning for AI agent platforms...'));
          console.log();
        }

        const allPlatforms = await detectPlatforms();

        // Filter to target platform if specified
        const validIds = [
          'claude-code',
          'claude-desktop',
          'cursor',
          'openclaw',
          'codex',
          'workbuddy',
          'nemoclaw',
          'arkclaw',
        ];
        let targets = allPlatforms;
        if (options.platform) {
          if (!validIds.includes(options.platform)) {
            console.error(c.red(`  Unknown platform: ${options.platform}`));
            console.error(c.dim(`  Valid platforms: ${validIds.join(', ')}`));
            process.exitCode = 1;
            return;
          }
          targets = allPlatforms.filter((p) => p.id === options.platform);
        }

        // 2. Show detection results
        if (!options.json) {
          console.log(c.bold('  Detected Platforms:'));
          console.log();
          for (const p of allPlatforms) {
            const status = p.detected
              ? p.alreadyConfigured
                ? c.green(`${symbols.pass} configured`)
                : c.yellow(`${symbols.warn} not configured`)
              : c.dim(`${symbols.dot} not found`);
            console.log(`    ${p.detected ? c.bold(p.name) : c.dim(p.name)}  ${status}`);
          }
          console.log();
          divider();
          console.log();
        }

        // Determine which platforms to act on
        const actionable = options.remove
          ? targets.filter((p) => p.alreadyConfigured)
          : targets.filter((p) => p.detected && !p.alreadyConfigured);

        // JSON mode: collect all data, output at the end (don't return early)
        const jsonOutput: Record<string, unknown> = {
          action: options.remove ? 'remove' : 'setup',
          version: PANGUARD_VERSION,
          timestamp: new Date().toISOString(),
          platforms: [],
        };

        if (actionable.length === 0) {
          if (!options.json) {
            const msg = options.remove
              ? 'No platforms have Panguard configured.'
              : 'All detected platforms are already configured, or no platforms found.';
            console.log(c.green(`  ${symbols.pass} ${msg}`));
            console.log();
            console.log(c.dim('  Run with --platform <name> to target a specific platform.'));
          }

          // Include already-configured platforms in JSON output
          jsonOutput['platforms'] = allPlatforms
            .filter((p) => p.detected)
            .map((p) => ({
              platform: p.id,
              success: true,
              already_configured: p.alreadyConfigured,
            }));

          // Don't return — continue to skill scan + guard for JSON mode
          if (!options.json) return;
        }

        // 3. Execute injection or removal
        if (!options.json) {
          const action = options.remove ? 'Removing from' : 'Configuring';
          console.log(c.bold(`  ${action} ${actionable.length} platform(s):`));
          console.log();
        }

        const results: Array<{
          success: boolean;
          platformId: string;
          configPath?: string;
          error?: string;
        }> = [];
        for (const p of actionable) {
          const result = options.remove ? removeMCPConfig(p.id) : injectMCPConfig(p.id);
          results.push(result);

          if (!options.json) {
            const icon = result.success ? c.green(symbols.pass) : c.red(symbols.fail);
            console.log(`    ${icon} ${p.name}`);
            if (result.success) {
              console.log(c.dim(`      ${result.configPath}`));
            } else {
              console.log(c.red(`      Error: ${result.error}`));
            }
          }
        }

        // Update jsonOutput with actual platform results (only if there were actionable platforms)
        if (results.length > 0) {
          jsonOutput['platforms'] = results.map((r) => ({
            platform: r.platformId,
            success: r.success,
            configPath: r.configPath,
            error: r.error,
          }));
        }

        if (options.json && options.remove) {
          jsonOutput['agent_friendly'] = true;
          console.log(JSON.stringify(jsonOutput, null, 2));
          return;
        }

        console.log();
        divider();
        console.log();

        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        if (!options.json) {
          if (failed === 0) {
            console.log(
              c.green(`  ${symbols.pass} All ${succeeded} platform(s) configured successfully.`)
            );
          } else {
            console.log(c.yellow(`  ${succeeded} succeeded, ${failed} failed.`));
          }
        }

        // ── 4. Scan installed skills ──────────────────────────────────
        if (!options.remove && !options.skipScan) {
          if (!options.json) {
            console.log();
            divider('Skill Security Scan');
            console.log();
            console.log(c.dim('  Scanning installed MCP skills across all platforms...'));
            console.log();
          }

          try {
            const { discoverAllSkills } = await (import(
              '@panguard-ai/panguard-mcp/config' as string
            ) as Promise<{
              discoverAllSkills: () => Promise<import('./setup-skill-scan.js').MCPServerEntry[]>;
            }>);
            const skills = await discoverAllSkills();

            if (skills.length > 0) {
              const scanResults = await scanInstalledSkills(skills, {
                silent: options.json,
              });
              if (!options.json) renderSkillScanResults(scanResults);

              // Collect skill scan data for JSON output
              const safe = scanResults.filter((r) => r.status === 'safe');
              const cautionResults = scanResults.filter((r) => r.status === 'caution');
              const flaggedResults = scanResults.filter((r) => r.status === 'flagged');
              jsonOutput['skill_scan'] = {
                total: scanResults.length,
                safe: safe.length,
                caution: cautionResults.length,
                flagged: flaggedResults.length,
                skills: scanResults.map((r) => ({
                  name: r.entry.name,
                  platform: r.entry.platformId,
                  status: r.status,
                  risk_level: r.audit?.riskLevel ?? null,
                  risk_score: r.audit?.riskScore ?? null,
                })),
              };

              // Whitelist only safe (LOW risk) skills — caution (MEDIUM) needs review
              const safeOnly = scanResults
                .filter((r) => r.status === 'safe')
                .map((r) => r.entry.name);
              if (safeOnly.length > 0) {
                persistToWhitelist(safeOnly, 'static');
                if (!options.json) {
                  console.log();
                  console.log(
                    c.green(`  ${symbols.pass} ${safeOnly.length} safe skill(s) auto-whitelisted.`)
                  );
                  console.log(c.dim(`    Saved to ~/.panguard-guard/skill-whitelist.json`));
                }
              }

              const caution = scanResults.filter((r) => r.status === 'caution');
              if (caution.length > 0 && !options.json) {
                console.log(
                  c.yellow(
                    `  ${symbols.warn} ${caution.length} skill(s) at MEDIUM risk — monitored but not whitelisted.`
                  )
                );
              }

              // Separate CRITICAL (auto-block) from HIGH (interactive review)
              const flagged = scanResults.filter((r) => r.status === 'flagged');
              const critical = flagged.filter((r) => r.audit?.riskLevel === 'CRITICAL');
              const high = flagged.filter((r) => r.audit?.riskLevel === 'HIGH');

              // Auto-block CRITICAL skills -- no user choice offered
              if (critical.length > 0) {
                const { removeServer } = await (import(
                  '@panguard-ai/panguard-mcp/config' as string
                ) as Promise<{
                  removeServer: (platformId: string, serverName: string) => boolean;
                }>);

                for (const result of critical) {
                  const removed = removeServer(result.entry.platformId, result.entry.name);
                  if (!options.json) {
                    if (removed) {
                      console.log(
                        c.red(
                          `  ${symbols.fail} BLOCKED: ${c.bold(result.entry.name)} is critically dangerous and has been disabled.`
                        )
                      );
                      console.log(
                        c.dim(
                          `    Risk score: ${result.audit?.riskScore ?? 0}/100 | Platform: ${result.entry.platformId}`
                        )
                      );
                    } else {
                      console.log(
                        c.red(
                          `  ${symbols.fail} CRITICAL: ${c.bold(result.entry.name)} -- could not auto-remove. Manually disable this skill.`
                        )
                      );
                    }
                  }
                }
              }

              // Review HIGH skills interactively (not CRITICAL)
              if (high.length > 0 && !options.yes && !options.json) {
                const userWhitelisted = await reviewFlaggedSkills(high);
                if (userWhitelisted.length > 0) {
                  persistToWhitelist(userWhitelisted, 'manual');
                }
              } else if (high.length > 0 && !options.json) {
                console.log(
                  c.yellow(
                    `  ${symbols.warn} ${high.length} HIGH-risk skill(s) -- run "panguard guard --watch" to review.`
                  )
                );
              }
            } else {
              jsonOutput['skill_scan'] = { total: 0, safe: 0, caution: 0, flagged: 0, skills: [] };
              if (!options.json) {
                console.log(
                  c.dim(
                    `  ${symbols.info} No MCP skills found. Skills will be audited as you install them.`
                  )
                );
              }
            }
          } catch {
            if (!options.json) {
              console.log(
                c.dim(`  ${symbols.info} Skill scanning skipped (auditor not available).`)
              );
            }
          }

          if (!options.json) {
            console.log();
            divider();
          }
        }

        // ── 5. Install guard as system service (auto-start on boot) ───
        if (!options.remove && !options.skipGuard) {
          if (!options.json) console.log();
          const installGuard =
            options.yes ||
            options.json ||
            (await promptConfirm({
              message: {
                en: 'Install Panguard Guard as system service? (recommended, auto-start on boot)',
                'zh-TW': '安裝 Panguard Guard 為系統服務？（建議安裝，開機自動啟動）',
              },
              defaultValue: true,
              lang: L,
            }));

          if (installGuard) {
            if (!options.json) {
              console.log();
              console.log(c.dim('  Installing Panguard Guard as system service...'));
            }

            // Resolve the guard CLI binary path (outside try so fallback can use it)
            let guardBin: string | undefined;
            try {
              const require = createRequire(import.meta.url);
              guardBin = require.resolve('@panguard-ai/panguard-guard/dist/cli/index.js');
            } catch {
              // Fallback: check common global/local paths
            }

            const dashUrl = 'http://127.0.0.1:3100';

            if (!guardBin) {
              if (!options.json) {
                console.log(c.yellow(`  ${symbols.warn} Could not locate panguard-guard binary.`));
                console.log(c.dim('    Run manually: panguard guard install'));
              }
              jsonOutput['guard'] = {
                installed: false,
                running: false,
                error: 'guard binary not found',
              };
            } else {
              try {
                const guardExec = `${process.execPath} ${guardBin}`;
                const dataDir = join(homedir(), '.panguard-guard');

                const { installService } = await import('@panguard-ai/panguard-guard');
                const servicePath = await installService(guardExec, dataDir);

                const osPlatform = process.platform;
                const serviceType =
                  osPlatform === 'darwin'
                    ? 'launchd'
                    : osPlatform === 'linux'
                      ? 'systemd'
                      : osPlatform === 'win32'
                        ? 'Windows Service'
                        : 'system service';

                if (!options.json) {
                  console.log(
                    c.green(`  ${symbols.pass} Guard installed as ${serviceType} service.`)
                  );
                  console.log(c.dim(`    ${servicePath}`));
                  console.log(
                    c.green(`  ${symbols.pass} Guard will auto-start on boot and restart on crash.`)
                  );
                  console.log(c.dim('    Run "panguard guard status" to check.'));
                  console.log(c.dim('    Run "panguard guard uninstall" to remove.'));
                }

                jsonOutput['guard'] = {
                  installed: true,
                  running: true,
                  service_type: serviceType,
                  service_path: servicePath,
                  dashboard_url: dashUrl,
                };

                // Open Dashboard in browser (skip in JSON mode — AI agent will show URL)
                if (!options.json) {
                  console.log();
                  console.log(c.green(`  ${symbols.pass} Opening Guard Dashboard...`));
                  console.log(c.dim(`    ${dashUrl}`));
                  openBrowser(dashUrl);
                }
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (!options.json) {
                  if (msg.includes('EACCES') || msg.includes('permission')) {
                    console.log(
                      c.yellow(
                        `  ${symbols.warn} Needs elevated privileges to install system service.`
                      )
                    );
                    console.log(c.dim('    Run: sudo panguard guard install'));
                  } else {
                    console.log(
                      c.yellow(`  ${symbols.warn} Could not install as system service: ${msg}`)
                    );
                    console.log(c.dim('    Run manually: panguard guard install'));
                  }
                  // Fallback: start Guard for this session only
                  console.log();
                  console.log(c.dim('  Starting Guard for this session instead...'));
                }
                try {
                  const child = spawn(process.execPath, [guardBin, 'start', '--dashboard'], {
                    detached: true,
                    stdio: 'ignore',
                  });
                  child.unref();

                  jsonOutput['guard'] = {
                    installed: false,
                    running: true,
                    pid: child.pid,
                    dashboard_url: dashUrl,
                    error: `service install failed: ${msg}`,
                  };

                  if (!options.json) {
                    console.log(
                      c.green(
                        `  ${symbols.pass} Guard started (PID: ${child.pid}). Will stop when system restarts.`
                      )
                    );
                    console.log();
                    console.log(c.green(`  ${symbols.pass} Opening Guard Dashboard...`));
                    console.log(c.dim(`    ${dashUrl}`));
                    openBrowser(dashUrl);
                  }
                } catch {
                  jsonOutput['guard'] = { installed: false, running: false, error: msg };
                  if (!options.json) {
                    console.log(c.dim('    Run manually: panguard guard start --dashboard'));
                  }
                }
              }
            }
          }
        }

        // ── 6. Threat Cloud opt-in (always runs, independent of guard install) ──
        if (!options.remove && !options.skipGuard) {
          const dataDir = join(homedir(), '.panguard-guard');
          const enableTC =
            options.yes ||
            options.json ||
            (await promptConfirm({
              message: {
                en: 'Enable Threat Cloud collective defense?',
                'zh-TW': '啟用 Threat Cloud 集體防禦？',
              },
              defaultValue: true,
              lang: L,
            }));

          try {
            const tcConfigPath = join(dataDir, 'config.json');
            const { loadConfig, saveConfig } = await import('@panguard-ai/panguard-guard');
            const guardConfig = loadConfig(tcConfigPath);
            const updatedConfig = {
              ...guardConfig,
              threatCloudUploadEnabled: enableTC,
              threatCloudEndpoint: enableTC
                ? (guardConfig.threatCloudEndpoint ?? 'https://tc.panguard.ai/api')
                : guardConfig.threatCloudEndpoint,
            };
            saveConfig(updatedConfig, tcConfigPath);

            if (!options.json) {
              if (enableTC) {
                console.log(
                  c.green(
                    `  ${symbols.pass} Threat Cloud enabled: ${updatedConfig.threatCloudEndpoint ?? 'https://tc.panguard.ai/api'}`
                  )
                );
                console.log(c.dim('    Every scan strengthens the collective defense network.'));
              } else {
                console.log(
                  c.dim(
                    `  ${symbols.info} Threat Cloud disabled. Enable later: panguard guard config --set threatCloudUploadEnabled=true`
                  )
                );
              }
            }

            // Add TC status to guard JSON output
            if (jsonOutput['guard'] && typeof jsonOutput['guard'] === 'object') {
              (jsonOutput['guard'] as Record<string, unknown>)['threat_cloud'] = enableTC;
            }
          } catch {
            // Config save failed — non-fatal
          }
        }

        // ── Report setup event to Threat Cloud (best-effort) ────────
        void fetch('https://tc.panguard.ai/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'cli_setup',
            source: 'cli-user',
            metadata: {
              version: PANGUARD_VERSION,
              platforms: results.filter((r) => r.success).map((r) => r.platformId),
              skillsScanned:
                (jsonOutput['skill_scan'] as { total?: number } | undefined)?.total ?? 0,
            },
          }),
          signal: AbortSignal.timeout(3000),
        }).catch(() => {});

        // ── JSON output (all data collected) ─────────────────────────
        if (options.json) {
          jsonOutput['agent_friendly'] = true;
          console.log(JSON.stringify(jsonOutput, null, 2));
          return;
        }

        // ── Next steps (human-readable only) ─────────────────────────
        console.log();
        console.log(c.sage(c.bold('  Setup complete! Here are your quick commands:')));
        console.log();
        console.log(`    ${c.sage('pga')}              Open interactive menu`);
        console.log(`    ${c.sage('pga up')}           Start protection + dashboard`);
        console.log(`    ${c.sage('pga status')}       Check protection status`);
        console.log(`    ${c.sage('pga scan')}         Scan all installed skills`);
        console.log(`    ${c.sage('pga audit <url>')}  Audit a skill before installing`);
        console.log();
        console.log(c.dim('  Open source (MIT). If PanGuard helps you, star us on GitHub:'));
        console.log(c.sage('  https://github.com/panguard-ai/panguard-ai'));
        console.log();

        const configuredPlatforms = actionable.filter((_, i) => results[i]?.success);
        if (configuredPlatforms.length > 0) {
          console.log(c.dim('  Restart your AI agent to activate MCP:'));
          for (const p of configuredPlatforms) {
            const restartHint = PLATFORM_RESTART_HINTS[p.id] ?? 'Restart the application';
            console.log(c.dim(`    ${p.name}: ${restartHint}`));
          }
          console.log();
        }
      }
    );

  return cmd;
}
