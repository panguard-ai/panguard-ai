/**
 * Pure authorization decision for GET /api/billing/evidence/[id]/download.
 *
 * The route handler runs three Supabase queries (user, evidence row,
 * workspace membership). The auth state machine that decides which HTTP
 * status to return is pulled into this module so we can unit-test every
 * branch without standing up Supabase or Storage.
 *
 * Decisions (in order of precedence):
 *   unauthenticated   — no logged-in user
 *   not_found         — evidence row missing or RLS filtered it out
 *   forbidden         — caller is not a workspace member
 *   tier_locked       — workspace is below 'pilot' (Pilot+ feature)
 *   allow             — sign + return URL
 *
 * Tier check is layered AFTER membership so a workspace member of a
 * downgraded org gets a more accurate 403 (tier_locked) rather than a
 * 404 (not_found) — the row exists for them, it's just not downloadable.
 */

import { meetsTier, type Tier } from '@/lib/tier/types';

export type EvidenceDownloadAuth =
  | { kind: 'unauthenticated' }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'tier_locked'; currentTier: Tier }
  | { kind: 'allow'; storagePath: string };

export interface EvidenceDownloadInput {
  user: { id: string } | null;
  evidence: { workspace_id: string; storage_path: string } | null;
  isMember: boolean;
  workspaceTier: Tier | null;
}

const REQUIRED_TIER: Tier = 'pilot';

export function decideEvidenceDownload(input: EvidenceDownloadInput): EvidenceDownloadAuth {
  if (!input.user) return { kind: 'unauthenticated' };
  if (!input.evidence) return { kind: 'not_found' };
  if (!input.isMember) return { kind: 'forbidden' };
  if (!input.workspaceTier || !meetsTier(input.workspaceTier, REQUIRED_TIER)) {
    return { kind: 'tier_locked', currentTier: input.workspaceTier ?? 'community' };
  }
  return { kind: 'allow', storagePath: input.evidence.storage_path };
}
