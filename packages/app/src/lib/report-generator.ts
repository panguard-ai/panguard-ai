/**
 * Compliance Audit Evidence report generator — inline version
 *
 * Mirrors `packages/panguard/src/cli/commands/report.ts` (the `pga report
 * generate` CLI). Re-implemented here so app.panguard.ai doesn't depend on
 * the CLI package at build time (the CLI pulls in commander, Guard, etc.).
 *
 * Produces PDF / Markdown / JSON, all carrying a SHA-256 integrity hash and
 * optional HMAC-SHA256 signature. Pulls ATR rule metadata from the
 * `agent-threat-rules` npm package so the app deploy is self-contained.
 */

import { createHash, createHmac } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import type { ReportFormat, ReportFramework } from '@/lib/types';

const nodeRequire = createRequire(import.meta.url);

// ─── Framework catalog (synced with CLI) ─────────────────────────────────────

interface FrameworkMeta {
  id: ReportFramework;
  yamlKey: string;
  name: string;
  authority: string;
  enforcementDate?: string;
  identifierField: 'id' | 'article' | 'section' | 'clause';
}

const FRAMEWORKS: Record<ReportFramework, FrameworkMeta> = {
  'owasp-agentic': {
    id: 'owasp-agentic',
    yamlKey: 'owasp_agentic',
    name: 'OWASP Agentic Top 10 (2026)',
    authority: 'OWASP Foundation',
    identifierField: 'id',
  },
  'owasp-llm': {
    id: 'owasp-llm',
    yamlKey: 'owasp_llm',
    name: 'OWASP LLM Top 10 (2025)',
    authority: 'OWASP Foundation',
    identifierField: 'id',
  },
  'eu-ai-act': {
    id: 'eu-ai-act',
    yamlKey: 'eu_ai_act',
    name: 'EU AI Act (Regulation 2024/1689)',
    authority: 'European Union',
    enforcementDate: '2026-08-02',
    identifierField: 'article',
  },
  'colorado-ai-act': {
    id: 'colorado-ai-act',
    yamlKey: 'colorado_ai_act',
    name: 'Colorado AI Act (SB24-205)',
    authority: 'State of Colorado',
    enforcementDate: '2026-06-30',
    identifierField: 'section',
  },
  'nist-ai-rmf': {
    id: 'nist-ai-rmf',
    yamlKey: 'nist_ai_rmf',
    name: 'NIST AI Risk Management Framework 1.0',
    authority: 'NIST (US Dept of Commerce)',
    identifierField: 'clause',
  },
  'iso-42001': {
    id: 'iso-42001',
    yamlKey: 'iso_42001',
    name: 'ISO/IEC 42001:2023 AIMS',
    authority: 'ISO / IEC',
    identifierField: 'clause',
  },
};

interface ComplianceEntry {
  identifier: string;
  context: string;
  strength: 'primary' | 'secondary' | 'partial';
}

interface ATRRule {
  id: string;
  title: string;
  severity: string;
  category: string;
  compliance: Record<string, ComplianceEntry[]>;
}

function findRulesDir(): string | null {
  const envDir = process.env['PANGUARD_ATR_RULES_DIR'];
  if (envDir) {
    try {
      if (statSync(envDir).isDirectory()) return envDir;
    } catch {
      /* fall through */
    }
  }
  try {
    const pkgPath = nodeRequire.resolve('agent-threat-rules/package.json');
    const candidate = join(dirname(pkgPath), 'rules');
    if (statSync(candidate).isDirectory()) return candidate;
  } catch {
    /* fall through */
  }
  const monorepoCandidate = resolve(process.cwd(), '..', '..', 'node_modules', 'agent-threat-rules', 'rules');
  try {
    if (statSync(monorepoCandidate).isDirectory()) return monorepoCandidate;
  } catch {
    /* noop */
  }
  return null;
}

function collectYamlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectYamlFiles(full));
    else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) out.push(full);
  }
  return out;
}

function parseRule(filePath: string): ATRRule | null {
  let yaml: typeof import('js-yaml');
  try {
    yaml = nodeRequire('js-yaml') as typeof import('js-yaml');
  } catch {
    return null;
  }
  let doc: Record<string, unknown> | null;
  try {
    doc = yaml.load(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!doc || typeof doc !== 'object' || !doc['id']) return null;

  const tags = (doc['tags'] as Record<string, unknown>) ?? {};
  const complianceRaw = (doc['compliance'] as Record<string, unknown>) ?? {};
  const compliance: Record<string, ComplianceEntry[]> = {};

  for (const fw of Object.values(FRAMEWORKS)) {
    const raw = complianceRaw[fw.yamlKey];
    if (!Array.isArray(raw)) continue;
    compliance[fw.yamlKey] = raw
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map((e) => {
        const idField = fw.identifierField;
        const rawId =
          idField === 'clause' && fw.id === 'nist-ai-rmf'
            ? `${String(e['function'] ?? '')}.${String(e['subcategory'] ?? '')}`
            : String(e[idField] ?? '');
        return {
          identifier: rawId,
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
    category: String(tags['category'] ?? 'uncategorised'),
    compliance,
  };
}

function loadRules(): ATRRule[] {
  const dir = findRulesDir();
  if (!dir) return [];
  const out: ATRRule[] = [];
  for (const f of collectYamlFiles(dir).sort()) {
    const r = parseRule(f);
    if (r) out.push(r);
  }
  return out;
}

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
      const existing = byIdentifier.get(e.identifier) ?? { count: 0, context: [] };
      existing.count++;
      existing.context.push(`${r.id}: ${e.context}`);
      byIdentifier.set(e.identifier, existing);
    }
  }
  return { framework: fw, totalRules: rules.length, mappedRules, totalMappings, byIdentifier };
}

function computeReportHash(cov: CoverageSummary, orgName: string, reportDate: string): string {
  const byIdentifier: Record<string, { count: number; context: string[] }> = {};
  for (const k of Array.from(cov.byIdentifier.keys()).sort()) {
    const v = cov.byIdentifier.get(k);
    if (v) byIdentifier[k] = { count: v.count, context: [...v.context].sort() };
  }
  const canonical = JSON.stringify({
    framework: cov.framework.id,
    yamlKey: cov.framework.yamlKey,
    organisation: orgName,
    reportDate,
    totalRules: cov.totalRules,
    mappedRules: cov.mappedRules,
    totalMappings: cov.totalMappings,
    byIdentifier,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function signReport(hash: string, key: string): string {
  return createHmac('sha256', key).update(hash).digest('hex');
}

function renderMarkdown(cov: CoverageSummary, orgName: string, integrityFooter: string): string {
  const fw = cov.framework;
  const today = new Date().toISOString().slice(0, 10);
  const pct = cov.totalRules > 0 ? ((cov.mappedRules / cov.totalRules) * 100).toFixed(1) : '0.0';
  const lines: string[] = [
    '# AI Compliance Audit Evidence Report',
    '',
    `- **Framework**: ${fw.name}`,
    `- **Authority**: ${fw.authority}`,
    ...(fw.enforcementDate ? [`- **Enforcement date**: ${fw.enforcementDate}`] : []),
    `- **Organisation**: ${orgName}`,
    `- **Report date**: ${today}`,
    `- **ATR rules in set**: ${cov.totalRules}`,
    `- **Rules mapped**: ${cov.mappedRules} (${pct}%)`,
    `- **Total mappings**: ${cov.totalMappings}`,
    '',
    '---',
    '',
  ];
  if (cov.mappedRules === 0) {
    lines.push('> **Status: Mapping in progress.** No rules yet map to this framework.', '');
    return lines.join('\n') + integrityFooter;
  }
  lines.push(`## Mapping by ${fw.identifierField}`, '');
  for (const id of Array.from(cov.byIdentifier.keys()).sort()) {
    const d = cov.byIdentifier.get(id);
    if (!d) continue;
    lines.push(`### ${id}`, `*${d.count} rule${d.count === 1 ? '' : 's'} address this control*`, '');
    for (const l of d.context) lines.push(`- ${l}`);
    lines.push('');
  }
  return lines.join('\n') + integrityFooter;
}

function renderJson(
  cov: CoverageSummary,
  orgName: string,
  hash: string,
  signature: string | null,
): string {
  const byIdentifier: Record<string, { count: number; context: string[] }> = {};
  for (const [k, v] of cov.byIdentifier.entries()) byIdentifier[k] = v;
  return JSON.stringify(
    {
      framework: cov.framework,
      organisation: orgName,
      reportDate: new Date().toISOString(),
      totalRules: cov.totalRules,
      mappedRules: cov.mappedRules,
      totalMappings: cov.totalMappings,
      byIdentifier,
      integrity: { sha256: hash, ...(signature ? { hmac_sha256: signature } : {}) },
    },
    null,
    2,
  );
}

async function renderPdf(
  cov: CoverageSummary,
  orgName: string,
  hash: string,
  signature: string | null,
): Promise<Buffer> {
  const mod = (await import('pdfkit')) as unknown as { default: typeof import('pdfkit') };
  const PDFDocument = mod.default;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `AI Compliance Audit Evidence — ${cov.framework.name}`,
      Author: 'PanGuard AI · Compliance Evidence Module',
      Subject: `${orgName} — ${cov.framework.name}`,
      Keywords: `ATR, compliance, ${cov.framework.yamlKey}`,
      CreationDate: new Date(),
    },
  });

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolvePromise, rejectPromise) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolvePromise(Buffer.concat(chunks)));
    doc.on('error', (e: Error) => rejectPromise(e));
  });

  const fw = cov.framework;
  const today = new Date().toISOString().slice(0, 10);
  const pct = cov.totalRules > 0 ? ((cov.mappedRules / cov.totalRules) * 100).toFixed(1) : '0.0';

  doc.fontSize(20).font('Helvetica-Bold').text('AI Compliance Audit Evidence Report');
  doc.moveDown(0.5).fontSize(12).font('Helvetica').text(fw.name).moveDown(1).fontSize(10);
  const meta: [string, string][] = [
    ['Framework', fw.name],
    ['Authority', fw.authority],
    ...(fw.enforcementDate ? ([['Enforcement date', fw.enforcementDate]] as [string, string][]) : []),
    ['Organisation', orgName],
    ['Report date', today],
    ['ATR rules', String(cov.totalRules)],
    ['Rules mapped', `${cov.mappedRules} (${pct}%)`],
    ['Total mappings', String(cov.totalMappings)],
  ];
  for (const [k, v] of meta) {
    doc.font('Helvetica-Bold').text(`${k}: `, { continued: true });
    doc.font('Helvetica').text(v);
  }
  doc.moveDown(1).font('Helvetica-Bold').text('Report integrity');
  doc.moveDown(0.3).font('Courier').fontSize(8).text(`sha256: ${hash}`);
  if (signature) doc.text(`hmac:   ${signature}`);
  doc.font('Helvetica').fontSize(10);

  if (cov.mappedRules === 0) {
    doc.moveDown(1).font('Helvetica-Oblique').text(
      'Mapping in progress. No rules yet map to this framework.',
    );
    doc.end();
    return done;
  }

  doc.addPage().fontSize(14).font('Helvetica-Bold').text(`Mapping by ${fw.identifierField}`).moveDown(0.5);
  for (const id of Array.from(cov.byIdentifier.keys()).sort()) {
    const d = cov.byIdentifier.get(id);
    if (!d) continue;
    doc.fontSize(12).font('Helvetica-Bold').text(id);
    doc.fontSize(9).font('Helvetica-Oblique').text(
      `${d.count} rule${d.count === 1 ? '' : 's'} address this control`,
    );
    doc.moveDown(0.3).fontSize(10).font('Helvetica');
    for (const line of d.context) doc.text(`  • ${line}`, { paragraphGap: 3 });
    doc.moveDown(0.5);
  }
  doc.end();
  return done;
}

export interface GenerateReportInput {
  framework: ReportFramework;
  format: ReportFormat;
  orgName: string;
  signingKey?: string;
}

export interface GenerateReportOutput {
  buffer: Buffer;
  contentType: string;
  sha256: string;
  hmacSha256: string | null;
  rulesLoaded: number;
  rulesMapped: number;
  totalMappings: number;
}

export async function generateComplianceReport(
  input: GenerateReportInput,
): Promise<GenerateReportOutput> {
  const fw = FRAMEWORKS[input.framework];
  if (!fw) throw new Error(`Unknown framework: ${input.framework}`);

  const rules = loadRules();
  const coverage = buildCoverage(rules, fw);
  const reportDate = new Date().toISOString();
  const hash = computeReportHash(coverage, input.orgName, reportDate);
  const signingKey = input.signingKey ?? process.env['PANGUARD_REPORT_SIGNING_KEY'];
  const signature = signingKey ? signReport(hash, signingKey) : null;

  const integrityFooter =
    '\n\n---\n\n## Report integrity\n\n' +
    `- \`sha256\`: \`${hash}\`\n` +
    (signature ? `- \`hmac_sha256\`: \`${signature}\`\n` : '') +
    '\nRecompute with the same ATR rule snapshot to verify.\n';

  if (input.format === 'pdf') {
    const buf = await renderPdf(coverage, input.orgName, hash, signature);
    return {
      buffer: buf,
      contentType: 'application/pdf',
      sha256: hash,
      hmacSha256: signature,
      rulesLoaded: coverage.totalRules,
      rulesMapped: coverage.mappedRules,
      totalMappings: coverage.totalMappings,
    };
  }

  const content =
    input.format === 'json'
      ? renderJson(coverage, input.orgName, hash, signature)
      : renderMarkdown(coverage, input.orgName, integrityFooter);

  return {
    buffer: Buffer.from(content, 'utf-8'),
    contentType: input.format === 'json' ? 'application/json' : 'text/markdown',
    sha256: hash,
    hmacSha256: signature,
    rulesLoaded: coverage.totalRules,
    rulesMapped: coverage.mappedRules,
    totalMappings: coverage.totalMappings,
  };
}
