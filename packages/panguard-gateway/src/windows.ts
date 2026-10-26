/**
 * Windowed scanning for long fields.
 *
 * agent-threat-rules skips any input longer than its MAX_EVAL_LENGTH (100,000
 * characters in 3.5.10 and 4.2.1): the whole field matches nothing. A 120K tool
 * output carrying an injection at its end measured 0 matches directly and 12
 * when cut into 60K windows that overlap by 4K. Until ATR scans long inputs in
 * segments itself (ATR #726), the gateway cuts them.
 *
 * @module @panguard-ai/panguard-gateway/windows
 */

import type { AgentEvent } from 'agent-threat-rules';
import type { EvalResult } from '@panguard-ai/panguard-mcp-proxy/evaluator';

/** agent-threat-rules MAX_EVAL_LENGTH: longer inputs are not evaluated at all. */
export const ENGINE_MAX_EVAL_LENGTH = 100_000;

export interface WindowOptions {
  /** Window length; must stay under ENGINE_MAX_EVAL_LENGTH. */
  readonly size: number;
  /** Characters shared by consecutive windows, so a pattern on a seam is seen whole. */
  readonly overlap: number;
  /**
   * Characters scanned per field. Past this the head up to the limit and the
   * final window are scanned and the result is marked partial.
   */
  readonly maxChars: number;
}

export const DEFAULT_WINDOWS: WindowOptions = { size: 60_000, overlap: 4_000, maxChars: 400_000 };

export type Coverage = 'full' | 'partial';

export interface TextWindows {
  readonly windows: readonly string[];
  readonly partial: boolean;
}

export function windowsOf(text: string, opts: WindowOptions): TextWindows {
  if (text.length <= ENGINE_MAX_EVAL_LENGTH) return { windows: [text], partial: false };
  const step = opts.size - opts.overlap;
  const limit = Math.min(text.length, opts.maxChars);
  const windows: string[] = [];
  for (let start = 0; start < limit; start += step) {
    windows.push(text.slice(start, start + opts.size));
    if (start + opts.size >= text.length) return { windows, partial: false };
  }
  // Past maxChars: the tail is where appended payloads land, so it is always read.
  return { windows: [...windows, text.slice(text.length - opts.size)], partial: true };
}

export interface WindowedEvents {
  readonly events: readonly AgentEvent[];
  readonly coverage: Coverage;
}

/**
 * One event per window. Every value longer than the engine limit is replaced
 * by its i-th window; fields holding the same text as `content` (the hook puts
 * the output in content, tool_response and fields.content) stay aligned.
 */
export function windowedEvents(event: AgentEvent, opts: WindowOptions): WindowedEvents {
  const values = [event.content, ...Object.values(event.fields ?? {})];
  const long = [...new Set(values.filter((v) => v.length > ENGINE_MAX_EVAL_LENGTH))];
  if (long.length === 0) return { events: [event], coverage: 'full' };

  const split = new Map(long.map((text) => [text, windowsOf(text, opts)]));
  const count = Math.max(...[...split.values()].map((w) => w.windows.length));
  const pick = (value: string, i: number): string => {
    const w = split.get(value);
    if (!w) return value;
    return w.windows[Math.min(i, w.windows.length - 1)] ?? '';
  };
  const events = Array.from({ length: count }, (_, i): AgentEvent => {
    const fields = event.fields
      ? Object.fromEntries(Object.entries(event.fields).map(([k, v]) => [k, pick(v, i)]))
      : undefined;
    return { ...event, content: pick(event.content, i), ...(fields ? { fields } : {}) };
  });
  const partial = [...split.values()].some((w) => w.partial);
  return { events, coverage: partial ? 'partial' : 'full' };
}

const OUTCOME_RANK: Readonly<Record<EvalResult['outcome'], number>> = { allow: 0, ask: 1, deny: 2 };

/**
 * One verdict over all windows of an event: the strongest outcome wins and the
 * matched rules are the union. An 'ask' stays advise-only only if every asking
 * window was advise-only.
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
