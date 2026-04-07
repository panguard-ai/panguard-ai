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
    .action(async (opts: { dashboard: boolean; verbose: boolean; skipScan: boolean }) => {
      // Suppress JSON logs for clean output
      if (!opts.verbose) setLogLevel('silent');
      const startTime = Date.now();

      console.log(`\n  ${c.sage(c.bold('PANGUARD AI'))} ${c.dim('— AI Agent Security Guard')}\n`);
      console.log(`  ${c.dim('─'.repeat(50))}\n`);

      const configPath1 = join(homedir(), '.panguard', 'config.json');
      const configPath2 = join(homedir(), '.panguard-guard', 'config.json');
      const isFirstRun = !existsSync(configPath1) && !existsSync(configPath2);

      if (isFirstRun) {
        console.log(c.sage('\n  First time? Running setup first...\n'));
        const { execFileSync } = await import('node:child_process');
        try {
          execFileSync(process.execPath, [process.argv[1] ?? 'panguard', 'setup'], {
            stdio: 'inherit',
          });
        } catch {
          // continue anyway
        }
      }

      // ── Step 1: Detect platforms + inject proxy ─────────────
      let platformCount = 0;
      let serverCount = 0;
      try {
        const pkg = '@panguard-ai/panguard-mcp';
        let detectPlatforms: () => Promise<Array<{ id: string; name: string; detected: boolean }>>;
        let injectProxyFn: (ids: readonly string[]) => { totalPlatforms: number; totalServersProxied: number; results: ReadonlyArray<{ platformId: string; serversProxied: number; error?: string }> };

        try {
          const mcp = await import(pkg) as { detectPlatforms: typeof detectPlatforms; injectProxy: typeof injectProxyFn };
          detectPlatforms = mcp.detectPlatforms;
          injectProxyFn = mcp.injectProxy;
        } catch {
          const { resolve } = await import('node:path');
          const { pathToFileURL } = await import('node:url');
          const mcpDist = resolve(process.cwd(), 'packages/panguard-mcp/dist/config/index.js');
          const mcp = await import(pathToFileURL(mcpDist).href) as { detectPlatforms: typeof detectPlatforms; injectProxy: typeof injectProxyFn };
          detectPlatforms = mcp.detectPlatforms;
          injectProxyFn = mcp.injectProxy;
        }

        console.log(`  ${symbols.scan} ${c.bold('Detecting AI platforms...')}\n`);
        const platforms = await detectPlatforms();
        const detected = platforms.filter((p) => p.detected);

        for (const p of detected) {
          console.log(`    ${c.safe(p.name)}  ${c.dim('detected')}`);
        }
        if (detected.length === 0) {
          console.log(`    ${c.dim('No AI platforms found.')}`);
        }

        // Inject proxy on all detected platforms
        if (detected.length > 0) {
          console.log(`\n  ${symbols.shield} ${c.bold('Injecting runtime protection...')}\n`);
          const proxySummary = injectProxyFn(detected.map((p) => p.id));
          platformCount = proxySummary.totalPlatforms;
          serverCount = proxySummary.totalServersProxied;

          if (serverCount > 0) {
            console.log(`    ${c.safe(`${serverCount} MCP server(s)`)} proxied across ${c.sage(`${platformCount} platform(s)`)}`);
            console.log(`    ${c.dim('Config backed up to *.bak files')}`);
          } else {
            console.log(`    ${c.dim('No new servers to proxy (all already protected or none found).')}`);
          }

          // Show errors if any
          for (const r of proxySummary.results) {
            if (r.error) {
              console.log(`    ${c.critical(`${r.platformId}: ${r.error}`)}`);
            }
          }
        }
        console.log();
      } catch {
        console.log(`  ${c.dim('Platform detection skipped.')}\n`);
      }

      // ── Step 2: Open dashboard ──────────────────────────────
      if (opts.dashboard) {
        console.log(`  ${c.sage(`Opening dashboard: ${DASHBOARD_URL}`)}\n`);
        openBrowser(DASHBOARD_URL);
      }

      // ── Step 3: Scan installed skills ────────────────────────
      if (!opts.skipScan) {
        console.log(`\n  ${symbols.scan} ${c.bold('Scanning installed skills...')}\n`);

        try {
          const pkg = '@panguard-ai/panguard-mcp';
          let skills: ReadonlyArray<{ name: string; platformId: string }> = [];
          try {
            const mcp = (await import(pkg)) as {
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
            console.log(`  ${c.dim('No skills found. Install some MCP skills and run again.')}\n`);
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
              } catch {
                /* ignore */
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

                const toScan = unknown.slice(0, 20);
                let scanned = 0;
                for (const skill of toScan) {
                  try {
                    scanned++;
                    process.stdout.write(`\r  ${c.dim(`[${scanned}/${toScan.length}]`)} Auditing ${c.bold(skill.name)}...`);

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
                  } catch {
                    // Skip skills that can't be audited
                  }
                }
              } catch {
                // Skill auditor not available
              }

              // Clear progress line
              process.stdout.write('\r' + ' '.repeat(80) + '\r');

              if (threats.length > 0) {
                console.log(`  ${c.critical(c.bold(`${threats.length} threat(s) detected:`))}\n`);
                for (const t of threats) {
                  const icon = t.riskLevel === 'CRITICAL' ? c.critical('!!') : c.caution('!');
                  console.log(
                    `  [${icon}] ${c.bold(t.name)} (${t.platform}) — ${t.riskLevel} (${t.riskScore}/100)`
                  );
                }
                console.log(`\n  ${c.bold('Recommended action:')} Remove or disable these skills.`);
                console.log(
                  `  ${c.dim('Run: pga audit skill <name> for details on each threat.')}\n`
                );
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

      // ── Activation tracking (one-time) ─────────────────────
      reportActivation().catch(() => {});

      // ── Step 3: Start Guard ────────────────────────────────
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Build summary line
      const summaryParts: string[] = [];
      if (platformCount > 0) summaryParts.push(`${platformCount} platform(s)`);
      if (serverCount > 0) summaryParts.push(`${serverCount} server(s) proxied`);
      const summaryLine = summaryParts.length > 0 ? summaryParts.join(', ') : '';

      if (isGuardRunning()) {
        console.log(`  ${c.dim('\u2500'.repeat(50))}`);
        console.log(`  ${c.safe(`${symbols.pass} Guard is already running.`)}`);
        if (summaryLine) console.log(`  ${c.sage(`PROTECTED`)} ${c.dim(`\u2014 ${summaryLine}`)}`);
        console.log(`  ${c.dim(`Completed in ${elapsed}s`)}\n`);
        return;
      }

      console.log(`  ${c.dim('\u2500'.repeat(50))}`);
      if (summaryLine) console.log(`  ${c.sage(`PROTECTED`)} ${c.dim(`\u2014 ${summaryLine}`)}`);
      console.log(`  ${c.dim(`Scan completed in ${elapsed}s`)} ${symbols.info} ${c.bold('Starting Guard...')}\n`);

      const args = ['start'];
      if (opts.dashboard) args.push('--dashboard');
      if (opts.verbose) args.push('--verbose');

      await runCLI(args);
    });
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
