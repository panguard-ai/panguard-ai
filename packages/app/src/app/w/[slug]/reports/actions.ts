'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import { generateComplianceReport } from '@/lib/report-generator';

const GenerateInput = z.object({
  slug: z.string(),
  framework: z.enum([
    'owasp-agentic',
    'owasp-llm',
    'eu-ai-act',
    'colorado-ai-act',
    'nist-ai-rmf',
    'iso-42001',
  ]),
  format: z.enum(['pdf', 'json', 'md']),
  orgName: z.string().trim().min(2).max(120),
});

export interface GenerateReportResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const REPORTS_BUCKET = 'reports';

export async function generateReport(formData: FormData): Promise<GenerateReportResult> {
  const parsed = GenerateInput.safeParse({
    slug: formData.get('slug'),
    framework: formData.get('framework'),
    format: formData.get('format'),
    orgName: formData.get('orgName'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(' ') };
  }

  const ctx = await requireWorkspaceBySlug(parsed.data.slug);
  if (!ctx) return { ok: false, error: 'Workspace not found' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Generate the report first (fast, synchronous-ish); then upload + record.
  try {
    const rendered = await generateComplianceReport({
      framework: parsed.data.framework,
      format: parsed.data.format,
      orgName: parsed.data.orgName,
    });

    const admin = createAdminClient();
    const ext = parsed.data.format === 'md' ? 'md' : parsed.data.format;
    const safeOrg = parsed.data.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40);
    const dateSlug = new Date().toISOString().slice(0, 10);

    // Insert the reports row first to get a stable id for the storage path
    const { data: row, error: insertErr } = await admin
      .from('reports')
      .insert({
        workspace_id: ctx.workspace.id,
        framework: parsed.data.framework,
        format: parsed.data.format,
        org_name: parsed.data.orgName,
        sha256: rendered.sha256,
        hmac_sha256: rendered.hmacSha256,
        size_bytes: rendered.buffer.byteLength,
        rules_loaded: rendered.rulesLoaded,
        rules_mapped: rendered.rulesMapped,
        total_mappings: rendered.totalMappings,
        generated_by: user.id,
        storage_path: null,
      })
      .select()
      .single();
    if (insertErr || !row) {
      return { ok: false, error: insertErr?.message ?? 'insert failed' };
    }

    const storagePath = `${ctx.workspace.id}/${row.id}-panguard-${parsed.data.framework}-${safeOrg}-${dateSlug}.${ext}`;
    const { error: uploadErr } = await admin.storage
      .from(REPORTS_BUCKET)
      .upload(storagePath, rendered.buffer, {
        contentType: rendered.contentType,
        upsert: true,
      });
    if (uploadErr) {
      return { ok: false, error: uploadErr.message };
    }

    await admin.from('reports').update({ storage_path: storagePath }).eq('id', row.id);

    revalidatePath(`/w/${parsed.data.slug}/reports`);
    return { ok: true, id: row.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    // eslint-disable-next-line no-console
    console.error('[reports] generate failed', err);
    return { ok: false, error: message };
  }
}
