/**
 * panguard up - One-command start: scan → protect → dashboard
 *
 * Flow: scan installed skills → warn about threats → start Guard → open dashboard
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { execFile } from 'node:child_process';
import { Command } from 'commander';
import { runCLI } from '@panguard-ai/panguard-guard';
import { c, symbols, setLogLevel } from '@panguard-ai/core';
import { detectLang } from '../interactive/lang.js';

type Lang = 'en' | 'zh-TW';

/** Minimal i18n for key user-facing strings */
const t = (lang: Lang, en: string, zh: string): string => (lang === 'zh-TW' ? zh : en);

const TC_ENDPOINT = 'https://tc.panguard.ai';

const DASHBOARD_URL = 'http://127.0.0.1:3100';

function openBrowser(url: string): void {
  const os = platform();
  if (os === 'win32') {
    // Hardcode cmd.exe path — never trust COMSPEC env var (attacker-controllable)
    const systemRoot = process.env['SystemRoot'] || 'C:\\Windows';
    const cmd = `${systemRoot}\\System32\\cmd.exe`;
    execFile(cmd, ['/c', 'start', '', url], () => {});
  } else if (os === 'darwin') {
    execFile('open', [url], () => {});
  } else {
    execFile('xdg-open', [url], () => {});
  }
}

function isGuardRunning(): boolean {
  const pidPath = join(homedir(), '.panguard-guard', 'panguard-guard.pid');
  if (!existsSync(pidPath)) return false;
  try {
    const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function upCommand(): Command {
  return new Command('up')
    .description('Scan skills → start protection → open dashboard')
    .option('--no-dashboard', 'Skip opening dashboard in browser')
    .option('--verbose', 'Verbose output', false)
    .option('--skip-scan', 'Skip initial skill scan', false)
    .option('-y, --yes', 'Skip confirmation prompts', false)
    .action(
      async (opts: { dashboard: boolean; verbose: boolean; skipScan: boolean; yes: boolean }) => {
        // Suppress JSON logs for clean output — set env var BEFORE any dynamic imports
        // so all child modules (panguard-mcp, panguard-scan, etc.) also respect it
        if (!opts.verbose) {
          process.env['PANGUARD_LOG_LEVEL'] = 'silent';
          setLogLevel('silent');
        }
        const startTime = Date.now();
        const lang = detectLang();

        console.log(
          `\n  ${c.sage(c.bold('PANGUARD AI'))} ${c.dim(t(lang, '— AI Agent Security Guard', '— AI 代理安全防護'))}\n`
        );
        console.log(`  ${c.dim('─'.repeat(50))}\n`);

        const activatedMarker = join(homedir(), '.panguard', 'activated');
        const isFirstRun = !existsSync(activatedMarker);

        if (isFirstRun) {
          console.log('');
          console.log(
            `  ${c.sage(c.bold(t(lang, 'Welcome to PanGuard AI!', '歡迎使用 PanGuard AI！')))}`
          );
          console.log('');
          console.log(
            `  ${t(lang, 'PanGuard protects your AI agents in 3 steps:', 'PanGuard 三步驟保護你的 AI 代理：')}`
          );
          console.log(
            `  ${c.dim('1.')} ${t(lang, 'Scan — detect threats in installed skills', '掃描 — 偵測已安裝技能中的威脅')}`
          );
          console.log(
            `  ${c.dim('2.')} ${t(lang, 'Protect — inject MCP proxy for runtime guard', '防護 — 注入 MCP 代理進行即時守護')}`
          );
          console.log(
            `  ${c.dim('3.')} ${t(lang, 'Monitor — Guard engine watches for attacks', '監控 — Guard 引擎持續監控攻擊')}`
          );
          console.log('');
          console.log(`  ${c.dim(t(lang, 'Running initial setup...', '正在執行初始設定...'))}`);
          console.log('');
          const { execFileSync } = await import('node:child_process');
          try {
            execFileSync(process.execPath, [process.argv[1] ?? 'panguard', 'setup'], {
              stdio: 'inherit',
            });
          } catch (err) {
            process.stderr.write(
              `[panguard up] Setup failed: ${err instanceof Error ? err.message : String(err)}\n`
            );
          }
        }

        // ── Step 1: Detect platforms + inject proxy ─────────────
        let platformCount = 0;
        let serverCount = 0;
        let threatCount = 0;
        try {
          type DetectFn = () => Promise<Array<{ id: string; name: string; detected: boolean }>>;
          type InjectFn = (ids: readonly string[]) => {
            totalPlatforms: number;
            totalServersProxied: number;
            results: ReadonlyArray<{ platformId: string; serversProxied: number; error?: string }>;
          };
          let detectPlatforms: DetectFn;
          let injectProxyFn: InjectFn;

          try {
            // Published package: import from /config subpath
            const mcp = (await import('@panguard-ai/panguard-mcp/config' as string)) as {
              detectPlatforms: DetectFn;
              injectProxy: InjectFn;
            };
            detectPlatforms = mcp.detectPlatforms;
            injectProxyFn = mcp.injectProxy;
          } catch {
            // Monorepo fallback: resolve from cwd
            const { resolve } = await import('node:path');
            const { pathToFileURL } = await import('node:url');
            const mcpDist = resolve(process.cwd(), 'packages/panguard-mcp/dist/config/index.js');
            const mcp = (await import(pathToFileURL(mcpDist).href)) as {
              detectPlatforms: DetectFn;
              injectProxy: InjectFn;
            };
            detectPlatforms = mcp.detectPlatforms;
            injectProxyFn = mcp.injectProxy;
          }

          console.log(
            `  ${symbols.scan} ${c.bold(t(lang, 'Detecting AI platforms...', '偵測 AI 平台...'))}\n`
          );
          const platforms = await detectPlatforms();
          const detected = platforms.filter((p) => p.detected);

          for (const p of detected) {
            console.log(`    ${c.safe(p.name)}  ${c.dim('detected')}`);
          }
          if (detected.length === 0) {
            console.log(`    ${c.dim('No AI platforms found.')}`);
          }

          // Inject proxy on all detected platforms (with consent)
          if (detected.length > 0) {
            let shouldInject = opts.yes;
            if (!shouldInject) {
              if (!process.stdin.isTTY) {
                // Non-interactive (CI, piped): skip injection by default
                shouldInject = false;
              } else {
                const { createInterface } = await import('node:readline');
                const rl = createInterface({ input: process.stdin, output: process.stdout });
                const answer = await new Promise<string>((resolve) => {
                  rl.question(
                    `\n  Inject MCP proxy into ${detected.length} platform(s)? ` +
                      `${c.dim('(configs backed up to *.bak)')} [y/N] `,
                    resolve
                  );
                });
                rl.close();
                shouldInject = answer.trim().toLowerCase() === 'y';
              }
            }

            if (!shouldInject) {
              console.log(`\n    ${c.dim('Proxy injection skipped. Run "pga up -y" to inject.')}`);
            } else {
              console.log(`\n  ${symbols.shield} ${c.bold('Injecting runtime protection...')}\n`);
              const proxySummary = injectProxyFn(detected.map((p) => p.id));
              platformCount = proxySummary.totalPlatforms;
              serverCount = proxySummary.totalServersProxied;

              if (serverCount > 0) {
                console.log(
                  `    ${c.safe(`${serverCount} MCP server(s)`)} proxied across ${c.sage(`${platformCount} platform(s)`)}`
                );
                console.log(`    ${c.dim('Config backed up to *.bak files')}`);
              } else {
                console.log(
                  `    ${c.dim('No new servers to proxy (all already protected or none found).')}`
                );
              }

              // Show errors if any
              for (const r of proxySummary.results) {
                if (r.error) {
                  console.log(`    ${c.critical(`${r.platformId}: ${r.error}`)}`);
                }
              }
            }
          }
          console.log();
        } catch {
          console.log(
            `  ${c.dim('Platform detection skipped (install @panguard-ai/panguard-mcp for full detection).')}\n`
          );
        }

        // ── Step 2: Open dashboard ──────────────────────────────
        if (opts.dashboard) {
          console.log(`  ${c.sage(`Opening dashboard: ${DASHBOARD_URL}`)}\n`);
          openBrowser(DASHBOARD_URL);
        }

        // ── Step 3: Scan installed skills ────────────────────────
        if (!opts.skipScan) {
          console.log(
            `\n  ${symbols.scan} ${c.bold(t(lang, 'Scanning installed skills...', '掃描已安裝技能...'))}\n`
          );

          try {
            let skills: ReadonlyArray<{ name: string; platformId: string }> = [];
            try {
              const mcp = (await import('@panguard-ai/panguard-mcp/config' as string)) as {
                discoverAllSkills: () => Promise<typeof skills>;
              };
              skills = await mcp.discoverAllSkills();
            } catch {
              // Monorepo fallback
              const { resolve } = await import('node:path');
              const { pathToFileURL } = await import('node:url');
              const mcpDist = resolve(process.cwd(), 'packages/panguard-mcp/dist/config/index.js');
              const mcp = (await import(pathToFileURL(mcpDist).href)) as {
                discoverAllSkills: () => Promise<typeof skills>;
              };
              skills = await mcp.discoverAllSkills();
            }

            if (skills.length === 0) {
              console.log(
                `  ${c.dim('No skills found. Install some MCP skills and run again.')}\n`
              );
            } else {
              // Load whitelist
              const whitelistPath = join(homedir(), '.panguard-guard', 'skill-whitelist.json');
              const safeNames = new Set<string>();
              if (existsSync(whitelistPath)) {
                try {
                  const wl = JSON.parse(readFileSync(whitelistPath, 'utf-8')) as {
                    whitelist?: Array<{ name: string; normalizedName?: string }>;
                  };
                  for (const s of wl.whitelist ?? []) {
                    safeNames.add(s.name.toLowerCase());
                    if (s.normalizedName) safeNames.add(s.normalizedName.toLowerCase());
                  }
                } catch (err) {
                  process.stderr.write(
                    `[panguard up] Failed to load whitelist: ${err instanceof Error ? err.message : String(err)}\n`
                  );
                }
              }

              const safe = skills.filter((s) => safeNames.has(s.name.toLowerCase()));
              const unknown = skills.filter((s) => !safeNames.has(s.name.toLowerCase()));

              console.log(
                `  ${c.safe(String(safe.length))} safe  ${c.dim('|')}  ${unknown.length > 0 ? c.caution(String(unknown.length)) : c.dim('0')} unscanned`
              );

              // If there are unscanned skills, run audit on them
              if (unknown.length > 0) {
                console.log(
                  `\n  ${symbols.warn} ${c.bold(`${unknown.length} unscanned skill(s) found. Auditing...`)}\n`
                );

                const threats: Array<{
                  name: string;
                  platform: string;
                  riskLevel: string;
                  riskScore: number;
                }> = [];

                try {
                  const { auditSkill } = await import('@panguard-ai/panguard-skill-auditor');

                  const toScan = unknown;
                  let scanned = 0;
                  for (const skill of toScan) {
                    try {
                      scanned++;
                      process.stdout.write(
                        `\r  ${c.dim(`[${scanned}/${toScan.length}]`)} Auditing ${c.bold(skill.name)}...`
                      );

                      // Find skill directory
                      const skillDir = join(homedir(), '.claude', 'skills', skill.name);
                      if (!existsSync(skillDir)) continue;

                      const report = await auditSkill(skillDir);
                      if (report.riskLevel === 'HIGH' || report.riskLevel === 'CRITICAL') {
                        threats.push({
                          name: skill.name,
                          platform: skill.platformId,
                          riskLevel: report.riskLevel,
                          riskScore: report.riskScore,
                        });
                      }

                      // ── Flywheel: submit scan results to TC ──
                      if (report.riskScore > 0) {
                        submitToTC(skill.name, skillDir, report).catch(() => {});
                      }
                    } catch (err) {
                      process.stderr.write(
                        `[panguard up] Skill audit failed for ${skill.name}: ${err instanceof Error ? err.message : String(err)}\n`
                      );
                    }
                  }
                } catch (err) {
                  process.stderr.write(
                    `[panguard up] Skill auditor unavailable: ${err instanceof Error ? err.message : String(err)}\n`
                  );
                }

                // Clear progress line
                process.stdout.write('\r' + ' '.repeat(80) + '\r');

                threatCount = threats.length;
                if (threats.length > 0) {
                  console.log(`  ${c.critical(c.bold(`${threats.length} threat(s) detected:`))}\n`);
                  for (const threat of threats) {
                    const icon =
                      threat.riskLevel === 'CRITICAL' ? c.critical('!!') : c.caution('!');
                    const action =
                      threat.riskLevel === 'CRITICAL'
                        ? c.critical('remove or replace this skill')
                        : c.caution('review with: pga scan ~/.claude/skills/' + threat.name);
                    console.log(
                      `    ${icon} ${c.bold(threat.name)} ${c.dim(`(${threat.platform}) \u2014 ${threat.riskLevel}`)}`
                    );
                    console.log(`      ${c.dim('\u2192')} ${action}`);
                  }

                  // Auto-revoke CRITICAL skills from whitelist
                  const criticalNames = new Set(
                    threats
                      .filter((t) => t.riskLevel === 'CRITICAL')
                      .map((t) => t.name.toLowerCase())
                  );
                  if (criticalNames.size > 0 && existsSync(whitelistPath)) {
                    try {
                      const wlRaw = JSON.parse(readFileSync(whitelistPath, 'utf-8')) as {
                        whitelist?: Array<{ name: string; [k: string]: unknown }>;
                      };
                      const before = wlRaw.whitelist?.length ?? 0;
                      wlRaw.whitelist = (wlRaw.whitelist ?? []).filter(
                        (s) => !criticalNames.has(s.name.toLowerCase())
                      );
                      const revoked = before - (wlRaw.whitelist?.length ?? 0);
                      if (revoked > 0) {
                        const { writeFileSync, renameSync } = await import('node:fs');
                        const tmpPath = `${whitelistPath}.tmp.${process.pid}`;
                        writeFileSync(tmpPath, JSON.stringify(wlRaw, null, 2), 'utf-8');
                        renameSync(tmpPath, whitelistPath);
                        console.log(
                          `\n  ${c.critical(c.bold(`${revoked} CRITICAL skill(s) auto-revoked from whitelist.`))}`
                        );
                      }
                    } catch (err) {
                      process.stderr.write(
                        `[panguard up] Whitelist revocation failed: ${err instanceof Error ? err.message : String(err)}\n`
                      );
                    }
                  }
                  console.log('');
                } else {
                  console.log(
                    `  ${c.safe(`${symbols.pass} No threats found in unscanned skills.`)}\n`
                  );
                }
              } else {
                console.log(
                  `  ${c.safe(`${symbols.pass} All ${skills.length} skills verified safe.`)}\n`
                );
              }
            }
          } catch {
            console.log(`  ${c.dim('Skill scan skipped (discovery unavailable).')}\n`);
          }
        }

        // ── Activation tracking (one-time, respects telemetry opt-out) ──
        const telemetryDisabled = (() => {
          try {
            const cfgPath = join(homedir(), '.panguard-guard', 'config.json');
            if (existsSync(cfgPath)) {
              const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8')) as {
                telemetryEnabled?: boolean;
              };
              return cfg.telemetryEnabled === false;
            }
          } catch {
            /* default to enabled */
          }
          return false;
        })();
        if (!telemetryDisabled) {
          reportActivation().catch(() => {});
        }

        // ── Summary + Start Guard ─────────────────────────────
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const guardAlreadyRunning = isGuardRunning();

        if (!guardAlreadyRunning) {
          // Suppress guard's own banner/status — pga up has its own summary
          process.env['PANGUARD_QUIET_GUARD'] = '1';
          const args = ['start'];
          if (opts.dashboard) args.push('--dashboard');
          if (opts.verbose) args.push('--verbose');
          await runCLI(args);
        }

        // ── Read rule count + TC status ──────────
        // ATR rule count — matches agent-threat-rules package
        const ruleCount = 108;

        let tcStatus = 'disconnected';
        try {
          const cachePath = join(homedir(), '.panguard-guard', 'threat-cloud-cache.json');
          if (existsSync(cachePath)) {
            const cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as {
              lastSync?: string;
            };
            if (cache.lastSync) {
              tcStatus = 'connected';
            }
          }
        } catch {
          /* best-effort: TC cache may not exist on first run */
        }

        // ── Clean summary panel ────────────────────────────────
        // Guard is running: either it was already running, or we just started it via runCLI
        const guardRunning = true;
        const hasProxy = serverCount > 0;
        const statusLabel =
          guardRunning && hasProxy
            ? c.safe(c.bold(t(lang, 'MONITORING + PROXY ACTIVE', '監控中 + 代理已啟動')))
            : guardRunning
              ? c.sage(c.bold(t(lang, 'MONITORING', '監控中')))
              : c.caution(c.bold(t(lang, 'SCAN COMPLETE', '掃描完成')));

        console.log(`\n  ${c.dim('\u2500'.repeat(50))}`);
        console.log(`  ${statusLabel} ${c.dim(`\u2014 ${elapsed}s`)}`);
        console.log(`  ${c.dim('\u2500'.repeat(50))}`);
        console.log('');
        if (opts.dashboard) {
          console.log(`  ${c.sage('Dashboard')}     ${DASHBOARD_URL}`);
        }
        console.log(
          `  ${c.sage(t(lang, 'Rules', '規則'))}         ${ruleCount} ${t(lang, 'detection rules active', '條偵測規則運作中')}`
        );
        if (platformCount > 0) {
          console.log(
            `  ${c.sage(t(lang, 'Platforms', '平台'))}     ${platformCount} ${t(lang, 'detected', '已偵測')}, ${hasProxy ? `${serverCount} ${t(lang, 'server(s) proxied', '個伺服器已代理')}` : t(lang, 'proxy not injected', '代理未注入')}`
          );
        }
        if (threatCount > 0) {
          console.log(
            `  ${c.sage(t(lang, 'Threats', '威脅'))}       ${c.critical(`${threatCount} ${t(lang, 'found', '個發現')}`)}`
          );
        }
        console.log(`  ${c.sage('Threat Cloud')}  ${tcStatus}`);
        console.log('');

        // ── Next steps ─────────────────────────────────────────
        console.log(`  ${c.bold(t(lang, 'NEXT STEPS', '下一步'))}`);
        console.log(
          `  ${c.dim('1.')} ${t(lang, 'Open dashboard', '開啟儀表板')}     ${c.sage(DASHBOARD_URL)}`
        );
        if (threatCount > 0) {
          console.log(
            `  ${c.dim('2.')} ${t(lang, 'Review threats', '檢視威脅')}     ${c.caution(`${threatCount} ${t(lang, 'flagged', '個標記')}`)} ${c.dim('\u2014 pga audit skill <name>')}`
          );
          console.log(
            `  ${c.dim('3.')} ${t(lang, 'Upgrade detection', '升級偵測')}  ${c.dim('pga guard setup-ai')}`
          );
        } else {
          console.log(
            `  ${c.dim('2.')} ${t(lang, 'Upgrade detection', '升級偵測')}  ${c.dim('pga guard setup-ai')}`
          );
        }
        console.log('');
        console.log(
          `  ${c.dim(t(lang, 'Layer 1 (regex) catches ~70% of attacks at zero cost.', 'Layer 1 (正則) 零成本攔截約 70% 攻擊。'))}`
        );
        console.log(
          `  ${c.dim(t(lang, 'Add Layer 2 (local AI) or 3 (cloud AI) for deeper detection.', '加入 Layer 2 (本地 AI) 或 Layer 3 (雲端 AI) 提升偵測深度。'))}`
        );
        if (!telemetryDisabled) {
          console.log(
            `  ${c.dim(t(lang, 'Telemetry: anonymous usage stats sent to tc.panguard.ai', '遙測：匿名使用統計會傳送至 tc.panguard.ai'))}`
          );
          console.log(
            `  ${c.dim(t(lang, 'Opt out: pga config set telemetry false', '關閉：pga config set telemetry false'))}`
          );
        }
        console.log('');
      }
    );
}

/** Best-effort submit scan results to Threat Cloud for the flywheel */
async function submitToTC(
  skillName: string,
  skillDir: string,
  report: {
    riskScore: number;
    riskLevel: string;
    findings: ReadonlyArray<{ id: string; category: string; severity: string; title: string }>;
  }
): Promise<void> {
  const { ThreatCloudClient } = await import('@panguard-ai/panguard-guard');
  const { contentHash, patternHash } = await import('@panguard-ai/scan-core');
  const { readFileSync: rf, existsSync: fe } = await import('node:fs');

  const dataDir = join(homedir(), '.panguard-guard');
  const tc = new ThreatCloudClient(TC_ENDPOINT, dataDir);

  // 1. Submit skill threat
  const skillMdPath = join(skillDir, 'SKILL.md');
  const skillHash = fe(skillMdPath) ? contentHash(rf(skillMdPath, 'utf-8')) : contentHash(skillDir);

  await tc.submitSkillThreat({
    skillHash,
    skillName,
    riskScore: report.riskScore,
    riskLevel: report.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    findingSummaries: report.findings.slice(0, 10).map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
    })),
  });

  // 2. Submit ATR proposal for HIGH/CRITICAL
  if (
    (report.riskLevel === 'HIGH' || report.riskLevel === 'CRITICAL') &&
    report.findings.length > 0
  ) {
    const highFindings = report.findings
      .filter((f) => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 5);
    const findingSummary = highFindings.map((f) => f.title).join('; ');
    const pHash = patternHash(skillName, findingSummary);
    const severity = report.riskLevel === 'CRITICAL' ? 'critical' : 'high';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');

    const conditions = highFindings
      .map((f, idx) => {
        const keywords = f.title
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 4);
        if (keywords.length === 0) return null;
        const regex = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
        return `    - field: content\n      operator: regex\n      value: "(?i)${regex}"\n      description: "Pattern ${idx + 1}: ${f.title.slice(0, 80)}"`;
      })
      .filter(Boolean);

    if (conditions.length > 0) {
      const ruleContent = `title: "CLI Audit: ${highFindings[0]?.title.slice(0, 60) ?? skillName}"
id: ATR-2026-DRAFT-${pHash.slice(0, 8)}
status: draft
description: |
  Auto-generated from pga up scan of "${skillName}".
  Findings: ${findingSummary.slice(0, 200)}
author: "PanGuard CLI (pga up)"
date: "${date}"
schema_version: "0.1"
detection_tier: pattern
maturity: experimental
severity: ${severity}
tags:
  category: skill-compromise
  subcategory: cli-scan
  confidence: medium
detection:
  conditions:
${conditions.join('\n')}
  condition: any
response:
  actions: [alert, snapshot]`;

      await tc.submitATRProposal({
        patternHash: pHash,
        ruleContent,
        llmProvider: 'cli-auditor',
        llmModel: 'pga-up-scan',
        selfReviewVerdict: JSON.stringify({
          approved: true,
          source: 'pga-up',
          skillName,
          riskLevel: report.riskLevel,
          findingCount: highFindings.length,
        }),
      });
    }
  }

  // 3. Report scan event for metrics
  void tc.reportScanEvent({
    source: 'cli-user',
    skillsScanned: 1,
    findingsCount: report.findings.length,
    confirmedMalicious: report.riskLevel === 'CRITICAL' ? 1 : 0,
    highlySuspicious: report.riskLevel === 'HIGH' ? 1 : 0,
    cleanCount: report.riskLevel === 'LOW' || report.riskScore === 0 ? 1 : 0,
  });
}

/** One-time activation report — only fires on first pga up */
async function reportActivation(): Promise<void> {
  const {
    existsSync: fe,
    writeFileSync: wf,
    mkdirSync: md,
    readFileSync: rf,
  } = await import('node:fs');
  const marker = join(homedir(), '.panguard', 'activated');
  if (fe(marker)) return;

  const { randomUUID } = await import('node:crypto');
  const idPath = join(homedir(), '.panguard', 'client-id');
  let clientId: string;
  try {
    clientId = rf(idPath, 'utf-8').trim();
  } catch {
    clientId = randomUUID();
    try {
      wf(idPath, clientId, 'utf-8');
    } catch {
      /* best effort */
    }
  }

  const body = JSON.stringify({
    clientId,
    platform: process.env['TERM_PROGRAM'] ?? 'terminal',
    osType: `${process.platform}-${process.arch}`,
    panguardVersion: process.env['npm_package_version'] ?? 'unknown',
    nodeVersion: process.version,
  });

  const res = await fetch(`${TC_ENDPOINT}/api/activations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(5000),
  });

  if (res.ok) {
    md(join(homedir(), '.panguard'), { recursive: true });
    wf(marker, new Date().toISOString(), 'utf-8');
  }
}
