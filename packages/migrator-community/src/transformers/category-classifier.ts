/**
 * Pick a `tags.category` from ATR's 9-category enum based on Sigma logsource + tags.
 *
 * D1: hardcoded default + warning. D2 adds real heuristics.
 *
 * Default is `prompt-injection` because:
 *   - it's the largest ATR category (108/314 rules)
 *   - command-line attack patterns (the most common Sigma category) often
 *     map to LLM injection patterns when reframed for agents
 *   - if wrong, the `# NEEDS_HUMAN_REVIEW` marker tells the auditor to fix it
 *
 * The honest move: every rule from this classifier carries a warning. Don't
 * pretend the default is right.
 */

const ATR_CATEGORIES = [
  'prompt-injection',
  'tool-poisoning',
  'context-exfiltration',
  'agent-manipulation',
  'privilege-escalation',
  'excessive-autonomy',
  'data-poisoning',
  'model-abuse',
  'skill-compromise',
] as const;

export type AtrCategory = (typeof ATR_CATEGORIES)[number];

export function classifyCategory(): {
  category: AtrCategory;
  needsReview: boolean;
} {
  return { category: 'prompt-injection', needsReview: true };
}
