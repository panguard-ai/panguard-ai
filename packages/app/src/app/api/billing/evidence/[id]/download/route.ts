/**
 * GET /api/billing/evidence/[id]/download
 *
 * Auth chain (decideEvidenceDownload):
 *   1. Authenticated user (Supabase session cookie)
 *   2. Evidence row exists and is readable (RLS — workspace member)
 *   3. Caller is explicitly listed in workspace_members
 *   4. Workspace tier >= 'pilot'
 *
 * On success, mints a 1-hour signed URL from the 'evidence-packs' bucket
 * and 302-redirects there. The signed URL is never persisted; browsers
 * follow the redirect once and the URL expires on its own.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  decideEvidenceDownload,
  type EvidenceDownloadInput,
} from '@/lib/billing/evidence-download';
import type { Tier } from '@/lib/tier/types';

const BUCKET = 'evidence-packs';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull the evidence row + workspace metadata via the user's session so
  // RLS already filters to workspaces they can see. We still verify
  // membership + tier explicitly below for defense-in-depth.
  let evidence: EvidenceDownloadInput['evidence'] = null;
  let isMember = false;
  let workspaceTier: Tier | null = null;

  if (user) {
    const { data: evRow } = await supabase
      .from('evidence_archives')
      .select('workspace_id, storage_path')
      .eq('id', id)
      .maybeSingle();
    evidence = (evRow as EvidenceDownloadInput['evidence']) ?? null;

    if (evidence) {
      const { data: memRow } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', evidence.workspace_id)
        .eq('user_id', user.id)
        .maybeSingle();
      isMember = !!memRow;

      const { data: wsRow } = await supabase
        .from('workspaces')
        .select('tier')
        .eq('id', evidence.workspace_id)
        .maybeSingle();
      workspaceTier = (wsRow as { tier: Tier } | null)?.tier ?? null;
    }
  }

  const decision = decideEvidenceDownload({
    user: user ? { id: user.id } : null,
    evidence,
    isMember,
    workspaceTier,
  });

  switch (decision.kind) {
    case 'unauthenticated':
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    case 'not_found':
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    case 'forbidden':
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    case 'tier_locked':
      return NextResponse.json(
        { error: 'tier_locked', tier: decision.currentTier },
        { status: 403 }
      );
    case 'allow': {
      // Mint the signed URL via the admin client so we bypass any RLS
      // surprises on the storage object metadata. The path was already
      // validated to belong to a workspace the caller is a member of.
      const admin = createAdminClient();
      const { data: signed, error: signErr } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(decision.storagePath, SIGNED_URL_TTL_SECONDS);

      if (signErr || !signed?.signedUrl) {
        return NextResponse.json(
          { error: 'sign_failed', detail: signErr?.message ?? 'no_url' },
          { status: 500 }
        );
      }

      return NextResponse.redirect(signed.signedUrl, 302);
    }
  }
}
