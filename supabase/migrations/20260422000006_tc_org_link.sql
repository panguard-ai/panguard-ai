-- ============================================================================
-- 20260422000006_tc_org_link.sql
-- Bridge paid-tier Supabase workspaces ↔ anonymous-telemetry TC orgs.
--
-- Problem this solves (from /plan-eng-review Finding 1):
--   tc.panguard.ai has `orgs / devices / org_policies` tables in SQLite for the
--   Community-tier anonymous telemetry pipeline. app.panguard.ai has Supabase
--   `workspaces` for paid tenants. The two are disconnected — an F500 customer
--   who deploys Guard across 50 endpoints gets their `events` scoped by
--   workspace_id (in Supabase) but any telemetry that still flows to TC has no
--   way to correlate back to the same workspace.
--
--   Before this migration, the "unified attack map across all my agents"
--   dashboard cannot be built without extra schema work per-deploy.
--
-- What this migration does:
--   1. Add `tc_org_id` column to workspaces (UUID, nullable, not an FK — the
--      referenced table lives in a different database).
--   2. Add `tc_client_key_hash` so TC bearer auth can resolve back to a workspace.
--
--   scripts/provision-workspace.ts populates both when onboarding a paid tenant.
--   packages/panguard/src/cli/workspace-sync.ts passes the tc_org_id as a
--   request header when CLI also reports to TC (harmless if TC ignores it today;
--   enables retroactive correlation when TC is upgraded).
--
-- Not in scope (Phase 3 / TC-migration work):
--   - Enforce the link with a trigger. Cross-DB referential integrity needs a
--     reconciliation job, not a FK constraint.
--   - Migrate TC SQLite → Supabase Postgres (the "one tenant table to rule them
--     all" refactor). That's a multi-day job with live data migration.
-- ============================================================================

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS tc_org_id UUID,
  ADD COLUMN IF NOT EXISTS tc_client_key_hash TEXT;

COMMENT ON COLUMN public.workspaces.tc_org_id IS
  'Matches the id column in tc.panguard.ai orgs table (SQLite). Used to correlate paid-tier events in Supabase with anonymous Community telemetry in TC. Logical FK only — no constraint because tables live in separate DBs.';

COMMENT ON COLUMN public.workspaces.tc_client_key_hash IS
  'sha256 of the TC client key issued when the workspace was provisioned. Lets TC resolve an incoming Bearer token back to this workspace without round-tripping to Supabase.';

-- Helper view for admin / provisioning scripts: one row per workspace showing
-- all the IDs at once.
CREATE OR REPLACE VIEW public.workspace_identity AS
  SELECT
    id                      AS workspace_id,
    slug,
    name,
    tier,
    tc_org_id,
    (tc_org_id IS NOT NULL) AS has_tc_link,
    (tc_client_key_hash IS NOT NULL) AS has_tc_client_key
  FROM public.workspaces;

COMMENT ON VIEW public.workspace_identity IS
  'Admin-facing convenience view. Not for customer-facing queries.';
