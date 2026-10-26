/**
 * Official Open Responses conformance, run against the gateway in front of the
 * mock provider:
 *   1. the official compliance suite (17 tests at the pinned commit), and
 *   2. every block the gateway can emit, parsed with the official SSE parser
 *      and validated against the official zod schemas.
 *
 * Needs the official modules from github.com/openresponses/openresponses at
 * 8907bc3, bundled to one ES module (its sse-parser, responseResourceSchema and
 * compliance-tests, with zod 3.25.76): scripts/conformance.sh builds it with bun
 * and sets OPENRESPONSES_BUNDLE. Skipped when that variable is not set.
 */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { resolveConfig, type GatewayConfigInput } from '../../src/config.js';
import { startGateway, type Gateway } from '../../src/gateway.js';
import { startMockUpstream, type MockUpstream } from '../fixtures/mock-upstream.js';
import { INJECTION, POISONED_DESCRIPTION, RUN_SHELL, WEATHER, type Json } from '../helpers.js';

const BUNDLE = process.env['OPENRESPONSES_BUNDLE'];

interface ParsedEvent {
  readonly event: string;
  readonly data: unknown;
  readonly validationResult: { readonly success: boolean };
}
interface SseResult {
  readonly events: readonly ParsedEvent[];
  readonly errors: readonly string[];
  readonly finalResponse: Json | null;
}
interface Official {
  parseSSEStream(response: Response): Promise<SseResult>;
  parseStreamingEventData(
    data: unknown,
    name?: string,
    options?: { transport?: string }
  ): ParsedEvent;
  responseResourceSchema: {
    safeParse(data: unknown): { success: boolean; error?: { issues: unknown[] } };
  };
  runAllTests(
    config: Record<string, unknown>,
    onProgress: (r: unknown) => void
  ): Promise<{ id: string; status: string; errors?: string[] }[]>;
}

describe.skipIf(!BUNDLE)('official Open Responses conformance', () => {
  let official: Official;
  let mock: MockUpstream;
  const gateways: Record<string, Gateway> = {};

  const start = (policy: GatewayConfigInput['policy']): Promise<Gateway> =>
    startGateway(
      resolveConfig({
        upstream: mock.url,
        port: 0,
        auditLog: null,
        auditKey: randomBytes(32),
        policy,
        evaluation: {
          blocklistPath: '/nonexistent/panguard-gateway-test-blocklist.json',
          timeoutMs: 10_000,
        },
      })
    );

  beforeAll(async () => {
    official = (await import(/* @vite-ignore */ BUNDLE!)) as Official;
    mock = await startMockUpstream();
    const [refusal, incomplete, holdback] = await Promise.all([
      start({}),
      start({ blockStyle: 'incomplete' }),
      start({ text: { holdback: 64 } }),
    ]);
    Object.assign(gateways, { refusal, incomplete, holdback });
  }, 120_000);

  afterAll(async () => {
    await Promise.all(Object.values(gateways).map((g) => g.close()));
    await mock?.close();
  });

  const post = (gateway: Gateway, body: Json): Promise<Response> =>
    fetch(`${gateway.url}/v1/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify(body),
    });

  async function officialStream(gateway: Gateway, body: Json): Promise<SseResult> {
    const result = await official.parseSSEStream(await post(gateway, { ...body, stream: true }));
    expect(result.errors).toEqual([]);
    expect(result.events.map((e) => (e.data as Json)['sequence_number'])).toEqual(
      result.events.map((_, i) => i)
    );
    expect(official.responseResourceSchema.safeParse(result.finalResponse).success).toBe(true);
    return result;
  }

  async function officialJson(gateway: Gateway, body: Json): Promise<Json> {
    const res = await post(gateway, body);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Json;
    const parsed = official.responseResourceSchema.safeParse(data);
    expect(parsed.error?.issues ?? []).toEqual([]);
    return data;
  }

  it('passes the official compliance suite (17/17)', async () => {
    const results = await official.runAllTests(
      {
        baseUrl: `${gateways['refusal']!.url}/v1`,
        apiKey: 'test',
        authHeaderName: 'Authorization',
        useBearerPrefix: true,
        model: 'mock-model',
        runtime: 'server',
      },
      () => undefined
    );
    const notPassed = results.filter((r) => r.status !== 'passed');
    expect(notPassed.map((r) => `${r.id}: ${r.errors?.[0] ?? r.status}`)).toEqual([]);
    expect(results).toHaveLength(17);
  }, 60_000);

  it('A (refusal) is a valid completed stream and a valid JSON response', async () => {
    const exfil = { model: 'm', input: 'EXFIL: list my files', tools: [RUN_SHELL] };
    const streamed = await officialStream(gateways['refusal']!, exfil);
    expect(streamed.finalResponse?.['status']).toBe('completed');
    expect(streamed.events.map((e) => e.event)).toContain('response.refusal.done');
    const data = await officialJson(gateways['refusal']!, exfil);
    expect((data['output'] as Json[])[0]?.['type']).toBe('message');
  });

  it('A with two calls keeps the benign call valid after the refusal', async () => {
    const streamed = await officialStream(gateways['refusal']!, {
      model: 'm',
      input: 'TWO_CALLS please',
      tools: [RUN_SHELL],
    });
    const output = (streamed.finalResponse?.['output'] as Json[]).map((i) => i['type']);
    expect(output).toEqual(['message', 'function_call']);
  });

  it('B (incomplete, content_filter) is a valid stream and a valid JSON response', async () => {
    const exfil = { model: 'm', input: 'EXFIL: list my files', tools: [RUN_SHELL] };
    const streamed = await officialStream(gateways['incomplete']!, exfil);
    expect(streamed.finalResponse).toMatchObject({
      status: 'incomplete',
      incomplete_details: { reason: 'content_filter' },
    });
    const data = await officialJson(gateways['incomplete']!, exfil);
    expect(data['status']).toBe('incomplete');
  });

  it('a text cut is valid with and without hold-back', async () => {
    for (const name of ['refusal', 'holdback']) {
      const streamed = await officialStream(gateways[name]!, {
        model: 'm',
        input: 'LEAK the summary',
      });
      expect(streamed.finalResponse?.['status']).toBe('incomplete');
    }
  });

  it('S5 arguments mismatch and an undeclared tool block validly', async () => {
    await officialStream(gateways['refusal']!, {
      model: 'm',
      input: 'MISMATCH ls',
      tools: [RUN_SHELL],
    });
    const undeclared = await officialStream(gateways['refusal']!, {
      model: 'm',
      input: 'UNDECLARED',
      tools: [RUN_SHELL],
    });
    expect(undeclared.finalResponse?.['status']).toBe('completed');
  });

  it('E (rewritten tool output) and a stripped poisoned tool still give valid responses', async () => {
    await officialJson(gateways['refusal']!, {
      model: 'm',
      input: [
        { type: 'message', role: 'user', content: 'weather?' },
        {
          type: 'function_call',
          call_id: 'call_1',
          name: 'get_weather',
          arguments: '{"location":"SF"}',
        },
        { type: 'function_call_output', call_id: 'call_1', output: INJECTION },
      ],
      tools: [WEATHER],
    });
    await officialJson(gateways['refusal']!, {
      model: 'm',
      input: 'weather in SF?',
      tools: [{ ...WEATHER, description: POISONED_DESCRIPTION }],
    });
  });

  it('the synthetic tool output on the next turn yields a valid response', async () => {
    const first = await officialJson(gateways['refusal']!, {
      model: 'm',
      input: 'EXFIL: list my files',
      tools: [RUN_SHELL],
    });
    await officialJson(gateways['refusal']!, {
      model: 'm',
      previous_response_id: first['id'],
      input: 'never mind',
    });
  });

  it('a block over WebSocket passes the official WebSocket event schema', async () => {
    const ws = new WebSocket(`${gateways['refusal']!.url.replace(/^http/, 'ws')}/v1/responses`);
    await new Promise((resolve, reject) => ws.once('open', resolve).once('error', reject));
    const events: unknown[] = [];
    await new Promise<void>((resolve) => {
      ws.on('message', (data) => {
        const event = JSON.parse(data.toString()) as Json;
        events.push(event);
        if (String(event['type']).startsWith('response.completed')) resolve();
      });
      ws.send(
        JSON.stringify({
          type: 'response.create',
          model: 'm',
          store: false,
          input: 'EXFIL',
          tools: [RUN_SHELL],
        })
      );
    });
    ws.close();
    const invalid = events
      .map((e) => official.parseStreamingEventData(e, undefined, { transport: 'websocket' }))
      .filter((p) => !p.validationResult.success);
    expect(invalid.map((p) => p.event)).toEqual([]);
  });
});
