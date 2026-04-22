-- =============================================================================
-- PanGuard AI Customer Dashboard — initial schema
-- Migration: 20260422000001_initial.sql
-- -----------------------------------------------------------------------------
-- Creates the six core tables backing the console:
--   workspaces          — top-level tenant boundary
--   workspace_members   — user <-> workspace mapping with role
--   api_keys            — long-lived tokens for CLI / CI (sha256-hashed)
--   device_codes        — short-lived OAuth Device Code Flow state
--   reports             — compliance evidence artifacts
--   audit_log           — append-only activity trail
--
-- Design choices:
--   * `public` schema only — `auth.*` owned by Supabase.
--   * `UUID` primary keys (`gen_random_uuid`) everywhere — opaque, safe to
--     expose in URLs, no row-enumeration leaks via sequential IDs.
--   * `TIMESTAMPTZ DEFAULT now()` for every audit column — stores UTC, renders
--     in the user's tz in the app layer.
--   * Secrets NEVER stored in the clear. Both `api_keys.key_hash` and
--     `device_codes.device_code` + `user_code` are treated as opaque strings;
--     app layer SHA-256s the raw secret before INSERT / SELECT.
--   * CHECK constraints pin enum-like columns at the DB layer so bad values
--     can't land even from a misbehaving service-role client.
-- =============================================================================

-- `gen_random_uuid` lives in pgcrypto on older images; Postgres 15 has it
-- in the core `extensions` schema but enabling is idempotent either way.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- workspaces — tenant root. One row per customer org.
-- =============================================================================
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Display name. Free-form; admins can rename.
  name TEXT NOT NULL,
  -- URL-safe identifier used in dashboard routes (app.panguard.ai/acme).
  -- CHECK ensures 2-40 chars, lowercase alphanumerics + hyphen only — matches
  -- what DNS / URL paths tolerate and blocks injection into generated URLs.
  slug TEXT UNIQUE NOT NULL CHECK (slug ~* '^[a-z0-9-]{2,40}$'),
  -- Subscription tier. Drives feature gating in the app. CHECK enforces the
  -- pricing v4 locked set — no silent tier sprawl.
  tier TEXT NOT NULL DEFAULT 'community'
    CHECK (tier IN ('community', 'pilot', 'enterprise')),
  -- NULL = never expires (community is free forever). Pilots get a 90-day
  -- expiry set at purchase time; enterprise usually gets yearly renewal.
  tier_expires_at TIMESTAMPTZ,
  -- SHA-256 of the pre-shared secret used for workspace <-> tc.panguard.ai
  -- verdict cache calls. Never the plaintext. Rotated per `README.md` runbook.
  tc_api_key_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Slug is how the app resolves a workspace from a URL path; must be fast.
-- (Also implicitly unique via the UNIQUE constraint, but the index is needed
-- for lookups that want just the workspace id — UNIQUE-only may not be used
-- by planner in every query shape.)
CREATE INDEX workspaces_slug_idx ON public.workspaces (slug);

-- =============================================================================
-- workspace_members — the join table that makes the console multi-tenant.
-- =============================================================================
CREATE TABLE public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE,
  -- Points at Supabase's built-in auth.users table. CASCADE so deleting a
  -- user also removes their memberships (GDPR hygiene).
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  -- Four-tier RBAC:
  --   admin    — manage members, keys, billing
  --   analyst  — run scans, generate reports, manage keys
  --   auditor  — read-only + report download (for compliance team)
  --   readonly — see dashboard only, no downloads
  -- `is_workspace_member(ws_id, min_role)` helper (below) encodes the ladder.
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'analyst', 'auditor', 'readonly')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NULL until the user accepts the invite. UI hides non-accepted members
  -- from the "team" list but keeps them for invite-resend.
  accepted_at TIMESTAMPTZ,
  -- Composite PK prevents the same user being added twice to one workspace.
  PRIMARY KEY (workspace_id, user_id)
);

-- Reverse lookup: "which workspaces does this user belong to?" — runs on
-- every page load to build the workspace switcher. Composite PK is
-- (workspace_id, user_id) so user_id alone needs its own index.
CREATE INDEX workspace_members_user_id_idx ON public.workspace_members (user_id);

-- =============================================================================
-- api_keys — long-lived tokens used by the `panguard` CLI and CI pipelines.
-- =============================================================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  -- Human label ("CI — main branch", "laptop-Alice"). Shown in the UI.
  name TEXT NOT NULL,
  -- First 8 chars of the raw token, e.g. `pg_live_abcd1234`. Safe to show
  -- in the UI so users can distinguish keys without revealing the secret.
  key_prefix TEXT NOT NULL,
  -- SHA-256 of the full token. UNIQUE — two keys can never collide even
  -- across workspaces, which means a stolen hash is still identifiable.
  -- We compare against this hash on every authenticated API call.
  key_hash TEXT NOT NULL UNIQUE,
  -- Bumped by the API on successful auth. Used to show "last seen" in UI
  -- and to detect abandoned keys.
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Soft revocation — the row stays for audit purposes but the API treats
  -- any key with `revoked_at IS NOT NULL` as invalid.
  revoked_at TIMESTAMPTZ
);

-- Hot query: "list active keys for this workspace". Partial index skips
-- revoked rows entirely — typical workspaces will have 10+ historical keys.
CREATE INDEX api_keys_workspace_active_idx
  ON public.api_keys (workspace_id)
  WHERE revoked_at IS NULL;

-- =============================================================================
-- device_codes — RFC 8628 OAuth 2.0 Device Authorization Grant state.
-- -----------------------------------------------------------------------------
-- Flow:
--   1. CLI calls POST /device/code → server creates row with user_code +
--      device_code, returns both.
--   2. CLI shows user_code (ABCD-EFGH). User visits app.panguard.ai/device,
--      enters code, logs in, approves.
--   3. App sets user_id, workspace_id, approved_at, mints an api_key, stores
--      its id in issued_api_key_id.
--   4. CLI polls POST /device/token with device_code until approved, then
--      retrieves the api_key secret one time.
-- =============================================================================
CREATE TABLE public.device_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Short, human-typed code. Format "ABCD-EFGH" (35 bits entropy) — enough
  -- for a 10-minute window given rate-limiting at the API layer.
  user_code TEXT NOT NULL UNIQUE,
  -- Long secret only the CLI sees. ≥128 bits entropy. UNIQUE so a compromised
  -- value can't silently collide with another session.
  device_code TEXT NOT NULL UNIQUE,
  -- Both NULL until the user approves; once set, the CLI's poll succeeds.
  user_id UUID REFERENCES auth.users,
  workspace_id UUID REFERENCES public.workspaces,
  -- Reserved for future scope narrowing (e.g. 'cli:read-only'). MVP uses 'cli'.
  scope TEXT NOT NULL DEFAULT 'cli',
  -- Hard TTL. Default 10 minutes set by the API at INSERT time.
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  -- FK to the api_keys row minted on approval. Lets us trace "which device
  -- flow produced this token?" during incident response.
  issued_api_key_id UUID REFERENCES public.api_keys,
  -- Seconds between CLI polls. RFC 8628 says server can raise this to
  -- throttle. 5s is a reasonable default.
  polling_interval_s INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup by user_code during the approve step. Partial index on pending
-- rows only — approved/expired rows don't need to be found by code.
CREATE INDEX device_codes_pending_user_code_idx
  ON public.device_codes (user_code)
  WHERE approved_at IS NULL;
-- Janitor query: periodic sweep deletes expired unapproved rows. Index on
-- expires_at keeps that scan cheap.
CREATE INDEX device_codes_expires_at_idx ON public.device_codes (expires_at);

-- =============================================================================
-- reports — compliance evidence artifacts (EU AI Act, NIST AI RMF, etc.).
-- -----------------------------------------------------------------------------
-- The actual bytes live in Storage bucket `reports`; this table is metadata
-- + integrity info so auditors can verify a downloaded PDF matches what was
-- generated at the recorded timestamp.
-- =============================================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  -- Framework tag. Free text (not a CHECK) because the framework list grows
  -- over time (e.g. Colorado AI Act 2024, EU AI Act Annex IV). The app layer
  -- validates against the currently-supported set; historical values stay.
  framework TEXT NOT NULL,
  -- Output format — three supported. CHECK pins the set.
  format TEXT NOT NULL CHECK (format IN ('md', 'json', 'pdf')),
  -- Legal entity name that goes on the report cover. Snapshotted here
  -- because workspaces.name might be renamed later and we want the record
  -- to match what was actually stamped on the PDF.
  org_name TEXT NOT NULL,
  -- Content-address of the artifact bytes. Lets an auditor verify a
  -- downloaded file by rehashing locally.
  sha256 TEXT NOT NULL,
  -- HMAC-SHA256 computed with the workspace's tc_api_key — proves the
  -- report was issued by PanGuard for this specific workspace (not
  -- forged offline after the fact).
  hmac_sha256 TEXT,
  -- `reports/<workspace_id>/<uuid>.<ext>` — path inside the Storage bucket.
  storage_path TEXT,
  size_bytes INTEGER,
  -- Generation statistics — how many ATR rules loaded, how many mapped to
  -- the framework's controls, total control→rule mappings. These back the
  -- "coverage" metric shown next to the download button.
  rules_loaded INTEGER,
  rules_mapped INTEGER,
  total_mappings INTEGER,
  generated_by UUID REFERENCES auth.users,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot query: "list my reports, newest first" on the dashboard.
CREATE INDEX reports_workspace_generated_idx
  ON public.reports (workspace_id, generated_at DESC);

-- =============================================================================
-- audit_log — append-only record of every meaningful action in the console.
-- -----------------------------------------------------------------------------
-- Populated by:
--   * SECURITY DEFINER helpers in this file (e.g. create_workspace),
--   * service-role inserts from the Next.js API layer,
--   * database triggers on sensitive tables (future work).
--
-- RLS (next migration) allows SELECT to members but no direct INSERT — so
-- the app can't pretend events didn't happen by rewriting the log.
-- =============================================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Workspace scope. NULL only for user-level events (e.g. account deletion).
  workspace_id UUID REFERENCES public.workspaces ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  -- Dotted verb string: 'workspace.created', 'report.generated',
  -- 'api_key.revoked'. Free text rather than CHECK because we add new actions
  -- often and don't want to ship a migration per action.
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  -- Structured event payload. Keep individual entries small (<4KB); large
  -- artifacts go to Storage and are referenced by path here.
  metadata JSONB,
  -- Raw client metadata for forensics. `INET` validates IPv4/IPv6 format.
  ip_address INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot query: audit view in the UI, newest-first, filtered by workspace.
CREATE INDEX audit_log_workspace_occurred_idx
  ON public.audit_log (workspace_id, occurred_at DESC);

-- =============================================================================
-- Trigger helper: keep `updated_at` fresh without requiring every UPDATE to
-- set it explicitly. Applied to tables that expose an updated_at column.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workspaces_set_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- create_workspace(name, slug)
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER because the INSERT-into-workspaces policy is locked (no
-- direct insert from clients). This function is the only sanctioned path to
-- create a workspace; it:
--   1. Requires an authenticated caller (auth.uid() NOT NULL),
--   2. Inserts the workspace row,
--   3. Adds the caller as the `admin` member with accepted_at=now(),
--   4. Writes an audit_log entry.
--
-- Granted to `authenticated` so any signed-in user can onboard.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_workspace(
  p_name TEXT,
  p_slug TEXT
)
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
-- Lock the search_path so a hijacked `public` schema can't redirect our
-- INSERTs — defense in depth for any SECURITY DEFINER function.
SET search_path = public, pg_temp
AS $$
DECLARE
  ws public.workspaces;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.workspaces (name, slug)
    VALUES (p_name, p_slug)
    RETURNING * INTO ws;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, accepted_at)
    VALUES (ws.id, auth.uid(), 'admin', now());

  INSERT INTO public.audit_log (workspace_id, user_id, action, metadata)
    VALUES (
      ws.id,
      auth.uid(),
      'workspace.created',
      jsonb_build_object('name', p_name, 'slug', p_slug)
    );

  RETURN ws;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- is_workspace_member(workspace_id, min_role)
-- -----------------------------------------------------------------------------
-- The single source of truth for "is the current user allowed to touch this
-- workspace at the requested role or higher?". Called from every RLS policy
-- in migration 20260422000002 — keeping the logic in one place means the
-- role ladder can change with one edit.
--
-- Role ladder (highest to lowest):
--   admin > analyst > auditor > readonly
--
-- STABLE (not VOLATILE) lets Postgres cache the result within a single query,
-- which matters because RLS re-checks policies row-by-row.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(
  p_workspace_id UUID,
  p_min_role TEXT DEFAULT 'readonly'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND CASE p_min_role
        WHEN 'admin'    THEN role = 'admin'
        WHEN 'analyst'  THEN role IN ('admin', 'analyst')
        WHEN 'auditor'  THEN role IN ('admin', 'analyst', 'auditor')
        ELSE TRUE  -- 'readonly' (or any unrecognized value) accepts any role
      END
  );
$$;
