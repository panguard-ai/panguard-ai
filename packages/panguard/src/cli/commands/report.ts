/**
 * panguard report — AI Compliance Audit Evidence report generator
 *
 * Reads ATR rule YAML (from @panguard-ai/agent-threat-rules node_modules) and
 * produces auditor-readable reports mapping each rule to compliance framework
 * articles / clauses / subcategories. This is the Enterprise tier's core
 * differentiator (product "D1").
 *
 * Usage:
 *   pga report list-frameworks
 *   pga report summary --framework <name>
 *   pga report generate --framework <name> [--format md|json] [--output <path>]
 *
 * Supported framework ids:
 *   owasp-agentic   — OWASP Agentic Top 10 (2026)
 *   owasp-llm       — OWASP LLM Top 10 (2025)
 *   eu-ai-act       — EU AI Act (Regulation 2024/1689)
 *   colorado-ai-act — Colorado SB24-205
 *   nist-ai-rmf     — NIST AI RMF 1.0
 *   iso-42001       — ISO/IEC 42001:2023
 *
 * @module @panguard-ai/panguard/cli/commands/report
 */

import { Command } from 'commander';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { c, symbols } from '@panguard-ai/core';

const require = createRequire(import.meta.url);

// ─── Framework catalog ───────────────────────────────────────────────

type FrameworkId =
  | 'owasp-agentic'
  | 'owasp-llm'
  | 'eu-ai-act'
  | 'colorado-ai-act'
  | 'nist-ai-rmf'
  | 'iso-42001';

interface FrameworkMeta {
  id: FrameworkId;
  /** Key used in ATR rule YAML compliance: block */
  yamlKey: string;
  name: string;
  authority: string;
  enforcementDate?: string;
  /** Field on each mapping entry that identifies the article / section / clause */
  identifierField: 'id' | 'article' | 'section' | 'clause';
  /** Status of ATR rule coverage for this framework */
  coverageStatus: 'shipped' | 'partial' | 'planned';
}

const FRAMEWORKS: readonly FrameworkMeta[] = [
  {
    id: 'owasp-agentic',
    yamlKey: 'owasp_agentic',
    name: 'OWASP Agentic Top 10 (2026)',
    authority: 'OWASP Foundation',
    identifierField: 'id',
    coverageStatus: 'partial',
  },
  {
    id: 'owasp-llm',
    yamlKey: 'owasp_llm',
    name: 'OWASP LLM Top 10 (2025)',
    authority: 'OWASP Foundation',
    identifierField: 'id',
    coverageStatus: 'partial',
  },
  {
    id: 'eu-ai-act',
    yamlKey: 'eu_ai_act',
    name: 'EU AI Act (Regulation 2024/1689)',
    authority: 'European Union',
    enforcementDate: '2026-08-02',
    identifierField: 'article',
    coverageStatus: 'planned',
  },
  {
    id: 'colorado-ai-act',
    yamlKey: 'colorado_ai_act',
    name: 'Colorado AI Act (SB24-205)',
    authority: 'State of Colorado',
    enforcementDate: '2026-06-30',
    identifierField: 'section',
    coverageStatus: 'planned',
  },
  {
    id: 'nist-ai-rmf',
    yamlKey: 'nist_ai_rmf',
    name: 'NIST AI Risk Management Framework 1.0',
    authority: 'NIST (US Dept of Commerce)',
    identifierField: 'clause',
    coverageStatus: 'planned',
  },
  {
    id: 'iso-42001',
    yamlKey: 'iso_42001',
    name: 'ISO/IEC 42001:2023 AIMS',
    authority: 'ISO / IEC',
    identifierField: 'clause',
    coverageStatus: 'planned',
  },
];

// ─── ATR rule loading ────────────────────────────────────────────────

interface ComplianceEntry {
  identifier: string;
  clause?: string;
  clauseName?: string;
  context: string;
  strength: 'primary' | 'secondary' | 'partial';
}

interface ATRRule {
  id: string;
  title: string;
  severity: string;
  status: string;
  maturity: string;
  category: string;
  filePath: string;
  /** Keyed by framework.yamlKey */
  compliance: Record<string, ComplianceEntry[]>;
}

/**
 * Locate the agent-threat-rules rule directory.
 *
 * Precedence:
 *   1. $PANGUARD_ATR_RULES_DIR env var — for local development against an
 *      ATR repo checkout (useful when hacking on new compliance metadata
 *      before npm publish).
 *   2. Installed npm package in node_modules / pnpm hoisted location.
 *   3. Monorepo dev layout (panguard/packages/panguard → ../../node_modules/...).
 */
function findRulesDir(): string | null {
  const envDir = process.env['PANGUARD_ATR_RULES_DIR'];
  if (envDir && existsSync(envDir) && statSync(envDir).isDirectory()) {
    return envDir;
  }
  const candidates = [
    resolve(process.cwd(), 'node_modules', 'agent-threat-rules', 'rules'),
    resolve(process.cwd(), 'node_modules', '.pnpm', 'node_modules', 'agent-threat-rules', 'rules'),
    resolve(process.cwd(), '..', '..', 'node_modules', 'agent-threat-rules', 'rules'),
  ];
  for (const p of candidates) {
    if (existsSync(p) && statSync(p).isDirectory()) return p;
  }
  return null;
}

function collectYamlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectYamlFiles(full));
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      results.push(full);
    }
  }
  return results;
}

function parseRule(filePath: string): ATRRule | null {
  // Load js-yaml lazily — only needed when report runs
  let yaml: { load: (s: string) => unknown };
  try {
    yaml = require('js-yaml') as { load: (s: string) => unknown };
  } catch {
    return null;
  }

  let doc: Record<string, unknown>;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    doc = yaml.load(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!doc || typeof doc !== 'object' || !doc['id']) return null;

  const tags = (doc['tags'] as Record<string, unknown>) ?? {};
  const compliance = (doc['compliance'] as Record<string, unknown>) ?? {};

  // Normalise compliance entries per framework into uniform shape
  const normalisedCompliance: Record<string, ComplianceEntry[]> = {};
  for (const fw of FRAMEWORKS) {
    const raw = compliance[fw.yamlKey];
    if (!Array.isArray(raw)) continue;
    normalisedCompliance[fw.yamlKey] = raw
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map((e) => {
        const identifierField = fw.identifierField;
        const rawId =
          identifierField === 'clause' && fw.id === 'nist-ai-rmf'
            ? `${String(e['function'] ?? '')}.${String(e['subcategory'] ?? '')}`
            : String(e[identifierField] ?? '');
        return {
          identifier: rawId,
          clause: typeof e['clause'] === 'string' ? (e['clause'] as string) : undefined,
          clauseName:
            typeof e['clause_name'] === 'string' ? (e['clause_name'] as string) : undefined,
          context: String(e['context'] ?? ''),
          strength: (e['strength'] as 'primary' | 'secondary' | 'partial' | undefined) ?? 'primary',
        };
      })
      .filter((e) => e.identifier && e.context);
  }

  return {
    id: String(doc['id']),
    title: String(doc['title'] ?? ''),
    severity: String(doc['severity'] ?? 'unknown'),
    status: String(doc['status'] ?? 'unknown'),
    maturity: String(doc['maturity'] ?? 'unknown'),
    category: String(tags['category'] ?? 'uncategorised'),
    filePath,
    compliance: normalisedCompliance,
  };
}

function loadAllRules(): { rules: ATRRule[]; rulesDir: string | null } {
  const rulesDir = findRulesDir();
  if (!rulesDir) return { rules: [], rulesDir: null };
  const files = collectYamlFiles(rulesDir).sort();
  const rules: ATRRule[] = [];
  for (const f of files) {
    const r = parseRule(f);
    if (r) rules.push(r);
  }
  return { rules, rulesDir };
}

// ─── Report building ─────────────────────────────────────────────────

interface CoverageSummary {
  framework: FrameworkMeta;
  totalRules: number;
  mappedRules: number;
  totalMappings: number;
  byIdentifier: Map<string, { count: number; context: string[] }>;
}

function buildCoverage(rules: ATRRule[], fw: FrameworkMeta): CoverageSummary {
  const byIdentifier = new Map<string, { count: number; context: string[] }>();
  let mappedRules = 0;
  let totalMappings = 0;

  for (const r of rules) {
    const entries = r.compliance[fw.yamlKey];
    if (!entries || entries.length === 0) continue;
    mappedRules++;
    for (const e of entries) {
      totalMappings++;
      const key = e.identifier;
      const existing = byIdentifier.get(key) ?? { count: 0, context: [] };
      existing.count++;
      existing.context.push(`${r.id}: ${e.context}`);
      byIdentifier.set(key, existing);
    }
  }

  return {
    framework: fw,
    totalRules: rules.length,
    mappedRules,
    totalMappings,
    byIdentifier,
  };
}

function renderMarkdown(coverage: CoverageSummary, orgName: string): string {
  const fw = coverage.framework;
  const today = new Date().toISOString().slice(0, 10);
  const sortedIds = Array.from(coverage.byIdentifier.keys()).sort();
  const coveragePercent =
    coverage.totalRules > 0
      ? ((coverage.mappedRules / coverage.totalRules) * 100).toFixed(1)
      : '0.0';

  const lines: string[] = [];
  lines.push(`# AI Compliance Audit Evidence Report`);
  lines.push('');
  lines.push(`- **Framework**: ${fw.name}`);
  lines.push(`- **Authority**: ${fw.authority}`);
  if (fw.enforcementDate) {
    lines.push(`- **Enforcement date**: ${fw.enforcementDate}`);
  }
  lines.push(`- **Organisation**: ${orgName}`);
  lines.push(`- **Report date**: ${today}`);
  lines.push(`- **ATR rules in set**: ${coverage.totalRules}`);
  lines.push(`- **Rules mapped to this framework**: ${coverage.mappedRules} (${coveragePercent}%)`);
  lines.push(`- **Total mappings (rule × article)**: ${coverage.totalMappings}`);
  lines.push('');
  lines.push(`---`);
  lines.push('');

  if (coverage.mappedRules === 0) {
    lines.push(
      `> **Status: Mapping in progress.** The \`compliance.${fw.yamlKey}\` metadata block`
    );
    lines.push(`> has not yet been authored for any rules in this ATR release. See`);
    lines.push(
      `> [compliance-metadata.md](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/spec/compliance-metadata.md)`
    );
    lines.push(`> for the target schema and the roll-out plan.`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`## Mapping by ${fw.identifierField}`);
  lines.push('');

  for (const id of sortedIds) {
    const detail = coverage.byIdentifier.get(id);
    if (!detail) continue;
    lines.push(`### ${id}`);
    lines.push(`*${detail.count} rule${detail.count === 1 ? '' : 's'} address this control*`);
    lines.push('');
    for (const line of detail.context) {
      lines.push(`- ${line}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push('');
  lines.push(`## Provenance`);
  lines.push('');
  lines.push(
    `Every mapping in this report originates from an ATR rule YAML file in the public MIT-licensed repository.`
  );
  lines.push(
    `Each \`compliance:\` entry is a human-authored statement reviewed against the spec in \`spec/compliance-metadata.md\`.`
  );
  lines.push('');
  lines.push(
    `For traceability chain: ATR rule ID → \`compliance.${fw.yamlKey}\` block → identifier → rule file in the repo.`
  );
  lines.push('');
  lines.push(
    `**Limitations**: this is a *rule-coverage* report — which ATR rules claim to address which framework controls. A full audit also requires *event evidence* (which detections your deployment actually triggered during the audit period). See \`pga sensor status\` and the PanGuard Enterprise audit-log export for event-level evidence.`
  );
  return lines.join('\n');
}

function renderJson(coverage: CoverageSummary, orgName: string): string {
  const fw = coverage.framework;
  const byIdentifier: Record<string, { count: number; context: string[] }> = {};
  for (const [k, v] of coverage.byIdentifier.entries()) {
    byIdentifier[k] = v;
  }
  return JSON.stringify(
    {
      framework: fw,
      organisation: orgName,
      reportDate: new Date().toISOString(),
      totalRules: coverage.totalRules,
      mappedRules: coverage.mappedRules,
      totalMappings: coverage.totalMappings,
      byIdentifier,
    },
    null,
    2
  );
}

// ─── CLI wiring ──────────────────────────────────────────────────────

function resolveFramework(id: string): FrameworkMeta | null {
  return FRAMEWORKS.find((f) => f.id === id) ?? null;
}

function listFrameworksAction(): void {
  const { rules, rulesDir } = loadAllRules();
  console.log('');
  console.log(`  ${c.bold('AI COMPLIANCE FRAMEWORKS')}`);
  console.log(`  ${c.dim('─'.repeat(68))}`);
  if (!rulesDir) {
    console.log(`  ${c.caution(symbols.warn)} Could not locate the agent-threat-rules package.`);
    console.log(`  ${c.dim('Install it or run from a monorepo with ATR rules available.')}`);
    console.log('');
    return;
  }
  console.log(`  ${c.dim(`Loaded ${rules.length} ATR rules from`)} ${c.dim(rulesDir)}`);
  console.log('');
  for (const fw of FRAMEWORKS) {
    const coverage = buildCoverage(rules, fw);
    const pct = rules.length > 0 ? ((coverage.mappedRules / rules.length) * 100).toFixed(1) : '0.0';
    const state =
      coverage.mappedRules === 0
        ? c.caution(`planned`)
        : coverage.mappedRules < rules.length / 2
          ? c.caution(`partial`)
          : c.safe(`shipped`);
    console.log(`  ${c.sage(fw.id.padEnd(18))} ${fw.name}`);
    console.log(
      `  ${' '.repeat(18)} ${c.dim(`${coverage.mappedRules}/${rules.length} rules mapped (${pct}%)`)} · ${state}`
    );
    if (fw.enforcementDate) {
      console.log(`  ${' '.repeat(18)} ${c.dim('Enforcement:')} ${fw.enforcementDate}`);
    }
    console.log('');
  }
  console.log(`  ${c.dim('Generate a report:')} ${c.sage('pga report generate --framework <id>')}`);
  console.log('');
}

function summaryAction(opts: { framework?: string }): void {
  const fw = opts.framework ? resolveFramework(opts.framework) : null;
  if (!fw) {
    console.log(
      `  ${c.caution(symbols.warn)} --framework <id> required. Run ${c.sage('pga report list-frameworks')} to see options.`
    );
    return;
  }
  const { rules } = loadAllRules();
  const coverage = buildCoverage(rules, fw);
  const pct = rules.length > 0 ? ((coverage.mappedRules / rules.length) * 100).toFixed(1) : '0.0';
  console.log('');
  console.log(`  ${c.bold(fw.name)}`);
  console.log(`  ${c.dim('─'.repeat(68))}`);
  console.log(`  ${c.dim('Authority:')}         ${fw.authority}`);
  if (fw.enforcementDate) {
    console.log(`  ${c.dim('Enforcement date:')}  ${fw.enforcementDate}`);
  }
  console.log(`  ${c.dim('ATR rules in set:')}  ${rules.length}`);
  console.log(`  ${c.dim('Rules mapped:')}      ${coverage.mappedRules} (${pct}%)`);
  console.log(`  ${c.dim('Total mappings:')}    ${coverage.totalMappings}`);
  console.log('');
  if (coverage.byIdentifier.size > 0) {
    console.log(`  ${c.bold(`Coverage by ${fw.identifierField}`)}`);
    const sorted = Array.from(coverage.byIdentifier.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );
    for (const [id, detail] of sorted.slice(0, 10)) {
      console.log(
        `    ${c.sage(id.padEnd(18))} ${c.dim(`${detail.count} rule${detail.count === 1 ? '' : 's'}`)}`
      );
    }
    if (sorted.length > 10) {
      console.log(`    ${c.dim(`… and ${sorted.length - 10} more`)}`);
    }
  } else {
    console.log(
      `  ${c.caution('No mappings authored yet for this framework. See spec/compliance-metadata.md.')}`
    );
  }
  console.log('');
}

function generateAction(opts: {
  framework?: string;
  format?: string;
  output?: string;
  org?: string;
}): void {
  const fw = opts.framework ? resolveFramework(opts.framework) : null;
  if (!fw) {
    console.log(
      `  ${c.caution(symbols.warn)} --framework <id> required. Run ${c.sage('pga report list-frameworks')} to see options.`
    );
    return;
  }
  const format = opts.format === 'json' ? 'json' : 'md';
  const orgName = opts.org ?? 'Your Organisation';
  const { rules } = loadAllRules();
  const coverage = buildCoverage(rules, fw);
  const content =
    format === 'json' ? renderJson(coverage, orgName) : renderMarkdown(coverage, orgName);

  if (opts.output) {
    // opts.output is a user-provided absolute or relative path we write to
    writeFileSync(opts.output, content, 'utf-8'); // eslint-disable-line security/detect-non-literal-fs-filename
    console.log(`  ${c.safe(symbols.pass)} Wrote ${format.toUpperCase()} report to ${opts.output}`);
  } else {
    process.stdout.write(content + '\n');
  }
}

function validateAction(): void {
  const { rules, rulesDir } = loadAllRules();
  if (!rulesDir) {
    console.log(`  ${c.caution(symbols.warn)} Could not locate ATR rules.`);
    return;
  }
  let errors = 0;
  let mapped = 0;
  let unmapped = 0;
  for (const r of rules) {
    const hasAny = Object.values(r.compliance).some((v) => v.length > 0);
    if (hasAny) mapped++;
    else unmapped++;
    for (const fw of FRAMEWORKS) {
      const entries = r.compliance[fw.yamlKey];
      if (!entries) continue;
      for (const e of entries) {
        if (!e.identifier) {
          console.log(
            `  ${c.critical(symbols.fail)} ${r.id}: missing ${fw.identifierField} in ${fw.yamlKey} entry`
          );
          errors++;
        }
        if (!e.context || e.context.length < 20) {
          console.log(
            `  ${c.caution(symbols.warn)} ${r.id}: ${fw.yamlKey} entry for ${e.identifier} has no / short context (<20 chars)`
          );
        }
      }
    }
  }
  console.log('');
  console.log(`  ${c.bold('VALIDATION SUMMARY')}`);
  console.log(`  ${c.dim('Rules total:')}       ${rules.length}`);
  console.log(`  ${c.sage('Rules mapped:')}      ${mapped}`);
  console.log(`  ${c.caution('Rules unmapped:')}    ${unmapped}`);
  console.log(
    errors > 0
      ? `  ${c.critical('Errors:')}            ${errors}`
      : `  ${c.safe('Errors:')}            0`
  );
  console.log('');
}

export function reportCommand(): Command {
  const cmd = new Command('report').description('AI Compliance Audit Evidence report generator');

  cmd
    .command('list-frameworks')
    .description('List supported compliance frameworks + coverage status')
    .action(() => listFrameworksAction());

  cmd
    .command('summary')
    .description('Show compliance coverage summary for one framework')
    .option('--framework <id>', 'Framework id — see: pga report list-frameworks')
    .action((opts: { framework?: string }) => summaryAction(opts));

  cmd
    .command('generate')
    .description('Generate a Markdown or JSON compliance evidence report')
    .option('--framework <id>', 'Framework id')
    .option('--format <fmt>', 'Output format: md (default) | json')
    .option('--output <path>', 'Write report to file instead of stdout')
    .option('--org <name>', 'Organisation name for the report header')
    .action((opts: { framework?: string; format?: string; output?: string; org?: string }) =>
      generateAction(opts)
    );

  cmd
    .command('validate')
    .description('Validate all compliance: blocks in the ATR rule set')
    .action(() => validateAction());

  return cmd;
}
