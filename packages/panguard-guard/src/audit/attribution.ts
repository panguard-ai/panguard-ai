/**
 * Forensic attribution for audit records.
 *
 * Every durable audit payload is enriched with a stable `actor` block (who/where
 * the record was produced) plus a `decisionId` and lifted `rule` identity, so an
 * auditor can answer "who did this, on what host, under which rule" from the log
 * alone.
 *
 * The FULL actor (including OS username) is kept in the LOCAL durable log. The
 * EXPORT path anonymizes the username before forwarding to an external auditor
 * (see anonymizeActorForExport).
 *
 * @module @panguard-ai/panguard-guard/audit/attribution
 */

import { hostname, userInfo } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';

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
 * Anonymize an actor for EXPORT: replace the username with a stable salted hash
 * so an auditor can correlate same-user records without learning the username,
 * and never leak a real OS username into a forwarded document. Host/pid/agent
 * are retained (operationally useful, not personally identifying in the same way).
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

/** SHA-256 of the username with a fixed domain separator. Not reversible. */
function hashUser(user: string): string {
  return createHash('sha256').update(`panguard-audit-user:${user}`).digest('hex').slice(0, 32);
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
