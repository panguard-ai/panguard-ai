import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreatCloudDB } from '../src/database.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { ATRProposal } from '../src/types.js';

describe('Canary Staging Layer', () => {
  let db: ThreatCloudDB;
  let tempDir: string;

  const makeProposal = (hash: string): ATRProposal => ({
    patternHash: hash,
    ruleContent: JSON.stringify({ id: hash, detection: { pattern: 'test.*' } }),
    llmProvider: 'anthropic',
    llmModel: 'claude-sonnet-4-6',
    selfReviewVerdict: 'safe',
    clientId: 'test-client-1',
  });

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'canary-test-'));
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

  it('1. confirmed proposals move to canary instead of promoted', () => {
    db.insertATRProposal(makeProposal('hash-canary-1'));
    // Simulate 3 confirmations to reach 'confirmed' status
    db.confirmATRProposal('hash-canary-1');
    db.confirmATRProposal('hash-canary-1');
    // insertATRProposal starts with confirmations=1, so 2 more confirms = 3 total = confirmed

    const moved = db.promoteConfirmedProposals();
    expect(moved).toBe(1);

    const proposals = db.getATRProposals('canary');
    expect(proposals.length).toBe(1);
    expect((proposals[0] as { status: string }).status).toBe('canary');
  });

  it('2. canary proposals are NOT returned by getConfirmedATRRules', () => {
    db.insertATRProposal(makeProposal('hash-canary-2'));
    db.confirmATRProposal('hash-canary-2');
    db.confirmATRProposal('hash-canary-2');
    db.promoteConfirmedProposals();

    const rules = db.getConfirmedATRRules();
    const canaryRule = rules.find((r) => r.ruleId === 'hash-canary-2');
    expect(canaryRule).toBeUndefined();
  });

  it('3. canary proposals have canary_started_at set', () => {
    db.insertATRProposal(makeProposal('hash-canary-3'));
    db.confirmATRProposal('hash-canary-3');
    db.confirmATRProposal('hash-canary-3');
    db.promoteConfirmedProposals();

    const proposals = db.getATRProposals('canary');
    expect(proposals.length).toBe(1);
    expect((proposals[0] as { canary_started_at: string }).canary_started_at).toBeTruthy();
  });

  it('4. canary rules are returned by getCanaryATRRules', () => {
    db.insertATRProposal(makeProposal('hash-canary-4'));
    db.confirmATRProposal('hash-canary-4');
    db.confirmATRProposal('hash-canary-4');
    db.promoteConfirmedProposals();

    const canaryRules = db.getCanaryATRRules();
    expect(canaryRules.length).toBe(1);
    expect(canaryRules[0].ruleId).toBe('hash-canary-4');
    expect(canaryRules[0].source).toBe('atr-canary');
  });

  it('5. promoteCanaryRules does NOT promote rules before 24hr', () => {
    db.insertATRProposal(makeProposal('hash-canary-5'));
    db.confirmATRProposal('hash-canary-5');
    db.confirmATRProposal('hash-canary-5');
    db.promoteConfirmedProposals();

    // Immediately try to promote — should not promote (< 24hr)
    const result = db.promoteCanaryRules();
    expect(result.promoted).toBe(0);
    expect(result.quarantined).toBe(0);

    // Still in canary
    const canaryRules = db.getCanaryATRRules();
    expect(canaryRules.length).toBe(1);
  });

  it('6. promoteCanaryRules promotes rules after 24hr with no negative feedback', () => {
    db.insertATRProposal(makeProposal('hash-canary-6'));
    db.confirmATRProposal('hash-canary-6');
    db.confirmATRProposal('hash-canary-6');
    db.promoteConfirmedProposals();

    // Manually backdate canary_started_at to 25 hours ago
    const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    (db as unknown as { db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } } }).db
      .prepare("UPDATE atr_proposals SET canary_started_at = ? WHERE pattern_hash = ?")
      .run(pastTime, 'hash-canary-6');

    const result = db.promoteCanaryRules();
    expect(result.promoted).toBe(1);
    expect(result.quarantined).toBe(0);

    // Now in promoted rules
    const rules = db.getConfirmedATRRules();
    const promoted = rules.find((r) => r.ruleId === 'hash-canary-6');
    expect(promoted).toBeDefined();
  });

  it('7. promoteCanaryRules quarantines rules with >= 3 negative feedback', () => {
    db.insertATRProposal(makeProposal('hash-canary-7'));
    db.confirmATRProposal('hash-canary-7');
    db.confirmATRProposal('hash-canary-7');
    db.promoteConfirmedProposals();

    // Submit 3 negative feedback reports — threshold is >= 3
    db.insertATRFeedback('hash-canary-7', false, 'client-a');
    db.insertATRFeedback('hash-canary-7', false, 'client-b');
    db.insertATRFeedback('hash-canary-7', false, 'client-c');

    const result = db.promoteCanaryRules();
    expect(result.quarantined).toBe(1);
    expect(result.promoted).toBe(0);

    // Verify status is quarantined
    const proposals = db.getATRProposals('quarantined');
    expect(proposals.length).toBe(1);
  });

  it('8. getNegativeFeedbackCount returns correct count', () => {
    db.insertATRFeedback('rule-x', false, 'c1');
    db.insertATRFeedback('rule-x', false, 'c2');
    db.insertATRFeedback('rule-x', true, 'c3'); // positive — should not count

    expect(db.getNegativeFeedbackCount('rule-x')).toBe(2);
  });

  it('9. quarantineProposal sets status to quarantined', () => {
    db.insertATRProposal(makeProposal('hash-canary-9'));
    db.quarantineProposal('hash-canary-9');

    const proposals = db.getATRProposals('quarantined');
    expect(proposals.length).toBe(1);
    expect((proposals[0] as { pattern_hash: string }).pattern_hash).toBe('hash-canary-9');
  });

  it('10. getProposalStats includes canary and quarantined counts', () => {
    db.insertATRProposal(makeProposal('hash-stats-1'));
    db.confirmATRProposal('hash-stats-1');
    db.confirmATRProposal('hash-stats-1');
    db.promoteConfirmedProposals(); // -> canary

    db.insertATRProposal(makeProposal('hash-stats-2'));
    db.quarantineProposal('hash-stats-2');

    const stats = db.getProposalStats();
    expect(stats.canary).toBe(1);
    expect(stats.quarantined).toBe(1);
    expect(stats.total).toBe(2);
  });

  it('11. positive feedback does not trigger quarantine', () => {
    db.insertATRProposal(makeProposal('hash-canary-11'));
    db.confirmATRProposal('hash-canary-11');
    db.confirmATRProposal('hash-canary-11');
    db.promoteConfirmedProposals();

    // Submit 5 positive feedback reports
    for (let i = 0; i < 5; i++) {
      db.insertATRFeedback('hash-canary-11', true, `client-${i}`);
    }

    // Backdate to make it eligible for promotion
    const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    (db as unknown as { db: { prepare: (sql: string) => { run: (...args: unknown[]) => void } } }).db
      .prepare("UPDATE atr_proposals SET canary_started_at = ? WHERE pattern_hash = ?")
      .run(pastTime, 'hash-canary-11');

    const result = db.promoteCanaryRules();
    expect(result.promoted).toBe(1);
    expect(result.quarantined).toBe(0);
  });
});
