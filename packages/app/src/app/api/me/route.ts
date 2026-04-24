/**
 * GET /api/me
 *
 * CLI-facing endpoint called by `pga whoami`. Returns the workspace and user
 * info for the presented api_key, plus light stats (endpoint count, events
 * in the last 30d).
 *
 * Auth: Bearer <pga_...>   — api_key issued by Device Code Flow
 *
 * Success (200):
 *   {
 *     user: { email: "..." },
 *     workspace: { id, slug, name, tier, tier_expires_at },
 *     stats: { endpoints_count, events_30d }
 *   }
 * Auth fail (401): { error: "invalid_api_key" }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token.startsWith('pga_') || token.length < 20) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const admin = createAdminClient();
  const { data: key } = await admin
    .from('api_keys')
    .select('id, workspace_id, revoked_at, created_by')
    .eq('key_hash', tokenHash)
    .maybeSingle();
  if (!key || key.revoked_at) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }

  const { data: workspace } = await admin
    .from('workspaces')
    .select('id, slug, name, tier, tier_expires_at, tc_org_id')
    .eq('id', key.workspace_id)
    .maybeSingle();
  if (!workspace) {
    return NextResponse.json({ error: 'workspace_not_found' }, { status: 404 });
  }

  // Resolve user email: the api_key's creator (device flow approver).
  let email: string | null = null;
  if (key.created_by) {
    try {
      const { data: user } = await admin.auth.admin.getUserById(key.created_by);
      email = user?.user?.email ?? null;
    } catch {
      // non-fatal
    }
  }

  // Light stats: endpoint count + 30-day event count.
  const [{ count: endpointsCount }, { count: events30d }] = await Promise.all([
    admin
      .from('endpoints')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', key.workspace_id),
    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', key.workspace_id)
      .gte('occurred_at', new Date(Date.now() - 30 * 86400_000).toISOString()),
  ]);

  // last_used_at nudge (best-effort)
  void admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id)
    .then(() => undefined, () => undefined);

  return NextResponse.json({
    user: { email },
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      tier: workspace.tier,
      tier_expires_at: workspace.tier_expires_at,
      tc_org_id: workspace.tc_org_id,
    },
    stats: {
      endpoints_count: endpointsCount ?? 0,
      events_30d: events30d ?? 0,
    },
  });
}
