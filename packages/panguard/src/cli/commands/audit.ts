/**
 * panguard audit - Skill security auditing command
 * panguard audit - 技能安全審計命令
 */

import { Command } from 'commander';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { c, banner, divider, box, symbols, setLogLevel } from '@panguard-ai/core';

/** Default Threat Cloud endpoint */
const DEFAULT_TC_ENDPOINT = 'https://tc.panguard.ai';

/**
 * Compute a SHA-256 hash of a skill's SKILL.md content for anonymized tracking.
 */
function computeSkillHash(skillDir: string): string {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) return createHash('sha256').update(skillDir).digest('hex');
  const content = readFileSync(skillMdPath, 'utf-8');
  return createHash('sha256').update(content).digest('hex');
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
        if (options.verbose) setLogLevel('debug');

        const resolvedPath = path.resolve(skillPath);

        if (!options.json) {
          banner('Panguard Skill Auditor');
          console.log(c.dim(`  Scanning: ${resolvedPath}`));
          console.log();
        }

        const { auditSkill } = await import('@panguard-ai/panguard-skill-auditor');

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
              console.log();
            }
          } catch {
            // Threat Cloud fetch is best-effort — never block the audit
          }
        }

        const report = await auditSkill(resolvedPath, { cloudRules });

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

        // Exit code
        if (report.riskLevel === 'CRITICAL') process.exitCode = 2;
        else if (report.riskLevel === 'HIGH') process.exitCode = 1;
      }
    );

  return cmd;
}
