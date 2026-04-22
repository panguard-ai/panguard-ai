import { createClient } from '@/lib/supabase/server';
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

export async function requireWorkspaceBySlug(
  slug: string,
): Promise<WorkspaceContext | null> {
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
  const ws = wsRaw as Workspace | null;
  if (!ws) return null;

  const { data: membershipRaw } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .maybeSingle();
  const membership = membershipRaw as { role: Role } | null;
  if (!membership) return null;

  return { workspace: ws, role: membership.role };
}
