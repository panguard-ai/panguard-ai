-- ============================================================================
-- 20260512000004_evidence_archives.sql
-- Compliance Evidence archive — Pilot+ feature.
--
-- Stores metadata for compliance evidence packs (migrator output, audit
-- bundles, scan exports). Binary artefacts live in Supabase Storage bucket
-- 'evidence-packs' at path '<workspace_id>/<id>.<ext>' and are served via
-- signed URLs minted by /api/billing/evidence/[id]/download. The bucket
-- itself MUST be configured as non-public; service-role minted signed URLs
-- expire after 1 hour.
-- ============================================================================

CREATE TABLE public.evidence_archives (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Provenance: which subsystem generated this evidence.
  --   'migrator' — migration completeness pack from panguard-migrator
  --   'audit'    — skill-audit evidence bundle
  --   'scan'     — pga scan SARIF + summary
  source                TEXT NOT NULL CHECK (source IN ('migrator', 'audit', 'scan')),
  storage_path          TEXT NOT NULL,
  file_size_bytes       BIGINT NOT NULL,
  sha256                TEXT NOT NULL,
  generated_by_user_id  UUID REFERENCES auth.users(id),
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.evidence_archives IS
  'Compliance evidence packs (Pilot+ feature). Binary artefacts live in Storage bucket "evidence-packs"; this table is the metadata + integrity index.';
COMMENT ON COLUMN public.evidence_archives.sha256 IS
  'SHA-256 of the storage object. Verified server-side before signing a download URL — tamper-detection for auditors.';
COMMENT ON COLUMN public.evidence_archives.storage_path IS
  'Path inside the "evidence-packs" bucket. Convention: "<workspace_id>/<id>.<ext>". Never exposed to clients; signed URL is minted on demand.';

ALTER TABLE public.evidence_archives ENABLE ROW LEVEL SECURITY;

-- Workspace members (any role) may list/download their workspace's evidence.
-- The download API also re-verifies the caller is a member before signing.
CREATE POLICY "evidence_select_workspace_member" ON public.evidence_archives
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Only the service_role can insert. The migrator/audit/scan upload routes
-- run with service_role privilege; users cannot forge an entry from the UI.
CREATE POLICY "evidence_insert_service_only" ON public.evidence_archives
  FOR INSERT
  WITH CHECK (false);

-- Same for UPDATE/DELETE — immutable from the dashboard surface.
-- (No policy means default-deny under RLS.)

CREATE INDEX idx_evidence_workspace_generated
  ON public.evidence_archives (workspace_id, generated_at DESC);
