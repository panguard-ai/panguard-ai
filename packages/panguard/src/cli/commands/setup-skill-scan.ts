/**
 * Setup Skill Scanner - Discover, audit, and whitelist installed AI skills
 * 安裝技能掃描器 - 發現、審核並將已安裝的 AI 技能加入白名單
 *
 * Used by `panguard setup` to scan all installed MCP servers across
 * detected platforms, audit each for security risks, and interactively
 * manage flagged skills.
 *
 * @module @panguard-ai/panguard/cli/commands/setup-skill-scan
 */

import {
  c,
  symbols,
  table,
  ProgressBar,
  promptSelect,
  divider,
} from '@panguard-ai/core';
import type { TableColumn } from '@panguard-ai/core';
import type { MCPServerEntry } from '@panguard-ai/panguard-mcp/config';
import type { AuditReport } from '@panguard-ai/panguard-skill-auditor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillScanResult {
  readonly entry: MCPServerEntry;
  readonly audit: AuditReport | null;
  readonly status: 'safe' | 'caution' | 'flagged' | 'unknown';
}

export interface SkillScanOptions {
  readonly skipAI?: boolean;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classifyRisk(audit: AuditReport | null): 'safe' | 'caution' | 'flagged' | 'unknown' {
  if (!audit) return 'unknown';
  if (audit.riskLevel === 'CRITICAL' || audit.riskLevel === 'HIGH') return 'flagged';
  if (audit.riskLevel === 'MEDIUM') return 'caution';
  return 'safe';
}

function statusIcon(status: string): string {
  switch (status) {
    case 'safe': return c.green(symbols.pass);
    case 'caution': return c.yellow(symbols.warn);
    case 'flagged': return c.red(symbols.fail);
    default: return c.dim(symbols.dot);
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'safe': return c.green('SAFE');
    case 'caution': return c.yellow('CAUTION');
    case 'flagged': return c.red('FLAGGED');
    default: return c.dim('UNKNOWN');
  }
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Audit all discovered skills and classify by risk level.
 */
export async function scanInstalledSkills(
  skills: readonly MCPServerEntry[],
  options?: SkillScanOptions,
): Promise<readonly SkillScanResult[]> {
  if (skills.length === 0) return [];

  // Dynamic import to avoid circular deps
  const { auditSkill } = await import('@panguard-ai/panguard-skill-auditor');
  const { resolveSkillDir } = await import('@panguard-ai/panguard-mcp/config');

  const bar = new ProgressBar({ total: skills.length, width: 30 });
  const results: SkillScanResult[] = [];

  for (let i = 0; i < skills.length; i++) {
    const entry = skills[i]!;
    bar.update(i + 1);

    const skillDir = resolveSkillDir(entry);
    let audit: AuditReport | null = null;

    if (skillDir) {
      try {
        audit = await auditSkill(skillDir, { skipAI: options?.skipAI ?? true });
      } catch {
        // Audit failed — treat as unknown
      }
    }

    results.push({
      entry,
      audit,
      status: classifyRisk(audit),
    });
  }

  bar.complete();
  return results;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render skill scan results as a formatted table.
 */
export function renderSkillScanResults(results: readonly SkillScanResult[]): void {
  if (results.length === 0) {
    console.log(c.dim(`  ${symbols.info} No MCP skills found across detected platforms.`));
    return;
  }

  const safe = results.filter((r) => r.status === 'safe').length;
  const caution = results.filter((r) => r.status === 'caution').length;
  const flagged = results.filter((r) => r.status === 'flagged').length;
  const unknown = results.filter((r) => r.status === 'unknown').length;

  console.log();
  console.log(c.bold(`  Skill Scan Results (${results.length} skills found):`));
  console.log();

  // Summary line
  const parts: string[] = [];
  if (safe > 0) parts.push(c.green(`${safe} safe`));
  if (caution > 0) parts.push(c.yellow(`${caution} caution`));
  if (flagged > 0) parts.push(c.red(`${flagged} flagged`));
  if (unknown > 0) parts.push(c.dim(`${unknown} unknown`));
  console.log(`    ${parts.join('  |  ')}`);
  console.log();

  // Table
  const columns: TableColumn[] = [
    { header: '', key: 'icon', width: 5 },
    { header: 'Skill', key: 'name', width: 30 },
    { header: 'Platform', key: 'platform', width: 14 },
    { header: 'Risk', key: 'risk', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
  ];

  const rows = results.map((r) => ({
    icon: statusIcon(r.status),
    name: r.entry.name,
    platform: r.entry.platformId,
    risk: r.audit ? `${r.audit.riskScore}/100` : '-',
    status: statusLabel(r.status),
  }));

  table(columns, rows);
}

// ---------------------------------------------------------------------------
// Interactive Review
// ---------------------------------------------------------------------------

/**
 * Interactively review flagged skills with the user.
 * Returns names of skills the user chose to whitelist.
 */
export async function reviewFlaggedSkills(
  flagged: readonly SkillScanResult[],
): Promise<readonly string[]> {
  if (flagged.length === 0) return [];

  console.log();
  divider('Flagged Skills Review');
  console.log();

  const whitelisted: string[] = [];

  for (const result of flagged) {
    const name = result.entry.name;
    const riskScore = result.audit?.riskScore ?? 0;
    const findings = result.audit?.findings ?? [];

    console.log(c.red(`  ${symbols.fail} ${c.bold(name)}`));
    console.log(c.dim(`    Platform: ${result.entry.platformId}`));
    console.log(c.dim(`    Risk Score: ${riskScore}/100`));

    if (findings.length > 0) {
      console.log(c.dim(`    Findings:`));
      for (const f of findings.slice(0, 5)) {
        console.log(c.dim(`      - [${f.severity}] ${f.title}`));
      }
      if (findings.length > 5) {
        console.log(c.dim(`      ... and ${findings.length - 5} more`));
      }
    }
    console.log();

    const choice = await promptSelect({
      title: {
        en: `What to do with ${name}?`,
        'zh-TW': `${name} 要如何處理？`,
      },
      options: [
        { label: { en: 'Keep and whitelist (I trust this skill)', 'zh-TW': '保留並加入白名單（我信任此技能）' }, value: 'whitelist' },
        { label: { en: 'Keep but monitor (do not whitelist)', 'zh-TW': '保留但監控（不加入白名單）' }, value: 'monitor' },
        { label: { en: 'Skip for now', 'zh-TW': '暫時跳過' }, value: 'skip' },
      ],
      lang: 'en',
    });

    if (choice === 'whitelist') {
      whitelisted.push(name);
      console.log(c.green(`    ${symbols.pass} ${name} will be whitelisted`));
    } else if (choice === 'monitor') {
      console.log(c.yellow(`    ${symbols.warn} ${name} will be monitored`));
    }
    console.log();
  }

  return whitelisted;
}

/**
 * Auto-whitelist safe skills (used in --yes mode).
 * Returns names of whitelisted skills.
 */
export function collectSafeSkillNames(results: readonly SkillScanResult[]): readonly string[] {
  return results
    .filter((r) => r.status === 'safe' || r.status === 'caution')
    .map((r) => r.entry.name);
}
