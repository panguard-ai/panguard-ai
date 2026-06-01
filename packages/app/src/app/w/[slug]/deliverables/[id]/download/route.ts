import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspaceBySlug } from '@/lib/workspaces';

const REPORTS_BUCKET = 'reports';

/**
 * Stream the issued deliverable PDF via a short-lived signed URL. Gated on
 * `status === 'issued'`: a draft has no signed artifact to hand a client.
 * Mirrors reports/[id]/download (which gates on `status === 'ready'`).
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string; id: string } }) {
  const ctx = await requireWorkspaceBySlug(params.slug);
  if (!ctx) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('deliverables')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspace.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (row.status !== 'issued' || !row.storage_path) {
    return NextResponse.json({ error: 'not_issued' }, { status: 409 });
  }

  // Force a download (Content-Disposition: attachment) with a human filename so
  // the button actually downloads rather than opening the PDF inline over the
  // detail page. report_ref is sanitised to a filesystem-safe ASCII slug.
  const safeRef = (row.report_ref || 'deliverable').replace(/[^A-Za-z0-9._-]+/g, '-');
  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: `${safeRef}.pdf` });
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
