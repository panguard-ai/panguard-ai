-- pilot_intent — captured before checkout, persists scoping answers + terms acceptance.
--
-- Flow:
--   1. Visitor on panguard.ai/scoping fills 5 fields + ticks MSA/DPA/Refund checkboxes
--   2. POST /api/pilot/intent creates a row + sends magic link (Resend or Supabase auth)
--   3. Visitor clicks magic link → /pilot/checkout?intent=<pk>
--   4. /pilot/checkout verifies token, creates workspace, mints Stripe Session with
--      metadata.pilot_intent_id = pk so the webhook can join the two later
--   5. checkout.session.completed webhook updates workspace tier + sends welcome email
--
-- This table is the audit trail for the founding-customer gate: counting rows
-- where stripe_session_status='paid' tells us how many of the 3 slots have closed.

CREATE TABLE IF NOT EXISTS public.pilot_intent (
  -- Surrogate PK used in URL tokens. UUID is non-enumerable (vs serial)
  -- so a leaked intent URL doesn't expose the count.
  pk UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Scoping answers (collected on panguard.ai/scoping, all required)
  org_name TEXT NOT NULL CHECK (length(org_name) BETWEEN 2 AND 200),
  contact_email TEXT NOT NULL CHECK (contact_email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
  contact_name TEXT NOT NULL CHECK (length(contact_name) BETWEEN 2 AND 100),

  -- One of: 'eu-ai-act' | 'nist-ai-rmf' | 'iso-42001' | 'owasp-agentic' | 'owasp-llm'
  framework TEXT NOT NULL CHECK (
    framework IN ('eu-ai-act', 'nist-ai-rmf', 'iso-42001', 'owasp-agentic', 'owasp-llm')
  ),

  -- One of: 'vpc-aws' | 'vpc-gcp' | 'vpc-azure' | 'on-prem' | 'airgap' | 'undecided'
  deployment_target TEXT NOT NULL CHECK (
    deployment_target IN ('vpc-aws', 'vpc-gcp', 'vpc-azure', 'on-prem', 'airgap', 'undecided')
  ),

  -- One of: '1-10' | '11-50' | '51-200' | '200+'
  team_size TEXT NOT NULL CHECK (team_size IN ('1-10', '11-50', '51-200', '200+')),

  -- Free-form use case (capped 1000 chars to discourage abuse)
  use_case TEXT NOT NULL CHECK (length(use_case) BETWEEN 10 AND 1000),

  -- Path selection at scoping time. Path A = Stripe card. Path B = wire/invoice.
  payment_path TEXT NOT NULL DEFAULT 'card' CHECK (payment_path IN ('card', 'wire')),

  -- Terms acceptance — boolean snapshots at submission time. Audit value: if
  -- a customer ever disputes, we can prove they ticked these on this date.
  accepted_msa BOOLEAN NOT NULL DEFAULT false,
  accepted_dpa BOOLEAN NOT NULL DEFAULT false,
  accepted_refund_policy BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Document versions accepted (the file URLs are stable but the content rolls;
  -- record the version that was current at acceptance time).
  msa_version TEXT NOT NULL DEFAULT 'v1.0',
  dpa_version TEXT NOT NULL DEFAULT 'v1.0',
  refund_policy_version TEXT NOT NULL DEFAULT 'v1.0',

  -- Stripe Checkout Session ID once minted. Updated by /pilot/checkout when
  -- the intent is converted to a real Session.
  stripe_session_id TEXT UNIQUE,
  stripe_session_status TEXT CHECK (
    stripe_session_status IS NULL
    OR stripe_session_status IN ('open', 'complete', 'expired', 'paid', 'failed')
  ),

  -- Workspace created from this intent. Set after sign-up / first login.
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,

  -- Telemetry — IP + UA for fraud signal (kept 30 days, redacted on conversion)
  ip_address INET,
  user_agent TEXT,

  -- TTL — intents expire after 14 days if not converted to a paid session.
  -- Sweeping job (TBD) deletes expired rows.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days')
);

-- Lookup by Stripe Session ID in the webhook handler
CREATE INDEX IF NOT EXISTS pilot_intent_stripe_session_id_idx
  ON public.pilot_intent (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Founding-customer count — fast query for the gate
CREATE INDEX IF NOT EXISTS pilot_intent_paid_idx
  ON public.pilot_intent (stripe_session_status) WHERE stripe_session_status = 'paid';

-- Email lookup for "did this email already start an intent" UX
CREATE INDEX IF NOT EXISTS pilot_intent_email_idx ON public.pilot_intent (contact_email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_pilot_intent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pilot_intent_updated_at
  BEFORE UPDATE ON public.pilot_intent
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pilot_intent_updated_at();

-- RLS — service-role only. Visitors don't authenticate before posting an intent;
-- the API route uses the service-role client and validates body server-side.
-- After login + workspace association, customers can read their own intent via
-- the (workspace_id, member) join — handled in the API, not RLS.
ALTER TABLE public.pilot_intent ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for authenticated users by default — the workspace
-- billing page server-fetches via service-role.
-- (Adding a member-read policy would leak any pre-conversion intents
-- that happen to match emails. Keep service-role-only.)
