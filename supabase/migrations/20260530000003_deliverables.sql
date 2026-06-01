-- =============================================================================
-- PanGuard AI — Deliverable assessment reports (Partner/JV client deliverables)
-- Migration: 20260530000003_deliverables.sql
-- -----------------------------------------------------------------------------
-- The findings-based, gov-grade PDF a Partner/JV assessor hands to a client.
-- Unlike `reports` (an immutable rule->control coverage matrix generated in one
-- shot), a deliverable is an EDITABLE working document: the assessor seeds
-- findings from scan events, enriches them by hand (CVSS / description /
-- remediation / control mappings), then ISSUES it — at which point the PDF is
-- rendered, hashed, uploaded, and the row is locked (status flips to 'issued').
--
-- Two tables:
--   deliverables          — one editable working doc + issued-artifact pointer
--   deliverable_findings  — one editable row per finding (ordered by `ordinal`)
--
-- RLS rides the existing is_workspace_member(workspace_id, role) helper — which
-- the organizations migration already extended to auto-admit the parent org's
-- members — so no new helper is introduced here. Same role ladder `reports`
-- uses (auditor reads, analyst writes), EXCEPT deliverables are mutable while in
-- draft, so an UPDATE policy is present (the immutable `reports` table has none).
-- =============================================================================

CREATE TABLE public.deliverables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces ON DELETE CASCADE,

  -- Lifecycle. 'draft' = editable; 'issued' = rendered + locked.
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'issued')),

  -- ---- Editable metadata (maps 1:1 to DeliverableReportInput) ---------------
  language          TEXT NOT NULL DEFAULT 'en'
                      CHECK (language IN ('en', 'zh-Hant')),
  classification    TEXT NOT NULL DEFAULT 'confidential'
                      CHECK (classification IN ('public','internal','confidential','restricted')),
  region            TEXT NOT NULL DEFAULT 'eu'
                      CHECK (region IN ('eu','us','apac','global')),
  -- Free text (the framework list grows over time) — the app layer validates
  -- against the currently-supported set; historical values stay readable.
  primary_framework TEXT NOT NULL DEFAULT 'eu-ai-act',
  client_name       TEXT NOT NULL DEFAULT '',
  client_detail     TEXT,
  assessor_name     TEXT NOT NULL DEFAULT '',
  assessor_detail   TEXT,
  report_ref        TEXT NOT NULL DEFAULT '',   -- human id, e.g. PG-RPT-2026-0042
  version           TEXT NOT NULL DEFAULT '1.0',
  report_date       DATE,
  prepared_by       TEXT NOT NULL DEFAULT '',
  reviewed_by       TEXT,
  scope             JSONB NOT NULL DEFAULT '[]'::jsonb,   -- string[]
  methodology       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- string[]

  -- ---- Issued artifact pointer (all NULL until issued) ----------------------
  -- Content-address of the PDF bytes; lets a recipient verify by rehashing.
  sha256          TEXT,
  -- HMAC-SHA256 (when a signing key is configured) proving issuance.
  hmac_sha256     TEXT,
  -- `reports/<workspace_id>/<uuid>-deliverable-...pdf` inside the Storage bucket.
  storage_path    TEXT,
  size_bytes      INTEGER,
  page_count      INTEGER,
  finding_count   INTEGER,
  issued_by       UUID REFERENCES auth.users,
  issued_at       TIMESTAMPTZ,

  -- ---- Audit ----------------------------------------------------------------
  created_by      UUID REFERENCES auth.users,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot query: "list this workspace's deliverables, newest first".
CREATE INDEX deliverables_workspace_created_idx
  ON public.deliverables (workspace_id, created_at DESC);

CREATE TABLE public.deliverable_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  UUID NOT NULL REFERENCES public.deliverables ON DELETE CASCADE,
  -- Display order within the deliverable (assessor can reorder).
  ordinal         INTEGER NOT NULL DEFAULT 0,

  finding_ref     TEXT,                          -- e.g. PG-001
  title           TEXT NOT NULL DEFAULT '',
  severity        TEXT NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('critical','high','medium','low','info')),
  category        TEXT,
  atr_rule_id     TEXT,
  affected_asset  TEXT,
  description     TEXT NOT NULL DEFAULT '',
  -- Redacted evidence summary ONLY — raw adversarial payloads are never stored
  -- (seeded from events.payload_summary, which is redacted by design).
  evidence        TEXT,
  cvss            NUMERIC(3,1),                  -- 0.0 - 10.0
  cvss_vector     TEXT,
  remediation     TEXT NOT NULL DEFAULT '',
  controls        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ControlRef[]

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX deliverable_findings_deliverable_ordinal_idx
  ON public.deliverable_findings (deliverable_id, ordinal);

-- Keep updated_at fresh without every UPDATE setting it (reuses the helper from
-- the initial migration).
CREATE TRIGGER deliverables_set_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER deliverable_findings_set_updated_at
  BEFORE UPDATE ON public.deliverable_findings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RLS
-- -----------------------------------------------------------------------------
-- Default-deny the instant RLS is enabled; policies below re-open specific
-- paths. Privileged writes (the issue/upload path) go through the service-role
-- admin client, which bypasses RLS — same pattern as the `reports` action.
-- =============================================================================
ALTER TABLE public.deliverables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_findings ENABLE ROW LEVEL SECURITY;

-- deliverables: auditor+ read, analyst+ create/update, admin delete (drop draft).
CREATE POLICY dlv_select ON public.deliverables
  FOR SELECT USING (public.is_workspace_member(workspace_id, 'auditor'));
CREATE POLICY dlv_insert ON public.deliverables
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, 'analyst'));
CREATE POLICY dlv_update ON public.deliverables
  FOR UPDATE USING (public.is_workspace_member(workspace_id, 'analyst'));
CREATE POLICY dlv_delete ON public.deliverables
  FOR DELETE USING (public.is_workspace_member(workspace_id, 'admin'));

-- deliverable_findings: every policy resolves the parent deliverable's
-- workspace_id and delegates to the same is_workspace_member gate.
CREATE POLICY dlvf_select ON public.deliverable_findings
  FOR SELECT USING (
    deliverable_id IN (
      SELECT id FROM public.deliverables
      WHERE public.is_workspace_member(workspace_id, 'auditor')
    )
  );
CREATE POLICY dlvf_insert ON public.deliverable_findings
  FOR INSERT WITH CHECK (
    deliverable_id IN (
      SELECT id FROM public.deliverables
      WHERE public.is_workspace_member(workspace_id, 'analyst')
    )
  );
CREATE POLICY dlvf_update ON public.deliverable_findings
  FOR UPDATE USING (
    deliverable_id IN (
      SELECT id FROM public.deliverables
      WHERE public.is_workspace_member(workspace_id, 'analyst')
    )
  );
CREATE POLICY dlvf_delete ON public.deliverable_findings
  FOR DELETE USING (
    deliverable_id IN (
      SELECT id FROM public.deliverables
      WHERE public.is_workspace_member(workspace_id, 'analyst')
    )
  );
