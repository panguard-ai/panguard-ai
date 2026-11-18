/**
 * Turn a skill audit into an ATR rule proposal, or decide there is none.
 *
 * Every skill-audit producer (`pga audit`, `pga up`, the skill watcher) goes
 * through here, so they all follow the same two rules:
 *
 * 1. Only threats ATR does not already catch become proposals. A finding made
 *    by an ATR rule (`atr-*`) is already covered, and so is any other finding in
 *    a file an ATR rule matched. Leaked credentials (`secret-*`, category
 *    `secrets`) are not attack patterns, and audit bookkeeping (manifest,
 *    dependency and permission notes, "scanner unavailable") is not evidence.
 * 2. The payload is the attack text itself: the lines around the finding, read
 *    from the skill, capped in length and de-identified before anything is
 *    published. A finding whose source cannot be read is dropped. Never a rule
 *    regex, a "Matched: ..." line or a finding title in its place.
 *
 * @module @panguard-ai/panguard-guard/proposals/skill-evidence
 */

import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { patternHash } from '@panguard-ai/scan-core';
import { scrubSecretValues } from '../agent/scrub-secrets.js';
import type { AtrProposal } from './convert.js';

/** A single audit finding, reduced to what a proposal needs. */
export interface SkillFindingInput {
  readonly id?: string;
  readonly title: string;
  readonly severity: string;
  readonly category: string;
  /** `path:line[:col]`, a bare path, or a scanner note such as "Matched: ...". */
  readonly location?: string;
  /** Source text the scanner already extracted, when it did. */
  readonly snippet?: string;
}

export interface SkillAuditProposalInput {
  readonly skillName: string;
  readonly riskLevel: 'HIGH' | 'CRITICAL';
  readonly findings: readonly SkillFindingInput[];
  /** Provenance tag for the self-review verdict, e.g. 'pga-up' | 'cli-auditor'. */
  readonly source: string;
  /** The audited skill directory; evidence is only read from inside it. */
  readonly skillDir?: string;
}

/** Lines of context kept on each side of the flagged line. */
const CONTEXT_LINES = 2;
/** Upper bound on one finding's evidence text. */
export const MAX_SNIPPET_CHARS = 600;
const MAX_FINDINGS = 5;
const MAX_SOURCE_BYTES = 512 * 1024;
const MIN_PRINTABLE_RUN = 6;

const NOT_EVIDENCE_IDS: ReadonlySet<string> = new Set([
  'code-scan-unavailable',
  'ai-no-llm',
  'atr-scripts-incomplete',
  'atr-engine-error',
]);
const NOT_EVIDENCE_PREFIXES: readonly string[] = ['manifest-', 'dep-', 'perm-', 'secret-'];
const NOT_EVIDENCE_CATEGORIES: ReadonlySet<string> = new Set([
  'secrets',
  'manifest',
  'dependency',
  'permission',
]);

/** True when an ATR rule made this finding. */
export function isAtrFinding(f: SkillFindingInput): boolean {
  return (f.id ?? '').startsWith('atr-');
}

function isHighSeverity(f: SkillFindingInput): boolean {
  return f.severity === 'critical' || f.severity === 'high';
}

function isAttackEvidence(f: SkillFindingInput): boolean {
  const id = f.id ?? '';
  if (NOT_EVIDENCE_IDS.has(id)) return false;
  if (NOT_EVIDENCE_PREFIXES.some((p) => id.startsWith(p))) return false;
  return !NOT_EVIDENCE_CATEGORIES.has(f.category);
}

interface ParsedLocation {
  readonly file: string;
  readonly line?: number;
}

/** `scripts/run.py:3`, `/abs/x.ts:10:4` or `__pycache__/a.pyc`; null for notes. */
export function parseLocation(location: string | undefined): ParsedLocation | null {
  if (!location) return null;
  const text = location.trim();
  if (!text || /^matched:/i.test(text) || /^ai analysis$/i.test(text)) return null;
  const m = /^(.+?):(\d+)(?::\d+)?$/.exec(text);
  if (m) return { file: m[1] as string, line: Number(m[2]) };
  if (/\s/.test(text)) return null;
  return { file: text };
}

/**
 * The file an ATR finding matched in. ATR script findings read
 * "<file>: Matched: ..."; a bare "Matched: ..." comes from SKILL.md itself.
 */
function atrMatchedFile(f: SkillFindingInput): string | null {
  const loc = (f.location ?? '').trim();
  if (!loc || /^matched:/i.test(loc)) return 'SKILL.md';
  const m = /^(.+?):\s*Matched:/i.exec(loc);
  return m ? (m[1] as string).trim() : null;
}

/** Resolve a finding path inside the skill dir and return it skill-relative. */
function insideSkill(
  skillDir: string | undefined,
  file: string
): { abs: string; rel: string } | null {
  if (!skillDir) return null;
  const root = resolve(skillDir);
  const abs = isAbsolute(file) ? resolve(file) : resolve(root, file);
  if (abs !== root && !abs.startsWith(root + sep)) return null;
  return { abs, rel: relative(root, abs).split(sep).join('/') };
}

function skillRelative(skillDir: string | undefined, file: string): string {
  return insideSkill(skillDir, file)?.rel ?? file.split(sep).join('/');
}

function readSource(abs: string): Buffer | null {
  try {
    const st = statSync(abs);
    if (!st.isFile() || st.size > MAX_SOURCE_BYTES) return null;
    return readFileSync(abs);
  } catch {
    return null;
  }
}

function cap(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_SNIPPET_CHARS
    ? `${trimmed.slice(0, MAX_SNIPPET_CHARS)}\n[truncated]`
    : trimmed;
}

/** Printable strings of a binary file (bytecode), like `strings`. */
function printableRuns(buf: Buffer): string {
  const runs = buf.toString('latin1').match(/[\x20-\x7e]{6,}/g) ?? [];
  return runs.filter((r) => r.trim().length >= MIN_PRINTABLE_RUN).join('\n');
}

/** The lines around the finding, or the readable strings of a binary file. */
function evidenceFor(
  f: SkillFindingInput,
  skillDir: string | undefined
): { file: string; line?: number; text: string } | null {
  const loc = parseLocation(f.location);
  if (f.snippet && f.snippet.trim() && !/^matched:/i.test(f.snippet.trim())) {
    return {
      file: loc ? skillRelative(skillDir, loc.file) : 'SKILL.md',
      line: loc?.line,
      text: cap(f.snippet),
    };
  }
  if (!loc) return null;
  const where = insideSkill(skillDir, loc.file);
  if (!where) return null;
  const buf = readSource(where.abs);
  if (!buf) return null;
  if (buf.includes(0)) {
    const strings = printableRuns(buf);
    return strings ? { file: where.rel, text: cap(strings) } : null;
  }
  if (loc.line === undefined) return null;
  const lines = buf.toString('utf8').split(/\r?\n/);
  const from = Math.max(0, loc.line - 1 - CONTEXT_LINES);
  const to = Math.min(lines.length, loc.line + CONTEXT_LINES);
  const text = lines.slice(from, to).join('\n');
  return text.trim() ? { file: where.rel, line: loc.line, text: cap(text) } : null;
}

interface KeptFinding {
  readonly finding: SkillFindingInput;
  readonly file: string;
  readonly line?: number;
  readonly text: string;
}

/** The findings that would go into a proposal, each with its evidence. */
export function selectProposalEvidence(
  findings: readonly SkillFindingInput[],
  skillDir?: string
): KeptFinding[] {
  const atrFiles = new Set(
    findings
      .filter(isAtrFinding)
      .map(atrMatchedFile)
      .filter((f): f is string => !!f)
      .map((f) => skillRelative(skillDir, f))
  );
  const kept: KeptFinding[] = [];
  for (const f of findings) {
    if (kept.length >= MAX_FINDINGS) break;
    if (!isHighSeverity(f) || isAtrFinding(f) || !isAttackEvidence(f)) continue;
    const ev = evidenceFor(f, skillDir);
    if (!ev || atrFiles.has(ev.file)) continue;
    kept.push({ finding: f, ...ev });
  }
  return kept;
}

/**
 * A draft-request proposal for the threats ATR missed, or null when there are
 * none or none of them has readable evidence.
 */
export function buildSkillAuditProposal(input: SkillAuditProposalInput): AtrProposal | null {
  const kept = selectProposalEvidence(input.findings, input.skillDir);
  if (kept.length === 0) return null;

  const payload = kept
    .map((k) => `# ${k.file}${k.line !== undefined ? `:${k.line}` : ''}\n${k.text}`)
    .join('\n---\n');
  const findings = kept.map((k) => ({
    id: k.finding.id,
    category: k.finding.category,
    severity: k.finding.severity,
    title: k.finding.title,
    location: `${k.file}${k.line !== undefined ? `:${k.line}` : ''}`,
  }));

  const draftRequest = {
    type: 'skill-audit-finding',
    skillName: input.skillName,
    riskLevel: input.riskLevel,
    payload,
    findings,
    needsLLMDraft: true,
  };

  return {
    patternHash: patternHash(input.skillName, findings.map((f) => f.title).join('; ')),
    // A snippet can embed the credential next to the attack; mask secret values
    // before the proposal is stored or uploaded. Publishing adds de-identification.
    ruleContent: JSON.stringify(scrubSecretValues(draftRequest)),
    llmProvider: 'skill-audit',
    llmModel: 'needs-llm-drafting',
    selfReviewVerdict: JSON.stringify({
      approved: true,
      source: input.source,
      skillName: input.skillName,
      riskLevel: input.riskLevel,
      findingCount: kept.length,
    }),
  };
}
