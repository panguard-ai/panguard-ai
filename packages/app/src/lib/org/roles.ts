/**
 * Organization role helpers — ordering, comparison, and the org→workspace
 * role mapping.
 *
 * The partner console gates surfaces by org role (only partner_admin can
 * create client workspaces, edit branding, manage org members). We compare by
 * numeric ordering rather than enum equality so callers write
 * `meetsOrgRole(actual, 'partner_admin')` once.
 *
 * `orgRoleToWorkspaceRole` mirrors branch 2 of the SQL `is_workspace_member()`
 * function (migration 20260530000001). It is the SINGLE place the app-side
 * mapping lives; the unit test pins it against the documented SQL ladder so
 * the two never drift. If you change one, change the other.
 *
 * `OrgRole` is re-exported from the canonical Supabase row type in `@/lib/types`
 * so there is exactly one source of truth for the string literal union.
 */

import type { OrgRole as DbOrgRole, Role } from '@/lib/types';

export type OrgRole = DbOrgRole;

/**
 * Strict numeric ordering. Higher = more authority.
 * partner_admin supersedes partner_analyst.
 */
export const ORG_ROLE_ORDER: Record<OrgRole, number> = {
  partner_analyst: 0,
  partner_admin: 1,
};

/**
 * Returns true iff `actual` is at least `required` in the ordering above.
 * Use this for every org-level gating decision — never compare role strings
 * directly.
 *
 * Examples:
 *   meetsOrgRole('partner_admin',   'partner_analyst') === true   // inherits
 *   meetsOrgRole('partner_analyst', 'partner_admin')   === false
 *   meetsOrgRole('partner_analyst', 'partner_analyst') === true
 */
export function meetsOrgRole(actual: OrgRole, required: OrgRole): boolean {
  return ORG_ROLE_ORDER[actual] >= ORG_ROLE_ORDER[required];
}

/**
 * Maps an org role to the equivalent workspace role an org member effectively
 * holds over every client workspace under their org. Mirrors the SQL CASE in
 * is_workspace_member()'s org branch:
 *
 *   partner_admin   → 'admin'    (full client control)
 *   partner_analyst → 'analyst'  (run scans, generate reports; not billing/members)
 *
 * Use this for UI affordances (e.g. "can this partner user open the client's
 * billing page?"). Authorization itself is still enforced in the DB by RLS —
 * this is for rendering, not for trust decisions.
 */
export function orgRoleToWorkspaceRole(orgRole: OrgRole): Role {
  return orgRole === 'partner_admin' ? 'admin' : 'analyst';
}
