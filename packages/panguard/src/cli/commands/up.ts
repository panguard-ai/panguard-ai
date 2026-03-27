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

const DASHBOARD_URL = 'http://127.0.0.1:3100';

function openBrowser(url: string): void {
  const os = platform();
  if (os === 'win32') {
    // 'start' is a cmd.exe built-in, not an executable — must invoke via cmd /c
    execFile('cmd', ['/c', 'start', '', url], () => {});
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

      // ── Step 1: Open dashboard immediately ───────────────────
      if (opts.dashboard) {
        console.log(`  ${c.sage(`Opening dashboard: ${DASHBOARD_URL}`)}\n`);
        openBrowser(DASHBOARD_URL);
      }

      // ── Step 2: Scan installed skills ────────────────────────
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

                for (const skill of unknown.slice(0, 20)) {
                  try {
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
                  } catch {
                    // Skip skills that can't be audited
                  }
                }
              } catch {
                // Skill auditor not available
              }

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

      // ── Step 3: Start Guard ────────────────────────────────
      if (isGuardRunning()) {
        console.log(`  ${c.safe(`${symbols.pass} Guard is already running.`)}\n`);
        return;
      }

      console.log(`  ${symbols.info} ${c.bold('Starting protection...')}\n`);

      const args = ['start'];
      if (opts.dashboard) args.push('--dashboard');
      if (opts.verbose) args.push('--verbose');

      await runCLI(args);
    });
}
