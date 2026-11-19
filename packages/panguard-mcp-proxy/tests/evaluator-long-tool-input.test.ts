/**
 * Long tool input — evaluateToolCall scans tool-call content the way
 * evaluateToolResponse scans a long response: content the engine can take
 * whole stays one event, longer content is scanned in overlapping windows.
 * This covers the PreToolUse hook (a large Write or Edit) and MCP tool
 * arguments alike. In that range only a stable-maturity rule hard-denies (a
 * match by any other rule is an advisory), the verdict is marked `segmented`
 * so it never escalates a session, and only the first 256KB are scanned.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ProxyEvaluator,
  EvaluationDeadlineError,
  responseWindows,
  ENGINE_MAX_EVAL_LENGTH,
  MAX_TOOL_INPUT_SCAN_CHARS,
  RESPONSE_WINDOW_CHARS,
  RESPONSE_WINDOW_OVERLAP_CHARS,
} from '../src/evaluator.js';

const FILLER_LINE = 'export const total = rows.reduce((sum, row) => sum + row.amount, 0);\n';

function filler(chars: number): string {
  return FILLER_LINE.repeat(Math.ceil(chars / FILLER_LINE.length)).slice(0, chars);
}

const STEP = RESPONSE_WINDOW_CHARS - RESPONSE_WINDOW_OVERLAP_CHARS;
/** evaluateToolCall scans `${toolName} ${key}: ${value}` for a one-argument call. */
const PREFIX = 'command input: ';

type EngineEvent = { type: string; content: string; fields: Record<string, string> };
type StubMatch = {
  rule: {
    id: string;
    title: string;
    severity: string;
    maturity: string;
    tags?: { scan_target?: string; subcategory?: string };
  };
  confidence: number;
};

/**
 * Replace the engine's evaluate() so a test controls exactly which events
 * match. Like the real engine, the stub matches nothing in a field longer than
 * ENGINE_MAX_EVAL_LENGTH.
 */
async function stubbedEvaluator(
  match: (event: EngineEvent) => StubMatch[],
  options: ConstructorParameters<typeof ProxyEvaluator>[0] = {}
) {
  const ev = new ProxyEvaluator(options);
  await ev.loadRules();
  const engine = (ev as unknown as { engine: { evaluate: (e: unknown) => unknown[] } }).engine;
  const spy = vi
    .spyOn(engine, 'evaluate')
    .mockImplementation((e) =>
      (e as EngineEvent).content.length > ENGINE_MAX_EVAL_LENGTH ? [] : match(e as EngineEvent)
    );
  return { ev, spy };
}

function stubRule(
  id: string,
  severity: string,
  maturity: string,
  tags?: StubMatch['rule']['tags']
): StubMatch {
  return { rule: { id, title: `rule ${id}`, severity, maturity, tags }, confidence: 0.9 };
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * An ATR true-positive fixture (the mcp-remote OAuth URL command injection,
 * ATR-2026-01306, a stable rule): blocked as short input and in any window.
 */
const ATTACK = 'http://user$(mate-calc)r:pass@127.0.0.1:9003/authorize?response_type=code';
/** Generous timeout: these tests scan several windows with the full bundled rule set. */
const LONG_SCAN_TIMEOUT_MS = 60_000;

describe('long tool input: real bundled rules', () => {
  const evaluator = new ProxyEvaluator();
  const hookScan = (input: string) =>
    evaluator.evaluateToolCall('command', { input }, 'tool_call', true);

  it(
    'denies the line on its own, as before',
    async () => {
      await evaluator.loadRules();
      expect((await hookScan(ATTACK)).outcome).toBe('deny');
    },
    LONG_SCAN_TIMEOUT_MS
  );

  it(
    'DENIES it after more than 100,000 chars of other content',
    async () => {
      await evaluator.loadRules();
      const r = await hookScan(filler(120_000) + '\n' + ATTACK + '\n');
      expect(r.outcome).toBe('deny');
      expect(r.matchedRules.length).toBeGreaterThan(0);
    },
    LONG_SCAN_TIMEOUT_MS
  );

  it(
    'DENIES it buried in the middle of long content',
    async () => {
      await evaluator.loadRules();
      const r = await hookScan(filler(130_000) + '\n' + ATTACK + '\n' + filler(110_000));
      expect(r.outcome).toBe('deny');
    },
    LONG_SCAN_TIMEOUT_MS
  );

  it(
    'DENIES it in a long MCP tool argument too',
    async () => {
      await evaluator.loadRules();
      const r = await evaluator.evaluateToolCall(
        'run_script',
        { script: filler(150_000) + '\n' + ATTACK + '\n' },
        'tool_call'
      );
      expect(r.outcome).toBe('deny');
    },
    LONG_SCAN_TIMEOUT_MS
  );

  it(
    'adds no match at the window seams of long benign content',
    async () => {
      await evaluator.loadRules();
      const short = await hookScan(filler(20_000));
      const long = await hookScan(filler(200_000));
      expect(long.matchedRules).toEqual(short.matchedRules);
      expect(long.outcome).toBe(short.outcome);
    },
    LONG_SCAN_TIMEOUT_MS
  );
});

describe('long tool input: windowing (stubbed engine)', () => {
  const NEEDLE = 'NEEDLE-' + 'x'.repeat(200) + '-END';
  const hit = (e: EngineEvent) =>
    e.content.includes(NEEDLE) ? [stubRule('ATR-TEST-NEEDLE', 'critical', 'stable')] : [];

  it('keeps tool input up to the engine limit as exactly one event', async () => {
    const { ev, spy } = await stubbedEvaluator(() => []);
    const input = filler(ENGINE_MAX_EVAL_LENGTH - PREFIX.length);
    await ev.evaluateToolCall('command', { input }, 'tool_call', true);
    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0]![0] as EngineEvent;
    expect(event.content).toBe(PREFIX + input);
    expect(event.fields['tool_input']).toBe(PREFIX + input);
  });

  it('splits longer tool input into windows of the same event type, under the engine limit', async () => {
    const { ev, spy } = await stubbedEvaluator(() => []);
    const input = filler(ENGINE_MAX_EVAL_LENGTH);
    await ev.evaluateToolCall('command', { input }, 'tool_call', true);
    const events = spy.mock.calls.map((call) => call[0] as EngineEvent);
    expect(events.length).toBeGreaterThan(1);
    for (const event of events) {
      expect(event.type).toBe('tool_call');
      expect(event.content.length).toBeLessThanOrEqual(RESPONSE_WINDOW_CHARS);
      expect(event.fields['tool_input']).toBe(event.content);
      expect(event.fields['tool_name']).toBe('command');
    }
    expect(events.map((e) => e.content)).toEqual(responseWindows(PREFIX + input));
  });

  it('keeps the event type the caller passes in every window', async () => {
    for (const type of ['tool_call', 'mcp_exchange'] as const) {
      const { ev, spy } = await stubbedEvaluator(() => []);
      await ev.evaluateToolCall('write_file', { content: filler(150_000) }, type);
      const types = new Set(spy.mock.calls.map((call) => (call[0] as EngineEvent).type));
      expect([...types]).toEqual([type]);
      expect(spy.mock.calls.length).toBeGreaterThan(1);
      vi.restoreAllMocks();
    }
  });

  it('finds a signal in the last argument of a long multi-argument MCP call', async () => {
    const { ev } = await stubbedEvaluator(hit);
    const r = await ev.evaluateToolCall(
      'write_file',
      { path: '/srv/app/data.json', content: filler(150_000), mode: NEEDLE },
      'tool_call'
    );
    expect(r.outcome).toBe('deny');
  });

  it('finds a single-signal needle that straddles every window seam', async () => {
    const { ev } = await stubbedEvaluator(hit);
    const input = filler(200_000);
    const flat = PREFIX + input;
    const seams = responseWindows(flat)
      .slice(0, -1)
      .map((_, i) => i * STEP + RESPONSE_WINDOW_CHARS);
    expect(seams.length).toBeGreaterThan(1);
    for (const seam of seams) {
      const start = seam - PREFIX.length - Math.floor(NEEDLE.length / 2);
      const poisoned = input.slice(0, start) + NEEDLE + input.slice(start + NEEDLE.length);
      const r = await ev.evaluateToolCall('command', { input: poisoned }, 'tool_call', true);
      expect(r.outcome, `needle across the seam at ${seam}`).toBe('deny');
    }
  });

  it('counts a rule once when it matches in two overlapping windows', async () => {
    const { ev } = await stubbedEvaluator(hit);
    const input = filler(STEP + 500) + NEEDLE + filler(150_000);
    const r = await ev.evaluateToolCall('command', { input }, 'tool_call', true);
    expect(r.matchedRules).toEqual(['ATR-TEST-NEEDLE']);
  });

  it("still applies the built-in surface's shell-grammar gate in a window", async () => {
    const { ev } = await stubbedEvaluator((e) =>
      e.content.includes('NEEDLE')
        ? [
            stubRule('ATR-TEST-SHELL', 'critical', 'stable', {
              scan_target: 'mcp',
              subcategory: 'shell-escape',
            }),
          ]
        : []
    );
    const input = filler(150_000) + 'NEEDLE';
    expect((await ev.evaluateToolCall('command', { input }, 'tool_call', true)).outcome).toBe(
      'ask'
    );
    expect((await ev.evaluateToolCall('command', { input }, 'tool_call', false)).outcome).toBe(
      'deny'
    );
  });
});

describe('long tool input: deny policy (stubbed engine)', () => {
  const TRIGGER = 'TRIGGER';
  const critical = (maturity: string) => (e: EngineEvent) =>
    e.content.includes(TRIGGER) ? [stubRule('ATR-TEST-T', 'critical', maturity)] : [];
  const hook = (ev: ProxyEvaluator, input: string, builtin = true) =>
    ev.evaluateToolCall('command', { input }, 'tool_call', builtin);

  it('denies on a critical test-maturity match in short input', async () => {
    const { ev } = await stubbedEvaluator(critical('test'));
    const r = await hook(ev, filler(5_000) + TRIGGER);
    expect(r.outcome).toBe('deny');
    expect(r.segmented).toBeUndefined();
  });

  it('only advises on a critical test-maturity match past the limit, on both surfaces', async () => {
    const { ev } = await stubbedEvaluator(critical('test'));
    for (const builtin of [true, false]) {
      const r = await hook(ev, filler(150_000) + TRIGGER, builtin);
      expect(r.outcome).toBe('ask');
      expect(r.matchedRules).toEqual(['ATR-TEST-T']);
      expect(r.reason).toContain('only stable rules block');
      expect(r.segmented).toBe(true);
    }
  });

  it('still denies on a stable match past the limit, on both surfaces', async () => {
    const { ev } = await stubbedEvaluator(critical('stable'));
    for (const builtin of [true, false]) {
      const r = await hook(ev, filler(150_000) + TRIGGER, builtin);
      expect(r.outcome).toBe('deny');
      expect(r.segmented).toBe(true);
    }
  });
});

describe('long tool input: scan cap', () => {
  const TRIGGER = 'TRIGGER';
  const critical = (e: EngineEvent) =>
    e.content.includes(TRIGGER) ? [stubRule('ATR-TEST-T', 'critical', 'stable')] : [];

  it('scans a prefix of input past the cap and says so', async () => {
    const { ev } = await stubbedEvaluator(critical);
    const flatPrefix = 'write_file content: '.length;
    const before = filler(MAX_TOOL_INPUT_SCAN_CHARS - flatPrefix - 100) + TRIGGER + '\n';
    const r = await ev.evaluateToolCall(
      'write_file',
      { content: before + filler(50_000) },
      'tool_call'
    );
    expect(r.outcome).toBe('deny');
    expect(r.inputCapped).toBe(true);
    expect(r.reason).toContain('scan cap');
  });

  it('does not scan content past the cap', async () => {
    const { ev } = await stubbedEvaluator(critical);
    const r = await ev.evaluateToolCall(
      'write_file',
      { content: filler(MAX_TOOL_INPUT_SCAN_CHARS + 10_000) + TRIGGER },
      'tool_call'
    );
    expect(r.outcome).toBe('allow');
    expect(r.inputCapped).toBe(true);
  });

  it('does not cap when the caller lifts the cap (the hook)', async () => {
    const { ev } = await stubbedEvaluator(critical);
    const r = await ev.evaluateToolCall(
      'command',
      { input: filler(MAX_TOOL_INPUT_SCAN_CHARS + 10_000) + TRIGGER },
      'tool_call',
      true,
      Number.POSITIVE_INFINITY
    );
    expect(r.outcome).toBe('deny');
    expect(r.inputCapped).toBeUndefined();
  });

  it('marks input under the cap as not capped', async () => {
    const { ev } = await stubbedEvaluator(() => []);
    const r = await ev.evaluateToolCall('write_file', { content: filler(150_000) }, 'tool_call');
    expect(r.inputCapped).toBeUndefined();
    expect(r.segmented).toBe(true);
  });
});

describe('long tool input on the calling thread (inline)', () => {
  /** A stub engine that takes about `ms` per event. */
  const slow = (ms: number) => () => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      // busy-wait, like an evaluation that takes a while
    }
    return [];
  };

  it('stops between windows once past the deadline', async () => {
    const { ev, spy } = await stubbedEvaluator(slow(100), { deadlineMs: 250 });
    const input = filler(300_000);
    await expect(
      ev.evaluateToolCall('command', { input }, 'tool_call', true)
    ).rejects.toBeInstanceOf(EvaluationDeadlineError);
    expect(spy.mock.calls.length).toBeLessThan(responseWindows(PREFIX + input).length);
  });

  it('still runs input the engine takes whole in one piece, as before', async () => {
    const { ev, spy } = await stubbedEvaluator(slow(400), { deadlineMs: 100 });
    const r = await ev.evaluateToolCall('command', { input: filler(5_000) }, 'tool_call', true);
    expect(r.outcome).toBe('allow');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
