import { describe, expect, it } from 'vitest';
import type { EvalResult } from '@panguard-ai/panguard-mcp-proxy/evaluator';
import {
  DEFAULT_WINDOWS,
  ENGINE_MAX_EVAL_LENGTH,
  mergeEvalResults,
  windowedEvents,
  windowsOf,
} from '../src/windows.js';
import { functionCallOutputEvent } from '../src/atr-events.js';

describe('windowsOf', () => {
  it('leaves text within the engine limit whole', () => {
    expect(windowsOf('abc', DEFAULT_WINDOWS)).toEqual({ windows: ['abc'], partial: false });
  });

  it('covers a long text with overlapping windows under the engine limit', () => {
    const text = 'x'.repeat(150_000);
    const { windows, partial } = windowsOf(text, DEFAULT_WINDOWS);
    expect(partial).toBe(false);
    expect(windows.length).toBe(3);
    expect(windows.every((w) => w.length <= ENGINE_MAX_EVAL_LENGTH)).toBe(true);
    // Consecutive windows share `overlap` characters, and the last reaches the end.
    expect(windows.reduce((sum, w) => sum + w.length, 0)).toBeGreaterThanOrEqual(text.length);
  });

  it('a payload sitting on a seam lands whole inside one window', () => {
    const payload = 'IGNORE-ALL-PREVIOUS-INSTRUCTIONS';
    const seam = DEFAULT_WINDOWS.size - 10;
    const text = 'a'.repeat(seam) + payload + 'b'.repeat(120_000);
    const { windows } = windowsOf(text, DEFAULT_WINDOWS);
    expect(windows.some((w) => w.includes(payload))).toBe(true);
  });

  it('past maxChars scans the head and the tail and reports partial coverage', () => {
    const text = 'h'.repeat(500_000) + 'TAIL';
    const { windows, partial } = windowsOf(text, DEFAULT_WINDOWS);
    expect(partial).toBe(true);
    expect(windows[windows.length - 1]?.endsWith('TAIL')).toBe(true);
  });
});

describe('windowedEvents', () => {
  it('replaces every field holding the long text with the same window', () => {
    const long = 'z'.repeat(130_000);
    const event = functionCallOutputEvent(undefined, long, '2026-10-26T00:00:00Z');
    const plan = windowedEvents(event, DEFAULT_WINDOWS);
    expect(plan.events.length).toBe(3);
    for (const windowed of plan.events) {
      expect(windowed.content.length).toBeLessThanOrEqual(ENGINE_MAX_EVAL_LENGTH);
      expect(windowed.fields?.['tool_response']).toBe(windowed.content);
      expect(windowed.fields?.['tool_name']).toBe('');
    }
  });

  it('passes a short event through untouched', () => {
    const event = functionCallOutputEvent(undefined, 'short', '2026-10-26T00:00:00Z');
    expect(windowedEvents(event, DEFAULT_WINDOWS)).toEqual({ events: [event], coverage: 'full' });
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

  it('an ask stays advise-only only if every asking window was', () => {
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
