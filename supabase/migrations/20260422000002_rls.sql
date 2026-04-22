-- =============================================================================
-- PanGuard AI Customer Dashboard — Row Level Security
-- Migration: 20260422000002_rls.sql
-- -----------------------------------------------------------------------------
-- Enables RLS on every public table and attaches policies. Without RLS, the
-- anon and authenticated roles have implicit SELECT/INSERT/UPDATE on any
-- table via PostgREST — which would let user A read workspace B.
--
-- Mental model: every policy delegates the "is this user allowed?" check to
-- `public.is_workspace_member(ws_id, min_role)` from the initial migration.
-- If the role ladder ever changes, it changes in ONE place, not twelve.
--
-- Bypass mechanics:
--   * `service_role` JWT bypasses RLS entirely — used by the Next.js server
--     routes for privileged operations (issuing API keys, writing audit
--     entries). NEVER ship this key to the browser.
--   * SECURITY DEFINER functions (like create_workspace) run as the
--     function owner, also bypassing RLS, which is why they can write to
--     tables with INSERT policies set to `false`.
-- =============================================================================

-- Switch every table over to RLS. Default-deny kicks in the instant the
-- ALTER runs — policies below re-open the specific paths we want.
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- workspaces
-- -----------------------------------------------------------------------------
-- Members of a workspace can read it. Only admins update it. No direct
-- INSERT from clients — `create_workspace()` is the only path (its
-- SECURITY DEFINER bypasses this policy). DELETE is omitted — workspace
-- deletion is a privileged admin-panel action routed through service_role.
-- =============================================================================
CREATE POLICY ws_select ON public.workspaces
  FOR SELECT
  USING (public.is_workspace_member(id));

CREATE POLICY ws_insert ON public.workspaces
  FOR INSERT
  -- `false` hard-blocks direct INSERT. The only way a row lands in this
  -- table is through `public.create_workspace()`, which runs as DEFINER
  -- and sidesteps RLS. This prevents a client from creating a workspace
  -- without also adding itself as a member + writing the audit log.
  WITH CHECK (false);

CREATE POLICY ws_update ON public.workspaces
  FOR UPDATE
  USING (public.is_workspace_member(id, 'admin'));

-- =============================================================================
-- workspace_members
-- -----------------------------------------------------------------------------
-- Members can see the team list (for the "who's in this workspace" UI).
-- Admins can invite (INSERT) and remove (DELETE). UPDATE is deliberately
-- omitted — role changes happen via a dedicated `change_role` RPC (future)
-- that audits the change; bare UPDATE would skip that audit trail.
-- =============================================================================
CREATE POLICY wm_select ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY wm_insert ON public.workspace_members
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, 'admin'));

CREATE POLICY wm_delete ON public.workspace_members
  FOR DELETE
  USING (public.is_workspace_member(workspace_id, 'admin'));

-- =============================================================================
-- api_keys
-- -----------------------------------------------------------------------------
-- Reading keys shows metadata only (name, prefix, last_used_at) — the
-- full `key_hash` is opaque and the plaintext secret is never stored. We
-- still restrict reads to analyst+ so readonly/auditor users can't enumerate
-- key metadata and correlate with CI activity. INSERT (mint) and UPDATE
-- (revoke) are admin-only.
-- =============================================================================
CREATE POLICY ak_select ON public.api_keys
  FOR SELECT
  USING (public.is_workspace_member(workspace_id, 'analyst'));

CREATE POLICY ak_insert ON public.api_keys
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, 'admin'));

-- UPDATE covers the revocation flow (setting revoked_at).
CREATE POLICY ak_update ON public.api_keys
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id, 'admin'));

-- =============================================================================
-- device_codes
-- -----------------------------------------------------------------------------
-- This table is weird by design: rows are created by the service_role
-- before any user is known (user_id = NULL at insert time). So the SELECT
-- and UPDATE policies accept either:
--   * user_id IS NULL — the pending row hasn't been claimed yet, and the
--     app's approve-page needs to read it to show the "are you sure?"
--     confirmation, OR
--   * user_id = auth.uid() — the claimant is the user who approved it.
--
-- Note: the initial INSERT path is the service_role, which bypasses RLS.
-- So no INSERT policy is defined here — a missing policy means no
-- authenticated or anon client can create rows directly, which is what
-- we want.
-- =============================================================================
CREATE POLICY dc_select_own ON public.device_codes
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY dc_approve ON public.device_codes
  FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid());

-- =============================================================================
-- reports
-- -----------------------------------------------------------------------------
-- Auditors (and above) read — this is the role designed for compliance
-- staff who shouldn't see live threats but need to pull evidence. Analysts
-- create. Readonly users cannot see reports, since report contents can
-- reveal infrastructure specifics an analyst might want to withhold.
-- =============================================================================
CREATE POLICY rpt_select ON public.reports
  FOR SELECT
  USING (public.is_workspace_member(workspace_id, 'auditor'));

CREATE POLICY rpt_insert ON public.reports
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, 'analyst'));

-- No UPDATE / DELETE policy — reports are immutable once generated. If a
-- report is wrong, the user generates a new one (the old row keeps the
-- audit trail). Service_role may still rewrite if needed (e.g. GDPR request).

-- =============================================================================
-- audit_log
-- -----------------------------------------------------------------------------
-- All members can read (transparency for their own workspace). Nobody can
-- INSERT directly from a user session — the missing INSERT policy means
-- only service_role and SECURITY DEFINER functions can append. This keeps
-- the log trustworthy: a compromised user session cannot write a
-- "workspace.deleted_by_admin" entry to muddy investigations.
-- =============================================================================
CREATE POLICY al_select ON public.audit_log
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));
