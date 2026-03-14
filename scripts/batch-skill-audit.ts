#!/usr/bin/env npx tsx
/**
 * Batch Skill Auditor — 批次技能審計工具
 *
 * Scans all SKILL.md files + commands + agents on the machine,
 * runs PanGuard Skill Auditor on each, and produces:
 *   1. A summary report (JSON + console)
 *   2. An initial whitelist (skill-whitelist.json)
 *   3. A flagged list for manual review
 *
 * Usage:
 *   npx tsx scripts/batch-skill-audit.ts [--include-commands] [--include-agents] [--output <dir>]
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditFinding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  location?: string;
}

interface AuditReport {
  skillPath: string;
  manifest: {
    name?: string;
    description?: string;
    metadata?: { version?: string; author?: string };
  } | null;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  checks: Array<{ status: string; label: string; findings: AuditFinding[] }>;
  findings: AuditFinding[];
  auditedAt: string;
  durationMs: number;
}

interface BatchResult {
  name: string;
  path: string;
  type: 'skill' | 'command' | 'agent';
  riskScore: number;
  riskLevel: string;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topFindings: string[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

const HOME = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '/tmp';

function discoverSkills(): Array<{
  path: string;
  name: string;
  type: 'skill' | 'command' | 'agent';
}> {
  const targets: Array<{ path: string; name: string; type: 'skill' | 'command' | 'agent' }> = [];

  // 1. Global skills (~/.claude/skills/*)
  const skillsDir = join(HOME, '.claude', 'skills');
  if (existsSync(skillsDir)) {
    const findSkillMd = (dir: string, depth: number): void => {
      if (depth > 3) return;
      const skillMd = join(dir, 'SKILL.md');
      if (existsSync(skillMd)) {
        targets.push({ path: dir, name: basename(dir), type: 'skill' });
        return; // Don't recurse into skill directories
      }
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            findSkillMd(join(dir, entry.name), depth + 1);
          }
        }
      } catch {
        /* permission denied etc */
      }
    };
    findSkillMd(skillsDir, 0);
  }

  // 2. Global commands (~/.claude/commands/*.md) — wrap as SKILL.md for auditing
  const includeCommands = process.argv.includes('--include-commands');
  if (includeCommands) {
    const cmdsDir = join(HOME, '.claude', 'commands');
    if (existsSync(cmdsDir)) {
      for (const entry of readdirSync(cmdsDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          targets.push({
            path: join(cmdsDir, entry.name),
            name: entry.name.replace('.md', ''),
            type: 'command',
          });
        }
      }
    }
  }

  // 3. Global agents (~/.claude/agents/*.md) — wrap as SKILL.md for auditing
  const includeAgents = process.argv.includes('--include-agents');
  if (includeAgents) {
    const agentsDir = join(HOME, '.claude', 'agents');
    if (existsSync(agentsDir)) {
      for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          targets.push({
            path: join(agentsDir, entry.name),
            name: entry.name.replace('.md', ''),
            type: 'agent',
          });
        }
      }
    }
  }

  return targets;
}

/**
 * For commands/agents that are single .md files (not directories with SKILL.md),
 * create a temporary directory with a SKILL.md wrapper so the auditor can scan them.
 */
function wrapAsSkillDir(filePath: string, name: string, type: 'command' | 'agent'): string {
  const tmpDir = mkdtempSync(join(tmpdir(), `panguard-audit-${type}-`));
  const content = readFileSync(filePath, 'utf-8');

  const wrapped = `---
name: ${name}
description: "Claude Code ${type}: ${name}"
---

${content}
`;
  writeFileSync(join(tmpDir, 'SKILL.md'), wrapped, 'utf-8');
  return tmpDir;
}

// ---------------------------------------------------------------------------
// Audit Runner
// ---------------------------------------------------------------------------

async function runAudit(
  auditFn: (path: string) => Promise<AuditReport>,
  targets: Array<{ path: string; name: string; type: 'skill' | 'command' | 'agent' }>
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  const tempDirs: string[] = [];

  const total = targets.length;
  let current = 0;

  for (const target of targets) {
    current++;
    const pct = Math.round((current / total) * 100);
    process.stdout.write(
      `\r  [${pct}%] Auditing ${current}/${total}: ${target.name}...`.padEnd(80)
    );

    let scanPath = target.path;

    // Wrap non-skill files as temporary SKILL.md directories
    if (target.type !== 'skill') {
      scanPath = wrapAsSkillDir(target.path, target.name, target.type);
      tempDirs.push(scanPath);
    }

    try {
      const report = await auditFn(scanPath);

      const bySev = (sev: string) => report.findings.filter((f) => f.severity === sev).length;

      results.push({
        name: target.name,
        path: target.path,
        type: target.type,
        riskScore: report.riskScore,
        riskLevel: report.riskLevel,
        findingsCount: report.findings.length,
        criticalCount: bySev('critical'),
        highCount: bySev('high'),
        mediumCount: bySev('medium'),
        lowCount: bySev('low'),
        topFindings: report.findings
          .filter((f) => f.severity === 'critical' || f.severity === 'high')
          .slice(0, 5)
          .map((f) => `[${f.severity.toUpperCase()}] ${f.title}`),
        durationMs: report.durationMs,
      });
    } catch (err) {
      results.push({
        name: target.name,
        path: target.path,
        type: target.type,
        riskScore: -1,
        riskLevel: 'ERROR',
        findingsCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        topFindings: [`Error: ${err instanceof Error ? err.message : String(err)}`],
        durationMs: 0,
      });
    }
  }

  // Clean up temp directories
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  process.stdout.write('\r'.padEnd(80) + '\r');
  return results;
}

// ---------------------------------------------------------------------------
// Whitelist Generation
// ---------------------------------------------------------------------------

interface WhitelistEntry {
  name: string;
  normalizedName: string;
  source: 'manual';
  addedAt: string;
  fingerprintHash?: string;
  reason: string;
}

function generateWhitelist(results: BatchResult[]): {
  whitelist: WhitelistEntry[];
  revoked: string[];
} {
  const now = new Date().toISOString();
  const whitelist: WhitelistEntry[] = [];
  const revoked: string[] = [];

  for (const r of results) {
    if (r.riskLevel === 'ERROR') continue;

    if (r.riskLevel === 'LOW') {
      whitelist.push({
        name: r.name,
        normalizedName: r.name.toLowerCase().trim().replace(/\s+/g, '-'),
        source: 'manual',
        addedAt: now,
        reason: `Batch audit: LOW risk (score ${r.riskScore}/100, ${r.findingsCount} findings)`,
      });
    }
    // CRITICAL/HIGH go to implicit blacklist (revoked)
    if (r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH') {
      revoked.push(r.name.toLowerCase().trim().replace(/\s+/g, '-'));
    }
  }

  return { whitelist, revoked };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(results: BatchResult[]): void {
  const sorted = [...results].sort((a, b) => b.riskScore - a.riskScore);

  const byLevel = {
    CRITICAL: sorted.filter((r) => r.riskLevel === 'CRITICAL'),
    HIGH: sorted.filter((r) => r.riskLevel === 'HIGH'),
    MEDIUM: sorted.filter((r) => r.riskLevel === 'MEDIUM'),
    LOW: sorted.filter((r) => r.riskLevel === 'LOW'),
    ERROR: sorted.filter((r) => r.riskLevel === 'ERROR'),
  };

  console.log('\n' + '='.repeat(70));
  console.log('  PANGUARD BATCH SKILL AUDIT REPORT');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(70));

  console.log(`\n  Total scanned: ${results.length}`);
  console.log(`  CRITICAL: ${byLevel.CRITICAL.length}`);
  console.log(`  HIGH:     ${byLevel.HIGH.length}`);
  console.log(`  MEDIUM:   ${byLevel.MEDIUM.length}`);
  console.log(`  LOW:      ${byLevel.LOW.length}`);
  if (byLevel.ERROR.length > 0) console.log(`  ERROR:    ${byLevel.ERROR.length}`);

  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  console.log(`  Duration: ${(totalMs / 1000).toFixed(1)}s total`);

  // CRITICAL & HIGH details
  if (byLevel.CRITICAL.length > 0 || byLevel.HIGH.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('  FLAGGED FOR REVIEW (CRITICAL + HIGH)');
    console.log('-'.repeat(70));

    for (const r of [...byLevel.CRITICAL, ...byLevel.HIGH]) {
      console.log(`\n  [${r.riskLevel}] ${r.name} (${r.type}) — score: ${r.riskScore}/100`);
      console.log(`    Path: ${r.path}`);
      for (const f of r.topFindings) {
        console.log(`    - ${f}`);
      }
    }
  }

  // MEDIUM summary
  if (byLevel.MEDIUM.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('  MEDIUM RISK (review recommended)');
    console.log('-'.repeat(70));

    for (const r of byLevel.MEDIUM) {
      const findings = r.topFindings.length > 0 ? ` — ${r.topFindings[0]}` : '';
      console.log(
        `  ${r.name} (${r.type}): score ${r.riskScore}/100, ${r.findingsCount} findings${findings}`
      );
    }
  }

  // LOW (just names)
  if (byLevel.LOW.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log(`  LOW RISK — AUTO-WHITELISTED (${byLevel.LOW.length} skills)`);
    console.log('-'.repeat(70));
    const names = byLevel.LOW.map((r) => r.name);
    // Print in columns
    const cols = 3;
    for (let i = 0; i < names.length; i += cols) {
      const row = names
        .slice(i, i + cols)
        .map((n) => n.padEnd(28))
        .join('');
      console.log(`  ${row}`);
    }
  }

  console.log('\n' + '='.repeat(70));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n  PanGuard Batch Skill Auditor');
  console.log('  Discovering skills, commands, and agents...\n');

  const targets = discoverSkills();

  const skillCount = targets.filter((t) => t.type === 'skill').length;
  const cmdCount = targets.filter((t) => t.type === 'command').length;
  const agentCount = targets.filter((t) => t.type === 'agent').length;

  console.log(`  Found: ${skillCount} skills, ${cmdCount} commands, ${agentCount} agents`);
  console.log(`  Total: ${targets.length} targets to audit\n`);

  if (targets.length === 0) {
    console.log('  No targets found. Use --include-commands and --include-agents to expand scope.');
    process.exit(0);
  }

  // Import auditor
  const { auditSkill } = await import('@panguard-ai/panguard-skill-auditor');

  // Run batch audit
  const results = await runAudit(auditSkill, targets);

  // Generate whitelist
  const whitelistData = generateWhitelist(results);

  // Determine output directory
  const outputIdx = process.argv.indexOf('--output');
  const outputDir =
    outputIdx >= 0 && process.argv[outputIdx + 1]
      ? resolve(process.argv[outputIdx + 1]!)
      : join(HOME, '.panguard-guard');

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Save whitelist
  const whitelistPath = join(outputDir, 'skill-whitelist.json');
  writeFileSync(whitelistPath, JSON.stringify(whitelistData, null, 2), 'utf-8');

  // Save full report
  const reportPath = join(outputDir, 'batch-audit-report.json');
  const reportData = {
    auditedAt: new Date().toISOString(),
    totalScanned: results.length,
    summary: {
      critical: results.filter((r) => r.riskLevel === 'CRITICAL').length,
      high: results.filter((r) => r.riskLevel === 'HIGH').length,
      medium: results.filter((r) => r.riskLevel === 'MEDIUM').length,
      low: results.filter((r) => r.riskLevel === 'LOW').length,
      error: results.filter((r) => r.riskLevel === 'ERROR').length,
    },
    whitelisted: whitelistData.whitelist.length,
    flagged: whitelistData.revoked.length,
    results,
  };
  writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');

  // Print report
  printReport(results);

  console.log(`\n  Output files:`);
  console.log(`    Whitelist: ${whitelistPath}`);
  console.log(`    Report:    ${reportPath}`);
  console.log(`    Whitelisted: ${whitelistData.whitelist.length} skills`);
  console.log(`    Flagged:     ${whitelistData.revoked.length} skills`);
  console.log();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
