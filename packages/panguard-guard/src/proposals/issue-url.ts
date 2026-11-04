/**
 * Turn an ATR rule proposal into a pre-filled "New Rule Proposal" issue URL on
 * the ATR repository.
 *
 * The URL only pre-fills GitHub's issue form. Nothing is posted: the user opens
 * the URL, reads exactly what will be published, edits it if they want, and
 * presses Submit from their own account. No token, no server, no Threat Cloud.
 *
 * Query keys must match the field ids in the ATR template
 * `.github/ISSUE_TEMPLATE/new-rule.yml` (attack-type, description, references,
 * payload, false-positives). The template applies the `new-rule` label, which is
 * what starts ATR's issue-to-proposal workflow.
 *
 * @module @panguard-ai/panguard-guard/proposals/issue-url
 */

import { deidentifyText, localContext, type DeidentifyContext } from './deidentify.js';

export const ATR_NEW_ISSUE_URL =
  'https://github.com/Agent-Threat-Rule/agent-threat-rules/issues/new';
export const ATR_RULE_TEMPLATE = 'new-rule.yml';

/** Field ids of the ATR new-rule issue form, in form order. */
export const ATR_FORM_FIELDS = [
  'attack-type',
  'description',
  'references',
  'payload',
  'false-positives',
] as const;

/**
 * Upper bound for the whole URL. Browsers and GitHub start failing around 8 KB;
 * staying well under leaves room for percent-encoding differences.
 */
export const MAX_ISSUE_URL_LENGTH = 7000;

const TRUNCATION_NOTE =
  '\n[payload truncated to fit the issue link; the full copy stays on the reporter machine]';
const MIN_PAYLOAD_CHARS = 200;

export interface AtrIssueFields {
  readonly title: string;
  readonly attackType: string;
  readonly description: string;
  readonly payload: string;
  readonly references?: string;
  readonly falsePositives?: string;
}

export interface AtrIssueLink {
  readonly url: string;
  /** True when the payload (or description) was cut to fit MAX_ISSUE_URL_LENGTH. */
  readonly truncated: boolean;
  /** The de-identified fields the URL carries. */
  readonly fields: AtrIssueFields;
}

function compose(f: AtrIssueFields): string {
  const params = new URLSearchParams();
  params.set('template', ATR_RULE_TEMPLATE);
  params.set('title', f.title);
  params.set('attack-type', f.attackType);
  params.set('description', f.description);
  if (f.references) params.set('references', f.references);
  params.set('payload', f.payload);
  if (f.falsePositives) params.set('false-positives', f.falsePositives);
  return `${ATR_NEW_ISSUE_URL}?${params.toString()}`;
}

/** Longest prefix of `text` (plus `note`) for which `fits` holds. */
function longestFitting(text: string, note: string, fits: (s: string) => boolean): string {
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(text.slice(0, mid) + note)) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + note;
}

function deidentifyFields(f: AtrIssueFields, ctx: DeidentifyContext): AtrIssueFields {
  const clean = (s: string | undefined) => (s === undefined ? undefined : deidentifyText(s, ctx));
  const title = clean(f.title) ?? '';
  return {
    title: title.startsWith('[Rule]') ? title : `[Rule] ${title}`,
    attackType: clean(f.attackType) ?? '',
    description: clean(f.description) ?? '',
    payload: clean(f.payload) ?? '',
    references: clean(f.references),
    falsePositives: clean(f.falsePositives),
  };
}

/**
 * Build the pre-filled issue link. Every field is de-identified first; if the
 * URL would exceed MAX_ISSUE_URL_LENGTH the payload is cut (with a note), then
 * the description if the payload alone was not enough.
 */
export function buildAtrIssueUrl(
  input: AtrIssueFields,
  ctx: DeidentifyContext = localContext()
): AtrIssueLink {
  const fields = deidentifyFields(input, ctx);
  const fits = (f: AtrIssueFields) => compose(f).length <= MAX_ISSUE_URL_LENGTH;
  if (fits(fields)) return { url: compose(fields), truncated: false, fields };

  const withoutPayload = { ...fields, payload: '' };
  let description = fields.description;
  if (!fits({ ...withoutPayload, payload: 'x'.repeat(MIN_PAYLOAD_CHARS) + TRUNCATION_NOTE })) {
    description = longestFitting(fields.description, '\n[description truncated]', (d) =>
      fits({
        ...withoutPayload,
        description: d,
        payload: 'x'.repeat(MIN_PAYLOAD_CHARS) + TRUNCATION_NOTE,
      })
    );
  }
  const payload = longestFitting(fields.payload, TRUNCATION_NOTE, (p) =>
    fits({ ...fields, description, payload: p })
  );
  const truncatedFields = { ...fields, description, payload };
  return { url: compose(truncatedFields), truncated: true, fields: truncatedFields };
}
