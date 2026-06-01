import { createClient } from '@/lib/supabase/server';
import type { Organization, OrgRole, Workspace } from '@/lib/types';

/**
 * Organization-layer data access (Partner / JV console).
 *
 * Mirrors @/lib/workspaces.ts but one level up the tenancy tree:
 *   listMyOrganizations()  → orgs the current user is a member of
 *   requireOrgBySlug(slug)  → resolve + authorize an org for a partner route
 *   listOrgWorkspaces(id)   → the fleet of client workspaces under an org
 *
 * All reads go through the RLS-scoped server client, so a user only ever sees
 * orgs they belong to and workspaces their org owns (the org branch of
 * is_workspace_member admits them). No service-role here.
 */

/**
 * Fetch the orgs the current user is a member of. Returns [] when
 * unauthenticated or on query failure.
 */
export async function listMyOrganizations(): Promise<ReadonlyArray<Organization>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('organization_members')
    .select(
      'organization_id, organizations(id, slug, name, type, region, branding, contract_status, created_at, updated_at)'
    )
    .eq('user_id', user.id);

  if (error || !data) {
    console.error('[organizations] listMyOrganizations', error?.message);
    return [];
  }

  // postgrest-js can't statically resolve the joined-table shape through our
  // hand-authored Database type; at runtime it's an object or a 1-element array
  // depending on relationship cardinality (same caveat as listMyWorkspaces).
  type Row = {
    organization_id: string;
    organizations: Organization | Organization[] | null;
  };
  return (data as unknown as Row[])
    .map((row) => {
      const raw = row.organizations;
      const org = Array.isArray(raw) ? raw[0] : raw;
      return org ?? null;
    })
    .filter((o): o is Organization => o !== null);
}

export interface OrgContext {
  organization: Organization;
  role: OrgRole;
}

/**
 * Resolve an org by slug and authorize the current user. Returns null when:
 *   - unauthenticated,
 *   - the org doesn't exist,
 *   - the user is not a member of it, OR
 *   - the org's contract is suspended (login is frozen until reinstated).
 *
 * The caller (a partner route layout) renders notFound() on null.
 */
export async function requireOrgBySlug(slug: string): Promise<OrgContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: orgRaw } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  const org = orgRaw as Organization | null;
  if (!org) return null;

  // Contract gate — a suspended partner cannot operate the console. We treat
  // this as "no access" (null) rather than a distinct error so a suspended
  // partner can't enumerate which client workspaces still exist.
  if (org.contract_status === 'suspended') return null;

  const { data: membershipRaw } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle();
  const membership = membershipRaw as { role: OrgRole } | null;
  if (!membership) return null;

  return { organization: org, role: membership.role };
}

/**
 * List the client workspaces under an org, oldest first. RLS admits these via
 * the org branch of is_workspace_member, so a partner_admin/analyst sees the
 * full fleet without a per-workspace membership row.
 */
export async function listOrgWorkspaces(orgId: string): Promise<ReadonlyArray<Workspace>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('[organizations] listOrgWorkspaces', error?.message);
    return [];
  }
  return data as Workspace[];
}
