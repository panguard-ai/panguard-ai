import { describe, it, expect } from 'vitest';
import type { SecurityEvent } from '@panguard-ai/core';
import { ATRContentDetector } from '../../src/containment/atr-detector.js';
import type { ATREngineLike } from '../../src/containment/atr-detector.js';

function evt(): SecurityEvent {
  return {
    id: 'e',
    timestamp: new Date(0),
    source: 'process',
    severity: 'info',
    category: 't',
    description: 'x',
    raw: {},
    host: 'h',
    metadata: {},
  };
}

describe('ATRContentDetector', () => {
  it('maps ATR matches to DetectionMatch', () => {
    const engine: ATREngineLike = {
      evaluate: () => [
        { rule: { id: 'ATR-1', severity: 'high', tags: { category: 'tool-poisoning' } }, confidence: 80 },
      ],
    };
    const matches = new ATRContentDetector(engine).detect(evt());
    expect(matches[0]).toEqual({
      ruleId: 'ATR-1',
      severity: 'high',
      confidence: 80,
      category: 'tool-poisoning',
    });
  });

  it("maps ATR 'informational' severity to core 'info'", () => {
    const engine: ATREngineLike = {
      evaluate: () => [{ rule: { id: 'ATR-2', severity: 'informational' }, confidence: 10 }],
    };
    expect(new ATRContentDetector(engine).detect(evt())[0]!.severity).toBe('info');
  });

  it('returns empty when the engine finds nothing', () => {
    const engine: ATREngineLike = { evaluate: () => [] };
    expect(new ATRContentDetector(engine).detect(evt())).toEqual([]);
  });
});
