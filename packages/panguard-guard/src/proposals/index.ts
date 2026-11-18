/**
 * ATR rule proposals without Threat Cloud: local outbox + pre-filled GitHub
 * issue on the ATR repository, submitted by the user from their own account.
 *
 * @module @panguard-ai/panguard-guard/proposals
 */

export { deidentifyText, localContext, MASK } from './deidentify.js';
export type { DeidentifyContext } from './deidentify.js';
export {
  buildAtrIssueUrl,
  ATR_NEW_ISSUE_URL,
  ATR_RULE_TEMPLATE,
  ATR_FORM_FIELDS,
  MAX_ISSUE_URL_LENGTH,
} from './issue-url.js';
export type { AtrIssueFields, AtrIssueLink } from './issue-url.js';
export { proposalToIssueFields } from './convert.js';
export {
  buildSkillAuditProposal,
  selectProposalEvidence,
  isAtrFinding,
  parseLocation,
  MAX_SNIPPET_CHARS,
} from './skill-evidence.js';
export type { SkillFindingInput, SkillAuditProposalInput } from './skill-evidence.js';
export type { AtrProposal } from './convert.js';
export {
  saveProposalToOutbox,
  listOutbox,
  readOutboxRecord,
  markOutboxOpened,
  withOutbox,
  defaultOutboxDir,
  outboxId,
} from './outbox.js';
export type { OutboxRecord, OutboxStatus } from './outbox.js';
