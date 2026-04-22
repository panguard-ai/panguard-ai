-- ============================================================================
-- 20260422000005_device_pending.sql
-- Add pending_plaintext column to device_codes so the poll endpoint can
-- return the freshly-minted api_key exactly once.
--
-- Flow recap:
--   1. CLI posts /api/device/code            → server inserts device_codes row with random device_code
--   2. User visits /device, authorizes        → server updates row with user_id + workspace_id +
--                                                creates api_keys row (keeping hash only) +
--                                                sets pending_plaintext = the plaintext api_key
--   3. CLI polls /api/device/poll             → server returns pending_plaintext,
--                                                then NULLs it so it can only ever be read once
--
-- The pending_plaintext column is short-lived (lifetime measured in seconds
-- between user approval and next CLI poll). Still sha256-only in the long-term
-- storage (api_keys.key_hash).
-- ============================================================================

ALTER TABLE public.device_codes
  ADD COLUMN IF NOT EXISTS pending_plaintext TEXT;

COMMENT ON COLUMN public.device_codes.pending_plaintext IS
  'Freshly-minted api_key plaintext, readable exactly once by the CLI poll endpoint. NULLed immediately after read. Never exposed to browser sessions.';

-- Defensive: an index to quickly null-sweep any pending_plaintext older than 24h.
-- Belt-and-braces in case the poll endpoint misses the update.
CREATE INDEX IF NOT EXISTS device_codes_pending_sweep_idx
  ON public.device_codes (approved_at)
  WHERE pending_plaintext IS NOT NULL;

-- Helper: periodic cleanup function (called by cron or edge function later)
CREATE OR REPLACE FUNCTION public.sweep_expired_device_codes()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE swept INTEGER;
BEGIN
  WITH victims AS (
    UPDATE public.device_codes
       SET pending_plaintext = NULL
     WHERE pending_plaintext IS NOT NULL
       AND (expires_at < now() OR (approved_at IS NOT NULL AND approved_at < now() - interval '10 minutes'))
     RETURNING id
  )
  SELECT count(*) INTO swept FROM victims;
  RETURN swept;
END $$;

COMMENT ON FUNCTION public.sweep_expired_device_codes() IS
  'Nulls pending_plaintext for any expired or >10min-approved device_code. Callable by a cron edge function.';
