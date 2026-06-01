/**
 * Pure scan-event -> seeded-finding mapping for the "import from scans" flow.
 * No Supabase and no file I/O: ATR rule enrichment is injected as a lookup so
 * this stays unit-testable. The server action (`importFindingsFromScans`)
 * wires the real disk-backed lookup from `@/lib/atr-rules`.
 *
 * Hybrid-seeding contract: carry across what the scan already knows (severity,
 * ATR rule id, affected asset, redacted evidence) plus what the ATR rule
 * supplies (title, category, control mappings); deliberately leave description
 * / remediation / CVSS blank for the assessor to complete before issuing.
 *
 * Secret discipline: `evidence` is sourced only from `payload_summary`, which
 * the events pipeline redacts at ingest — never raw payloads.
 */

import type { DeliverableControlRef, Severity } from '@/lib/types';

/** The subset of an `events_with_endpoint` row the seeder reads. */
export interface ScanEventInput {
  severity: Severity;
  rule_id: string | null;
  target: string;
  target_hash: string | null;
  payload_summary: string | null;
  endpoint_hostname: string | null;
}

/** What an ATR rule contributes to a seeded finding. */
export interface RuleEnrichment {
  title: string;
  category: string | null;
  controls: ReadonlyArray<DeliverableControlRef>;
}

/** Injected rule lookup (the real impl is disk-backed + cache-warmed). */
export type RuleEnrichmentLookup = (ruleId: string) => RuleEnrichment | null;

/**
 * A finding ready to insert into `deliverable_findings` (the action adds
 * `deliverable_id` + `ordinal`). Snake_case so it maps 1:1 to the columns.
 */
export interface SeededFinding {
  finding_ref: string;
  title: string;
  severity: Severity;
  category: string | null;
  atr_rule_id: string | null;
  affected_asset: string | null;
  description: string;
  evidence: string | null;
  cvss: number | null;
  cvss_vector: string | null;
  remediation: string;
  controls: DeliverableControlRef[];
}

/** Group identity: one finding per (rule, target). Falls back when hashes absent. */
function dedupeKey(e: ScanEventInput): string {
  return `${e.rule_id ?? 'none'}::${e.target_hash ?? e.target}`;
}

/**
 * Build seeded findings from scan-match events. Dedups by (rule_id,
 * target_hash), preserving first-seen order (the caller decides ordering), and
 * assigns sequential PG-NNN references.
 */
export function seedFindingsFromScans(
  events: ReadonlyArray<ScanEventInput>,
  lookup: RuleEnrichmentLookup
): SeededFinding[] {
  const seen = new Set<string>();
  const deduped: ScanEventInput[] = [];
  for (const e of events) {
    const key = dedupeKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  return deduped.map((e, i) => {
    const enrichment = e.rule_id ? lookup(e.rule_id) : null;
    return {
      finding_ref: `PG-${String(i + 1).padStart(3, '0')}`,
      title: enrichment?.title || e.rule_id || 'Untitled scan finding',
      severity: e.severity,
      category: enrichment?.category ?? null,
      atr_rule_id: e.rule_id,
      affected_asset: e.endpoint_hostname ?? e.target ?? null,
      description: '',
      evidence: e.payload_summary,
      cvss: null,
      cvss_vector: null,
      remediation: '',
      controls: enrichment ? [...enrichment.controls] : [],
    };
  });
}
