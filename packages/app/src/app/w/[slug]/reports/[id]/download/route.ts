import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspaceBySlug } from '@/lib/workspaces';

const REPORTS_BUCKET = 'reports';

export async function GET(_req: NextRequest, { params }: { params: { slug: string; id: string } }) {
  const ctx = await requireWorkspaceBySlug(params.slug);
  if (!ctx) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', ctx.workspace.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (row.status !== 'ready' || !row.storage_path) {
    return NextResponse.json({ error: 'not_ready' }, { status: 409 });
  }

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(row.storage_path, 60);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
