/**
 * 0-rules fail-open visibility — proxy must NEVER silently allow.
 *
 * Round-2 GA bug: when loadRules() yields 0 rules the detection engine matches
 * nothing, so evaluate() returns 'allow' for every tool call — protection is
 * silently OFF. We do not hard-fail (a blocklist-only proxy is a usable degraded
 * mode, and fail-CLOSED on evaluation *crashes* is unchanged), but the operator
 * must be told loudly. This proves the proxy announces DEGRADED mode on connect.
 *
 * Uses the ProxyEvaluatorLike injection seam with a 0-rule evaluator so the
 * assertion is about the visibility, not the ATR corpus.
 */
import { describe, it, expect, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPProxy } from '../src/proxy.js';
import type { ProxyEvaluatorLike } from '../src/proxy.js';
import type { EvalResult } from '../src/evaluator.js';

const ALLOW: EvalResult = {
  outcome: 'allow',
  reason: '',
  matchedRules: [],
  confidence: 0,
  durationMs: 0,
};

function makeEvaluator(ruleCount: number): ProxyEvaluatorLike {
  return {
    loadRules: async () => ruleCount,
    evaluateToolCall: async () => ALLOW,
    evaluateToolResponse: async () => ALLOW,
  };
}

function makeUpstream(): Server {
  const server = new Server(
    { name: 'test-upstream', version: '0.0.1' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));
  server.setRequestHandler(CallToolRequestSchema, async () => ({
    content: [{ type: 'text' as const, text: 'ran' }],
  }));
  return server;
}

async function connectWith(ruleCount: number): Promise<string> {
  const writes: string[] = [];
  const spy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      writes.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    });
  try {
    const upstream = makeUpstream();
    const [upSrv, proxyCli] = InMemoryTransport.createLinkedPair();
    await upstream.connect(upSrv);
    const proxy = new MCPProxy(
      { upstreamCommand: 'noop', upstreamArgs: [] },
      { evaluator: makeEvaluator(ruleCount) }
    );
    const [proxySrv, agentCli] = InMemoryTransport.createLinkedPair();
    await proxy.connect(proxyCli, proxySrv);
    void agentCli;
    return writes.join('');
  } finally {
    spy.mockRestore();
  }
}

describe('proxy 0-rules visibility — never silently fail open', () => {
  it('announces DEGRADED mode (not "0 rules protecting all tool calls") when 0 rules load', async () => {
    const out = await connectWith(0);
    expect(out).toContain('DEGRADED');
    expect(out.toLowerCase()).toContain('0 atr rules');
    // The misleading "protecting all tool calls" line must NOT appear with 0 rules.
    expect(out).not.toContain('0 rules protecting all tool calls');
  });

  it('reports the normal active line when rules are loaded', async () => {
    const out = await connectWith(642);
    expect(out).toContain('642 rules protecting all tool calls');
    expect(out).not.toContain('DEGRADED');
  });
});
