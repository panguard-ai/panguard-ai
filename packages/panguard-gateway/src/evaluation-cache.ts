/**
 * Verdict cache for request-side inputs. A stateless client resends the whole
 * history every turn; the same user message, tool output or tool definition is
 * evaluated once and its verdict reused, keyed by a hash of the event.
 *
 * Only results are cached, never failures. tool_call events are not cached:
 * the Guard blocklist they are checked against can change at any time.
 *
 * @module @panguard-ai/panguard-gateway/evaluation-cache
 */

import type { AgentEvent } from 'agent-threat-rules';
import type { Evaluation, Evaluator } from './evaluator-pool.js';
import { sha256 } from './ledger.js';
import type { EngineKind } from './worker/protocol.js';

const CACHEABLE: ReadonlySet<AgentEvent['type']> = new Set([
  'llm_input',
  'tool_response',
  'mcp_exchange',
]);

export class CachingEvaluator implements Evaluator {
  private readonly inner: Evaluator;
  private readonly maxEntries: number;
  private readonly entries = new Map<string, Evaluation>();

  constructor(inner: Evaluator, maxEntries = 2_000) {
    this.inner = inner;
    this.maxEntries = maxEntries;
  }

  async evaluate(engine: EngineKind, event: AgentEvent): Promise<Evaluation> {
    if (!CACHEABLE.has(event.type)) return this.inner.evaluate(engine, event);
    const key = sha256(
      [engine, event.type, event.content, JSON.stringify(event.fields ?? {})].join('\u0000')
    );
    const hit = this.entries.get(key);
    if (hit) {
      // Refresh recency: re-insert at the end of the iteration order.
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit.kind === 'result' ? { ...hit, durationMs: 0 } : hit;
    }
    const evaluation = await this.inner.evaluate(engine, event);
    if (evaluation.kind === 'result') {
      this.entries.set(key, evaluation);
      if (this.entries.size > this.maxEntries) {
        const oldest = this.entries.keys().next().value;
        if (oldest !== undefined) this.entries.delete(oldest);
      }
    }
    return evaluation;
  }
}
