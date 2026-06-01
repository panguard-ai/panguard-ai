-- =============================================================================
-- PanGuard AI — Row Level Security for the organization layer
-- Migration: 20260530000002_organizations_rls.sql
-- -----------------------------------------------------------------------------
-- Same model as 20260422000002_rls.sql: default-deny the instant RLS is
-- enabled, then re-open specific paths via policies that delegate to
-- `is_org_member(org_id, min_role)`.
--
-- IMPORTANT — workspaces + child tables (events/reports/endpoints/...) need NO
-- new policies here. The previous migration extended is_workspace_member() with
-- an org-membership branch, so every existing policy that already calls
-- is_workspace_member(workspace_id, ...) now also admits the parent org's
-- members. The org layer rides the rails that were already laid.
--
-- Bypass mechanics (unchanged): service_role JWT bypasses RLS entirely (used by
-- scripts/provision-partner.ts); SECURITY DEFINER functions
-- (create_client_workspace) run as owner and sidestep the WITH CHECK (false)
-- insert locks.
-- =============================================================================

ALTER TABLE public.organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- organizations
-- -----------------------------------------------------------------------------
-- Members read their own org. Only partner_admin updates it (rename, branding,
-- region). No direct INSERT from clients — provisioning is a service_role
-- action (provision-partner.ts) after the contract is signed. No DELETE —
-- partners are suspended (contract_status), never row-deleted, so client data
-- and audit history survive.
-- =============================================================================
CREATE POLICY org_select ON public.organizations
  FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY org_insert ON public.organizations
  FOR INSERT
  -- Hard-block direct INSERT. Orgs are born via the service-role provisioning
  -- script, which bypasses RLS. Prevents a signed-in user from minting an org
  -- (and making themselves its admin) without going through contract sign-off.
  WITH CHECK (false);

CREATE POLICY org_update ON public.organizations
  FOR UPDATE
  USING (public.is_org_member(id, 'partner_admin'));

-- =============================================================================
-- organization_members
-- -----------------------------------------------------------------------------
-- Members see the partner team roster. partner_admin invites (INSERT) and
-- removes (DELETE) members. UPDATE is omitted deliberately — a role change
-- (analyst <-> admin) should route through an audited RPC later, not a bare
-- UPDATE that skips the audit trail (same reasoning as workspace_members).
-- =============================================================================
CREATE POLICY orgmem_select ON public.organization_members
  FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY orgmem_insert ON public.organization_members
  FOR INSERT
  WITH CHECK (public.is_org_member(organization_id, 'partner_admin'));

CREATE POLICY orgmem_delete ON public.organization_members
  FOR DELETE
  USING (public.is_org_member(organization_id, 'partner_admin'));
