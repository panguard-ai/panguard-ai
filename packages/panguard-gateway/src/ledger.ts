/**
 * Verdict ledger (design §4.2, option C): metadata about the responses the
 * gateway relayed, never their text.
 *
 * Why the gateway keeps state at all:
 *   1. A function_call_output carries only call_id; rules reading tool_name and
 *      tool_args need the call it answers.
 *   2. Binding: every tool output should answer a call the gateway released.
 *      An output for a call it withheld, or for no call at all, is forged.
 *   3. Divergence: after a rewrite, the provider still stores the original
 *      output and waits for the withheld call's result. The next turn that
 *      continues from that response gets a synthetic function_call_output for
 *      each withheld call, so provider and client agree again.
 *
 * Records are immutable values. The two indexes are this store's private
 * state, bounded by a TTL and a response count, and live in memory only: a
 * restart forgets them, which degrades lookups to "unrecorded".
 *
 * @module @panguard-ai/panguard-gateway/ledger
 */

import { createHash } from 'node:crypto';

export type CallStatus = 'released' | 'withheld';

export interface LedgerCall {
  readonly call_id: string;
  readonly response_id: string;
  readonly item_id: string | undefined;
  readonly name: string;
  /** Canonical arguments; undefined when the ledger is told not to keep them. */
  readonly arguments: string | undefined;
  readonly arguments_sha256: string;
  readonly status: CallStatus;
  readonly decision_id: string | undefined;
  readonly rules: readonly string[];
  readonly reason: string;
}

export interface LedgerResponse {
  readonly response_id: string;
  readonly previous_response_id: string | undefined;
  readonly call_ids: readonly string[];
  readonly recorded_at: number;
}

export interface LedgerOptions {
  readonly ttlMs: number;
  readonly maxResponses: number;
  /** Keep canonical arguments (rules on tool_args need them); else keep a hash only. */
  readonly storeArguments: boolean;
}

export const DEFAULT_LEDGER: LedgerOptions = {
  ttlMs: 6 * 60 * 60 * 1000,
  maxResponses: 10_000,
  storeArguments: true,
};

export interface CallRecordInput {
  readonly call_id: string;
  readonly item_id: string | undefined;
  readonly name: string;
  readonly canonicalArguments: string;
  readonly status: CallStatus;
  readonly decision_id: string | undefined;
  readonly rules: readonly string[];
  readonly reason: string;
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export class VerdictLedger {
  private readonly options: LedgerOptions;
  private readonly responses = new Map<string, LedgerResponse>();
  private readonly calls = new Map<string, LedgerCall>();

  constructor(options: LedgerOptions = DEFAULT_LEDGER) {
    this.options = options;
  }

  /**
   * Record (or replace) what the gateway did with one response's function
   * calls. Called when the response ends, and earlier on a cut so a fast
   * continuation already finds the withheld call.
   */
  recordResponse(
    responseId: string,
    previousResponseId: string | undefined,
    calls: readonly CallRecordInput[],
    now: number = Date.now()
  ): void {
    this.sweep(now);
    const prior = this.responses.get(responseId);
    for (const id of prior?.call_ids ?? []) this.calls.delete(id);
    for (const call of calls) {
      this.calls.set(call.call_id, {
        call_id: call.call_id,
        response_id: responseId,
        item_id: call.item_id,
        name: call.name,
        arguments: this.options.storeArguments ? call.canonicalArguments : undefined,
        arguments_sha256: sha256(call.canonicalArguments),
        status: call.status,
        decision_id: call.decision_id,
        rules: call.rules,
        reason: call.reason,
      });
    }
    // Re-inserted at the end so insertion order stays recorded_at order (sweep relies on it).
    this.responses.delete(responseId);
    this.responses.set(responseId, {
      response_id: responseId,
      previous_response_id: previousResponseId,
      call_ids: calls.map((c) => c.call_id),
      recorded_at: now,
    });
    while (this.responses.size > this.options.maxResponses) {
      const oldest = this.responses.keys().next().value;
      if (oldest === undefined) break;
      this.forget(oldest);
    }
  }

  response(responseId: string, now: number = Date.now()): LedgerResponse | undefined {
    const entry = this.responses.get(responseId);
    if (!entry) return undefined;
    if (now - entry.recorded_at > this.options.ttlMs) {
      this.forget(responseId);
      return undefined;
    }
    return entry;
  }

  call(callId: string, now: number = Date.now()): LedgerCall | undefined {
    const call = this.calls.get(callId);
    if (!call) return undefined;
    return this.response(call.response_id, now) ? call : undefined;
  }

  /** Calls of a response that the client never received. */
  withheldCalls(responseId: string, now: number = Date.now()): readonly LedgerCall[] {
    const entry = this.response(responseId, now);
    if (!entry) return [];
    return entry.call_ids
      .map((id) => this.calls.get(id))
      .filter((c): c is LedgerCall => c !== undefined && c.status === 'withheld');
  }

  /**
   * Every call id issued along a chain. `complete` is true only when every
   * response back to the chain's first one is recorded; otherwise a call may
   * live in a response the ledger never saw or already forgot.
   */
  chainCalls(
    responseId: string,
    now: number = Date.now()
  ): { readonly ids: ReadonlySet<string>; readonly complete: boolean } {
    const ids = new Set<string>();
    const seen = new Set<string>();
    let cursor: string | undefined = responseId;
    while (cursor !== undefined) {
      if (seen.has(cursor)) return { ids, complete: false };
      seen.add(cursor);
      const entry = this.response(cursor, now);
      if (!entry) return { ids, complete: false };
      for (const id of entry.call_ids) ids.add(id);
      cursor = entry.previous_response_id;
    }
    return { ids, complete: true };
  }

  /** Oldest recorded ancestor of a response: a stable session key for a chain. */
  chainRoot(responseId: string, now: number = Date.now()): string {
    let root = responseId;
    const seen = new Set<string>();
    let entry = this.response(responseId, now);
    while (entry?.previous_response_id !== undefined && !seen.has(entry.response_id)) {
      seen.add(entry.response_id);
      const parent = this.response(entry.previous_response_id, now);
      if (!parent) break;
      root = parent.response_id;
      entry = parent;
    }
    return root;
  }

  size(): number {
    return this.responses.size;
  }

  private forget(responseId: string): void {
    const entry = this.responses.get(responseId);
    if (!entry) return;
    for (const id of entry.call_ids) {
      if (this.calls.get(id)?.response_id === responseId) this.calls.delete(id);
    }
    this.responses.delete(responseId);
  }

  private sweep(now: number): void {
    for (const entry of this.responses.values()) {
      if (now - entry.recorded_at <= this.options.ttlMs) break;
      this.forget(entry.response_id);
    }
  }
}
