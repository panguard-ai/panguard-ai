/**
 * Local outbox for ATR rule proposals: `~/.panguard/proposals/<id>.json`.
 *
 * Every proposal a producer emits lands here, already converted to the ATR
 * issue-form fields and de-identified, so nothing is lost when Threat Cloud is
 * unreachable and nothing leaves the machine until the user submits it with
 * `pga proposals submit <id>` (which only opens a pre-filled GitHub issue).
 *
 * One file per pattern hash, so a proposal that is re-emitted every cycle is
 * written once and keeps its original creation time.
 *
 * @module @panguard-ai/panguard-guard/proposals/outbox
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { proposalToIssueFields, type AtrProposal } from './convert.js';
import { deidentifyText, localContext, type DeidentifyContext } from './deidentify.js';
import type { AtrIssueFields } from './issue-url.js';

export type OutboxStatus = 'pending' | 'opened';

export interface OutboxRecord {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Producer tag, e.g. 'skill-audit' or the drafter's LLM provider. */
  readonly source: string;
  readonly status: OutboxStatus;
  /** Whether Threat Cloud accepted the same proposal (optional sink). */
  readonly threatCloudAccepted: boolean;
  /** De-identified ATR issue-form fields. */
  readonly issue: AtrIssueFields;
}

/** Directory override for tests and non-default homes. */
export function defaultOutboxDir(): string {
  return process.env['PANGUARD_PROPOSALS_DIR'] ?? join(homedir(), '.panguard', 'proposals');
}

/** File-name-safe id derived from the pattern hash. */
export function outboxId(patternHash: string): string {
  const id = patternHash.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  return id || 'proposal';
}

function recordPath(dir: string, id: string): string {
  return join(dir, `${outboxId(id)}.json`);
}

function writeAtomic(path: string, record: OutboxRecord): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf-8', mode: 0o600 });
  renameSync(tmp, path);
}

function deidentifyIssue(fields: AtrIssueFields, ctx: DeidentifyContext): AtrIssueFields {
  const clean = (s: string | undefined) => (s === undefined ? undefined : deidentifyText(s, ctx));
  return {
    title: clean(fields.title) ?? '',
    attackType: clean(fields.attackType) ?? '',
    description: clean(fields.description) ?? '',
    payload: clean(fields.payload) ?? '',
    references: clean(fields.references),
    falsePositives: clean(fields.falsePositives),
  };
}

export function readOutboxRecord(
  id: string,
  dir: string = defaultOutboxDir()
): OutboxRecord | null {
  const path = recordPath(dir, id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as OutboxRecord;
  } catch {
    return null;
  }
}

/**
 * Save a proposal to the outbox. Returns the stored record, or null when the
 * proposal carries no usable evidence. Re-saving the same pattern keeps the
 * first creation time and never downgrades `opened` back to `pending`.
 */
export function saveProposalToOutbox(
  proposal: AtrProposal,
  opts: { dir?: string; threatCloudAccepted?: boolean; ctx?: DeidentifyContext; now?: Date } = {}
): OutboxRecord | null {
  const fields = proposalToIssueFields(proposal);
  if (!fields) return null;
  const dir = opts.dir ?? defaultOutboxDir();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const id = outboxId(proposal.patternHash);
  const now = (opts.now ?? new Date()).toISOString();
  const existing = readOutboxRecord(id, dir);
  const record: OutboxRecord = {
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    source: proposal.llmProvider,
    status: existing?.status ?? 'pending',
    threatCloudAccepted:
      (existing?.threatCloudAccepted ?? false) || opts.threatCloudAccepted === true,
    issue: deidentifyIssue(fields, opts.ctx ?? localContext()),
  };
  writeAtomic(recordPath(dir, id), record);
  return record;
}

export function listOutbox(dir: string = defaultOutboxDir()): OutboxRecord[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readOutboxRecord(f.slice(0, -'.json'.length), dir))
    .filter((r): r is OutboxRecord => r !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markOutboxOpened(
  id: string,
  dir: string = defaultOutboxDir()
): OutboxRecord | null {
  const existing = readOutboxRecord(id, dir);
  if (!existing) return null;
  const updated: OutboxRecord = {
    ...existing,
    status: 'opened',
    updatedAt: new Date().toISOString(),
  };
  writeAtomic(recordPath(dir, id), updated);
  return updated;
}

/**
 * Wrap a Threat Cloud submitter so every proposal also lands in the outbox.
 * Threat Cloud stays optional: when it is unreachable or rejects the proposal
 * the record is kept as `pending` instead of being silently dropped. The
 * wrapper reports Threat Cloud's own result so callers keep their retry logic.
 */
export function withOutbox(
  submit: ((p: AtrProposal) => Promise<boolean>) | undefined,
  opts: { dir?: string; onSaved?: (record: OutboxRecord) => void } = {}
): (p: AtrProposal) => Promise<boolean> {
  return async (proposal) => {
    let accepted = false;
    if (submit) {
      try {
        accepted = await submit(proposal);
      } catch {
        accepted = false;
      }
    }
    try {
      const record = saveProposalToOutbox(proposal, {
        dir: opts.dir,
        threatCloudAccepted: accepted,
      });
      if (record) opts.onSaved?.(record);
    } catch {
      // A full disk or unwritable home must not break detection.
    }
    return accepted;
  };
}
