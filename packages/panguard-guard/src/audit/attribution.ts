/**
 * Forensic attribution for audit records.
 *
 * Every durable audit payload is enriched with a stable `actor` block (who/where
 * the record was produced) plus a `decisionId` and lifted `rule` identity, so an
 * auditor can answer "who did this, on what host, under which rule" from the log
 * alone.
 *
 * The FULL actor (including OS username) is kept in the LOCAL durable log. The
 * EXPORT path replaces the username with a per-install, salt-keyed pseudonym
 * before forwarding to an external auditor (see anonymizeActorForExport) — not
 * reversible by the recipient, who never receives the salt.
 *
 * @module @panguard-ai/panguard-guard/audit/attribution
 */

import { hostname, userInfo } from 'node:os';
import { createHmac, randomUUID } from 'node:crypto';
import { getExportSalt } from './export-salt.js';

/** Optional agent identity attached when the record originates from an agent session. */
export interface AgentAttribution {
  readonly platform: string;
  readonly sessionId: string;
  readonly agentId: string;
}

/** Who/where produced an audit record. */
export interface Actor {
  /** OS username on the producing machine (FULL value, local log only). */
  readonly user: string;
  /** Hostname of the producing machine. */
  readonly host: string;
  /** Process id. */
  readonly pid: number;
  /** Agent identity when applicable. */
  readonly agent?: AgentAttribution;
}

/** Lifted rule identity (id + version) for top-level forensic indexing. */
export interface RuleRef {
  readonly id: string;
  readonly version?: string;
}

/**
 * Build the local (full) actor block for the current process. Pass agent identity
 * when the record originates from a guarded agent session.
 */
export function buildActor(agent?: AgentAttribution): Actor {
  return {
    user: safeUsername(),
    host: safeHostname(),
    pid: process.pid,
    ...(agent ? { agent } : {}),
  };
}

/** Generate a fresh decision id. */
export function newDecisionId(): string {
  return `dec-${randomUUID()}`;
}

/**
 * Anonymize an actor for EXPORT: replace the username with a per-install pseudonym
 * so an auditor can correlate same-user records ACROSS the exported set without
 * being able to recover the real OS username, and never leak a real username into
 * a forwarded document. Host/pid/agent are retained (operationally useful, not
 * personally identifying in the same way).
 *
 * The pseudonym is an HMAC under a random per-install salt that is kept only in
 * the local data dir and NEVER exported (see hashUser / export-salt). This is what
 * makes it resistant to a wordlist/rainbow-table attack on the (very low-entropy)
 * username: without the never-exported salt the auditor cannot precompute the
 * mapping. It is a pseudonym, not true anonymization — a party that ALSO holds the
 * local salt could still map it back.
 */
export function anonymizeActorForExport(
  actor: Actor | undefined
): Record<string, unknown> | undefined {
  if (!actor) return undefined;
  return {
    user_hash: hashUser(actor.user),
    host: actor.host,
    pid: actor.pid,
    ...(actor.agent ? { agent: actor.agent } : {}),
  };
}

/**
 * Per-install pseudonymous digest of the username: HMAC-SHA256(localSalt, user).
 *
 * NOT a plain digest of low-entropy input: usernames are guessable, so an unsalted
 * (or fixed-domain) hash is trivially reversible by an auditor with a wordlist, and
 * one precomputed table would work for every install. The random per-install salt
 * lives only in the local data dir and is never exported, so the digest stays
 * correlatable within one install's documents but is not brute-forceable back to
 * the username by the export's recipient.
 */
function hashUser(user: string): string {
  return createHmac('sha256', getExportSalt()).update(user).digest('hex').slice(0, 32);
}

function safeUsername(): string {
  try {
    return userInfo().username;
  } catch {
    return 'unknown';
  }
}

function safeHostname(): string {
  try {
    return hostname();
  } catch {
    return 'unknown';
  }
}
