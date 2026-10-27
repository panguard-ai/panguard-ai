import { describe, expect, it } from 'vitest';
import {
  RESPONSE_WINDOW_CHARS,
  eventWindows,
  type EvalResult,
} from '@panguard-ai/panguard-mcp-proxy/evaluator';
import { functionCallOutputEvent } from '../src/atr-events.js';
import { DEFAULT_MAX_SCAN_CHARS, mergeEvalResults, scanPlan } from '../src/windows.js';

const TS = '2026-10-26T00:00:00Z';

describe('scanPlan', () => {
  it('passes an event within the scan limit through whole', () => {
    const event = functionCallOutputEvent(undefined, 'z'.repeat(130_000), TS);
    const plan = scanPlan(event, DEFAULT_MAX_SCAN_CHARS);
    expect(plan.events).toEqual([event]);
    expect(plan.coverage).toBe('full');
    // evaluateEvent scans it in the MCP proxy's windows.
    expect(plan.windows).toBe(eventWindows(event).length);
    expect(plan.windows).toBeGreaterThan(1);
  });

  it('past the limit scans the head and the last window, keeps fields aligned, and is partial', () => {
    const text = 'h'.repeat(DEFAULT_MAX_SCAN_CHARS + 50_000) + 'TAIL';
    const plan = scanPlan(functionCallOutputEvent(undefined, text, TS), DEFAULT_MAX_SCAN_CHARS);
    expect(plan.coverage).toBe('partial');
    const [head, tail] = plan.events;
    expect(head?.content.length).toBe(DEFAULT_MAX_SCAN_CHARS);
    expect(tail?.content.length).toBe(RESPONSE_WINDOW_CHARS);
    expect(tail?.content.endsWith('TAIL')).toBe(true);
    for (const event of plan.events) {
      expect(event.fields?.['tool_response']).toBe(event.content);
      expect(event.fields?.['tool_name']).toBe('');
    }
  });
});

describe('mergeEvalResults', () => {
  const result = (
    outcome: EvalResult['outcome'],
    rules: string[],
    adviseOnly = false
  ): EvalResult => ({
    outcome,
    reason: outcome,
    matchedRules: rules,
    confidence: outcome === 'allow' ? 0 : 0.9,
    durationMs: 2,
    adviseOnly,
  });

  it('keeps the strongest outcome and the union of rules', () => {
    const merged = mergeEvalResults([
      result('allow', []),
      result('deny', ['A']),
      result('ask', ['B']),
    ]);
    expect(merged?.outcome).toBe('deny');
    expect(merged?.matchedRules).toEqual(['A', 'B']);
    expect(merged?.durationMs).toBe(6);
  });

  it('an ask stays advise-only only if every asking part was', () => {
    expect(
      mergeEvalResults([result('ask', ['A'], true), result('ask', ['B'], false)])?.adviseOnly
    ).toBe(false);
    expect(mergeEvalResults([result('ask', ['A'], true), result('allow', [])])?.adviseOnly).toBe(
      true
    );
  });

  it('returns undefined for no results', () => {
    expect(mergeEvalResults([])).toBeUndefined();
  });
});
