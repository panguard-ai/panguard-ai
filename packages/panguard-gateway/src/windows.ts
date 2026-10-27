/**
 * How much of a long input the gateway scans.
 *
 * agent-threat-rules skips any input longer than its MAX_EVAL_LENGTH (100,000
 * characters): the whole field matches nothing. ProxyEvaluator.evaluateEvent
 * scans such input window by window (30K windows overlapping by 6K, shared
 * with the MCP proxy's tool-response scan), and past that length only
 * maturity=stable rules hard-deny. What it does not do is bound the cost: a
 * multi-megabyte tool output would run past the gateway's evaluation deadline.
 * So per text the gateway scans the first `maxChars` characters plus the final
 * window, where appended payloads land, and reports the result as partial.
 *
 * @module @panguard-ai/panguard-gateway/windows
 */

import type { AgentEvent } from 'agent-threat-rules';
import {
  ENGINE_MAX_EVAL_LENGTH,
  RESPONSE_WINDOW_CHARS,
  eventWindows,
  type EvalResult,
} from '@panguard-ai/panguard-mcp-proxy/evaluator';

export { ENGINE_MAX_EVAL_LENGTH };

/** Characters scanned per text by default: 17 windows, plus one for the tail. */
export const DEFAULT_MAX_SCAN_CHARS = 400_000;

export type Coverage = 'full' | 'partial';

export interface ScanPlan {
  /** Events to evaluate: the event itself, or its head and its tail. */
  readonly events: readonly AgentEvent[];
  readonly coverage: Coverage;
  /** Engine evaluations the plan costs (windows over all events). */
  readonly windows: number;
}

/**
 * The event itself when every text fits `maxChars`; otherwise two events, one
 * with each long text cut to its first `maxChars` characters and one with each
 * cut to its last window. Texts that are the same string stay aligned.
 */
export function scanPlan(event: AgentEvent, maxChars: number): ScanPlan {
  const texts = [event.content, ...Object.values(event.fields ?? {})];
  if (texts.every((t) => t.length <= maxChars)) {
    return { events: [event], coverage: 'full', windows: eventWindows(event).length };
  }
  const cut = (pick: (text: string) => string): AgentEvent => ({
    ...event,
    content: event.content.length > maxChars ? pick(event.content) : event.content,
    ...(event.fields
      ? {
          fields: Object.fromEntries(
            Object.entries(event.fields).map(([k, v]) => [k, v.length > maxChars ? pick(v) : v])
          ),
        }
      : {}),
  });
  const events = [
    cut((t) => t.slice(0, maxChars)),
    cut((t) => t.slice(t.length - RESPONSE_WINDOW_CHARS)),
  ];
  return {
    events,
    coverage: 'partial',
    windows: events.reduce((sum, e) => sum + eventWindows(e).length, 0),
  };
}

const OUTCOME_RANK: Readonly<Record<EvalResult['outcome'], number>> = { allow: 0, ask: 1, deny: 2 };

/**
 * One verdict over the head and tail of a capped input: the strongest outcome
 * wins and the matched rules are the union. An 'ask' stays advise-only only if
 * every asking part was advise-only.
 */
export function mergeEvalResults(results: readonly EvalResult[]): EvalResult | undefined {
  const [first, ...rest] = results;
  if (!first) return undefined;
  if (rest.length === 0) return first;
  const top = rest.reduce(
    (best, r) => (OUTCOME_RANK[r.outcome] > OUTCOME_RANK[best.outcome] ? r : best),
    first
  );
  return {
    outcome: top.outcome,
    reason: top.reason,
    matchedRules: [...new Set(results.flatMap((r) => r.matchedRules))],
    confidence: top.confidence,
    durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    adviseOnly:
      top.outcome === 'ask' &&
      results.filter((r) => r.outcome === 'ask').every((r) => r.adviseOnly),
  };
}
