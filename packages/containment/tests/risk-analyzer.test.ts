import { describe, it, expect } from 'vitest';
import type { SecurityEvent } from '@panguard-ai/core';
import { RiskAnalyzer } from '../src/risk-analyzer.js';
import type { ContentDetector, DetectionMatch } from '../src/types.js';

function evt(): SecurityEvent {
  return {
    id: 'e1',
    timestamp: new Date(0),
    source: 'process',
    severity: 'info',
    category: 'test',
    description: 'x',
    raw: {},
    host: 'h',
    metadata: {},
  };
}

function detectorWith(matches: DetectionMatch[]): ContentDetector {
  return { detect: () => matches };
}

describe('RiskAnalyzer: severity -> session risk', () => {
  it('maps a high-confidence critical match to confirmed_malicious', () => {
    const a = new RiskAnalyzer(
      detectorWith([{ ruleId: 'ATR-1', severity: 'critical', confidence: 95 }])
    );
    expect(a.analyze('s', [evt()]).risk.level).toBe('confirmed_malicious');
  });

  it('maps a lower-confidence critical match to high', () => {
    const a = new RiskAnalyzer(
      detectorWith([{ ruleId: 'ATR-2', severity: 'critical', confidence: 60 }])
    );
    expect(a.analyze('s', [evt()]).risk.level).toBe('high');
  });

  it('maps a high-severity match to elevated', () => {
    const a = new RiskAnalyzer(
      detectorWith([{ ruleId: 'ATR-3', severity: 'high', confidence: 80 }])
    );
    expect(a.analyze('s', [evt()]).risk.level).toBe('elevated');
  });

  it('maps no matches to normal', () => {
    const a = new RiskAnalyzer(detectorWith([]));
    expect(a.analyze('s', [evt()]).risk.level).toBe('normal');
  });

  it('distilled signals carry ruleIds + action-class, never raw payload', () => {
    const a = new RiskAnalyzer(
      detectorWith([
        { ruleId: 'ATR-4', severity: 'critical', confidence: 95, category: 'tool-poisoning' },
      ])
    );
    const { signals } = a.analyze('s', [evt()]);
    expect(signals[0]!.ruleIds).toContain('ATR-4');
    expect(signals[0]!.actionClass).toBe('tool-poisoning');
    expect(JSON.stringify(signals)).not.toContain('payload');
  });
});
