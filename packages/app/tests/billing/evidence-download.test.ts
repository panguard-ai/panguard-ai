/**
 * Unit tests for the evidence-download auth decision helper.
 *
 * The route handler in /api/billing/evidence/[id]/download runs three
 * Supabase queries (user, evidence row, membership) then calls the
 * decision function below. We exercise every decision branch here
 * without standing up Supabase or Storage. The 4 branches are the full
 * surface — there are no nested decisions to mock out.
 */

import { describe, it, expect } from 'vitest';
import {
  decideEvidenceDownload,
  type EvidenceDownloadInput,
} from '../../src/lib/billing/evidence-download';
import type { Tier } from '../../src/lib/tier/types';

const USER = { id: '00000000-0000-0000-0000-000000000001' };
const EVIDENCE = {
  workspace_id: '11111111-1111-1111-1111-111111111111',
  storage_path: '11111111-1111-1111-1111-111111111111/evidence.tar.gz',
};

function baseInput(overrides: Partial<EvidenceDownloadInput> = {}): EvidenceDownloadInput {
  return {
    user: USER,
    evidence: EVIDENCE,
    isMember: true,
    workspaceTier: 'pilot',
    ...overrides,
  };
}

describe('decideEvidenceDownload', () => {
  it('returns "unauthenticated" when there is no logged-in user', () => {
    const out = decideEvidenceDownload(baseInput({ user: null }));
    expect(out.kind).toBe('unauthenticated');
  });

  it('returns "not_found" when the evidence row does not exist', () => {
    const out = decideEvidenceDownload(baseInput({ evidence: null }));
    expect(out.kind).toBe('not_found');
  });

  it('returns "forbidden" when the caller is not a workspace member', () => {
    // Concrete narrative: a logged-in user got hold of an evidence URL
    // for another tenant. Even though the row exists, the auth layer
    // must deny — we never leak cross-tenant artefacts.
    const out = decideEvidenceDownload(baseInput({ isMember: false }));
    expect(out.kind).toBe('forbidden');
  });

  it('returns "tier_locked" when the workspace is on community', () => {
    // Concrete narrative: a Pilot org cancelled and the lazy-downgrade
    // already flipped it to community. Existing evidence rows still
    // appear (RLS allows SELECT for members) but downloads block
    // until they upgrade again.
    const out = decideEvidenceDownload(baseInput({ workspaceTier: 'community' }));
    expect(out.kind).toBe('tier_locked');
    if (out.kind === 'tier_locked') {
      expect(out.currentTier).toBe('community');
    }
  });

  it('returns "tier_locked" when workspaceTier is null', () => {
    const out = decideEvidenceDownload(baseInput({ workspaceTier: null }));
    expect(out.kind).toBe('tier_locked');
    if (out.kind === 'tier_locked') {
      expect(out.currentTier).toBe('community');
    }
  });

  it('returns "allow" with the storage path for a Pilot member', () => {
    const out = decideEvidenceDownload(baseInput());
    expect(out.kind).toBe('allow');
    if (out.kind === 'allow') {
      expect(out.storagePath).toBe(EVIDENCE.storage_path);
    }
  });

  it('returns "allow" for an Enterprise member (inheritance)', () => {
    const out = decideEvidenceDownload(baseInput({ workspaceTier: 'enterprise' }));
    expect(out.kind).toBe('allow');
  });

  // Ordering invariant — auth checks must precede tier check. Without
  // this, a non-member of a Pilot workspace would get tier_locked (info
  // leak: tells them the workspace IS Pilot) instead of forbidden.
  it.each<[Partial<EvidenceDownloadInput>, EvidenceDownloadInput['user'] | null]>([
    [{ isMember: false, workspaceTier: 'community' }, USER],
    [{ isMember: false, workspaceTier: 'pilot' }, USER],
    [{ isMember: false, workspaceTier: 'enterprise' }, USER],
  ])('non-members always get forbidden regardless of tier', (overrides) => {
    const out = decideEvidenceDownload(baseInput(overrides));
    expect(out.kind).toBe('forbidden');
  });

  // Ordering invariant — unauthenticated trumps everything.
  it('unauthenticated trumps not_found / forbidden / tier_locked', () => {
    const out = decideEvidenceDownload({
      user: null,
      evidence: null,
      isMember: false,
      workspaceTier: 'community' as Tier,
    });
    expect(out.kind).toBe('unauthenticated');
  });
});
