/**
 * Map the proposal contract every PanGuard producer emits (the shape
 * ThreatCloudClient.submitATRProposal takes) onto the fields of ATR's
 * "New Rule Proposal" issue form.
 *
 * Two producers exist:
 *  - skill audits (`pga up`, `pga audit`, the skill watcher) emit a JSON
 *    draft-request: `{ type: 'skill-audit-finding', payload, findings, ... }`;
 *  - the Guard ATR drafter emits a drafted rule as YAML.
 *
 * The public issue never carries the skill name or any machine detail: the
 * text is written neutrally ("a local skill audit") and de-identified later in
 * buildAtrIssueUrl.
 *
 * @module @panguard-ai/panguard-guard/proposals/convert
 */

import yaml from 'js-yaml';
import type { AtrIssueFields } from './issue-url.js';

/** The proposal contract shared by all producers. */
export interface AtrProposal {
  readonly patternHash: string;
  readonly ruleContent: string;
  readonly llmProvider: string;
  readonly llmModel: string;
  readonly selfReviewVerdict: string;
}

const NOT_ASSESSED = 'Not assessed by the reporter.';
const CVE_PATTERN = /CVE-\d{4}-\d{4,7}/gi;

interface DraftFinding {
  readonly category?: string;
  readonly severity?: string;
  readonly title?: string;
}

function humanize(category: string): string {
  return category.replace(/[-_]+/g, ' ').trim();
}

function cveRefs(...texts: readonly string[]): string | undefined {
  const found = new Set(
    texts.flatMap((t) => t.match(CVE_PATTERN) ?? []).map((s) => s.toUpperCase())
  );
  return found.size > 0 ? [...found].join(', ') : undefined;
}

function fromSkillAudit(doc: Record<string, unknown>): AtrIssueFields | null {
  const findings = (Array.isArray(doc['findings']) ? doc['findings'] : []) as DraftFinding[];
  const payload = typeof doc['payload'] === 'string' ? doc['payload'].trim() : '';
  if (findings.length === 0 || !payload) return null;
  const categories = [...new Set(findings.map((f) => f.category).filter((c): c is string => !!c))];
  const lines = findings.map(
    (f) =>
      `- [${(f.severity ?? 'unknown').toUpperCase()}] ${f.category ?? 'uncategorized'}: ${f.title ?? ''}`
  );
  const risk = typeof doc['riskLevel'] === 'string' ? doc['riskLevel'] : 'HIGH';
  return {
    title: `[Rule] ${findings[0]?.title ?? humanize(categories[0] ?? 'agent attack')}`,
    attackType: categories.map(humanize).join(', ') || 'agent manipulation',
    description:
      `A local skill audit rated an installed agent skill ${risk} with these findings:\n` +
      `${lines.join('\n')}\n\n` +
      'The example payload is the matched evidence, de-identified on the reporter machine ' +
      'before this issue was opened. No detection rule is proposed yet; the evidence is ' +
      'submitted for a maintainer or contributor to write one.',
    payload,
    references: cveRefs(payload, ...lines),
    falsePositives: NOT_ASSESSED,
  };
}

function truePositiveInputs(doc: Record<string, unknown>): string[] {
  const tc = doc['test_cases'] as Record<string, unknown> | undefined;
  const tps = Array.isArray(tc?.['true_positives']) ? (tc['true_positives'] as unknown[]) : [];
  return tps
    .map((tp) => {
      if (typeof tp === 'string') return tp;
      if (tp && typeof tp === 'object') {
        const rec = tp as Record<string, unknown>;
        const v = rec['input'] ?? rec['content'] ?? rec['tool_args'] ?? rec['tool_response'];
        return typeof v === 'string' ? v : v === undefined ? '' : JSON.stringify(v);
      }
      return '';
    })
    .filter((s) => s.trim().length > 0);
}

function fromDraftedRule(ruleYaml: string): AtrIssueFields | null {
  let doc: unknown;
  try {
    doc = yaml.load(ruleYaml);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  const rec = doc as Record<string, unknown>;
  const title = typeof rec['title'] === 'string' ? rec['title'] : 'Drafted agent threat rule';
  const tags = rec['tags'] as Record<string, unknown> | undefined;
  const category = typeof tags?.['category'] === 'string' ? tags['category'] : title;
  const examples = truePositiveInputs(rec);
  const desc = typeof rec['description'] === 'string' ? rec['description'].trim() : '';
  return {
    title: `[Rule] ${title}`,
    attackType: humanize(category),
    description:
      `${desc ? `${desc}\n\n` : ''}Drafted from a pattern seen repeatedly on the reporter machine. ` +
      'Draft rule, unreviewed:\n\n```yaml\n' +
      ruleYaml.trim() +
      '\n```',
    payload:
      examples.length > 0 ? examples.join('\n---\n') : 'See the draft rule in the description.',
    references: cveRefs(ruleYaml),
    falsePositives: NOT_ASSESSED,
  };
}

/** Issue fields for a proposal, or null when it carries no usable evidence. */
export function proposalToIssueFields(proposal: AtrProposal): AtrIssueFields | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(proposal.ruleContent);
  } catch {
    return fromDraftedRule(proposal.ruleContent);
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const doc = parsed as Record<string, unknown>;
    if (doc['type'] === 'skill-audit-finding') return fromSkillAudit(doc);
  }
  return null;
}
