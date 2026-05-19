-- =============================================================================
-- PanGuard AI — Stripe billing grace-period column
-- Migration: 20260512000002_billing_grace.sql
-- -----------------------------------------------------------------------------
-- Adds `workspaces.cancel_at` to support a paid-through-period grace window
-- when a Stripe subscription is cancelled.
--
-- Scenario: a customer cancels mid-billing-period. Stripe emits
-- `customer.subscription.deleted` with `current_period_end` set to the end of
-- the prepaid window. We have already collected the money for the rest of the
-- period; immediately downgrading to community is hostile to the customer
-- and inconsistent with industry norms (Stripe / GitHub / Vercel all let the
-- paid tier ride out the prepaid period).
--
-- Behaviour after this migration:
--   - The webhook compares `current_period_end` to `now()`. If it is in the
--     future, the tier stays as-is and `cancel_at` is set to that timestamp.
--   - A lazy check in `requireWorkspaceBySlug` (`lib/workspaces.ts`) flips the
--     workspace to community whenever `tier_expires_at < now()` AND the tier
--     is not already community. This avoids the need for a periodic cron job
--     for the MVP — a workspace can only be "active" if someone visits it.
--   - A future BLOCK E periodic job can re-use the same lazy-check logic via
--     a SQL function and a Supabase scheduled job.
-- =============================================================================

ALTER TABLE public.workspaces
  ADD COLUMN cancel_at TIMESTAMPTZ;

COMMENT ON COLUMN public.workspaces.cancel_at IS
  'Set when a Stripe subscription is cancelled but the prepaid period has not yet ended. '
  'Equals subscription.current_period_end at cancellation time. When the lazy downgrade '
  'check runs at or after this instant, the workspace falls back to community tier. '
  'NULL means no pending cancellation.';

-- Partial index so the (future) periodic reconciliation job can cheaply find
-- workspaces with an active grace window. Today the lazy-check path uses
-- the slug primary key, but the index keeps the periodic job O(grace) instead
-- of O(workspaces).
CREATE INDEX idx_workspaces_cancel_at
  ON public.workspaces (cancel_at)
  WHERE cancel_at IS NOT NULL;
