/**
 * Pure mappers: Supabase `deliverables` / `deliverable_findings` rows ->
 * the generator's `DeliverableReportInput`. No Supabase, no Buffers, no
 * server-only imports — so this stays unit-testable in isolation (the DB
 * reads live in `@/lib/deliverables`, which pulls in `next/headers`).
 */

import type { Deliverable, DeliverableFindingRow, OrgBranding } from '@/lib/types';
import type {
  ControlRef,
  DeliverableFinding,
  DeliverableReportInput,
  ReportBranding,
} from './types';

/**
 * Map a partner org's branding JSONB to the generator's ReportBranding.
 * Returns undefined when nothing usable is set, so the generator keeps its
 * built-in defaults.
 *
 * What renders today: `reportFooter` (per-page footer) and `legalName` (footer
 * fallback). `primaryColor` is carried through faithfully for forward-compat,
 * but the gov-report palette is currently fixed — accent theming is a deferred
 * follow-up, not wired into the verified template here. `logo_url` is ignored:
 * partner-logo white-label rides on `logoPath` separately and the cover keeps
 * the ATR logo by default.
 */
export function orgBrandingToReportBranding(
  b: OrgBranding | null | undefined
): ReportBranding | undefined {
  if (!b) return undefined;
  const branding: ReportBranding = {};
  if (b.legal_name) branding.legalName = b.legal_name;
  if (b.report_footer) branding.reportFooter = b.report_footer;
  if (b.primary_color) branding.primaryColor = b.primary_color;
  return Object.keys(branding).length > 0 ? branding : undefined;
}

/** Map one stored finding row to the generator's domain finding. */
export function findingRowToDomain(row: DeliverableFindingRow): DeliverableFinding {
  return {
    // Prefer the human ref (PG-001); fall back to the row id so the field is
    // never empty (the generator prints it in the detailed-findings header).
    id: row.finding_ref && row.finding_ref.length > 0 ? row.finding_ref : row.id,
    title: row.title,
    severity: row.severity,
    category: row.category ?? undefined,
    atrRuleId: row.atr_rule_id ?? undefined,
    affectedAsset: row.affected_asset ?? undefined,
    description: row.description,
    evidence: row.evidence ?? undefined,
    cvss: row.cvss ?? undefined,
    cvssVector: row.cvss_vector ?? undefined,
    remediation: row.remediation,
    // DeliverableControlRef is structurally identical to ControlRef.
    controls: row.controls as ReadonlyArray<ControlRef>,
  };
}

/** Extra render inputs the DB row can't carry (signing key, branding, logo). */
export interface ReportInputOptions {
  signingKey?: string;
  branding?: ReportBranding;
  logoPath?: string;
}

/**
 * Assemble a full `DeliverableReportInput` from a deliverable row + its
 * ordered finding rows. Empty `methodology` is normalised to `undefined` so
 * the generator falls back to its regional default.
 */
export function deliverableToReportInput(
  d: Deliverable,
  findings: ReadonlyArray<DeliverableFindingRow>,
  opts: ReportInputOptions = {}
): DeliverableReportInput {
  return {
    client: { name: d.client_name, detail: d.client_detail ?? undefined },
    assessor: { name: d.assessor_name, detail: d.assessor_detail ?? undefined },
    region: d.region,
    classification: d.classification,
    primaryFramework: d.primary_framework,
    findings: findings.map(findingRowToDomain),
    scope: d.scope,
    methodology: d.methodology.length > 0 ? d.methodology : undefined,
    language: d.language,
    reportId: d.report_ref,
    version: d.version,
    reportDate: d.report_date ?? '',
    preparedBy: d.prepared_by,
    reviewedBy: d.reviewed_by ?? undefined,
    signingKey: opts.signingKey,
    branding: opts.branding,
    logoPath: opts.logoPath,
  };
}
