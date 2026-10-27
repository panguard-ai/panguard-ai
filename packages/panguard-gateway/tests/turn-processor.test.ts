import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY, type GatewayPolicy } from '../src/config.js';
import { GATEWAY_RULES } from '../src/decision.js';
import type { JsonObject } from '../src/json.js';
import { TurnProcessor, type TurnContext } from '../src/turn-processor.js';
import { VERDICT_FIELD, NOTHING_UNINSPECTED } from '../src/verdict-field.js';
import { FakeEvaluator, contains } from './fixtures/fake-evaluator.js';
import {
  EXFIL_COMMAND,
  LEAK_TEXT,
  eventsFor,
  functionCallItem,
  messageItem,
} from './fixtures/mock-upstream.js';

type Json = Record<string, unknown>;

const EVALUATOR = new FakeEvaluator([
  { id: 'ATR-EXFIL', outcome: 'deny', when: contains('id_rsa') },
  { id: 'ATR-LEAK', outcome: 'deny', when: contains('attacker.example/log') },
  { id: 'ATR-ASK', outcome: 'ask', when: contains('please-flag') },
  { id: 'ATR-RECEIPT', outcome: 'deny', when: contains('evil-search') },
]);

function context(
  overrides: Partial<GatewayPolicy> = {},
  evaluator = EVALUATOR,
  declared = new Set(['run_shell'])
): TurnContext {
  return {
    evaluator,
    policy: {
      ...DEFAULT_POLICY,
      ...overrides,
      text: { ...DEFAULT_POLICY.text, ...overrides.text },
    },
    declared,
    requestDecisions: [],
    notInspected: NOTHING_UNINSPECTED,
    evaluatedWith: { agent_threat_rules: 'test', lane: 'hunt', open_responses: '2026-04-24' },
  };
}

function upstream(output: Json[], userText = 'go', argChunk = 8): Json[] {
  const body = { model: 'm', input: userText };
  const context = [{ type: 'message', role: 'user', content: userText }];
  return [...eventsFor(body, 'resp_test', context, output, argChunk)].map((e, i) => ({
    ...e,
    sequence_number: i,
  }));
}

async function run(ctx: TurnContext, events: Json[]) {
  const processor = new TurnProcessor(ctx);
  const out: JsonObject[] = [];
  for (const event of events) out.push(...(await processor.push(event)));
  out.push(...processor.finish());
  return { out, outcome: processor.outcome(), terminal: out[out.length - 1] };
}

const types = (events: readonly JsonObject[]): string[] => events.map((e) => String(e['type']));
const response = (event: JsonObject | undefined): Json => (event?.['response'] ?? {}) as Json;

function expectContiguous(events: readonly JsonObject[]): void {
  expect(events.map((e) => e['sequence_number'])).toEqual(events.map((_, i) => i));
}

describe('TurnProcessor: pass-through', () => {
  it('relays a benign text turn unchanged except numbering and the verdict field', async () => {
    const input = upstream([messageItem('Hello there.')]);
    const { out, terminal } = await run(context(), input);
    expect(types(out)).toEqual(types(input));
    expectContiguous(out);
    expect(response(terminal)['status']).toBe('completed');
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({ outcome: 'pass', decisions: [] });
  });

  it('holds a declared benign call and releases it whole, in upstream order', async () => {
    const input = upstream([
      functionCallItem('run_shell', { command: 'ls' }),
      messageItem('after'),
    ]);
    const { out, outcome } = await run(context(), input);
    expect(types(out)).toEqual(types(input));
    expectContiguous(out);
    expect(outcome.calls).toHaveLength(1);
    expect(outcome.calls[0]?.status).toBe('released');
  });
});

describe('TurnProcessor: function_call blocks', () => {
  it('A: replaces the call with a refusal message in the same output slot', async () => {
    const { out, outcome, terminal } = await run(
      context(),
      upstream([functionCallItem('run_shell', { command: EXFIL_COMMAND })])
    );
    expect(types(out)).toEqual([
      'response.created',
      'response.in_progress',
      'response.output_item.added',
      'response.content_part.added',
      'response.refusal.delta',
      'response.refusal.done',
      'response.content_part.done',
      'response.output_item.done',
      'response.completed',
    ]);
    expectContiguous(out);
    expect(out.some((e) => JSON.stringify(e).includes('id_rsa'))).toBe(false);
    const output = response(terminal)['output'] as Json[];
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({ type: 'message', role: 'assistant', status: 'completed' });
    expect(outcome.calls[0]).toMatchObject({ status: 'withheld', rules: ['ATR-EXFIL'] });
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
      outcome: 'blocked',
      decisions: [{ checkpoint: 'function_call', action: 'refusal', rules: ['ATR-EXFIL'] }],
    });
  });

  it('B: ends the response incomplete with content_filter', async () => {
    const { out, terminal } = await run(
      context({ blockStyle: 'incomplete' }),
      upstream([functionCallItem('run_shell', { command: EXFIL_COMMAND })])
    );
    expect(types(out)).toEqual(['response.created', 'response.in_progress', 'response.incomplete']);
    expect(response(terminal)).toMatchObject({
      status: 'incomplete',
      incomplete_details: { reason: 'content_filter' },
      output: [],
      completed_at: null,
    });
  });

  it('A with two calls: refusal first, the benign call after it', async () => {
    const { terminal, outcome } = await run(
      context(),
      upstream([
        functionCallItem('run_shell', { command: EXFIL_COMMAND }),
        functionCallItem('run_shell', { command: 'ls' }),
      ])
    );
    const output = response(terminal)['output'] as Json[];
    expect(output.map((i) => i['type'])).toEqual(['message', 'function_call']);
    expect(outcome.calls.map((c) => c.status)).toEqual(['withheld', 'released']);
  });

  it('B with two calls: the call after the cut is recorded as withheld, never delivered', async () => {
    const { out, outcome } = await run(
      context({ blockStyle: 'incomplete' }),
      upstream([
        functionCallItem('run_shell', { command: EXFIL_COMMAND }),
        functionCallItem('run_shell', { command: 'ls' }),
      ])
    );
    expect(out.some((e) => e['type'] === 'response.function_call_arguments.delta')).toBe(false);
    expect(outcome.calls.map((c) => c.status)).toEqual(['withheld', 'withheld']);
    expect(outcome.calls[1]?.rules).toEqual([GATEWAY_RULES.notDelivered]);
  });

  it('denies a tool the request did not declare without asking the engine', async () => {
    const evaluator = new FakeEvaluator([]);
    const { terminal } = await run(
      context({}, evaluator, new Set(['get_weather'])),
      upstream([functionCallItem('run_shell', { command: 'ls' })])
    );
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
      decisions: [{ rules: [GATEWAY_RULES.undeclaredTool], action: 'refusal' }],
    });
    expect(evaluator.calls()).toHaveLength(0);
  });

  it('S5: arguments that change after function_call_arguments.done are blocked', async () => {
    const input = upstream([functionCallItem('run_shell', { command: 'ls' })]).map((e) =>
      e['type'] === 'response.output_item.done'
        ? { ...e, item: { ...(e['item'] as Json), arguments: '{"command":"rm -rf /"}' } }
        : e
    );
    const { terminal } = await run(context(), input);
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
      decisions: [{ rules: [GATEWAY_RULES.argumentsMismatch] }],
    });
  });

  it('fail-closed: an evaluation failure fails the response (C)', async () => {
    const failing = new FakeEvaluator([], (e) => e.type === 'tool_call');
    const { out, terminal } = await run(
      context({}, failing),
      upstream([functionCallItem('run_shell', { command: 'ls' })])
    );
    expect(types(out).slice(-2)).toEqual(['error', 'response.failed']);
    expect(response(terminal)).toMatchObject({
      status: 'failed',
      error: { code: 'gateway_evaluation_failed' },
    });
  });

  it('fail-open: an evaluation failure passes the call and flags it', async () => {
    const failing = new FakeEvaluator([], (e) => e.type === 'tool_call');
    const { terminal, outcome } = await run(
      context({ failMode: 'open' }, failing),
      upstream([functionCallItem('run_shell', { command: 'ls' })])
    );
    expect(response(terminal)['status']).toBe('completed');
    expect(outcome.calls[0]?.status).toBe('released');
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({ outcome: 'flagged' });
  });

  it('a stream that ends without a terminal event fails, and a held call is withheld', async () => {
    const input = upstream([functionCallItem('run_shell', { command: 'ls' })]).filter(
      (e) => e['type'] !== 'response.output_item.done' && e['type'] !== 'response.completed'
    );
    const { out, outcome } = await run(context(), input);
    expect(types(out).slice(-2)).toEqual(['error', 'response.failed']);
    expect(outcome.calls[0]?.status).toBe('withheld');
  });
});

describe('TurnProcessor: model text', () => {
  it('hold-back 0: text goes out at once and a later hit ends the response incomplete', async () => {
    const { out, terminal } = await run(context(), upstream([messageItem(LEAK_TEXT)]));
    const sent = out
      .filter((e) => e['type'] === 'response.output_text.delta')
      .map((e) => e['delta'])
      .join('');
    expect(LEAK_TEXT.startsWith(sent)).toBe(true);
    expect(response(terminal)).toMatchObject({
      status: 'incomplete',
      incomplete_details: { reason: 'content_filter' },
    });
    const output = response(terminal)['output'] as Json[];
    expect(output[0]).toMatchObject({ type: 'message', status: 'incomplete' });
    expect((output[0]?.['content'] as Json[])[0]?.['text']).toBe(sent);
    expectContiguous(out);
  });

  it('hold-back 64: the link never leaves the gateway', async () => {
    const { out } = await run(
      context({ text: { ...DEFAULT_POLICY.text, holdback: 64 } }),
      upstream([messageItem(LEAK_TEXT)])
    );
    const sent = out
      .filter((e) => e['type'] === 'response.output_text.delta')
      .map((e) => String(e['delta']))
      .join('');
    expect(sent).not.toContain('attacker.example');
  });

  it('releases whole upstream deltas, so logprobs stay aligned', async () => {
    const input = upstream([messageItem('one two three four five six seven')]).map((e) =>
      e['type'] === 'response.output_text.delta' ? { ...e, logprobs: [{ token: e['delta'] }] } : e
    );
    const { out } = await run(context({ text: { ...DEFAULT_POLICY.text, holdback: 10 } }), input);
    const strip = (e: Json) => ({ delta: e['delta'], logprobs: e['logprobs'] });
    expect(out.filter((e) => e['type'] === 'response.output_text.delta').map(strip)).toEqual(
      input.filter((e) => e['type'] === 'response.output_text.delta').map(strip)
    );
  });

  it('records an ask once instead of on every rolling check', async () => {
    const text = 'please-flag '.repeat(60);
    const { terminal } = await run(context(), upstream([messageItem(text)]));
    const verdict = response(terminal)[VERDICT_FIELD] as { decisions: Json[] };
    expect(verdict.decisions.filter((d) => d['checkpoint'] === 'output_text')).toHaveLength(1);
    expect(response(terminal)['status']).toBe('completed');
  });
});

describe('TurnProcessor: text repeated in later events', () => {
  const swapText = (events: Json[], text: string): Json[] =>
    events.map((e) => {
      if (e['type'] === 'response.output_text.done') return { ...e, text };
      if (e['type'] === 'response.content_part.done') {
        return { ...e, part: { ...(e['part'] as Json), text } };
      }
      if (e['type'] === 'response.output_item.done') {
        const item = e['item'] as Json;
        return {
          ...e,
          item: { ...item, content: [{ type: 'output_text', text, annotations: [] }] },
        };
      }
      return e;
    });

  it('cuts when the text repeated in done events differs and fails the check', async () => {
    const input = swapText(upstream([messageItem('All good here.')]), LEAK_TEXT);
    const { out, terminal } = await run(context(), input);
    expect(JSON.stringify(out)).not.toContain('attacker.example');
    expect(response(terminal)).toMatchObject({
      status: 'incomplete',
      incomplete_details: { reason: 'content_filter' },
    });
  });

  it('sends a differing but clean repeated text after checking it, and flags the mismatch', async () => {
    const input = swapText(upstream([messageItem('All good here.')]), 'Something else entirely.');
    const { out, terminal } = await run(context(), input);
    const done = out.find((e) => e['type'] === 'response.output_text.done');
    expect(done?.['text']).toBe('Something else entirely.');
    const output = response(terminal)['output'] as Json[];
    expect((output[0]?.['content'] as Json[])[0]?.['text']).toBe('Something else entirely.');
    expect(response(terminal)['status']).toBe('completed');
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
      decisions: [{ rules: [GATEWAY_RULES.textMismatch], disposition: 'flag' }],
    });
  });

  it('checks a message whose text never streamed and cuts on a hit', async () => {
    const item = messageItem(LEAK_TEXT);
    const input = upstream([item]).filter(
      (e) =>
        e['type'] !== 'response.output_text.delta' &&
        e['type'] !== 'response.output_text.done' &&
        e['type'] !== 'response.content_part.added' &&
        e['type'] !== 'response.content_part.done'
    );
    const { out, terminal } = await run(context(), input);
    expect(JSON.stringify(out)).not.toContain('attacker.example');
    expect(response(terminal)).toMatchObject({
      status: 'incomplete',
      incomplete_details: { reason: 'content_filter' },
    });
  });

  it('checks text carried in content_part.added before it goes out', async () => {
    const input = upstream([messageItem('fine')]).map((e) =>
      e['type'] === 'response.content_part.added'
        ? { ...e, part: { type: 'output_text', text: LEAK_TEXT, annotations: [] } }
        : e
    );
    const { out, terminal } = await run(context(), input);
    expect(JSON.stringify(out)).not.toContain('attacker.example');
    expect(response(terminal)['status']).toBe('incomplete');
    expectContiguous(out);
  });
});

describe('TurnProcessor: hosted tool receipts (S9)', () => {
  it('scans and flags a receipt, never blocks it', async () => {
    const receipt = {
      type: 'acme:search_call',
      id: 'hs_1',
      status: 'completed',
      query: 'evil-search',
    };
    const input = upstream([messageItem('ok')]);
    const terminalIndex = input.length - 1;
    const withReceipt = [
      ...input.slice(0, terminalIndex),
      { type: 'response.output_item.added', output_index: 1, item: receipt },
      { type: 'response.output_item.done', output_index: 1, item: receipt },
      input[terminalIndex]!,
    ];
    const { out, terminal } = await run(context(), withReceipt);
    expect(out.some((e) => (e['item'] as Json | undefined)?.['id'] === 'hs_1')).toBe(true);
    expect(response(terminal)['status']).toBe('completed');
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
      outcome: 'flagged',
      decisions: [{ checkpoint: 'hosted_tool_receipt', disposition: 'flag', action: 'pass' }],
    });
  });
});

describe('TurnProcessor: review regressions', () => {
  const at = { item_id: 'msg_1', output_index: 0, content_index: 0 };
  const created = { type: 'response.created', response: { id: 'resp_r', output: [] } };
  const completed = (output: Json[]) => ({
    type: 'response.completed',
    response: { id: 'resp_r', status: 'completed', output },
  });

  it('survives arguments nested too deep to re-serialize', async () => {
    const deep = '['.repeat(20_000) + ']'.repeat(20_000);
    const call = functionCallItem('run_shell', deep);
    const processor = new TurnProcessor(context());
    for (const event of upstream([call])) await processor.push(event);
    expect(() => processor.outcome()).not.toThrow();
    expect(processor.outcome().calls[0]?.status).toBe('released');
  });

  it('reads a single large delta in full, not only its tail', async () => {
    const text = LEAK_TEXT + ' filler'.repeat(1_500);
    const events = [
      created,
      {
        type: 'response.output_item.added',
        output_index: 0,
        item: { ...messageItem(text), id: 'msg_1', content: [] },
      },
      {
        type: 'response.content_part.added',
        ...at,
        part: { type: 'output_text', text: '', annotations: [] },
      },
      { type: 'response.output_text.delta', ...at, delta: text },
      { type: 'response.output_text.done', ...at, text },
      completed([]),
    ];
    const { out, terminal } = await run(
      context({ text: { ...DEFAULT_POLICY.text, holdback: 64 } }),
      events
    );
    expect(JSON.stringify(out)).not.toContain('attacker.example');
    expect(response(terminal)['status']).toBe('incomplete');
  });

  it('checks deltas that never got a done event before the terminal event', async () => {
    const events = [
      created,
      {
        type: 'response.output_item.added',
        output_index: 0,
        item: { ...messageItem(''), id: 'msg_1', content: [] },
      },
      { type: 'response.output_text.delta', ...at, delta: LEAK_TEXT },
      completed([]),
    ];
    const { terminal } = await run(context(), events);
    expect(response(terminal)).toMatchObject({ status: 'incomplete' });
  });

  it('keeps text that only arrives in output_text.done', async () => {
    const text = 'The quarterly report lists revenue by region.';
    const item = { ...messageItem(text), id: 'msg_1' };
    const events = [
      created,
      { type: 'response.output_item.added', output_index: 0, item: { ...item, content: [] } },
      { type: 'response.output_text.done', ...at, text },
      { type: 'response.output_item.done', output_index: 0, item },
      completed([item]),
    ];
    const { terminal } = await run(context(), events);
    const output = response(terminal)['output'] as Json[];
    expect((output[0]?.['content'] as Json[])[0]?.['text']).toBe(text);
  });

  it('checks text pre-filled in output_item.added and text-typed parts', async () => {
    const prefilled = [
      created,
      {
        type: 'response.output_item.added',
        output_index: 0,
        item: { ...messageItem(LEAK_TEXT), id: 'msg_1' },
      },
      completed([]),
    ];
    const typed = upstream([messageItem('fine')]).map((e) =>
      e['type'] === 'response.content_part.done'
        ? { ...e, part: { type: 'text', text: LEAK_TEXT } }
        : e
    );
    for (const events of [prefilled]) {
      const { out, terminal } = await run(context(), events);
      expect(JSON.stringify(out)).not.toContain('attacker.example');
      expect(response(terminal)['status']).toBe('incomplete');
    }
    const textPart = await run(context(), typed);
    expect(JSON.stringify(textPart.out)).not.toContain('attacker.example');
  });

  it('drops provider events outside the standard set and counts them', async () => {
    const input = upstream([messageItem('ok')]);
    const withExtras = [
      ...input.slice(0, 2),
      { type: 'acme:note', text: LEAK_TEXT },
      {
        type: 'response.custom_tool_call_input.delta',
        item_id: 'x',
        output_index: 0,
        delta: LEAK_TEXT,
      },
      ...input.slice(2),
    ];
    const { out, terminal } = await run(context(), withExtras);
    expect(JSON.stringify(out)).not.toContain('attacker.example');
    expectContiguous(out);
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
      not_inspected: { dropped_events: 2 },
    });
  });

  it('S5: blocks a call whose name changes after output_item.added', async () => {
    const input = upstream([functionCallItem('run_shell', { command: 'ls' })]).map((e) =>
      e['type'] === 'response.output_item.done'
        ? { ...e, item: { ...(e['item'] as Json), name: 'delete_everything' } }
        : e
    );
    const { terminal } = await run(context(), input);
    expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
      decisions: [{ rules: [GATEWAY_RULES.itemMismatch] }],
    });
  });

  it('S5: blocks a call with two arguments.done events or deltas that do not add up', async () => {
    const base = upstream([functionCallItem('run_shell', { command: 'ls' })]);
    const doneIndex = base.findIndex((e) => e['type'] === 'response.function_call_arguments.done');
    const twoDones = [
      ...base.slice(0, doneIndex),
      { ...base[doneIndex]!, arguments: JSON.stringify({ command: EXFIL_COMMAND }) },
      ...base.slice(doneIndex),
    ];
    const badDeltas = base.map((e) =>
      e['type'] === 'response.function_call_arguments.delta' ? { ...e, delta: 'x' } : e
    );
    for (const events of [twoDones, badDeltas]) {
      const { out, terminal } = await run(context({}, new FakeEvaluator([])), events);
      expect(JSON.stringify(out)).not.toContain('id_rsa');
      expect(response(terminal)[VERDICT_FIELD]).toMatchObject({
        decisions: [{ rules: [GATEWAY_RULES.argumentsMismatch] }],
      });
    }
  });
});
