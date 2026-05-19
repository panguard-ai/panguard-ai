-- ============================================================================
-- 20260512000005_events_realtime.sql
-- Enable Supabase Realtime (Postgres logical replication → WebSocket) on the
-- public.events table so pilot dashboards can show new threat events live
-- without an F5 refresh.
--
-- Two-step setup:
--   1. REPLICA IDENTITY FULL so the WAL row carries every column (so the
--      realtime broker has the workspace_id needed to apply the channel
--      filter against `workspace_id=eq.<uuid>`).
--   2. Add the table to Supabase's default `supabase_realtime` publication.
--      The publication is created by Supabase on every project init; the
--      DO block is defensive for older / self-hosted projects where it may
--      not exist yet, and tolerates the "already in publication" duplicate
--      case so the migration is idempotent if re-run.
--
-- Security: realtime auto-respects RLS on the underlying table. The
-- `ev_select` policy in 20260422000004_events.sql already restricts SELECT
-- to workspace members (auditor+), so subscribers can only receive events
-- for workspaces they belong to. No additional auth wiring required.
--
-- Operational note: requires Supabase Pro ($25/mo) for production concurrent
-- subscriber counts on the realtime broker; free tier caps too low for
-- dashboards under active scan load.
-- ============================================================================

ALTER TABLE public.events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- already in publication; idempotent no-op
  NULL;
END $$;
