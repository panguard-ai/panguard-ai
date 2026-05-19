-- ============================================================================
-- 20260512000003_endpoints_health.sql
-- Extend endpoints table with health/mode/threat-counter columns so the new
-- /w/<slug>/endpoints fleet page can render without joining events per row.
--
-- Plain columns (NOT generated). Supabase managed PG has had quirks with
-- generated columns in the past (immutability constraints around now()),
-- so the totals are app-side-recomputed on the page-read path and the
-- mode/last_sync columns are updated by the bulk-event ingest route.
-- ============================================================================

ALTER TABLE public.endpoints
  ADD COLUMN IF NOT EXISTS current_mode       TEXT,                          -- 'learning' | 'protection' | NULL
  ADD COLUMN IF NOT EXISTS total_threats_30d  INTEGER NOT NULL DEFAULT 0,    -- snapshot, recomputed lazily on page read
  ADD COLUMN IF NOT EXISTS last_sync_at       TIMESTAMPTZ,                   -- last successful /api/v2/events post
  ADD COLUMN IF NOT EXISTS tier_at_last_sync  TEXT;                          -- 'community' | 'pilot' | 'enterprise'

COMMENT ON COLUMN public.endpoints.current_mode IS
  'Operating mode reported by Guard on the most recent telemetry batch (learning vs protection). NULL until the first event with metadata.guard_mode arrives.';

COMMENT ON COLUMN public.endpoints.total_threats_30d IS
  'Snapshot of high+critical event count over the last 30 days. App recomputes this from the events table on dashboard read — do not rely on it being live-accurate. Kept on the row so we can render the fleet page without a join for >100 endpoint fleets.';

COMMENT ON COLUMN public.endpoints.tier_at_last_sync IS
  'Workspace tier observed by the API route at sync time. Useful for forensic queries — "was this endpoint reporting under a Pilot or Community window when the incident fired?".';

-- The existing index `idx_endpoints_workspace_last_seen` is implied by the
-- column-list index created in 20260422000004_events.sql:
--   CREATE INDEX ON public.endpoints (workspace_id, last_seen_at DESC);
-- Re-create with an explicit name so the endpoints page query plan is easy to
-- inspect, and so future migrations can reference it by name. Idempotent via
-- IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_endpoints_workspace_last_seen
  ON public.endpoints (workspace_id, last_seen_at DESC);
