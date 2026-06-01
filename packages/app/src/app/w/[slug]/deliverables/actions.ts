'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import { getDeliverable, listDeliverableFindings } from '@/lib/deliverables';
import { deliverableToReportInput, orgBrandingToReportBranding } from '@/lib/report/from-db';
import { generateDeliverableReport, validateReportInput, type ReportBranding } from '@/lib/report';
import { controlsFromCompliance, getRuleMeta } from '@/lib/atr-rules';
import { seedFindingsFromScans, type RuleEnrichment, type ScanEventInput } from '@/lib/report/from-scans';
import type { DeliverableControlRef, OrgBranding, Role } from '@/lib/types';

export interface ActionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const REPORTS_BUCKET = 'reports';

/** analyst+ may create/edit/issue; auditor/readonly are read-only. */
const WRITE_ROLES: ReadonlyArray<Role> = ['admin', 'analyst'];
function canWrite(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

/** A human-friendly default reference, e.g. PG-RPT-2026-0042. Editable later. */
function defaultReportRef(now: Date = new Date()): string {
  const year = now.getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PG-RPT-${year}-${rand}`;
}

const CreateInput = z.object({ slug: z.string().min(1) });

/**
 * Create a draft deliverable seeded with sensible defaults (client = the
 * workspace name, today's date, a generated reference). Everything is editable
 * on the detail page before the report is issued.
 */
export async function createDeliverable(formData: FormData): Promise<ActionResult> {
  const parsed = CreateInput.safeParse({ slug: formData.get('slug') });
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const ctx = await requireWorkspaceBySlug(parsed.data.slug);
  if (!ctx) return { ok: false, error: 'Workspace not found' };
  if (!canWrite(ctx.role)) {
    return { ok: false, error: 'You need analyst access to create a deliverable.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('deliverables')
    .insert({
      workspace_id: ctx.workspace.id,
      client_name: ctx.workspace.name,
      report_ref: defaultReportRef(),
      report_date: new Date().toISOString().slice(0, 10),
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !row) {
    return { ok: false, error: error?.message ?? 'insert failed' };
  }

  revalidatePath(`/w/${parsed.data.slug}/deliverables`);
  return { ok: true, id: row.id };
}

// ─── Metadata edit ───────────────────────────────────────────────────────────

/** Split a textarea value into trimmed, non-empty lines (one bullet per line). */
function linesOf(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const MetaInput = z.object({
  slug: z.string().min(1),
  id: z.string().uuid(),
  client_name: z.string().trim().max(200),
  client_detail: z.string().trim().max(200),
  assessor_name: z.string().trim().max(200),
  assessor_detail: z.string().trim().max(200),
  report_ref: z.string().trim().max(80),
  version: z.string().trim().max(20),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  prepared_by: z.string().trim().max(200),
  reviewed_by: z.string().trim().max(200),
  language: z.enum(['en', 'zh-Hant']),
  classification: z.enum(['public', 'internal', 'confidential', 'restricted']),
  region: z.enum(['eu', 'us', 'apac', 'global']),
  primary_framework: z.enum([
    'owasp-agentic',
    'owasp-llm',
    'eu-ai-act',
    'nist-ai-rmf',
    'iso-42001',
  ]),
});

/**
 * Patch a draft deliverable's metadata. Issued deliverables are locked — the
 * issued PDF is the signed artifact, so its inputs must not drift. scope and
 * methodology are free-text textareas, one bullet per line.
 */
export async function updateDeliverableMeta(formData: FormData): Promise<ActionResult> {
  const parsed = MetaInput.safeParse({
    slug: formData.get('slug'),
    id: formData.get('id'),
    client_name: formData.get('client_name') ?? '',
    client_detail: formData.get('client_detail') ?? '',
    assessor_name: formData.get('assessor_name') ?? '',
    assessor_detail: formData.get('assessor_detail') ?? '',
    report_ref: formData.get('report_ref') ?? '',
    version: formData.get('version') ?? '',
    report_date: formData.get('report_date') ?? '',
    prepared_by: formData.get('prepared_by') ?? '',
    reviewed_by: formData.get('reviewed_by') ?? '',
    language: formData.get('language') ?? 'en',
    classification: formData.get('classification') ?? 'confidential',
    region: formData.get('region') ?? 'eu',
    primary_framework: formData.get('primary_framework') ?? 'eu-ai-act',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const input = parsed.data;

  const ctx = await requireWorkspaceBySlug(input.slug);
  if (!ctx) return { ok: false, error: 'Workspace not found' };
  if (!canWrite(ctx.role)) {
    return { ok: false, error: 'You need analyst access to edit this deliverable.' };
  }

  const existing = await getDeliverable(ctx.workspace.id, input.id);
  if (!existing) return { ok: false, error: 'Deliverable not found' };
  if (existing.status === 'issued') {
    return { ok: false, error: 'This deliverable is issued and can no longer be edited.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('deliverables')
    .update({
      client_name: input.client_name,
      client_detail: input.client_detail || null,
      assessor_name: input.assessor_name,
      assessor_detail: input.assessor_detail || null,
      report_ref: input.report_ref,
      version: input.version,
      report_date: input.report_date,
      prepared_by: input.prepared_by,
      reviewed_by: input.reviewed_by || null,
      language: input.language,
      classification: input.classification,
      region: input.region,
      primary_framework: input.primary_framework,
      scope: linesOf(formData.get('scope')),
      methodology: linesOf(formData.get('methodology')),
    })
    .eq('id', input.id)
    .eq('workspace_id', ctx.workspace.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/w/${input.slug}/deliverables/${input.id}`);
  return { ok: true, id: input.id };
}

// ─── Issue (render + sign + upload + lock) ───────────────────────────────────

const IssueInput = z.object({ slug: z.string().min(1), id: z.string().uuid() });

/**
 * Render the deliverable to a signed PDF, upload it to Storage, and flip the
 * row to `issued` (locking further edits). Mirrors the reports/generateReport
 * flow: render -> upload -> persist artifact pointer. Zero findings is valid —
 * the generator handles an empty findings list.
 */
export async function issueDeliverable(formData: FormData): Promise<ActionResult> {
  const parsed = IssueInput.safeParse({
    slug: formData.get('slug'),
    id: formData.get('id'),
  });
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { slug, id } = parsed.data;

  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) return { ok: false, error: 'Workspace not found' };
  if (!canWrite(ctx.role)) {
    return { ok: false, error: 'You need analyst access to issue a deliverable.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const deliverable = await getDeliverable(ctx.workspace.id, id);
  if (!deliverable) return { ok: false, error: 'Deliverable not found' };
  if (deliverable.status === 'issued') {
    return { ok: false, error: 'This deliverable is already issued.' };
  }

  try {
    const admin = createAdminClient();

    // Resolve the partner org's branding (footer / legal name) for the issued
    // PDF. Direct PanGuard-managed workspaces (org_id null) keep the defaults.
    let branding: ReportBranding | undefined;
    if (ctx.workspace.org_id) {
      const { data: orgRow } = await admin
        .from('organizations')
        .select('branding')
        .eq('id', ctx.workspace.org_id)
        .maybeSingle();
      branding = orgBrandingToReportBranding(
        (orgRow as { branding: OrgBranding } | null)?.branding
      );
    }

    const findings = await listDeliverableFindings(id);
    const input = deliverableToReportInput(deliverable, findings, { branding });

    // Fail fast with a readable message before spinning up PDFKit.
    const errors = validateReportInput(input);
    if (errors.length > 0) {
      return { ok: false, error: `Cannot issue: ${errors.join('; ')}` };
    }

    const rendered = await generateDeliverableReport(input);

    const dateSlug = (deliverable.report_date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    const storagePath = `${ctx.workspace.id}/${id}-deliverable-${dateSlug}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from(REPORTS_BUCKET)
      .upload(storagePath, rendered.buffer, {
        contentType: rendered.contentType,
        upsert: true,
      });
    if (uploadErr) return { ok: false, error: uploadErr.message };

    const { error: updateErr } = await admin
      .from('deliverables')
      .update({
        status: 'issued',
        sha256: rendered.sha256,
        hmac_sha256: rendered.hmacSha256,
        storage_path: storagePath,
        size_bytes: rendered.buffer.byteLength,
        page_count: rendered.pageCount,
        finding_count: rendered.findingCount,
        issued_by: user.id,
        issued_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id);
    if (updateErr) return { ok: false, error: updateErr.message };

    revalidatePath(`/w/${slug}/deliverables/${id}`);
    revalidatePath(`/w/${slug}/deliverables`);
    return { ok: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[deliverables] issue failed', err);
    return { ok: false, error: message };
  }
}

// ─── Duplicate (revise an issued report into a fresh draft) ──────────────────

const DuplicateInput = z.object({ slug: z.string().min(1), id: z.string().uuid() });

/**
 * Bump a "major.minor" version for a revision (1.0 -> 1.1). A bare integer
 * becomes "<n>.1"; anything else is left as-is for the assessor to set.
 */
function bumpVersion(version: string): string {
  const dotted = version.trim().match(/^(\d+)\.(\d+)$/);
  if (dotted) return `${dotted[1]}.${Number(dotted[2]) + 1}`;
  const whole = version.trim().match(/^(\d+)$/);
  if (whole) return `${whole[1]}.1`;
  return version;
}

/** Copy a source deliverable's findings onto a new deliverable id. */
async function copyFindingsTo(
  admin: ReturnType<typeof createAdminClient>,
  sourceId: string,
  targetId: string
): Promise<{ error?: string }> {
  const sourceFindings = await listDeliverableFindings(sourceId);
  if (sourceFindings.length === 0) return {};
  const inserts = sourceFindings.map((f) => ({
    deliverable_id: targetId,
    ordinal: f.ordinal,
    finding_ref: f.finding_ref,
    title: f.title,
    severity: f.severity,
    category: f.category,
    atr_rule_id: f.atr_rule_id,
    affected_asset: f.affected_asset,
    description: f.description,
    evidence: f.evidence,
    cvss: f.cvss,
    cvss_vector: f.cvss_vector,
    remediation: f.remediation,
    controls: f.controls,
  }));
  const { error } = await admin.from('deliverable_findings').insert(inserts);
  return error ? { error: error.message } : {};
}

/**
 * Clone a deliverable (typically an issued, locked one) into a fresh editable
 * draft — the only revise path, since an issued PDF is an immutable signed
 * artifact. Copies all metadata + findings, bumps the version, re-dates to
 * today, and leaves every issued-artifact pointer null so the copy starts clean.
 */
export async function duplicateDeliverable(formData: FormData): Promise<ActionResult> {
  const parsed = DuplicateInput.safeParse({ slug: formData.get('slug'), id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { slug, id } = parsed.data;

  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) return { ok: false, error: 'Workspace not found' };
  if (!canWrite(ctx.role)) {
    return { ok: false, error: 'You need analyst access to duplicate a deliverable.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const source = await getDeliverable(ctx.workspace.id, id);
  if (!source) return { ok: false, error: 'Deliverable not found' };

  const admin = createAdminClient();
  const { data: newRow, error: insertErr } = await admin
    .from('deliverables')
    .insert({
      workspace_id: ctx.workspace.id,
      status: 'draft',
      language: source.language,
      classification: source.classification,
      region: source.region,
      primary_framework: source.primary_framework,
      client_name: source.client_name,
      client_detail: source.client_detail,
      assessor_name: source.assessor_name,
      assessor_detail: source.assessor_detail,
      report_ref: source.report_ref,
      version: bumpVersion(source.version),
      report_date: new Date().toISOString().slice(0, 10),
      prepared_by: source.prepared_by,
      reviewed_by: source.reviewed_by,
      scope: source.scope,
      methodology: source.methodology,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (insertErr || !newRow) {
    return { ok: false, error: insertErr?.message ?? 'Could not create the revision draft.' };
  }
  const newId = newRow.id as string;

  // If copying findings fails, drop the half-made draft so we never leave an
  // orphan that has metadata but is missing its findings.
  const copy = await copyFindingsTo(admin, id, newId);
  if (copy.error) {
    await admin.from('deliverables').delete().eq('id', newId).eq('workspace_id', ctx.workspace.id);
    return { ok: false, error: copy.error };
  }

  revalidatePath(`/w/${slug}/deliverables`);
  return { ok: true, id: newId };
}

// ─── Findings CRUD ───────────────────────────────────────────────────────────

const FRAMEWORK_VALUES = [
  'owasp-agentic',
  'owasp-llm',
  'eu-ai-act',
  'colorado-ai-act',
  'nist-ai-rmf',
  'iso-42001',
] as const;

const ControlSchema = z.object({
  framework: z.enum(FRAMEWORK_VALUES),
  identifier: z.string().trim().min(1).max(120),
  context: z.string().trim().max(400).optional(),
  strength: z.enum(['primary', 'secondary', 'partial']).optional(),
});

/** Parse the hidden controls JSON field; invalid/missing -> []. */
function parseControls(raw: FormDataEntryValue | null): DeliverableControlRef[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  try {
    const parsed = z.array(ControlSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Parse a CVSS string field into a 0-10 number, or null when blank/invalid. */
function parseCvss(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10) return null;
  return n;
}

const FindingInput = z.object({
  slug: z.string().min(1),
  deliverable_id: z.string().uuid(),
  finding_id: z.string().uuid().optional(),
  finding_ref: z.string().trim().max(40),
  title: z.string().trim().min(1, 'Title is required').max(300),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.string().trim().max(80),
  atr_rule_id: z.string().trim().max(40),
  affected_asset: z.string().trim().max(200),
  description: z.string().trim().max(8000),
  evidence: z.string().trim().max(8000),
  cvss_vector: z.string().trim().max(120),
  remediation: z.string().trim().max(8000),
});

/** Guard: load the deliverable, confirm workspace + analyst write + draft. */
async function loadEditableDeliverable(
  slug: string,
  deliverableId: string
): Promise<{ workspaceId: string } | { error: string }> {
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) return { error: 'Workspace not found' };
  if (!canWrite(ctx.role)) return { error: 'You need analyst access to edit findings.' };
  const deliverable = await getDeliverable(ctx.workspace.id, deliverableId);
  if (!deliverable) return { error: 'Deliverable not found' };
  if (deliverable.status === 'issued') {
    return { error: 'This deliverable is issued and can no longer be edited.' };
  }
  return { workspaceId: ctx.workspace.id };
}

/** Next ordinal after the current findings (append to the end). */
async function nextOrdinal(deliverableId: string): Promise<number> {
  const existing = await listDeliverableFindings(deliverableId);
  return existing.reduce((max, f) => Math.max(max, f.ordinal), -1) + 1;
}

/**
 * Insert (no finding_id) or update (with finding_id) a single finding row.
 * Controls ride along as a hidden JSON field so the scalar editor preserves
 * the ATR-seeded traceability mappings without re-typing them.
 */
export async function upsertFinding(formData: FormData): Promise<ActionResult> {
  const parsed = FindingInput.safeParse({
    slug: formData.get('slug'),
    deliverable_id: formData.get('deliverable_id'),
    finding_id: formData.get('finding_id') || undefined,
    finding_ref: formData.get('finding_ref') ?? '',
    title: formData.get('title') ?? '',
    severity: formData.get('severity') ?? 'info',
    category: formData.get('category') ?? '',
    atr_rule_id: formData.get('atr_rule_id') ?? '',
    affected_asset: formData.get('affected_asset') ?? '',
    description: formData.get('description') ?? '',
    evidence: formData.get('evidence') ?? '',
    cvss_vector: formData.get('cvss_vector') ?? '',
    remediation: formData.get('remediation') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  const input = parsed.data;

  const guard = await loadEditableDeliverable(input.slug, input.deliverable_id);
  if ('error' in guard) return { ok: false, error: guard.error };

  const admin = createAdminClient();
  const fields = {
    finding_ref: input.finding_ref || null,
    title: input.title,
    severity: input.severity,
    category: input.category || null,
    atr_rule_id: input.atr_rule_id || null,
    affected_asset: input.affected_asset || null,
    description: input.description,
    evidence: input.evidence || null,
    cvss: parseCvss(formData.get('cvss')),
    cvss_vector: input.cvss_vector || null,
    remediation: input.remediation,
    controls: parseControls(formData.get('controls')),
  };

  if (input.finding_id) {
    const { error } = await admin
      .from('deliverable_findings')
      .update(fields)
      .eq('id', input.finding_id)
      .eq('deliverable_id', input.deliverable_id);
    if (error) return { ok: false, error: error.message };
  } else {
    const ordinal = await nextOrdinal(input.deliverable_id);
    const { error } = await admin
      .from('deliverable_findings')
      .insert({ deliverable_id: input.deliverable_id, ordinal, ...fields });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/w/${input.slug}/deliverables/${input.deliverable_id}`);
  return { ok: true, id: input.deliverable_id };
}

const DeleteFindingInput = z.object({
  slug: z.string().min(1),
  deliverable_id: z.string().uuid(),
  finding_id: z.string().uuid(),
});

/** Remove a single finding from a draft deliverable. */
export async function deleteFinding(formData: FormData): Promise<ActionResult> {
  const parsed = DeleteFindingInput.safeParse({
    slug: formData.get('slug'),
    deliverable_id: formData.get('deliverable_id'),
    finding_id: formData.get('finding_id'),
  });
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const input = parsed.data;

  const guard = await loadEditableDeliverable(input.slug, input.deliverable_id);
  if ('error' in guard) return { ok: false, error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from('deliverable_findings')
    .delete()
    .eq('id', input.finding_id)
    .eq('deliverable_id', input.deliverable_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/w/${input.slug}/deliverables/${input.deliverable_id}`);
  return { ok: true, id: input.deliverable_id };
}

// ─── Hybrid seeding: import findings from scan events ────────────────────────

const ImportInput = z.object({ slug: z.string().min(1), id: z.string().uuid() });

export interface ImportResult extends ActionResult {
  imported?: number;
}

/** Resolve ATR enrichment for the distinct rule ids into a sync lookup map. */
async function buildEnrichmentLookup(
  ruleIds: ReadonlyArray<string>
): Promise<Map<string, RuleEnrichment>> {
  const map = new Map<string, RuleEnrichment>();
  const metas = await Promise.all(ruleIds.map((id) => getRuleMeta(id)));
  ruleIds.forEach((id, i) => {
    const meta = metas[i];
    if (!meta) return;
    map.set(id, {
      title: meta.title,
      category: meta.category ?? null,
      controls: controlsFromCompliance(meta.compliance),
    });
  });
  return map;
}

/**
 * Seed findings from the workspace's scan-match events: dedup by
 * (rule_id, target_hash), enrich title/category/controls from the matching ATR
 * rule, and carry the redacted evidence summary across. Idempotent — findings
 * whose (rule, asset) already exist are skipped, so re-importing only adds new
 * scan results and never clobbers the assessor's manual edits.
 */
export async function importFindingsFromScans(formData: FormData): Promise<ImportResult> {
  const parsed = ImportInput.safeParse({ slug: formData.get('slug'), id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Invalid input' };
  const { slug, id } = parsed.data;

  const guard = await loadEditableDeliverable(slug, id);
  if ('error' in guard) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('events_with_endpoint')
    .select('severity, rule_id, target, target_hash, payload_summary, endpoint_hostname')
    .eq('workspace_id', guard.workspaceId)
    .eq('event_type', 'scan.rule_match')
    .order('occurred_at', { ascending: false })
    .limit(500);
  if (error) return { ok: false, error: error.message };
  if (!rows || rows.length === 0) {
    return { ok: true, id, imported: 0 };
  }

  const events = rows as unknown as ScanEventInput[];
  const ruleIds = Array.from(
    new Set(events.map((e) => e.rule_id).filter((r): r is string => !!r))
  );
  const lookup = await buildEnrichmentLookup(ruleIds);
  const seeded = seedFindingsFromScans(events, (ruleId) => lookup.get(ruleId) ?? null);

  // Skip (rule, asset) pairs already present so re-import is additive.
  const existing = await listDeliverableFindings(id);
  const existingKeys = new Set(existing.map((f) => `${f.atr_rule_id ?? ''}::${f.affected_asset ?? ''}`));
  const startOrdinal = existing.reduce((max, f) => Math.max(max, f.ordinal), -1) + 1;
  const startRef = existing.length;

  const fresh = seeded.filter(
    (s) => !existingKeys.has(`${s.atr_rule_id ?? ''}::${s.affected_asset ?? ''}`)
  );
  if (fresh.length === 0) {
    return { ok: true, id, imported: 0 };
  }

  const inserts = fresh.map((s, i) => ({
    deliverable_id: id,
    ordinal: startOrdinal + i,
    finding_ref: `PG-${String(startRef + i + 1).padStart(3, '0')}`,
    title: s.title,
    severity: s.severity,
    category: s.category,
    atr_rule_id: s.atr_rule_id,
    affected_asset: s.affected_asset,
    description: s.description,
    evidence: s.evidence,
    cvss: s.cvss,
    cvss_vector: s.cvss_vector,
    remediation: s.remediation,
    controls: s.controls,
  }));

  const admin = createAdminClient();
  const { error: insertErr } = await admin.from('deliverable_findings').insert(inserts);
  if (insertErr) return { ok: false, error: insertErr.message };

  revalidatePath(`/w/${slug}/deliverables/${id}`);
  return { ok: true, id, imported: inserts.length };
}
