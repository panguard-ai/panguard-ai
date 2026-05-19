/**
 * GET /api/me/session
 *
 * Browser-facing companion to `/api/me`. Authenticates via the Supabase
 * session cookie (not Bearer api_key) so the marketing site's pricing page
 * can probe "is this user signed in, and what's their primary workspace?"
 * before showing the Pilot Stripe checkout button.
 *
 * Auth: Supabase session cookie (same cookie pattern as every authenticated
 *       page in this app).
 *
 * Success (200):
 *   { user: { id, email }, workspace: { id, slug, name, tier } | null }
 * Auth fail (401): { error: 'unauthenticated' }
 *
 * CORS:
 *   Pricing lives on a different origin (panguard.ai vs app.panguard.ai).
 *   We emit a permissive CORS header against `NEXT_PUBLIC_WEBSITE_URL` so
 *   the cross-origin fetch with `credentials: 'include'` succeeds. We do
 *   NOT use `*` because the spec forbids combining wildcard with cookies.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Workspace } from '@/lib/types';

export const runtime = 'nodejs';

function corsHeaders(req: NextRequest): Record<string, string> {
  const allowed = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://panguard.ai';
  const origin = req.headers.get('origin') ?? '';
  // Echo back only if the origin matches the configured website URL; never
  // reflect arbitrary origins or we'd let any site read the session info.
  const allowOrigin = origin === allowed ? origin : allowed;
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    vary: 'origin',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers });
  }

  // Pull the user's first workspace (RLS scopes the select to memberships).
  // The pricing page only needs ONE workspace to wire the Stripe checkout —
  // an admin with multiple workspaces can switch inside the app afterwards.
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, accepted_at')
    .eq('user_id', user.id)
    .order('invited_at', { ascending: true })
    .limit(1);

  let workspace: Pick<Workspace, 'id' | 'slug' | 'name' | 'tier'> | null = null;
  const firstWorkspaceId = memberships?.[0]?.workspace_id;
  if (firstWorkspaceId) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id, slug, name, tier')
      .eq('id', firstWorkspaceId)
      .maybeSingle();
    if (ws) workspace = ws;
  }

  return NextResponse.json(
    {
      user: { id: user.id, email: user.email ?? null },
      workspace,
    },
    { headers }
  );
}
