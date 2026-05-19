/**
 * Tests for GitHub-bound client keys and weighted ATR proposal confirmations.
 *
 * Audit ref: C (TC client-registration Sybil defence). The corpus integrity
 * model says:
 *   - anonymous clients can submit proposals but their vote weight is 0
 *   - github_new clients (< 30 days) contribute 0.5 weight per vote
 *   - github_verified clients (>= 30 days) contribute 1.0 weight per vote
 *   - cumulative weight >= 3.0 promotes a proposal to 'confirmed' status
 *
 * The GitHub /user verification itself is exercised at the route layer with
 * a mocked fetch (see http-tests below). Here we cover the DB-layer
 * primitives directly because they own the trust model.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreatCloudDB } from '../src/database.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { ATRProposal } from '../src/types.js';

function makeProposal(patternHash: string, clientId?: string): ATRProposal {
  return {
    patternHash,
    ruleContent: `id: ATR-TEST-${patternHash}\ntitle: test\n`,
    llmProvider: 'test',
    llmModel: 'test',
    selfReviewVerdict: 'approved',
    clientId,
  } as unknown as ATRProposal;
}

describe('TC — GitHub trust tier + weighted confirmations', () => {
  let db: ThreatCloudDB;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tc-github-trust-test-'));
    db = new ThreatCloudDB(join(tempDir, 'test.db'));
  });

  afterEach(() => {
    db.close();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  describe('registerGitHubClientKey', () => {
    it('issues a fresh client key tied to a numeric github_user_id', () => {
      const result = db.registerGitHubClientKey(424242, 'octocat', '203.0.113.1');
      expect(result.clientKey).toMatch(/^[0-9a-f]{8}-/); // uuid prefix
      expect(result.clientId).toBe('github:424242');
      expect(result.trustTier).toBe('github_new');
    });

    it('reuses the original clientId across token rotations for the same github user', () => {
      const first = db.registerGitHubClientKey(424242, 'octocat', '203.0.113.1');
      const second = db.registerGitHubClientKey(424242, 'octocat', '198.51.100.5');
      // Same github user → same logical client_id, different raw key.
      expect(second.clientId).toBe(first.clientId);
      expect(second.clientKey).not.toBe(first.clientKey);
    });

    it('looks up trust tier via getClientKeyTrustInfo', () => {
      const issued = db.registerGitHubClientKey(789, 'alice', '203.0.113.2');
      const info = db.getClientKeyTrustInfo(issued.clientKey);
      expect(info).not.toBeNull();
      expect(info?.githubUserId).toBe(789);
      expect(info?.trustTier).toBe('github_new');
    });
  });

  describe('Anonymous keys map to trust_tier=anonymous', () => {
    it('returns anonymous trust tier for legacy /api/clients/register key', () => {
      const { clientKey } = db.registerClientKey('legacy-client-id-12345', '203.0.113.10');
      const info = db.getClientKeyTrustInfo(clientKey);
      expect(info?.trustTier).toBe('anonymous');
      expect(info?.githubUserId).toBeNull();
    });
  });

  describe('confirmATRProposalWeighted — promotion threshold = 3.0', () => {
    it('does NOT promote with anonymous votes only (weight 0)', () => {
      db.insertATRProposal(makeProposal('hash-anon', 'submitter-client'));
      // Anonymous tier contributes 0 weight per vote.
      db.confirmATRProposalWeighted('hash-anon', 0.0);
      db.confirmATRProposalWeighted('hash-anon', 0.0);
      db.confirmATRProposalWeighted('hash-anon', 0.0);
      db.confirmATRProposalWeighted('hash-anon', 0.0);

      const rows = db.getATRProposals('pending') as Array<{ pattern_hash: string }>;
      const stillPending = rows.find((r) => r.pattern_hash === 'hash-anon');
      expect(stillPending).toBeDefined();
    });

    it('promotes after three github_verified votes (3 x 1.0 = 3.0)', () => {
      db.insertATRProposal(makeProposal('hash-verified', 'submitter-client'));
      db.confirmATRProposalWeighted('hash-verified', 1.0);
      db.confirmATRProposalWeighted('hash-verified', 1.0);
      const final = db.confirmATRProposalWeighted('hash-verified', 1.0);

      expect(final).toBeGreaterThanOrEqual(3.0);
      const confirmed = db.getATRProposals('confirmed') as Array<{ pattern_hash: string }>;
      expect(confirmed.some((r) => r.pattern_hash === 'hash-verified')).toBe(true);
    });

    it('requires six github_new votes to promote (6 x 0.5 = 3.0)', () => {
      db.insertATRProposal(makeProposal('hash-new', 'submitter-client'));
      // 5 votes at 0.5 weight = 2.5 → not yet promoted
      for (let i = 0; i < 5; i++) {
        db.confirmATRProposalWeighted('hash-new', 0.5);
      }
      let stillPending = (db.getATRProposals('pending') as Array<{ pattern_hash: string }>).find(
        (r) => r.pattern_hash === 'hash-new'
      );
      expect(stillPending).toBeDefined();

      // 6th vote pushes weight to 3.0 → promoted
      db.confirmATRProposalWeighted('hash-new', 0.5);
      stillPending = (db.getATRProposals('pending') as Array<{ pattern_hash: string }>).find(
        (r) => r.pattern_hash === 'hash-new'
      );
      expect(stillPending).toBeUndefined();
      const confirmed = (db.getATRProposals('confirmed') as Array<{ pattern_hash: string }>).find(
        (r) => r.pattern_hash === 'hash-new'
      );
      expect(confirmed).toBeDefined();
    });

    it('mixed-tier: 2 verified + 2 new (2.0 + 1.0 = 3.0) promotes', () => {
      db.insertATRProposal(makeProposal('hash-mixed', 'submitter-client'));
      db.confirmATRProposalWeighted('hash-mixed', 1.0);
      db.confirmATRProposalWeighted('hash-mixed', 1.0);
      db.confirmATRProposalWeighted('hash-mixed', 0.5);
      db.confirmATRProposalWeighted('hash-mixed', 0.5);

      const confirmed = (db.getATRProposals('confirmed') as Array<{ pattern_hash: string }>).find(
        (r) => r.pattern_hash === 'hash-mixed'
      );
      expect(confirmed).toBeDefined();
    });

    it('anonymous votes mixed with verified do not block promotion', () => {
      db.insertATRProposal(makeProposal('hash-mixed-anon', 'submitter-client'));
      db.confirmATRProposalWeighted('hash-mixed-anon', 0.0); // anon
      db.confirmATRProposalWeighted('hash-mixed-anon', 1.0);
      db.confirmATRProposalWeighted('hash-mixed-anon', 0.0); // anon
      db.confirmATRProposalWeighted('hash-mixed-anon', 1.0);
      db.confirmATRProposalWeighted('hash-mixed-anon', 0.0); // anon
      db.confirmATRProposalWeighted('hash-mixed-anon', 1.0);

      const confirmed = (db.getATRProposals('confirmed') as Array<{ pattern_hash: string }>).find(
        (r) => r.pattern_hash === 'hash-mixed-anon'
      );
      expect(confirmed).toBeDefined();
    });
  });

  describe('Per-github-user daily proposal cap', () => {
    it('hasGitHubProposalCapReached returns false before cap is reached', () => {
      expect(db.hasGitHubProposalCapReached(424242, 10)).toBe(false);
      // Record 9 submissions
      for (let i = 0; i < 9; i++) {
        db.recordGitHubProposalSubmission(424242);
      }
      expect(db.hasGitHubProposalCapReached(424242, 10)).toBe(false);
    });

    it('returns true once the daily cap is reached', () => {
      for (let i = 0; i < 10; i++) {
        db.recordGitHubProposalSubmission(424242);
      }
      expect(db.hasGitHubProposalCapReached(424242, 10)).toBe(true);
    });

    it('isolates caps per github user', () => {
      for (let i = 0; i < 10; i++) {
        db.recordGitHubProposalSubmission(424242);
      }
      expect(db.hasGitHubProposalCapReached(424242, 10)).toBe(true);
      // A different user is not affected
      expect(db.hasGitHubProposalCapReached(999999, 10)).toBe(false);
    });
  });

  describe('promoteMatureGitHubClients', () => {
    it('is a no-op when no clients have been registered for >= 30 days', () => {
      db.registerGitHubClientKey(1, 'fresh-user', '203.0.113.1');
      const promoted = db.promoteMatureGitHubClients();
      expect(promoted).toBe(0);

      const info = db.getClientKeyTrustInfo(
        db.registerGitHubClientKey(1, 'fresh-user', '203.0.113.1').clientKey
      );
      expect(info?.trustTier).toBe('github_new');
    });
  });
});
