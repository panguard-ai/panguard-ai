/**
 * Pure logic for the deliverable report.
 *
 * No PDFKit, no fs, no Supabase — every function here is deterministic and
 * unit-tested in `packages/app/tests/report/logic.test.ts`. The generator
 * imports these and only adds rendering.
 */

import { createHash, createHmac } from 'node:crypto';
import type { ReportFramework, Severity } from '@/lib/types';
import type {
  DeliverableFinding,
  DeliverableReportInput,
  ReportLanguage,
  SeverityCounts,
  TraceabilityRow,
} from './types';

/** Most-severe-first ordering used for sorting and tables. */
export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/** Overall posture rating: the worst severity present, or 'none'. */
export type RiskRating = Severity | 'none';

/**
 * Return a new array sorted most-severe first; ties broken by finding id so
 * output is stable. Does not mutate the input (immutable contract).
 */
export function sortFindingsBySeverity(
  findings: ReadonlyArray<DeliverableFinding>
): DeliverableFinding[] {
  return [...findings].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return a.id.localeCompare(b.id);
  });
}

/** Tally findings by severity with every band present (zeroes included). */
export function countBySeverity(findings: ReadonlyArray<DeliverableFinding>): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

/** Worst severity present across the findings, or 'none' when empty. */
export function overallRiskRating(counts: SeverityCounts): RiskRating {
  if (counts.critical > 0) return 'critical';
  if (counts.high > 0) return 'high';
  if (counts.medium > 0) return 'medium';
  if (counts.low > 0) return 'low';
  if (counts.info > 0) return 'info';
  return 'none';
}

/** CVSS v3.1 qualitative band for a base score; null for out-of-range input. */
export function cvssRatingLabel(score: number): Severity | 'none' | null {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  if (score === 0) return 'none';
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}

/**
 * Flatten findings into one row per (finding, control) pair for the
 * traceability matrix. Findings with no controls are skipped. Rows are sorted
 * most-severe-first, then by finding id, then by control identifier.
 */
export function buildTraceabilityRows(
  findings: ReadonlyArray<DeliverableFinding>
): TraceabilityRow[] {
  const rows: TraceabilityRow[] = [];
  for (const f of findings) {
    for (const c of f.controls ?? []) {
      rows.push({
        findingId: f.id,
        findingTitle: f.title,
        severity: f.severity,
        atrRuleId: f.atrRuleId ?? null,
        framework: c.framework,
        controlIdentifier: c.identifier,
        context: c.context ?? '',
      });
    }
  }
  return rows.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const byFinding = a.findingId.localeCompare(b.findingId);
    if (byFinding !== 0) return byFinding;
    return a.controlIdentifier.localeCompare(b.controlIdentifier);
  });
}

/**
 * Secondary frameworks worth showing for a region, alongside the explicitly
 * chosen primary framework. Returns ids from the app-wide ReportFramework
 * union only (DORA/GDPR live in prose, not this enum).
 */
export function complianceFrameworksForRegion(
  region: DeliverableReportInput['region']
): ReportFramework[] {
  switch (region) {
    case 'eu':
      return ['eu-ai-act', 'iso-42001'];
    case 'us':
      return ['nist-ai-rmf'];
    case 'apac':
      return ['iso-42001', 'owasp-agentic'];
    case 'global':
    default:
      return ['owasp-agentic', 'owasp-llm', 'iso-42001'];
  }
}

const DEFAULT_METHODOLOGY: Record<ReportLanguage, ReadonlyArray<string>> = {
  en: [
    'Automated detection against the Agent Threat Rules (ATR) open standard rule set.',
    'Findings are deduplicated and rated using CVSS v3.1 qualitative severity bands.',
    'Each finding is cross-walked to the applicable compliance framework controls.',
    'Evidence is redacted at source; no raw secrets or payloads leave the endpoint.',
  ],
  'zh-Hant': [
    '依據 Agent Threat Rules (ATR) 開放標準規則集進行自動化偵測。',
    '發現項目經去重後，採用 CVSS v3.1 質性嚴重度分級評定。',
    '每一項發現皆對照至適用的合規框架控制項。',
    '證據於來源端去識別化；原始機密或載荷不離開端點。',
  ],
};

/** Methodology bullets for a language (used when the caller supplies none). */
export function defaultMethodology(language: ReportLanguage): ReadonlyArray<string> {
  return DEFAULT_METHODOLOGY[language];
}

const FRAMEWORK_DISPLAY: Record<ReportFramework, string> = {
  'owasp-agentic': 'OWASP Agentic Top 10',
  'owasp-llm': 'OWASP LLM Top 10',
  'eu-ai-act': 'EU AI Act',
  'colorado-ai-act': 'Colorado AI Act',
  'nist-ai-rmf': 'NIST AI RMF',
  'iso-42001': 'ISO/IEC 42001',
};

/** Short, stable display name for a framework id. */
export function frameworkDisplayName(framework: ReportFramework): string {
  return FRAMEWORK_DISPLAY[framework];
}

/**
 * Normalise one finding into a canonical, key-sorted shape so the integrity
 * hash is stable regardless of object key order or optional-field presence.
 */
function canonicalFinding(f: DeliverableFinding): Record<string, unknown> {
  const controls = [...(f.controls ?? [])]
    .map((c) => ({
      framework: c.framework,
      identifier: c.identifier,
      context: c.context ?? '',
      strength: c.strength ?? 'primary',
    }))
    .sort(
      (a, b) =>
        a.framework.localeCompare(b.framework) || a.identifier.localeCompare(b.identifier)
    );
  return {
    id: f.id,
    title: f.title,
    severity: f.severity,
    category: f.category ?? '',
    atrRuleId: f.atrRuleId ?? '',
    affectedAsset: f.affectedAsset ?? '',
    description: f.description,
    evidence: f.evidence ?? '',
    cvss: typeof f.cvss === 'number' ? f.cvss : null,
    cvssVector: f.cvssVector ?? '',
    remediation: f.remediation,
    controls,
  };
}

/**
 * Deterministic SHA-256 over the report's substantive content. Two runs with
 * the same client/framework/date/findings produce the same hash, so a
 * recipient can recompute and verify the deliverable was not altered.
 */
export function computeIntegrityHash(input: DeliverableReportInput): string {
  const findings = [...input.findings]
    .map(canonicalFinding)
    .sort((a, b) => String(a['id']).localeCompare(String(b['id'])));
  const canonical = JSON.stringify({
    reportId: input.reportId,
    version: input.version,
    client: input.client.name,
    assessor: input.assessor.name,
    region: input.region,
    classification: input.classification,
    primaryFramework: input.primaryFramework,
    reportDate: input.reportDate,
    severityCounts: countBySeverity(input.findings),
    findings,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/** HMAC-SHA256 of an integrity hash under a signing key. */
export function signIntegrity(hash: string, key: string): string {
  return createHmac('sha256', key).update(hash).digest('hex');
}

/**
 * Lightweight boundary validation. Returns a list of human-readable problems;
 * empty array means the input is renderable. The generator calls this and
 * throws on a non-empty result (fail fast, clear message).
 */
export function validateReportInput(input: DeliverableReportInput): string[] {
  const errors: string[] = [];
  if (!input.client?.name?.trim()) errors.push('client.name is required');
  if (!input.assessor?.name?.trim()) errors.push('assessor.name is required');
  if (!input.reportId?.trim()) errors.push('reportId is required');
  if (!input.version?.trim()) errors.push('version is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.reportDate ?? '')) {
    errors.push('reportDate must be an ISO date (YYYY-MM-DD)');
  }
  if (!input.preparedBy?.trim()) errors.push('preparedBy is required');
  if (!Array.isArray(input.findings)) errors.push('findings must be an array');
  input.findings?.forEach((f, i) => {
    if (!f.id?.trim()) errors.push(`findings[${i}].id is required`);
    if (!f.title?.trim()) errors.push(`findings[${i}].title is required`);
    if (!f.description?.trim()) errors.push(`findings[${i}].description is required`);
    if (!f.remediation?.trim()) errors.push(`findings[${i}].remediation is required`);
    if (f.cvss !== undefined && (f.cvss < 0 || f.cvss > 10 || !Number.isFinite(f.cvss))) {
      errors.push(`findings[${i}].cvss must be between 0 and 10`);
    }
  });
  return errors;
}
