import { describe, it, expect } from 'vitest';
import { applyMcpGate, mcpToolCallToAction } from '../src/mcp-gate.js';
import type { McpToolCall } from '../src/mcp-gate.js';
import { GuardGate, NoopContainmentController } from '../src/guard-gate.js';
import { InlineGate } from '../src/inline-gate.js';
import { RiskAnalyzer } from '../src/risk-analyzer.js';
import { InMemoryRiskStore } from '../src/risk-store.js';
import type { ContentDetector } from '../src/types.js';

const emptyDetector: ContentDetector = { detect: () => [] };

function guardWith(store = new InMemoryRiskStore()): GuardGate {
  return new GuardGate({
    gate: new InlineGate(),
    analyzer: new RiskAnalyzer(emptyDetector),
    riskStore: store,
    containment: new NoopContainmentController(),
  });
}

function call(overrides: Partial<McpToolCall> = {}): McpToolCall {
  return {
    name: 'read_file',
    args: { path: './README.md' },
    sessionId: 's1',
    agentId: 'a1',
    capabilities: new Set(['read_file', 'list_dir']),
    ...overrides,
  };
}

describe('mcp-gate adapter', () => {
  it('allows a granted tool call', () => {
    expect(applyMcpGate(guardWith(), call()).allow).toBe(true);
  });

  it('blocks an ungranted tool with a clean reason', () => {
    const v = applyMcpGate(guardWith(), call({ name: 'delete_db', capabilities: new Set(['read_file']) }));
    expect(v.allow).toBe(false);
    expect(v.reason).toMatch(/not in this agent's granted capabilities/);
    expect(v.escalated).toBe(false);
  });

  it('blocks and flags escalation when the session is high-risk', () => {
    const store = new InMemoryRiskStore();
    store.set('s1', { level: 'high', reasons: ['ATR-X'] });
    const v = applyMcpGate(guardWith(store), call());
    expect(v.allow).toBe(false);
    expect(v.escalated).toBe(true);
  });

  it('serializes tool args into the action payload', () => {
    const ctx = mcpToolCallToAction(call({ args: { a: 1, b: 'x' } }));
    expect(ctx.payload).toBe('{"a":1,"b":"x"}');
    expect(ctx.kind).toBe('tool_call');
    expect(ctx.target).toBe('read_file');
  });
});
