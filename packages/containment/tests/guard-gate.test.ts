import { describe, it, expect, vi } from 'vitest';
import type { SecurityEvent } from '@panguard-ai/core';
import { GuardGate, NoopContainmentController } from '../src/guard-gate.js';
import type { ContainmentController } from '../src/guard-gate.js';
import { InlineGate } from '../src/inline-gate.js';
import { RiskAnalyzer } from '../src/risk-analyzer.js';
import { InMemoryRiskStore } from '../src/risk-store.js';
import type { ActionContext, ContentDetector, DetectionMatch } from '../src/types.js';

function action(): ActionContext {
  return {
    agentId: 'a',
    sessionId: 's1',
    kind: 'tool_call',
    target: 'read_file',
    payload: '{}',
    capabilities: new Set(['read_file']),
  };
}

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

function detector(matches: DetectionMatch[]): ContentDetector {
  return { detect: () => matches };
}

describe('GuardGate dual-path', () => {
  it('onAction is the synchronous hot path and allows legitimate actions', () => {
    const g = new GuardGate({
      gate: new InlineGate(),
      analyzer: new RiskAnalyzer(detector([])),
      riskStore: new InMemoryRiskStore(),
      containment: new NoopContainmentController(),
    });
    expect(g.onAction(action())).toBe('ALLOW');
  });

  it('onSessionActivity updates the risk store and escalates on high risk', async () => {
    const store = new InMemoryRiskStore();
    const containment: ContainmentController = { escalate: vi.fn(async () => {}) };
    const g = new GuardGate({
      gate: new InlineGate(),
      analyzer: new RiskAnalyzer(
        detector([{ ruleId: 'ATR-X', severity: 'critical', confidence: 60 }]),
      ),
      riskStore: store,
      containment,
    });
    await g.onSessionActivity('s1', [evt()]);
    expect(store.get('s1').level).toBe('high');
    expect(containment.escalate).toHaveBeenCalledWith('s1', 'quarantine');
  });

  it('the brain feeds the gate: after activity, the next action escalates', async () => {
    const store = new InMemoryRiskStore();
    const g = new GuardGate({
      gate: new InlineGate(),
      analyzer: new RiskAnalyzer(
        detector([{ ruleId: 'ATR-Y', severity: 'critical', confidence: 60 }]),
      ),
      riskStore: store,
      containment: new NoopContainmentController(),
    });
    expect(g.onAction(action())).toBe('ALLOW'); // before
    await g.onSessionActivity('s1', [evt()]); // brain raises risk to high
    expect(g.onAction(action())).toBe('ESCALATE'); // after — gate reads new risk
  });
});
