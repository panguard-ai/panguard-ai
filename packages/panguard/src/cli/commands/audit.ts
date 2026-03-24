/**
 * panguard audit - Skill security auditing command
 * panguard audit - 技能安全審計命令
 */

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { c, banner, divider, box, symbols, setLogLevel } from '@panguard-ai/core';
import { contentHash, patternHash } from '@panguard-ai/scan-core';

/** Default Threat Cloud endpoint */
const DEFAULT_TC_ENDPOINT = 'https://tc.panguard.ai';

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
  const cmd = new Command('audit').description(
    'Audit security of OpenClaw skills / 審計 OpenClaw 技能的安全性'
  );

  cmd
    .command('skill')
    .description('Audit a SKILL.md directory for security issues / 審計 SKILL.md 目錄的安全問題')
    .argument(
      '<path>',
      'Path to skill directory containing SKILL.md / 包含 SKILL.md 的技能目錄路徑'
    )
    .option('--json', 'Output as JSON / 以 JSON 格式輸出', false)
    .option('--verbose', 'Verbose output / 詳細輸出', false)
    .option('--no-cloud', 'Skip Threat Cloud submission / 不回報至 Threat Cloud')
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

        const resolvedPath = path.resolve(skillPath);

        if (!options.json) {
          banner('Panguard Skill Auditor');
          console.log(c.dim(`  Scanning: ${resolvedPath}`));
          console.log();
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
            const skillName =
              path.basename(resolvedPath) === 'SKILL.md'
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
          console.log(JSON.stringify(report, null, 2));
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
          } catch {
            // Best effort
          }
        }

        // Exit code
        if (report.riskLevel === 'CRITICAL') process.exitCode = 2;
        else if (report.riskLevel === 'HIGH') process.exitCode = 1;
      }
    );

  return cmd;
}
