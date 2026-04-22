-- ============================================================================
-- 20260422000004_events.sql
-- Per-workspace scan / guard / detect events ingested from CLI + Guard daemon
--
-- Design note: paid-tier customer events live in Supabase (this table) with
-- RLS tenant isolation. Anonymous Community telemetry continues to flow into
-- the separate tc.panguard.ai SQLite DB (existing threat-cloud service) for
-- crystallization back into ATR rules. Two intake pipelines, two DBs, no
-- cross-contamination of tenant data with public telemetry.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- endpoints:   one row per machine reporting into the workspace.
-- Auto-created when Guard/CLI first posts an event with a new machine_id.
-- -----------------------------------------------------------------------------
CREATE TABLE public.endpoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  machine_id      TEXT NOT NULL,                -- stable hash produced by pga (machine-id + user)
  hostname        TEXT,
  os_type         TEXT,                         -- 'darwin' | 'linux' | 'windows'
  panguard_version TEXT,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (workspace_id, machine_id)
);
CREATE INDEX ON public.endpoints (workspace_id, last_seen_at DESC);

COMMENT ON COLUMN public.endpoints.machine_id IS
  'Stable hash combining host machine ID + logged-in user. Not PII itself; does not leak hostname.';

-- -----------------------------------------------------------------------------
-- events:      every triggered ATR rule match + every scan outcome.
-- Partitioning note: if volume grows beyond ~10M rows in Year 1 we partition
-- by occurred_at month. Not needed for pilot.
-- -----------------------------------------------------------------------------
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,
  endpoint_id     UUID REFERENCES public.endpoints,           -- NULL if pre-endpoint-registration
  event_type      TEXT NOT NULL CHECK (event_type IN (
                    'scan.rule_match',     -- pga audit / pga scan finding
                    'scan.completed',      -- pga audit run finished (summary row)
                    'guard.blocked',       -- Guard runtime blocked an action
                    'guard.flagged',       -- Guard flagged without blocking
                    'trap.triggered',      -- Honeypot hit
                    'respond.action'       -- Response action taken (quarantine/kill/etc)
                  )),
  severity        TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low','info')),
  rule_id         TEXT,                         -- ATR-2026-NNNNN, NULL for non-rule events
  target          TEXT NOT NULL,                -- what was scanned / blocked (e.g. "skill.md@abc123")
  target_hash     TEXT,                         -- sha256 of target content, enables dedup
  payload_summary TEXT,                         -- 1-line human-readable, no raw sensitive content
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_workspace_occurred_idx ON public.events (workspace_id, occurred_at DESC);
CREATE INDEX events_rule_idx               ON public.events (workspace_id, rule_id) WHERE rule_id IS NOT NULL;
CREATE INDEX events_severity_idx           ON public.events (workspace_id, severity, occurred_at DESC);
CREATE INDEX events_target_hash_idx        ON public.events (workspace_id, target_hash) WHERE target_hash IS NOT NULL;

COMMENT ON COLUMN public.events.payload_summary IS
  'One-line summary safe for display. Raw adversarial payloads are NEVER stored — only their sha256 and severity. Compliance requirement: no sensitive content replication.';

-- -----------------------------------------------------------------------------
-- RLS: events + endpoints visible to workspace members (analyst+); insertable
-- only via service role (app.panguard.ai API routes validate api_key → workspace).
-- -----------------------------------------------------------------------------
ALTER TABLE public.events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY ev_select  ON public.events    FOR SELECT USING (public.is_workspace_member(workspace_id, 'auditor'));
CREATE POLICY ep_select  ON public.endpoints FOR SELECT USING (public.is_workspace_member(workspace_id, 'auditor'));

-- Inserts go through service_role in API routes (which validates the api_key →
-- workspace_id mapping before calling through), so no INSERT policy for
-- authenticated users. Same for UPDATE / DELETE — immutable from UI.
-- Service role bypasses RLS, which is the intended path.

-- -----------------------------------------------------------------------------
-- Helper view: events enriched with endpoint info (used by dashboard list view)
-- -----------------------------------------------------------------------------
CREATE VIEW public.events_with_endpoint AS
  SELECT
    e.id, e.workspace_id, e.event_type, e.severity, e.rule_id,
    e.target, e.target_hash, e.payload_summary, e.metadata,
    e.occurred_at, e.ingested_at,
    ep.machine_id AS endpoint_machine_id,
    ep.hostname   AS endpoint_hostname,
    ep.os_type    AS endpoint_os_type
  FROM public.events e
  LEFT JOIN public.endpoints ep ON ep.id = e.endpoint_id;

-- Views inherit RLS from underlying tables; explicit grant required for auth'd role
GRANT SELECT ON public.events_with_endpoint TO authenticated;

-- -----------------------------------------------------------------------------
-- Rollup function: counters for workspace overview (used by dashboard home)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workspace_event_summary(p_workspace_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_events     BIGINT,
  critical_count   BIGINT,
  high_count       BIGINT,
  unique_rules     BIGINT,
  unique_endpoints BIGINT,
  last_event_at    TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    count(*)                                                   AS total_events,
    count(*) FILTER (WHERE severity = 'critical')              AS critical_count,
    count(*) FILTER (WHERE severity = 'high')                  AS high_count,
    count(DISTINCT rule_id)                                    AS unique_rules,
    count(DISTINCT endpoint_id)                                AS unique_endpoints,
    max(occurred_at)                                           AS last_event_at
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND occurred_at >= now() - make_interval(days => p_days)
    AND public.is_workspace_member(workspace_id, 'auditor');
$$;
GRANT EXECUTE ON FUNCTION public.workspace_event_summary(UUID, INTEGER) TO authenticated;

-- -----------------------------------------------------------------------------
-- Helper function: upsert endpoint (called by API route on event ingest)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_endpoint(
  p_workspace_id UUID,
  p_machine_id TEXT,
  p_hostname TEXT,
  p_os_type TEXT,
  p_panguard_version TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE ep_id UUID;
BEGIN
  INSERT INTO public.endpoints (workspace_id, machine_id, hostname, os_type, panguard_version)
  VALUES (p_workspace_id, p_machine_id, p_hostname, p_os_type, p_panguard_version)
  ON CONFLICT (workspace_id, machine_id) DO UPDATE
    SET last_seen_at     = now(),
        hostname         = COALESCE(EXCLUDED.hostname, public.endpoints.hostname),
        os_type          = COALESCE(EXCLUDED.os_type, public.endpoints.os_type),
        panguard_version = COALESCE(EXCLUDED.panguard_version, public.endpoints.panguard_version)
  RETURNING id INTO ep_id;
  RETURN ep_id;
END $$;
-- upsert_endpoint is called by service role from API routes only; no public GRANT.
