/**
 * Build an ATR rule PROPOSAL from a local skill-audit result.
 *
 * WHY THIS EXISTS (learned the hard way — the scrapped ATR-PRED-* batch):
 * a proposal must carry the REAL attack evidence, NOT a rule fabricated from a
 * finding title or the regex of a rule that already fired. The rules live in
 * the shared builder (@panguard-ai/panguard-guard proposals/skill-evidence) so
 * `pga audit`, `pga up` and the Guard skill watcher all decide the same way:
 * only threats ATR did not already catch, and only with the source lines the
 * threat was found in. No usable evidence means no proposal.
 */

import {
  buildSkillAuditProposal as buildShared,
  saveProposalToOutbox,
} from '@panguard-ai/panguard-guard';
import type {
  AtrProposal,
  OutboxRecord,
  SkillAuditProposalInput,
  SkillFindingInput,
} from '@panguard-ai/panguard-guard';

/** A single finding, reduced to what a proposal needs. */
export type ProposalFinding = SkillFindingInput;

/** The exact shape ThreatCloudClient.submitATRProposal expects. */
export type SkillAuditProposal = AtrProposal;

/**
 * Turn a skill audit into a draft-request proposal, or null when ATR already
 * covers every finding or no finding has readable evidence.
 */
export function buildSkillAuditProposal(input: SkillAuditProposalInput): SkillAuditProposal | null {
  return buildShared(input);
}

/**
 * Keep a skill-audit proposal in the LOCAL outbox (~/.panguard/proposals), with
 * no consent needed: nothing leaves the machine. The user reviews it and submits
 * it as a pre-filled public ATR issue with `pga proposals submit <id>`.
 * Returns the stored record, or null when there is nothing to propose or the
 * outbox cannot be written (never throws: a full disk must not break a scan).
 */
export function keepSkillAuditProposalLocally(input: SkillAuditProposalInput): OutboxRecord | null {
  const proposal = buildShared(input);
  if (!proposal) return null;
  try {
    return saveProposalToOutbox(proposal);
  } catch {
    return null;
  }
}
