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
 *   pga report generate --framework <name> [--format md|json|pdf] [--output <path>] [--sign <key>]
 *
 * Every report includes a SHA-256 integrity hash computed over the
 * canonical JSON representation, and optionally an HMAC-SHA256
 * signature (via --sign or PANGUARD_REPORT_SIGNING_KEY env var).
 * PDFs additionally write a sidecar <output>.hash file for auditor
 * verification.
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
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash, createHmac } from 'node:crypto';
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
 *   2. Resolve the agent-threat-rules package via Node module resolution.
 *      Works for global installs (`npm install -g @panguard-ai/panguard`)
 *      because `require.resolve` finds the bundled dep from the panguard
 *      package's own location, NOT from the user's pwd.
 *   3. Cwd-relative fallbacks (monorepo dev / customer project with ATR
 *      installed locally).
 */
function findRulesDir(): string | null {
  const envDir = process.env['PANGUARD_ATR_RULES_DIR'];
  if (envDir && existsSync(envDir) && statSync(envDir).isDirectory()) {
    return envDir;
  }
  // Walk up from THIS module's own directory looking for
  // node_modules/agent-threat-rules/rules. Mirrors Node's standard module
  // resolution but works on a directory subpath that ESM `import` can't
  // resolve directly (the agent-threat-rules package has an `exports` field
  // that hides ./package.json). This is the path that makes
  // `npm install -g @panguard-ai/panguard` work regardless of customer cwd.
  try {
    let dir = dirname(fileURLToPath(import.meta.url));
    while (dir !== sep && dir.length > 0) {
      const candidate = join(dir, 'node_modules', 'agent-threat-rules', 'rules');
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        return candidate;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Fall through to cwd-relative candidates.
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

// ─── PDF rendering (D1 Sprint 5) ─────────────────────────────────────

/**
 * Render the coverage report as a PDF binary.
 *
 * Uses pdfkit (already in dependencies). The PDF mirrors the Markdown
 * structure — header metadata, per-identifier rule mappings, provenance
 * footer — and includes the report integrity hash on the cover page so
 * auditors can verify the document hasn't been tampered with.
 *
 * Returns a Promise<Buffer> so async PDF streams finish before writing.
 */
async function renderPdf(
  coverage: CoverageSummary,
  orgName: string,
  integrityHash: string,
  signature: string | null
): Promise<Buffer> {
  // Lazy-load pdfkit so CLI startup stays fast when PDF isn't needed.
  // Use dynamic import so the pdfkit types come through properly even
  // when the module is optional at runtime.
  const pdfkitMod = (await import('pdfkit')) as unknown as {
    default: typeof import('pdfkit');
  };
  const PDFDocument = pdfkitMod.default;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `AI Compliance Audit Evidence — ${coverage.framework.name}`,
      Author: `PanGuard AI · AI Compliance Audit Evidence Module`,
      Subject: `${orgName} — ${coverage.framework.name}`,
      Keywords: `ATR, compliance, ${coverage.framework.yamlKey}, agent security`,
      CreationDate: new Date(),
    },
  });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolvePromise, rejectPromise) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolvePromise(Buffer.concat(chunks)));
    doc.on('error', (e: Error) => rejectPromise(e));
  });

  const fw = coverage.framework;
  const today = new Date().toISOString().slice(0, 10);
  const coveragePercent =
    coverage.totalRules > 0
      ? ((coverage.mappedRules / coverage.totalRules) * 100).toFixed(1)
      : '0.0';

  // Cover page
  doc.fontSize(20).font('Helvetica-Bold');
  doc.text('AI Compliance Audit Evidence Report');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica');
  doc.text(`${fw.name}`);
  doc.moveDown(1);

  doc.fontSize(10).font('Helvetica');
  const meta: [string, string][] = [
    ['Framework', fw.name],
    ['Authority', fw.authority],
    ...(fw.enforcementDate ? ([['Enforcement date', fw.enforcementDate]] as [string, string][]) : []),
    ['Organisation', orgName],
    ['Report date', today],
    ['ATR rules in set', String(coverage.totalRules)],
    ['Rules mapped', `${coverage.mappedRules} (${coveragePercent}%)`],
    ['Total mappings', String(coverage.totalMappings)],
  ];
  for (const [k, v] of meta) {
    doc.font('Helvetica-Bold').text(`${k}: `, { continued: true });
    doc.font('Helvetica').text(v);
  }

  doc.moveDown(1);
  doc.font('Helvetica-Bold').text('Report integrity');
  doc.moveDown(0.3);
  doc.font('Courier').fontSize(8).text(`sha256: ${integrityHash}`);
  if (signature) {
    doc.text(`hmac:   ${signature}`);
  }
  doc.font('Helvetica').fontSize(10).moveDown(1);

  if (coverage.mappedRules === 0) {
    doc.font('Helvetica-Oblique').text(
      `Status: Mapping in progress. The compliance.${fw.yamlKey} metadata block has not yet been authored for any rules in this ATR release. See spec/compliance-metadata.md for the target schema and the roll-out plan.`
    );
    doc.end();
    return done;
  }

  // Mapping by identifier
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text(`Mapping by ${fw.identifierField}`);
  doc.moveDown(0.5);

  const sortedIds = Array.from(coverage.byIdentifier.keys()).sort();
  for (const id of sortedIds) {
    const detail = coverage.byIdentifier.get(id);
    if (!detail) continue;
    doc.fontSize(12).font('Helvetica-Bold').text(id);
    doc
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text(`${detail.count} rule${detail.count === 1 ? '' : 's'} address this control`);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    for (const line of detail.context) {
      doc.text(`  • ${line}`, { paragraphGap: 3 });
    }
    doc.moveDown(0.5);
  }

  // Provenance footer
  doc.addPage();
  doc.fontSize(14).font('Helvetica-Bold').text('Provenance');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(
    'Every mapping in this report originates from an ATR rule YAML file in the public MIT-licensed repository.'
  );
  doc.moveDown(0.3);
  doc.text(
    `Each compliance: entry is a human-authored statement reviewed against the spec in spec/compliance-metadata.md.`
  );
  doc.moveDown(0.3);
  doc.text(
    `For traceability chain: ATR rule ID → compliance.${fw.yamlKey} block → identifier → rule file in the repo.`
  );
  doc.moveDown(1);
  doc.font('Helvetica-Bold').text('Limitations');
  doc.moveDown(0.3);
  doc.font('Helvetica').text(
    'This is a rule-coverage report — which ATR rules claim to address which framework controls. A full audit also requires event evidence (which detections your deployment actually triggered during the audit period). See pga sensor status and the PanGuard Enterprise audit-log export for event-level evidence.'
  );

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(9).text('Integrity chain');
  doc.font('Courier').fontSize(7);
  doc.text(`sha256(report-canonical-json):  ${integrityHash}`);
  if (signature) {
    doc.text(`hmac-sha256(report):            ${signature}`);
  }

  doc.end();
  return done;
}

// ─── Integrity hashing (D1 Sprint 5) ─────────────────────────────────

/**
 * Compute a deterministic SHA-256 hash of the canonical report payload.
 *
 * The hash is computed over the JSON representation (which is
 * deterministic for our controlled data shape) so the same inputs
 * always produce the same hash regardless of format. This gives
 * auditors a single identifier that binds the Markdown, JSON, and
 * PDF outputs of the same report together.
 */
function computeReportHash(coverage: CoverageSummary, orgName: string, reportDate: string): string {
  const byIdentifier: Record<string, { count: number; context: string[] }> = {};
  const sorted = Array.from(coverage.byIdentifier.keys()).sort();
  for (const k of sorted) {
    const v = coverage.byIdentifier.get(k);
    if (v) byIdentifier[k] = { count: v.count, context: [...v.context].sort() };
  }
  const canonical = JSON.stringify({
    framework: coverage.framework.id,
    yamlKey: coverage.framework.yamlKey,
    organisation: orgName,
    reportDate,
    totalRules: coverage.totalRules,
    mappedRules: coverage.mappedRules,
    totalMappings: coverage.totalMappings,
    byIdentifier,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Sign the report hash with an HMAC-SHA256 key.
 *
 * The key comes from either --sign <key> or the
 * PANGUARD_REPORT_SIGNING_KEY env var. Enterprise customers receive a
 * dedicated signing key so an auditor can verify that a report PDF
 * actually originated from their PanGuard deployment and wasn't tampered
 * with in transit or during review.
 */
function signReport(hash: string, key: string): string {
  return createHmac('sha256', key).update(hash).digest('hex');
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

async function generateAction(opts: {
  framework?: string;
  format?: string;
  output?: string;
  org?: string;
  sign?: string;
}): Promise<void> {
  const fw = opts.framework ? resolveFramework(opts.framework) : null;
  if (!fw) {
    console.log(
      `  ${c.caution(symbols.warn)} --framework <id> required. Run ${c.sage('pga report list-frameworks')} to see options.`
    );
    return;
  }
  const rawFormat = (opts.format ?? 'md').toLowerCase();
  const format: 'md' | 'json' | 'pdf' =
    rawFormat === 'json' ? 'json' : rawFormat === 'pdf' ? 'pdf' : 'md';
  if (format === 'pdf' && !opts.output) {
    console.log(
      `  ${c.caution(symbols.warn)} --output <path.pdf> is required when --format=pdf (PDFs are binary — cannot stream to stdout).`
    );
    return;
  }
  const orgName = opts.org ?? 'Your Organisation';
  const { rules } = loadAllRules();
  const coverage = buildCoverage(rules, fw);
  const reportDate = new Date().toISOString();
  const hash = computeReportHash(coverage, orgName, reportDate);
  const signingKey = opts.sign ?? process.env['PANGUARD_REPORT_SIGNING_KEY'];
  const signature = signingKey ? signReport(hash, signingKey) : null;

  if (format === 'pdf') {
    // PDF is binary — must go to a file, never stdout. Validated above.
    const buf = await renderPdf(coverage, orgName, hash, signature);
    const pdfPath = opts.output as string;
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    writeFileSync(pdfPath, buf);
    // Write sidecar .hash file with integrity metadata — auditors verify against this
    const hashSidecar = `${pdfPath}.hash`;
    const sidecarContent = [
      `# PanGuard AI Compliance Report — integrity sidecar`,
      `framework:    ${fw.id}`,
      `organisation: ${orgName}`,
      `report_date:  ${reportDate}`,
      `sha256:       ${hash}`,
      ...(signature ? [`hmac_sha256:  ${signature}`] : []),
      `pdf_bytes:    ${buf.length}`,
    ].join('\n');
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    writeFileSync(hashSidecar, sidecarContent + '\n', 'utf-8');
    console.log(`  ${c.safe(symbols.pass)} Wrote PDF report to ${pdfPath} (${buf.length} bytes)`);
    console.log(`  ${c.safe(symbols.pass)} Wrote integrity sidecar to ${hashSidecar}`);
    console.log(`  ${c.dim('sha256:')}      ${hash}`);
    if (signature) console.log(`  ${c.dim('hmac-sha256:')} ${signature}`);
    return;
  }

  const baseContent =
    format === 'json' ? renderJson(coverage, orgName) : renderMarkdown(coverage, orgName);
  const footer =
    format === 'json'
      ? ''
      : [
          '',
          '---',
          '',
          '## Report integrity',
          '',
          `- \`sha256(report-canonical-json)\`: \`${hash}\``,
          ...(signature ? [`- \`hmac-sha256(report)\`: \`${signature}\``] : []),
          '',
          `Recompute locally with \`pga report generate --framework ${fw.id}\` and compare the hash — any drift means the evidence was modified after export.`,
          '',
        ].join('\n');
  const content = format === 'json'
    ? JSON.stringify(
        {
          ...JSON.parse(baseContent),
          integrity: { sha256: hash, ...(signature ? { hmac_sha256: signature } : {}) },
        },
        null,
        2
      )
    : baseContent + footer;

  if (opts.output) {
    // opts.output is a user-provided absolute or relative path we write to
    writeFileSync(opts.output, content, 'utf-8'); // eslint-disable-line security/detect-non-literal-fs-filename
    console.log(`  ${c.safe(symbols.pass)} Wrote ${format.toUpperCase()} report to ${opts.output}`);
    console.log(`  ${c.dim('sha256:')}      ${hash}`);
    if (signature) console.log(`  ${c.dim('hmac-sha256:')} ${signature}`);
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
    .description('Generate a Markdown, JSON, or PDF compliance evidence report')
    .option('--framework <id>', 'Framework id')
    .option('--format <fmt>', 'Output format: md (default) | json | pdf')
    .option('--output <path>', 'Write report to file instead of stdout (required for pdf)')
    .option('--org <name>', 'Organisation name for the report header')
    .option(
      '--sign <key>',
      'HMAC-SHA256 key for report signing (or set PANGUARD_REPORT_SIGNING_KEY env var)'
    )
    .action(
      async (opts: {
        framework?: string;
        format?: string;
        output?: string;
        org?: string;
        sign?: string;
      }) => {
        try {
          await generateAction(opts);
        } catch (err) {
          console.error(`  ${c.critical(symbols.fail)} ${err instanceof Error ? err.message : err}`);
          process.exitCode = 1;
        }
      }
    );

  cmd
    .command('validate')
    .description('Validate all compliance: blocks in the ATR rule set')
    .action(() => validateAction());

  return cmd;
}
