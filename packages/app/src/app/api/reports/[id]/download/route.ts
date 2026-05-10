import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const REPORTS_BUCKET = 'reports';

/**
 * CLI-facing download endpoint.
 * Auth: `Authorization: Bearer pga_...` (API key).
 * Returns a 302 to a short-lived signed Supabase Storage URL.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 });
  }
  const plaintext = auth.slice(7).trim();
  const hash = createHash('sha256').update(plaintext).digest('hex');

  const admin = createAdminClient();
  const { data: key } = await admin
    .from('api_keys')
    .select('workspace_id, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle();

  if (!key || key.revoked_at) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const { data: row } = await admin
    .from('reports')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', key.workspace_id)
    .maybeSingle();
  if (!row || !row.storage_path || row.status !== 'ready') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: signed } = await admin.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(row.storage_path, 120);
  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
