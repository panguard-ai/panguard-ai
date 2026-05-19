-- =============================================================================
-- PanGuard AI — Stripe billing tables & workspace customer mapping
-- Migration: 20260512000001_billing.sql
-- -----------------------------------------------------------------------------
-- Adds two things needed to make the Stripe payment loop reliable:
--
--   1. `billing_events` — append-only idempotency log of every Stripe event
--      delivery the webhook has processed. Stripe retries on non-2xx, so the
--      same `event.id` can arrive multiple times; INSERT-on-conflict on the
--      primary key turns replays into a cheap no-op.
--
--   2. `workspaces.stripe_customer_id` — the reverse breadcrumb the webhook
--      needs to walk from a `customer.subscription.*` event back to a
--      workspace row. Checkout sets this once on the first
--      `checkout.session.completed`; every subsequent renewal/cancellation
--      event finds the workspace by this column.
--
-- Audit log action enum: the existing `audit_log.action` column is free-form
-- TEXT (see 20260422000001_initial.sql, table comment: "Free text rather than
-- CHECK because we add new actions often"). No schema change is needed to
-- start emitting `billing.upgraded`, `billing.cancelled`,
-- `billing.payment_failed`, `billing.updated`.
-- =============================================================================

-- =============================================================================
-- billing_events — Stripe webhook idempotency log.
-- -----------------------------------------------------------------------------
-- Primary key is the Stripe `event.id` (string, format `evt_...`). The webhook
-- INSERTs the row INSIDE a try/catch and treats a unique-violation as "already
-- processed, ack 200 to Stripe". This makes the whole webhook idempotent
-- without needing an advisory lock or external queue.
-- =============================================================================
CREATE TABLE public.billing_events (
  -- Stripe's own event id (e.g. `evt_1Q...`). Globally unique inside Stripe,
  -- so we use it as our PK directly — no surrogate UUID needed.
  event_id TEXT PRIMARY KEY,
  -- The Stripe event type, e.g. `checkout.session.completed`. Indexed so the
  -- ops view "what events did we see today, grouped by type" stays cheap.
  type TEXT NOT NULL,
  -- Full event JSON as Stripe delivered it. Kept for forensic replay so we
  -- can re-derive workspace state if a handler has a bug we only spot later.
  payload_jsonb JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX billing_events_type_received_idx
  ON public.billing_events (type, received_at DESC);

-- =============================================================================
-- billing_events RLS — service_role only.
-- -----------------------------------------------------------------------------
-- This table is never read by end users; the webhook (service_role) is the
-- only writer and the only reader. We explicitly DISABLE row-level security
-- so:
--   (a) The webhook's INSERT-on-conflict path doesn't pay the cost of policy
--       evaluation on a hot insert path that Stripe retries aggressively.
--   (b) There is no SELECT policy for `anon` / `authenticated` to attach to
--       — even an accidentally-exposed PostgREST query against this table
--       returns zero rows because the table grants no SELECT to those roles
--       (default — no GRANT issued below).
--
-- Note: with RLS disabled, the table relies on missing GRANTs rather than
-- row-level filters to keep non-service_role roles out. The Supabase default
-- of granting only `service_role` access to new tables in `public` schema
-- means we don't need to revoke anything.
-- =============================================================================
ALTER TABLE public.billing_events DISABLE ROW LEVEL SECURITY;

-- Belt-and-braces: revoke any default grant PostgREST may have synthesised so
-- the table is unreachable from a logged-in user's session.
REVOKE ALL ON TABLE public.billing_events FROM anon, authenticated;

-- =============================================================================
-- workspaces.stripe_customer_id
-- -----------------------------------------------------------------------------
-- Nullable because Community-tier workspaces never touch Stripe. Set on the
-- first successful `checkout.session.completed`, kept after cancellation so
-- reactivation reuses the same Stripe Customer object.
--
-- UNIQUE enforces the one-customer-per-workspace invariant the webhook relies
-- on when it looks up `WHERE stripe_customer_id = $1`. If a workspace ever
-- needed to swap Stripe customers (e.g. acquisition), an explicit migration
-- would null the old value before setting the new one.
-- =============================================================================
ALTER TABLE public.workspaces
  ADD COLUMN stripe_customer_id TEXT UNIQUE;

-- Partial index on non-null rows. UNIQUE already creates a btree index, but
-- this partial variant is cheaper for the webhook's lookup pattern
-- (`WHERE stripe_customer_id = $1`) and skips the long tail of NULL rows
-- representing community-tier workspaces.
CREATE INDEX idx_workspaces_stripe_customer
  ON public.workspaces (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
