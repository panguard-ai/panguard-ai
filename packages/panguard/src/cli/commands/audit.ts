/**
 * panguard audit - Skill security auditing command
 * panguard audit - 技能安全審計命令
 *
 * Supports local paths, GitHub URLs, and ClawHub URLs:
 *   pga audit skill ./my-skill/
 *   pga audit skill https://github.com/owner/repo
 *   pga audit skill https://clawhub.ai/owner/repo
 */

import { Command } from 'commander';
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { c, banner, divider, box, symbols, setLogLevel } from '@panguard-ai/core';
import { contentHash, patternHash } from '@panguard-ai/scan-core';
import {
  buildEventsFromAuditReport,
  getTcCorrelationHeaders,
  syncEvents,
} from '../workspace-sync.js';
import { PANGUARD_VERSION } from '../../index.js';

/** Default Threat Cloud endpoint */
const DEFAULT_TC_ENDPOINT = 'https://tc.panguard.ai';

// ---------------------------------------------------------------------------
// URL detection & content fetching
// ---------------------------------------------------------------------------

/** Check if the argument looks like a URL */
function isUrl(input: string): boolean {
  return (
    /^https?:\/\//i.test(input) || /^github\.com\//i.test(input) || /^clawhub\.ai\//i.test(input)
  );
}

interface ParsedUrl {
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
  source: 'github' | 'clawhub';
}

/** Parse GitHub or ClawHub URL into components */
function parseSkillUrl(input: string): ParsedUrl | null {
  try {
    const urlStr = input.startsWith('http') ? input : `https://${input}`;
    const u = new URL(urlStr);
    const isGitHub = u.hostname.includes('github.com');
    const isClawHub = u.hostname.includes('clawhub.ai');
    if (!isGitHub && !isClawHub) return null;

    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 2) return null;

    const owner = parts[0] ?? '';
    const repo = (parts[1] ?? '').replace(/\.git$/, '');
    if (!owner || !repo) return null;
    let branch = 'main';
    let basePath = '';

    if (parts.length > 3 && (parts[2] === 'tree' || parts[2] === 'blob')) {
      branch = parts[3] ?? 'main';
      basePath = parts.slice(4).join('/');
    }

    return {
      owner,
      repo,
      branch,
      basePath,
      source: (isGitHub ? 'github' : 'clawhub') as 'github' | 'clawhub',
    };
  } catch {
    return null;
  }
}

/** Fetch a single file from GitHub raw content */
async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Fetch SKILL.md content from GitHub/ClawHub, trying multiple candidate paths */
async function fetchSkillContent(
  parsed: ParsedUrl
): Promise<{ content: string; source: string } | null> {
  const { owner, repo, branch, basePath, source } = parsed;

  // ClawHub repos are mirrored on GitHub — fetch from raw.githubusercontent.com
  const candidates = basePath
    ? [`${basePath}/SKILL.md`, `${basePath}/skill.md`, 'SKILL.md', 'skill.md']
    : ['SKILL.md', 'skill.md', 'src/SKILL.md'];

  for (const candidate of candidates) {
    const content = await fetchRawFile(owner, repo, branch, candidate);
    if (content) return { content, source: `${source}:${owner}/${repo}/${candidate}` };
  }

  // Fallback: README.md
  const readme = await fetchRawFile(owner, repo, branch, 'README.md');
  if (readme) return { content: readme, source: `${source}:${owner}/${repo}/README.md` };

  return null;
}

/** Write fetched content to a temp directory for auditSkill() */
function writeToTempDir(content: string, skillName: string): string {
  const dir = path.join(
    tmpdir(),
    `pga-audit-${Date.now()}-${skillName.replace(/[^a-z0-9-]/gi, '_')}`
  );
  mkdirSync(dir, { recursive: true });
  // Prepend frontmatter with skill name if content lacks YAML frontmatter
  const hasFrontmatter = content.trimStart().startsWith('---');
  const finalContent = hasFrontmatter ? content : `---\nname: "${skillName}"\n---\n\n${content}`;
  writeFileSync(path.join(dir, 'SKILL.md'), finalContent, 'utf-8');
  return dir;
}

// ---------------------------------------------------------------------------
// Hash utility
// ---------------------------------------------------------------------------

/**
 * Compute a content hash of a skill's SKILL.md using scan-core's canonical hash.
 * Identical to what the website produces — critical for TC dedup.
 */
function computeSkillHash(skillDir: string): string {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) return contentHash(skillDir);
  const content = readFileSync(skillMdPath, 'utf-8');
  return contentHash(content);
}

export function auditCommand(): Command {
  const cmd = new Command('audit').description('Audit security of OpenClaw skills');

  cmd
    .command('skill')
    .description('Audit a skill for security issues (local path, GitHub URL, or ClawHub URL)')
    .argument(
      '<path-or-url>',
      'Local path, GitHub URL (github.com/owner/repo), or ClawHub URL (clawhub.ai/owner/repo)'
    )
    .option('--json', 'Output as JSON', false)
    .option('--verbose', 'Verbose output', false)
    .option('--no-cloud', 'Skip Threat Cloud submission')
    .option('--tc-endpoint <url>', 'Threat Cloud endpoint', DEFAULT_TC_ENDPOINT)
    .action(
      async (
        skillPath: string,
        options: {
          json: boolean;
          verbose: boolean;
          cloud: boolean;
          tcEndpoint: string;
        }
      ) => {
        if (options.verbose) {
          setLogLevel('debug');
        } else if (!options.json) {
          setLogLevel('silent');
        }

        // ── Detect URL vs local path ──
        let resolvedPath: string;
        let tempDir: string | null = null;
        let remoteSource: string | null = null;

        if (isUrl(skillPath)) {
          const parsed = parseSkillUrl(skillPath);
          if (!parsed) {
            if (options.json) {
              console.log(
                JSON.stringify({ error: 'Unsupported URL format. Use GitHub or ClawHub URLs.' })
              );
            } else {
              console.error(c.red('  Unsupported URL format. Supported:'));
              console.error(c.dim('    https://github.com/owner/repo'));
              console.error(c.dim('    https://clawhub.ai/owner/repo'));
            }
            process.exitCode = 1;
            return;
          }

          if (!options.json) {
            banner('Panguard Skill Auditor');
            console.log(c.dim(`  Fetching: ${parsed.source}:${parsed.owner}/${parsed.repo}...`));
          }

          const fetched = await fetchSkillContent(parsed);
          if (!fetched) {
            if (options.json) {
              console.log(
                JSON.stringify({
                  error: `Could not find SKILL.md in ${parsed.owner}/${parsed.repo}. Is the repo public?`,
                })
              );
            } else {
              console.error(c.red(`  Could not find SKILL.md in ${parsed.owner}/${parsed.repo}.`));
              console.error(c.dim('  Make sure the repository is public and contains SKILL.md.'));
            }
            process.exitCode = 1;
            return;
          }

          const skillName = `${parsed.owner}/${parsed.repo}`;
          tempDir = writeToTempDir(fetched.content, skillName);
          resolvedPath = tempDir;
          remoteSource = fetched.source;

          if (!options.json) {
            console.log(c.dim(`  Source: ${remoteSource}`));
            console.log();
          }
        } else {
          resolvedPath = path.resolve(skillPath);

          if (!options.json) {
            banner('Panguard Skill Auditor');
            console.log(c.dim(`  Scanning: ${resolvedPath}`));
            console.log();
          }
        }

        const { auditSkill } = await import('@panguard-ai/panguard-skill-auditor');

        // ── Tier 1: Blacklist pre-check from Threat Cloud ──
        let isBlacklisted = false;
        let blacklistReason = '';

        // ── Fetch cloud rules from Threat Cloud (flywheel: community rules enhance audits) ──
        type CloudATRRule = {
          id: string;
          title: string;
          detection: unknown;
          [key: string]: unknown;
        };
        const cloudRules: CloudATRRule[] = [];
        if (options.cloud) {
          try {
            const { ThreatCloudClient } = await import('@panguard-ai/panguard-guard');
            const dataDir = path.join(
              process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
              '.panguard-guard'
            );
            const tc = new ThreatCloudClient(options.tcEndpoint, dataDir);

            // Tier 1: Check blacklist before running full audit
            const skillHash = computeSkillHash(resolvedPath);
            const skillName = remoteSource
              ? remoteSource
                  .replace(/^(github|clawhub):/, '')
                  .replace(/\/(SKILL|skill|README)\.md$/, '')
              : path.basename(resolvedPath) === 'SKILL.md'
                ? path.basename(path.dirname(resolvedPath))
                : path.basename(resolvedPath);
            try {
              const blacklist = await tc.fetchSkillBlacklist();
              const match = blacklist.find(
                (b) =>
                  b.skillHash === skillHash || b.skillName.toLowerCase() === skillName.toLowerCase()
              );
              if (match) {
                isBlacklisted = true;
                blacklistReason = `Known malicious skill (${match.reportCount} community reports, avg risk: ${match.avgRiskScore})`;
                if (!options.json) {
                  console.log();
                  console.log(
                    `  ${c.red(symbols.fail)} ${c.bold(c.red('BLOCKED:'))} ${c.red(blacklistReason)}`
                  );
                  console.log(
                    `  ${c.dim(`Skill: ${skillName} | Hash: ${skillHash.slice(0, 12)}...`)}`
                  );
                  console.log();
                }
              }
            } catch {
              // Blacklist fetch is best-effort
            }

            // Fetch community ATR rules
            const atrUpdates = await tc.fetchATRRules();
            for (const update of atrUpdates) {
              try {
                const parsed = JSON.parse(update.ruleContent) as CloudATRRule;
                if (parsed.id && parsed.title && parsed.detection) {
                  cloudRules.push(parsed);
                }
              } catch {
                // Skip unparseable rules
              }
            }
            if (cloudRules.length > 0 && !options.json) {
              console.log(c.dim(`  Threat Cloud: ${cloudRules.length} community rule(s) loaded`));
              if (!isBlacklisted) console.log();
            }
          } catch {
            // Threat Cloud fetch is best-effort — never block the audit
          }
        }

        // If blacklisted, still run audit for telemetry but override risk level
        const report = await auditSkill(resolvedPath, { cloudRules });

        // Override risk level if blacklisted
        if (isBlacklisted) {
          report.riskLevel = 'CRITICAL';
          report.riskScore = Math.max(report.riskScore, 100);
          report.findings.unshift({
            id: 'BLACKLIST-001',
            category: 'code',
            severity: 'critical',
            title: blacklistReason,
            description: blacklistReason,
          } as (typeof report.findings)[0]);
        }

        if (options.json) {
          const jsonReport = remoteSource ? { ...report, remoteSource, url: skillPath } : report;
          console.log(JSON.stringify(jsonReport, null, 2));
        } else {
          // Pretty output
          const levelColors: Record<string, (s: string) => string> = {
            LOW: c.green,
            MEDIUM: c.yellow,
            HIGH: c.red,
            CRITICAL: (s: string) => c.bold(c.red(s)),
          };
          const colorFn = levelColors[report.riskLevel] ?? c.dim;

          console.log(
            box(
              [
                `${c.bold('Panguard Skill Audit Report')}`,
                '',
                `Skill:      ${report.manifest?.name ?? 'Unknown'}${report.manifest?.metadata?.version ? ` v${report.manifest.metadata.version}` : ''}`,
                `Author:     ${report.manifest?.metadata?.author ?? 'Unknown'}`,
                `Risk Score: ${colorFn(`${report.riskScore}/100 (${report.riskLevel})`)}`,
                `Duration:   ${report.durationMs}ms`,
              ].join('\n')
            )
          );

          console.log();

          for (const check of report.checks) {
            const icon =
              check.status === 'pass'
                ? c.green(symbols.pass)
                : check.status === 'fail'
                  ? c.red(symbols.fail)
                  : check.status === 'warn'
                    ? c.yellow(symbols.warn)
                    : c.blue(symbols.info);
            const statusLabel =
              check.status === 'pass'
                ? 'PASS'
                : check.status === 'fail'
                  ? 'FAIL'
                  : check.status === 'warn'
                    ? 'WARN'
                    : 'INFO';
            console.log(`  ${icon} [${statusLabel}] ${check.label}`);
          }

          // Show AI setup hint if AI check was skipped
          const aiSkipped = report.checks.some(
            (ch) => ch.status === 'info' && ch.label.includes('AI Analysis')
          );
          if (aiSkipped) {
            console.log();
            console.log(
              c.yellow('  Tip: AI analysis was skipped. To enable deeper semantic analysis:')
            );
            console.log(c.dim('       - Ollama (free, local): ollama pull llama3'));
            console.log(c.dim('       - Or set ANTHROPIC_API_KEY or OPENAI_API_KEY'));
          }

          console.log();
          divider();

          if (report.findings.length > 0 && options.verbose) {
            console.log();
            console.log(c.bold('  Detailed Findings:'));
            console.log();
            for (const finding of report.findings) {
              const sevColor =
                finding.severity === 'critical'
                  ? c.red
                  : finding.severity === 'high'
                    ? c.yellow
                    : c.dim;
              console.log(`  ${sevColor(`[${finding.severity.toUpperCase()}]`)} ${finding.title}`);
              console.log(`    ${c.dim(finding.description)}`);
              if (finding.location) console.log(`    ${c.dim(`at ${finding.location}`)}`);
              console.log();
            }
          }
        }

        // ── Report to Threat Cloud (flywheel) ──
        if (options.cloud && report.riskScore > 0) {
          const skillHash = computeSkillHash(resolvedPath);
          const skillName = report.manifest?.name ?? path.basename(resolvedPath);

          const submission = {
            skillHash,
            skillName,
            riskScore: report.riskScore,
            riskLevel: report.riskLevel,
            findingSummaries: report.findings.slice(0, 10).map((f) => ({
              id: f.id,
              category: f.category,
              severity: f.severity,
              title: f.title,
            })),
          };

          try {
            const { ThreatCloudClient } = await import('@panguard-ai/panguard-guard');
            const dataDir = path.join(
              process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
              '.panguard-guard'
            );
            const tc = new ThreatCloudClient(options.tcEndpoint, dataDir);
            const submitted = await tc.submitSkillThreat(submission);

            if (!options.json) {
              if (submitted) {
                console.log();
                console.log(
                  `  ${c.green(symbols.pass)} ${c.dim('Threat intelligence shared with Threat Cloud')}`
                );
              } else {
                console.log();
                console.log(
                  `  ${c.dim(`${symbols.info} Threat Cloud offline — results saved locally`)}`
                );
              }
            }
          } catch {
            // Threat Cloud submission is best-effort — never block the audit
            if (!options.json) {
              console.log();
              console.log(
                `  ${c.dim(`${symbols.info} Threat Cloud unavailable — results saved locally`)}`
              );
            }
          }
        }

        // ── Flywheel: submit ATR proposal for HIGH/CRITICAL findings ──
        if (
          options.cloud &&
          (report.riskLevel === 'HIGH' || report.riskLevel === 'CRITICAL') &&
          report.findings.length > 0
        ) {
          try {
            const { ThreatCloudClient } = await import('@panguard-ai/panguard-guard');
            const dataDir = path.join(
              process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
              '.panguard-guard'
            );
            const tc = new ThreatCloudClient(options.tcEndpoint, dataDir);
            const skillName = report.manifest?.name ?? path.basename(resolvedPath);

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
                const regex = keywords
                  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                  .join('.*');
                return `    - field: content\n      operator: regex\n      value: "(?i)${regex}"\n      description: "Pattern ${idx + 1}: ${f.title.slice(0, 80)}"`;
              })
              .filter(Boolean);

            if (conditions.length > 0) {
              const ruleContent = `title: "CLI Audit: ${highFindings[0]?.title.slice(0, 60) ?? skillName}"
id: ATR-2026-DRAFT-${pHash.slice(0, 8)}
status: draft
description: |
  Auto-generated from CLI audit of "${skillName}".
  Findings: ${findingSummary.slice(0, 200)}
author: "PanGuard CLI Auditor"
date: "${date}"
schema_version: "0.1"
detection_tier: pattern
maturity: experimental
severity: ${severity}
tags:
  category: skill-compromise
  subcategory: cli-audit
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
                llmModel: 'pattern-extraction',
                selfReviewVerdict: JSON.stringify({
                  approved: true,
                  source: 'cli-auditor',
                  skillName,
                  riskLevel: report.riskLevel,
                  findingCount: highFindings.length,
                }),
              });

              if (!options.json) {
                console.log(
                  `  ${c.green(symbols.pass)} ${c.dim('ATR rule proposal submitted to Threat Cloud')}`
                );
              }
            }
          } catch {
            // ATR proposal submission is best-effort
          }
        }

        // Report scan event to TC for metrics (always, regardless of findings)
        if (options.cloud) {
          try {
            const { ThreatCloudClient } = await import('@panguard-ai/panguard-guard');
            const dataDir = path.join(
              process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
              '.panguard-guard'
            );
            const tc = new ThreatCloudClient(options.tcEndpoint, dataDir);
            void tc.reportScanEvent({
              source: 'cli-user',
              skillsScanned: 1,
              findingsCount: report.findings.length,
              confirmedMalicious: report.riskLevel === 'CRITICAL' ? 1 : 0,
              highlySuspicious: report.riskLevel === 'HIGH' ? 1 : 0,
              cleanCount: report.riskLevel === 'LOW' || report.riskScore === 0 ? 1 : 0,
            });

            // Also report usage event for counter dashboard. When the user is
            // logged in, include workspace correlation headers so future TC
            // upgrades can join this anonymous telemetry back to the paid
            // workspace's events in Supabase (the bridge schema from
            // supabase/migrations/20260422000006_tc_org_link.sql).
            void fetch(`${options.tcEndpoint}/api/usage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getTcCorrelationHeaders(),
              },
              body: JSON.stringify({
                event_type: 'cli_scan',
                source: 'cli-user',
                metadata: {
                  skill: report.manifest?.name ?? path.basename(resolvedPath),
                  risk: report.riskLevel,
                  score: report.riskScore,
                  remote: !!remoteSource,
                },
              }),
              signal: AbortSignal.timeout(3000),
            }).catch(() => {});
          } catch {
            // Best effort
          }
        }

        // ── Workspace sync: if user is logged in (`pga login`), mirror this
        //    scan into their app.panguard.ai dashboard. Community / anonymous
        //    users skip this path automatically (syncEvents returns with
        //    skipped='anonymous'). Silent on success unless --verbose.
        try {
          // Compute a stable hash of the scanned target so the dashboard can
          // dedup repeated scans of the same artifact.
          let targetHash: string | undefined;
          try {
            targetHash = computeSkillHash(resolvedPath);
          } catch {
            targetHash = undefined;
          }
          const events = buildEventsFromAuditReport({
            target: remoteSource ?? resolvedPath,
            targetHash,
            riskLevel: report.riskLevel,
            riskScore: report.riskScore,
            findings: report.findings as Array<{
              ruleId?: string;
              severity?: string;
              title?: string;
              description?: string;
            }>,
            skillName: report.manifest?.name ?? path.basename(resolvedPath),
          });
          await syncEvents(events, {
            panguardVersion: PANGUARD_VERSION,
            verbose: !!options.verbose,
          });
        } catch {
          // syncEvents is already non-throwing; this is a belt-and-braces.
        }

        // Clean up temp directory if we fetched from URL
        if (tempDir) {
          try {
            rmSync(tempDir, { recursive: true, force: true });
          } catch {
            // Best-effort cleanup
          }
        }

        // Exit code
        if (report.riskLevel === 'CRITICAL') process.exitCode = 2;
        else if (report.riskLevel === 'HIGH') process.exitCode = 1;
      }
    );

  return cmd;
}
