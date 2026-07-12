/**
 * Build an ATR rule PROPOSAL from a local skill-audit result, for the Threat
 * Cloud flywheel (opt-in upload only).
 *
 * WHY THIS EXISTS (learned the hard way — the scrapped ATR-PRED-* batch):
 * a proposal must carry the REAL attack evidence (the matched code), NOT a rule
 * fabricated from the finding TITLE's keywords. The old `pga up` / `pga audit`
 * path built `value: "(?i)<title keywords>"` regexes — those detect our own
 * REPORT TEXT, not the attack, and shipped with no precision test. That is
 * exactly the class of rule the project had to throw away. Uploading them is
 * worse than uploading nothing: it pollutes the community proposal queue with
 * rules that can never pass the flywheel safety gate (which requires
 * true-positive + true-negative test cases and 0 FP on the benign corpus).
 *
 * So instead of fabricating a rule, we emit a DRAFT REQUEST: `needsLLMDraft:
 * true` plus the actual evidence (the matched code snippet where available,
 * otherwise the labeled finding). The server-side / Guard LLM drafter turns it
 * into a real, test-backed rule via the Rule Creation Standard. This mirrors the
 * runtime skill-watcher producer (packages/panguard-guard/src/engines/
 * skill-watcher.ts) so ALL proposal paths emit ONE valid contract.
 */

import { patternHash } from '@panguard-ai/scan-core';
import { scrubSecretValues } from '@panguard-ai/panguard-guard';

/** A single finding, reduced to what a proposal needs. */
export interface ProposalFinding {
  readonly id?: string;
  readonly title: string;
  readonly severity: string;
  readonly category: string;
  /** file:line of the match, when the scanner reported it. */
  readonly location?: string;
  /** The actual matched source snippet — the REAL attack pattern (present when
   *  the scan ran with source available / --explain). Preferred payload. */
  readonly snippet?: string;
}

/** The exact shape ThreatCloudClient.submitATRProposal expects. */
export interface SkillAuditProposal {
  patternHash: string;
  ruleContent: string;
  llmProvider: string;
  llmModel: string;
  selfReviewVerdict: string;
}

/**
 * Turn a skill audit into a valid draft-request proposal, or null when there is
 * nothing high-confidence to propose (never emit an empty/garbage proposal).
 */
export function buildSkillAuditProposal(input: {
  readonly skillName: string;
  readonly riskLevel: 'HIGH' | 'CRITICAL';
  readonly findings: readonly ProposalFinding[];
  /** provenance tag for the self-review verdict, e.g. 'pga-up' | 'cli-auditor'. */
  readonly source: string;
}): SkillAuditProposal | null {
  const highFindings = input.findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 5);
  if (highFindings.length === 0) return null;

  const findingSummary = highFindings.map((f) => f.title).join('; ');
  const pHash = patternHash(input.skillName, findingSummary);

  // Payload = the real evidence the drafter reasons over. Prefer the actual
  // matched code snippet (the genuine attack pattern); fall back to a labeled
  // finding line only when no source snippet is available. Never the bare
  // title-as-regex that made the old proposals detect their own report text.
  const payload = highFindings
    .map((f) => {
      const head = `[${f.severity.toUpperCase()}] ${f.category}: ${f.title}`;
      const loc = f.location ? ` (${f.location})` : '';
      const code = f.snippet && f.snippet.trim() ? `\n${f.snippet.trim()}` : '';
      return `${head}${loc}${code}`;
    })
    .join('\n---\n');

  // A structured draft-request, NOT a finished rule. The server/Guard drafter
  // builds the real detection + test cases from `payload`.
  const draftRequest = {
    type: 'skill-audit-finding',
    skillName: input.skillName,
    riskLevel: input.riskLevel,
    payload,
    findings: highFindings.map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
      location: f.location,
      snippet: f.snippet,
    })),
    needsLLMDraft: true,
  };
  // SECRET DISCIPLINE: a matched code snippet (or even a finding title) can embed
  // the very credential it flagged. This proposal is uploaded to Threat Cloud on
  // opt-in, so mask any AWS/GitHub/Anthropic/OpenAI/Stripe key, private-key block,
  // DB URL, or bearer token in every string VALUE before it can leave the machine.
  // Value-level (not key-name) scrubbing — the secret lives inside free text.
  const scrubbed = scrubSecretValues(draftRequest);

  return {
    patternHash: pHash,
    ruleContent: JSON.stringify(scrubbed),
    llmProvider: 'skill-audit',
    llmModel: 'needs-llm-drafting',
    selfReviewVerdict: JSON.stringify({
      approved: true,
      source: input.source,
      skillName: input.skillName,
      riskLevel: input.riskLevel,
      findingCount: input.findings.length,
    }),
  };
}
