-- =============================================================================
-- PanGuard AI Customer Dashboard — Storage bucket + policies
-- Migration: 20260422000003_storage.sql
-- -----------------------------------------------------------------------------
-- Creates the `reports` bucket (private) and RLS policies on storage.objects
-- that mirror the `public.reports` table access rules.
--
-- Object path convention:
--   reports/<workspace_id>/<report_id>.<ext>
--
-- The first folder segment is the workspace UUID. Policies parse it with
-- `storage.foldername(name)[1]` and run it through `is_workspace_member()`
-- — same guard as the metadata table.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket: `reports`
-- -----------------------------------------------------------------------------
-- `public = false` — every object requires a signed URL or an RLS-approved
-- read. Compliance reports contain customer infrastructure details and
-- cannot leak even briefly via a guessable URL.
--
-- `file_size_limit = 10 MiB` — hard server-side cap. Matches the value in
-- `config.toml` so local and prod agree. 10 MiB is plenty for PDF reports;
-- bigger artifacts should be paginated or move to a separate bucket.
--
-- `allowed_mime_types` — the three formats we generate. Denies arbitrary
-- uploads that slip past the Next.js API layer's own validation.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  10485760,  -- 10 * 1024 * 1024
  ARRAY[
    'application/pdf',
    'application/json',
    'text/markdown'
  ]
)
-- Idempotent: re-running the migration on a project that already has the
-- bucket (e.g. cloned from staging) silently no-ops.
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Storage RLS: gate every read on workspace auditor-or-higher membership.
-- -----------------------------------------------------------------------------
-- `storage.foldername(name)` returns the array of path segments of the
-- object key. We pick `[1]` (first segment) and cast to UUID — if the path
-- doesn't start with a valid UUID, the cast raises and the policy fails
-- closed, which is the behavior we want for malformed keys.
--
-- Auditor minimum matches the `reports` table policy: same people who can
-- see report metadata can download the file. Readonly users explicitly
-- cannot retrieve files.
CREATE POLICY reports_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reports'
    AND public.is_workspace_member(
      (storage.foldername(name))[1]::uuid,
      'auditor'
    )
  );

-- INSERT requires analyst+. Analysts generate reports; auditors only read.
-- Matches the `rpt_insert` policy on the metadata table.
CREATE POLICY reports_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND public.is_workspace_member(
      (storage.foldername(name))[1]::uuid,
      'analyst'
    )
  );

-- No UPDATE or DELETE policies — same reasoning as `public.reports`:
-- artifacts are immutable once generated. If a deletion is needed (GDPR
-- erasure request, accidental upload), the service_role handles it through
-- an audited admin flow.
