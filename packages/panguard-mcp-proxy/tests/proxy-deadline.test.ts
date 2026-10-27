/**
 * Proxy + evaluation deadline — the proxy evaluates in worker mode with its
 * evalTimeout as the deadline, so a scan that runs too long is cut and handled
 * by the proxy's fail mode: fail-closed (the default) blocks the response,
 * fail-open forwards it. Driven over in-memory transports with a test-only rule
 * and upstream output chosen so that the response scan runs past the deadline,
 * and with stub evaluators for the paths a real one cannot be made to take.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPProxy } from '../src/proxy.js';
import type { ProxyConfig, ProxyEvaluatorLike } from '../src/proxy.js';
import { ProxyEvaluator, EngineWorkerError, EVALUATION_ERROR_SENTINEL } from '../src/evaluator.js';
import type { EvalResult } from '../src/evaluator.js';

const SLOW_OUTPUT = 'q'.repeat(400);
/** Room for an ordinary scan on a fresh worker (regexes not yet compiled), on a slow CI runner too. */
const DEADLINE_MS = 5_000;

let slowDir: string;

beforeAll(() => {
  slowDir = mkdtempSync(join(tmpdir(), 'pg-proxy-deadline-'));
  writeFileSync(
    join(slowDir, 'ATR-TEST-SLOW.yaml'),
    `title: "Proxy deadline test rule"
id: ATR-TEST-SLOW
rule_version: 1
status: experimental
description: "test-only rule that runs long enough to exceed the deadline"
author: "test"
date: "2026/10/27"
schema_version: "1.0"
maturity: stable
severity: critical
tags:
  category: test
  confidence: high
agent_source:
  type: mcp_exchange
  provider:
    - any
detection:
  condition: any
  conditions:
    - field: content
      operator: regex
      value: "q*q*q*q*q*q*q*!"
`
  );
});

afterAll(() => {
  rmSync(slowDir, { recursive: true, force: true });
});

/** Upstream whose `fetch` returns output the test rule cannot finish scanning, and `ok` returns "fine". */
function makeUpstream(): Server {
  const server = new Server(
    { name: 'slow-upstream', version: '0.0.1' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: 'fetch', description: 'fetch a page', inputSchema: { type: 'object' as const } },
      { name: 'ok', description: 'answers fine', inputSchema: { type: 'object' as const } },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => ({
    content: [
      {
        type: 'text' as const,
        text: request.params.name === 'fetch' ? SLOW_OUTPUT : 'fine',
      },
    ],
  }));
  return server;
}

/** Connect an agent to `upstream` through a proxy; `call` returns a tool result's text. */
async function throughProxy(config: Partial<ProxyConfig>, evaluator: ProxyEvaluatorLike) {
  const [upSrv, proxyCli] = InMemoryTransport.createLinkedPair();
  await makeUpstream().connect(upSrv);
  const proxy = new MCPProxy(
    { upstreamCommand: 'noop', upstreamArgs: [], ...config },
    { evaluator }
  );
  const [proxySrv, agentCli] = InMemoryTransport.createLinkedPair();
  await proxy.connect(proxyCli, proxySrv);
  const agent = new Client({ name: 'test-agent', version: '0.0.1' }, { capabilities: {} });
  await agent.connect(agentCli);
  return async (name: string): Promise<string> => {
    const result = await agent.callTool({ name, arguments: { url: 'https://example.com' } });
    return (result.content as Array<{ text?: string }>).map((c) => c.text ?? '').join('');
  };
}

async function workerEvaluator(): Promise<ProxyEvaluator> {
  const evaluator = new ProxyEvaluator({ isolation: 'worker', deadlineMs: DEADLINE_MS });
  await evaluator.loadRules();
  await evaluator.loadAutoRules(slowDir, { adviseOnly: false });
  return evaluator;
}

const allow: EvalResult = {
  outcome: 'allow',
  reason: 'No threats detected',
  matchedRules: [],
  confidence: 0,
  durationMs: 0,
  adviseOnly: false,
};

/** A stub evaluator whose tool-call verdicts come from `onCall`; responses are allowed. */
function stubEvaluator(onCall: (n: number) => Promise<EvalResult>): ProxyEvaluatorLike {
  let n = 0;
  return {
    loadRules: async () => 1,
    evaluateToolCall: () => onCall(n++),
    evaluateToolResponse: async () => allow,
  };
}

describe('MCP proxy evaluation deadline', () => {
  it('builds its own evaluator in worker mode with evalTimeout as the deadline', () => {
    const evaluatorOf = (proxy: MCPProxy) =>
      (proxy as unknown as { evaluator: ProxyEvaluator }).evaluator;
    const tuned = evaluatorOf(
      new MCPProxy({ upstreamCommand: 'noop', upstreamArgs: [], evalTimeout: 1_234 })
    );
    expect(tuned.isolation).toBe('worker');
    expect(tuned.deadlineMs).toBe(1_234);
    // The default leaves room for large ordinary responses, which can take
    // several seconds to scan.
    expect(
      evaluatorOf(new MCPProxy({ upstreamCommand: 'noop', upstreamArgs: [] })).deadlineMs
    ).toBe(15_000);
  });

  it('blocks a response whose scan runs past the deadline under fail-closed', async () => {
    const evaluator = await workerEvaluator();
    const call = await throughProxy({ failMode: 'closed', evalTimeout: DEADLINE_MS }, evaluator);
    const start = Date.now();
    const text = await call('fetch');
    expect(Date.now() - start).toBeLessThan(DEADLINE_MS + 5_000);
    await evaluator.close();
    expect(text).toContain('[BLOCKED by PanGuard] Response from "fetch" could not be scanned.');
    expect(text).toContain(`within the ${DEADLINE_MS} ms time limit (fail-closed)`);
  }, 60_000);

  it('forwards it under fail-open', async () => {
    const evaluator = await workerEvaluator();
    const call = await throughProxy({ failMode: 'open', evalTimeout: DEADLINE_MS }, evaluator);
    const text = await call('fetch');
    await evaluator.close();
    expect(text).toBe(SLOW_OUTPUT);
  }, 60_000);

  it('still scans and forwards calls made alongside one whose scan is cut', async () => {
    const evaluator = await workerEvaluator();
    const call = await throughProxy({ failMode: 'closed', evalTimeout: DEADLINE_MS }, evaluator);
    const [slow, first, second] = await Promise.all([call('fetch'), call('ok'), call('ok')]);
    await evaluator.close();
    expect(slow).toContain('could not be scanned');
    // Queued behind the cut, these waited longer than evalTimeout in all, but
    // each scan of their own was short.
    expect([first, second]).toEqual(['fine', 'fine']);
  }, 90_000);

  it('stops waiting at evalTimeout for an injected evaluator that does not cut its own scans', async () => {
    const call = await throughProxy(
      { failMode: 'closed', evalTimeout: 300 },
      stubEvaluator(() => new Promise<never>(() => {}))
    );
    const start = Date.now();
    const text = await call('ok');
    expect(Date.now() - start).toBeLessThan(5_000);
    expect(text).toContain('[BLOCKED by PanGuard] Tool call "ok" was blocked.');
    expect(text).toContain('Scan did not finish within the 300 ms time limit (fail-closed)');
  }, 30_000);

  it('applies failMode when the scan worker fails', async () => {
    const failing = () => Promise.reject(new EngineWorkerError('ATR worker exited (code 1)'));
    const open = await throughProxy({ failMode: 'open' }, stubEvaluator(failing));
    expect(await open('ok')).toBe('fine');
    const closed = await throughProxy({ failMode: 'closed' }, stubEvaluator(failing));
    expect(await closed('ok')).toContain('Reason: Scan worker failed (fail-closed)');
  }, 30_000);

  it("does not escalate the session on the evaluator's own error verdict, only on a detection", async () => {
    const deny = (rule: string): EvalResult => ({
      outcome: 'deny',
      reason: 'denied',
      matchedRules: [rule],
      confidence: 100,
      durationMs: 0,
      adviseOnly: false,
    });
    const afterError = await throughProxy(
      {},
      stubEvaluator(async (n) => (n === 0 ? deny(EVALUATION_ERROR_SENTINEL) : allow))
    );
    expect(await afterError('ok')).toContain('[BLOCKED by PanGuard]');
    expect(await afterError('ok')).toBe('fine');
    const afterDetection = await throughProxy(
      {},
      stubEvaluator(async (n) => (n === 0 ? deny('ATR-2026-99999') : allow))
    );
    expect(await afterDetection('ok')).toContain('[BLOCKED by PanGuard]');
    expect(await afterDetection('ok')).toContain('[BLOCKED by PanGuard]');
  }, 30_000);
});
