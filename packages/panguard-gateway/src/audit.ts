/**
 * Out-of-band verdict record: every decision, allow included, appended to a
 * tamper-evident AuditChain (SHA-256 linked, HMAC signed), the same chain the
 * MCP proxy writes its verdicts to. The response carries the non-allow
 * decisions in its `panguard:verdict` field; the decision_id joins the two.
 *
 * Appends are fail-open, as in the MCP proxy: a broken audit file is reported
 * on stderr and never blocks traffic.
 *
 * @module @panguard-ai/panguard-gateway/audit
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  AuditChain,
  buildActor,
  getAuditKey,
  type VerifyResult,
} from '@panguard-ai/panguard-guard/audit';
import type { Decision } from './decision.js';

export const DEFAULT_AUDIT_LOG = join(homedir(), '.panguard-guard', 'gateway-verdicts.jsonl');

export interface AuditContext {
  readonly transport: 'http' | 'sse' | 'websocket';
  readonly phase: 'request' | 'response';
  /** Session key: the WebSocket connection, else the root of the response chain. */
  readonly session: string;
  readonly response_id?: string | undefined;
  readonly previous_response_id?: string | undefined;
  readonly safety_identifier?: string | undefined;
}

export interface AuditSink {
  record(context: AuditContext, decisions: readonly Decision[]): void;
  verify(): Promise<VerifyResult | null>;
}

export const NO_AUDIT: AuditSink = {
  record: () => undefined,
  verify: async () => null,
};

export class ChainAuditSink implements AuditSink {
  private readonly chain: AuditChain;

  private constructor(chain: AuditChain) {
    this.chain = chain;
  }

  /** Open the chain. Without a key, the machine's audit key is resolved (keychain first). */
  static async open(logPath: string, key?: Buffer): Promise<ChainAuditSink> {
    const auditKey = key ?? (await getAuditKey());
    return new ChainAuditSink(new AuditChain(logPath, { key: auditKey }));
  }

  record(context: AuditContext, decisions: readonly Decision[]): void {
    for (const decision of decisions) {
      this.chain.append({
        ...decision,
        transport: context.transport,
        phase: context.phase,
        ...(context.response_id !== undefined ? { response_id: context.response_id } : {}),
        ...(context.previous_response_id !== undefined
          ? { previous_response_id: context.previous_response_id }
          : {}),
        ...(context.safety_identifier !== undefined
          ? { safety_identifier: context.safety_identifier }
          : {}),
        decisionId: decision.decision_id,
        actor: buildActor({
          platform: 'openresponses-gateway',
          sessionId: context.session,
          agentId: context.safety_identifier ?? 'openresponses-client',
        }),
        ...(decision.rules[0] !== undefined ? { rule: { id: decision.rules[0] } } : {}),
      });
    }
  }

  verify(): Promise<VerifyResult> {
    return this.chain.verify();
  }
}
