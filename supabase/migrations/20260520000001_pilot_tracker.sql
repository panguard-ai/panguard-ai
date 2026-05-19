-- Pilot tracker tables — back the /w/[slug]/pilot dashboard page.
--
-- Two tables:
--   pilot_deliverables           — 6 SOW deliverables per workspace, status tracking
--   pilot_engineering_hours      — weekly office-hours log entries
--
-- Both are scoped to workspaces via workspace_id + RLS, so a Customer
-- only sees their own Pilot. Service-role can update on PanGuard's side
-- when deliverables are accepted or hours are logged.

-- =====================================================================
-- pilot_deliverables
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pilot_deliverables (
  -- Synthetic primary key for the row itself.
  pk UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Workspace owning this deliverable. CASCADE so deleting a workspace
  -- drops its tracker rows. workspace_id is the row's tenant boundary.
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Stable deliverable identifier — matches the keys in
  -- packages/app/src/app/w/[slug]/pilot/page.tsx SOW_DELIVERABLES.
  -- One of: engine | rule_pack | evidence_pack | siem_webhook |
  -- engineering_hours | exit_packet.
  id TEXT NOT NULL,

  -- Human-readable label cached at insert time so historical rows survive
  -- label changes in the SOW template. The page falls back to its own
  -- defaults when reading.
  label TEXT NOT NULL,

  -- SOW Section 2 target day (14, 21, 30, 75, 90, 90 today).
  target_day INTEGER NOT NULL CHECK (target_day BETWEEN 1 AND 120),

  -- Status state machine. Acceptance is silent after 10 business days
  -- per SOW Section 4 — that transition is performed by a scheduled job.
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'delivered', 'accepted')),

  -- When PanGuard marked the deliverable as delivered to the Customer.
  delivered_at TIMESTAMPTZ,

  -- When Customer explicitly accepted OR when silent-acceptance kicked in
  -- (10 business days after delivered_at per SOW Section 4).
  accepted_at TIMESTAMPTZ,

  -- Free-form notes — visible to Customer and PanGuard.
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, id)
);

CREATE INDEX IF NOT EXISTS pilot_deliverables_workspace_id_idx
  ON public.pilot_deliverables (workspace_id);

-- RLS — workspace members read; only service-role writes.
ALTER TABLE public.pilot_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY pilot_deliverables_select_member
  ON public.pilot_deliverables
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Service role bypass for inserts / updates is implicit (service role
-- bypasses RLS by design in Supabase).

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_pilot_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pilot_deliverables_updated_at
  BEFORE UPDATE ON public.pilot_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pilot_deliverables_updated_at();

-- =====================================================================
-- pilot_engineering_hours
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pilot_engineering_hours (
  pk UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Calendar week start (Monday 00:00 UTC). One row per workspace per week.
  -- Unused weekly hours expire at end of week per SOW Section 2.5.
  week_starting DATE NOT NULL,

  -- Hours used in this calendar week. CHECK constraint blocks negative
  -- values and unreasonable spikes; 6.0 is the weekly budget, with a
  -- 30% headroom for occasional overages.
  hours_used NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (hours_used >= 0 AND hours_used <= 10),

  -- Activity summary for the week. Surfaced in the Customer's dashboard.
  summary TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, week_starting)
);

CREATE INDEX IF NOT EXISTS pilot_engineering_hours_workspace_id_idx
  ON public.pilot_engineering_hours (workspace_id);

ALTER TABLE public.pilot_engineering_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY pilot_engineering_hours_select_member
  ON public.pilot_engineering_hours
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER pilot_engineering_hours_updated_at
  BEFORE UPDATE ON public.pilot_engineering_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pilot_deliverables_updated_at();
