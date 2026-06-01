-- =============================================================================
-- PanGuard AI — Organization layer (Partner / JV SaaS)
-- Migration: 20260530000001_organizations.sql
-- -----------------------------------------------------------------------------
-- Adds the tenant tier ABOVE workspaces. The GTM model is B2B2B / MSSP:
--
--   organizations  (Partner / JV / regional reseller — signs a contract)
--     └── workspaces (the Partner's end clients — one per customer org)
--           └── workspace_members / events / reports / endpoints  (existing)
--
-- A Partner signs an agreement, PanGuard provisions an `organizations` row +
-- a `partner_admin` member (scripts/provision-partner.ts). From then on the
-- Partner logs in and manages every client workspace under their org without
-- PanGuard touching anything per-client.
--
-- Design choices (consistent with 20260422000001_initial.sql):
--   * UUID PKs everywhere — opaque, URL-safe, no enumeration leaks.
--   * CHECK constraints pin enum-like columns at the DB layer.
--   * `org_id` on workspaces is NULLABLE — existing direct (PanGuard-managed)
--     workspaces keep org_id = NULL and behave exactly as before. The org
--     layer is purely additive.
--   * The single biggest lever: we EXTEND `is_workspace_member()` (the one
--     function every RLS policy delegates to) with an org-membership branch.
--     That one edit grants a partner_admin admin-equivalent access to every
--     workspace under their org through all 12 existing policies — "change in
--     ONE place, not twelve", exactly as the initial migration intended.
-- =============================================================================

-- =============================================================================
-- organizations — the Partner / JV tenant root. One row per signed partner.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Display name shown in the partner console + (optionally) on white-label
  -- report covers. Free-form; partner_admins can rename.
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 200),
  -- URL-safe identifier used in partner routes (app.panguard.ai/partner/acme-jv).
  -- Same constraint shape as workspaces.slug so URL handling is uniform.
  slug TEXT UNIQUE NOT NULL CHECK (slug ~* '^[a-z0-9-]{2,40}$'),
  -- 'partner' = external JV / reseller / MSSP that signed an agreement.
  -- 'direct'  = PanGuard-operated org (lets us model first-party fleets the
  --             same way without special-casing NULL everywhere).
  type TEXT NOT NULL DEFAULT 'partner' CHECK (type IN ('partner', 'direct')),
  -- Coarse data-residency / GTM region. Drives which compliance appendix a
  -- white-label report defaults to (EU customers → GDPR/EU AI Act, US → NIST).
  region TEXT NOT NULL DEFAULT 'global' CHECK (region IN ('eu', 'us', 'apac', 'global')),
  -- White-label config: { logo_url, primary_color, report_footer, legal_name }.
  -- JSONB (not columns) because branding fields grow and are partner-specific.
  -- Defaults to empty object so the app can read `branding->>'x'` without NULL
  -- guards everywhere.
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Contract gate. 'trial' lets a partner explore before signature; 'active'
  -- after the agreement lands; 'suspended' freezes login (the app checks this
  -- in requireOrgBySlug). We never hard-delete a partner — suspend instead so
  -- the audit trail + client workspaces survive.
  contract_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (contract_status IN ('trial', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slug resolves an org from a URL path; must be fast (see workspaces_slug_idx).
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations (slug);

-- =============================================================================
-- organization_members — Partner staff who log in to the partner console.
-- -----------------------------------------------------------------------------
-- Distinct from workspace_members: an org member's authority spans EVERY
-- workspace under the org. Two roles only — the per-client granularity
-- (analyst/auditor/readonly) still lives at the workspace level.
--   partner_admin   — manage the org, create client workspaces, full client
--                     access (maps to workspace 'admin' via is_workspace_member)
--   partner_analyst — operate clients (run scans, generate reports) but cannot
--                     change org settings or members (maps to workspace 'analyst')
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID REFERENCES public.organizations ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'partner_admin'
    CHECK (role IN ('partner_admin', 'partner_analyst')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NULL until the invited user accepts (same pattern as workspace_members).
  accepted_at TIMESTAMPTZ,
  PRIMARY KEY (organization_id, user_id)
);

-- Reverse lookup: "which orgs does this user belong to?" — runs on partner
-- console load. Composite PK is (organization_id, user_id) so user_id alone
-- needs its own index.
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx
  ON public.organization_members (user_id);

-- =============================================================================
-- workspaces.org_id — link a client workspace to its parent Partner org.
-- -----------------------------------------------------------------------------
-- NULLABLE + ON DELETE SET NULL: deleting an org orphans its clients back to
-- direct (PanGuard-managed) rather than cascade-deleting customer data. That
-- is the safe default — losing a partner relationship must never silently
-- destroy the end customer's events/reports.
-- =============================================================================
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workspaces.org_id IS
  'Parent Partner/JV organization. NULL = direct (PanGuard-managed) workspace. '
  'When set, org members get scoped access to this workspace via is_workspace_member().';

-- Partial index: the hot query is "list all client workspaces for this org".
CREATE INDEX IF NOT EXISTS workspaces_org_id_idx
  ON public.workspaces (org_id) WHERE org_id IS NOT NULL;

-- updated_at trigger for organizations (reuses set_updated_at from initial).
CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- is_org_member(organization_id, min_role)
-- -----------------------------------------------------------------------------
-- Single source of truth for "is the current user allowed to touch this org at
-- the requested role or higher?". Used by the organizations + organization_members
-- RLS policies (next migration). Mirrors is_workspace_member's shape.
--
-- Role ladder: partner_admin > partner_analyst
--
-- SECURITY DEFINER + locked search_path: this function is called from the
-- organization_members RLS policies, and it reads organization_members. Running
-- as DEFINER makes that internal read bypass RLS, which (a) avoids the
-- "infinite recursion detected in policy" error a self-referential SECURITY
-- INVOKER helper would hit, and (b) is the Supabase-recommended shape for RLS
-- helpers. It stays safe because every branch still filters by auth.uid(), so
-- it can only ever report on the *current* user's memberships.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_org_member(
  p_org_id UUID,
  p_min_role TEXT DEFAULT 'partner_analyst'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND CASE p_min_role
        WHEN 'partner_admin' THEN role = 'partner_admin'
        ELSE TRUE  -- 'partner_analyst' (or any lower) accepts any org role
      END
  );
$$;

-- =============================================================================
-- is_workspace_member(workspace_id, min_role) — EXTENDED
-- -----------------------------------------------------------------------------
-- Replaces the initial-migration version. Adds a SECOND branch: a user who is
-- a member of the ORG that owns the workspace is treated as a member of the
-- workspace, with the org role mapped down to the workspace role ladder:
--
--   partner_admin   → satisfies workspace 'admin'   (and everything below)
--   partner_analyst → satisfies workspace 'analyst' (and below; not 'admin')
--
-- The first branch (direct workspace_members) is byte-for-byte the original,
-- so behaviour for org_id IS NULL workspaces is unchanged. STABLE preserved.
--
-- Now SECURITY DEFINER (the original was INVOKER). Branch 2 reads
-- public.workspaces, whose ws_select policy itself calls this function — a
-- self-reference that, under SECURITY INVOKER, would raise "infinite recursion
-- detected in policy". DEFINER makes the internal reads bypass RLS, breaking
-- the cycle. This is also Supabase's recommended pattern for RLS helpers.
-- Results are unchanged: every branch filters by auth.uid(), so the function
-- still only reports on the current user's own access.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(
  p_workspace_id UUID,
  p_min_role TEXT DEFAULT 'readonly'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    -- Branch 1 — direct workspace membership (original behaviour).
    EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_id = p_workspace_id
        AND user_id = auth.uid()
        AND CASE p_min_role
          WHEN 'admin'    THEN role = 'admin'
          WHEN 'analyst'  THEN role IN ('admin', 'analyst')
          WHEN 'auditor'  THEN role IN ('admin', 'analyst', 'auditor')
          ELSE TRUE
        END
    )
    -- Branch 2 — parent-org membership grants scoped access to all clients.
    OR EXISTS (
      SELECT 1
      FROM public.workspaces w
      JOIN public.organization_members om ON om.organization_id = w.org_id
      WHERE w.id = p_workspace_id
        AND w.org_id IS NOT NULL
        AND om.user_id = auth.uid()
        AND CASE p_min_role
          WHEN 'admin'    THEN om.role = 'partner_admin'
          WHEN 'analyst'  THEN om.role IN ('partner_admin', 'partner_analyst')
          WHEN 'auditor'  THEN om.role IN ('partner_admin', 'partner_analyst')
          ELSE TRUE
        END
    );
$$;

-- =============================================================================
-- create_client_workspace(org_id, name, slug)
-- -----------------------------------------------------------------------------
-- Partner self-service path: a partner_admin creates a new client workspace
-- under their org from the partner console. SECURITY DEFINER because the
-- workspaces INSERT policy is WITH CHECK (false) — this is the only sanctioned
-- partner-driven insert path. Mirrors create_workspace() but:
--   1. Requires the caller be a partner_admin of p_org_id,
--   2. Stamps org_id on the new workspace,
--   3. Adds the caller as workspace 'admin' (keeps listMyWorkspaces + team UI
--      consistent; org-branch access already covers RLS),
--   4. Audits with via='partner'.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_client_workspace(
  p_org_id UUID,
  p_name TEXT,
  p_slug TEXT
)
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ws public.workspaces;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.is_org_member(p_org_id, 'partner_admin') THEN
    RAISE EXCEPTION 'not authorized: partner_admin role required for org %', p_org_id;
  END IF;

  INSERT INTO public.workspaces (name, slug, org_id)
    VALUES (p_name, p_slug, p_org_id)
    RETURNING * INTO ws;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, accepted_at)
    VALUES (ws.id, auth.uid(), 'admin', now());

  INSERT INTO public.audit_log (workspace_id, user_id, action, metadata)
    VALUES (
      ws.id,
      auth.uid(),
      'workspace.created',
      jsonb_build_object('name', p_name, 'slug', p_slug, 'org_id', p_org_id, 'via', 'partner')
    );

  RETURN ws;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_workspace(UUID, TEXT, TEXT) TO authenticated;
