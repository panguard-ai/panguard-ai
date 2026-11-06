/**
 * Gateway hardening: browser origins, the compact endpoint, WebSocket limits,
 * and a provider stream that would once have crashed the process.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket, { WebSocketServer } from 'ws';
import { resolveConfig } from '../src/config.js';
import { startGateway, type Gateway } from '../src/gateway.js';
import { FakeEvaluator, contains } from './fixtures/fake-evaluator.js';
import { startMockUpstream, type MockUpstream } from './fixtures/mock-upstream.js';
import { INJECTION, RUN_SHELL, type Json } from './helpers.js';

const EVALUATOR = new FakeEvaluator([
  { id: 'ATR-INJECT', outcome: 'deny', when: contains('Ignore all previous instructions') },
]);

let mock: MockUpstream;
let gateway: Gateway;

beforeAll(async () => {
  mock = await startMockUpstream();
  gateway = await startGateway(
    resolveConfig({
      upstream: mock.url,
      port: 0,
      auditLog: null,
      allowedOrigins: ['https://console.example'],
    }),
    { evaluator: EVALUATOR }
  );
});

afterAll(async () => {
  await gateway?.close();
  await mock?.close();
});

const wsUrl = (base: string): string => `${base.replace(/^http/, 'ws')}/v1/responses`;

describe('browser origins', () => {
  it('refuses an HTTP request from an origin that is not allowed', async () => {
    const res = await fetch(`${gateway.url}/v1/responses`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: 'https://evil.example' },
      body: JSON.stringify({ model: 'm', input: 'hi' }),
    });
    expect(res.status).toBe(403);
    expect(((await res.json()) as Json)['error']).toMatchObject({ code: 'origin_not_allowed' });
  });

  it('lets an allowed origin and an origin-less client through', async () => {
    const variants: Record<string, string>[] = [{ origin: 'https://console.example' }, {}];
    for (const headers of variants) {
      const res = await fetch(`${gateway.url}/v1/responses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ model: 'm', input: 'hi' }),
      });
      expect(res.status).toBe(200);
    }
  });

  it('refuses a WebSocket upgrade from an origin that is not allowed', async () => {
    const ws = new WebSocket(wsUrl(gateway.url), { headers: { origin: 'https://evil.example' } });
    const status = await new Promise<number>((resolve) => {
      ws.once('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
      ws.once('open', () => resolve(101));
      ws.once('error', () => undefined);
    });
    ws.terminate();
    expect(status).toBe(403);
  });
});

describe('/responses/compact', () => {
  it('checks tool outputs before they are compacted out of reach', async () => {
    const res = await fetch(`${gateway.url}/v1/responses/compact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'm',
        input: [
          { type: 'message', role: 'user', content: 'weather?' },
          { type: 'function_call', call_id: 'call_1', name: 'get_weather', arguments: '{}' },
          { type: 'function_call_output', call_id: 'call_1', output: INJECTION },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const sent = mock.compactRequests()[mock.compactRequests().length - 1] ?? {};
    expect(JSON.stringify(sent)).not.toContain('Ignore all previous instructions');
    expect(JSON.stringify(sent)).toContain('[PanGuard] tool output withheld');
  });
});

describe('WebSocket limits', () => {
  it('refuses response.create messages beyond the per-connection queue', async () => {
    const ws = new WebSocket(wsUrl(gateway.url));
    await new Promise((resolve, reject) => ws.once('open', resolve).once('error', reject));
    const refused = new Promise<Json>((resolve) => {
      ws.on('message', (data) => {
        const event = JSON.parse(data.toString()) as Json;
        if (event['type'] === 'error' && event['status'] === 429) resolve(event);
      });
    });
    for (let i = 0; i < 24; i += 1) {
      ws.send(
        JSON.stringify({ type: 'response.create', model: 'm', store: false, input: `turn ${i}` })
      );
    }
    expect(await refused).toMatchObject({ error: { code: 'too_many_pending_turns' } });
    ws.terminate();
  });
});

describe('a provider stream with arguments nested too deep to re-serialize', () => {
  let upstream: Server;
  let deepGateway: Gateway;

  beforeAll(async () => {
    const deep = '['.repeat(20_000) + ']'.repeat(20_000);
    const call = {
      type: 'function_call',
      id: 'fc_1',
      call_id: 'call_1',
      name: 'run_shell',
      arguments: deep,
      status: 'completed',
    };
    const response = { id: 'resp_deep', object: 'response', status: 'in_progress', output: [] };
    upstream = createServer((_req, res) => res.writeHead(404).end());
    const sockets = new WebSocketServer({ noServer: true });
    upstream.on('upgrade', (req, socket, head) =>
      sockets.handleUpgrade(req, socket, head, (ws) => {
        ws.on('message', () => {
          const events = [
            { type: 'response.created', response },
            {
              type: 'response.output_item.added',
              output_index: 0,
              item: { ...call, arguments: '' },
            },
            {
              type: 'response.function_call_arguments.done',
              item_id: 'fc_1',
              output_index: 0,
              arguments: deep,
            },
            { type: 'response.output_item.done', output_index: 0, item: call },
            {
              type: 'response.completed',
              response: { ...response, status: 'completed', output: [call] },
            },
          ];
          events.forEach((event, i) => ws.send(JSON.stringify({ ...event, sequence_number: i })));
          ws.close();
        });
      })
    );
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const port = (upstream.address() as AddressInfo).port;
    deepGateway = await startGateway(
      resolveConfig({ upstream: `http://127.0.0.1:${port}/v1`, port: 0, auditLog: null }),
      { evaluator: new FakeEvaluator([]) }
    );
  });

  afterAll(async () => {
    await deepGateway?.close();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  it('finishes the turn and keeps serving', async () => {
    const ws = new WebSocket(wsUrl(deepGateway.url));
    await new Promise((resolve, reject) => ws.once('open', resolve).once('error', reject));
    const types: string[] = [];
    const closed = new Promise<void>((resolve) => ws.once('close', () => resolve()));
    ws.on('message', (data) => types.push(String((JSON.parse(data.toString()) as Json)['type'])));
    ws.send(
      JSON.stringify({ type: 'response.create', model: 'm', input: 'go', tools: [RUN_SHELL] })
    );
    await closed;
    expect(types[types.length - 1]).toBe('response.completed');
    const health = await fetch(`${deepGateway.url}/healthz`);
    expect(health.status).toBe(200);
  });
});
