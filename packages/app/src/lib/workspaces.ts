import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideLazyDowngrade } from '@/lib/billing/grace';
import type { Role, Workspace } from '@/lib/types';

/**
 * Fetch the list of workspaces the current user is a member of.
 * Returns [] when unauthenticated or when the query fails.
 */
export async function listMyWorkspaces(): Promise<ReadonlyArray<Workspace>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('workspace_members')
    .select(
      'workspace_id, workspaces(id, slug, name, tier, tier_expires_at, tc_api_key_hash, created_at, updated_at)'
    )
    .eq('user_id', user.id);

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error('[workspaces] listMyWorkspaces', error?.message);
    return [];
  }

  // The postgrest-js v2.x generic can't statically resolve the joined-table
  // shape through our hand-authored Database type; at runtime Supabase returns
  // either a single object or array depending on the relationship cardinality.
  type Row = { workspace_id: string; workspaces: Workspace | Workspace[] | null };
  return (data as unknown as Row[])
    .map((row) => {
      const raw = row.workspaces;
      const ws = Array.isArray(raw) ? raw[0] : raw;
      return ws ?? null;
    })
    .filter((w): w is Workspace => w !== null);
}

export interface WorkspaceContext {
  workspace: Workspace;
  role: Role;
}

export async function requireWorkspaceBySlug(slug: string): Promise<WorkspaceContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: wsRaw } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  let ws = wsRaw as Workspace | null;
  if (!ws) return null;

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .maybeSingle();
  const membership = membershipRaw as { role: Role } | null;
  if (!membership) return null;

  // Lazy downgrade: a workspace whose paid tier_expires_at has passed but
  // is still flagged as a paid tier needs to fall back to community. This
  // covers two cases:
  //   1. The customer cancelled mid-period and the
  //      handleSubscriptionDeleted webhook stored `cancel_at` rather than
  //      flipping the tier immediately (grace period). After the grace
  //      window closes the next visitor triggers the downgrade.
  //   2. Failsafe for any subscription that ends without a Stripe webhook
  //      reaching us (e.g. webhook secret rotated, delivery dropped).
  //
  // We only run this when both conditions hold to avoid an unnecessary
  // admin-client write on every page load. We use the admin client so the
  // write succeeds regardless of RLS — `ws_update` requires admin role but
  // the caller may be analyst/auditor/readonly.
  ws = await maybeLazyDowngrade(ws);

  return { workspace: ws, role: membership.role };
}

/**
 * Lazy downgrade helper. Returns the workspace, possibly with a freshly
 * downgraded tier. Idempotent — calling it on an already-community
 * workspace is a no-op. Exported so the grace-period unit test can drive
 * the same path the page render uses.
 */
export async function maybeLazyDowngrade(ws: Workspace): Promise<Workspace> {
  if (!decideLazyDowngrade(ws.tier, ws.tier_expires_at, Date.now())) {
    return ws;
  }

  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from('workspaces')
    .update({
      tier: 'community',
      tier_expires_at: null,
      cancel_at: null,
    })
    .eq('id', ws.id);
  if (updateErr) {
    // eslint-disable-next-line no-console
    console.error(`[workspaces] lazy downgrade update failed ws=${ws.id}: ${updateErr.message}`);
    return ws;
  }

  const { error: auditErr } = await admin.from('audit_log').insert({
    workspace_id: ws.id,
    action: 'billing.downgraded_after_grace',
    target_type: 'subscription',
    target_id: null,
    metadata: {
      previous_tier: ws.tier,
      tier_expires_at: ws.tier_expires_at,
      cancel_at: ws.cancel_at,
      downgraded_at: new Date().toISOString(),
    },
  });
  if (auditErr) {
    // eslint-disable-next-line no-console
    console.error(
      `[workspaces] lazy downgrade audit insert failed ws=${ws.id}: ${auditErr.message}`
    );
  }

  // Return a NEW workspace object reflecting the post-downgrade state —
  // never mutate the input.
  return {
    ...ws,
    tier: 'community',
    tier_expires_at: null,
    cancel_at: null,
  };
}
