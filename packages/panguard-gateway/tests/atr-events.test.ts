import { describe, expect, it } from 'vitest';
import {
  canonicalArgs,
  functionCallEvent,
  functionCallOutputEvent,
  outputTextEvent,
  toolDefinitionEvent,
  userMessageEvent,
} from '../src/atr-events.js';

const TS = '2026-10-26T00:00:00.000Z';

describe('canonicalArgs', () => {
  it('re-serializes model JSON the way ATR hook-handler does (JSON.stringify)', () => {
    const args = canonicalArgs('{ "path" : "caf\\u00e9\\/x" , "n": 1 }');
    expect(args.valid).toBe(true);
    expect(args.canonical).toBe('{"path":"café/x","n":1}');
    expect(args.object).toEqual({ path: 'café/x', n: 1 });
  });

  it('keeps the raw string and reports invalid JSON', () => {
    const args = canonicalArgs('{not json');
    expect(args).toEqual({ canonical: '{not json', object: undefined, valid: false });
  });

  it('falls back to the raw string when the JSON is nested too deep to re-serialize', () => {
    const deep = '['.repeat(20_000) + ']'.repeat(20_000);
    expect(canonicalArgs(deep)).toEqual({ canonical: deep, object: undefined, valid: false });
  });

  it('serializes non-object JSON but exposes no object', () => {
    expect(canonicalArgs('[1, 2]')).toEqual({ canonical: '[1,2]', object: undefined, valid: true });
  });
});

describe('functionCallEvent (PreToolUse shape)', () => {
  it('uses the content argument as content when it is a string', () => {
    const event = functionCallEvent(
      'write_file',
      canonicalArgs('{"path":"/tmp/a","content":"echo hi"}'),
      TS
    );
    expect(event).toEqual({
      type: 'tool_call',
      timestamp: TS,
      content: 'echo hi',
      fields: {
        tool_name: 'write_file',
        tool_args: '{"path":"/tmp/a","content":"echo hi"}',
        content: 'echo hi',
      },
    });
  });

  it('falls back to the canonical JSON arguments, never key: value lines', () => {
    const event = functionCallEvent('run_shell', canonicalArgs('{"command": "ls -la"}'), TS);
    expect(event.content).toBe('{"command":"ls -la"}');
    expect(event.fields).toEqual({
      tool_name: 'run_shell',
      tool_args: '{"command":"ls -la"}',
      content: '{"command":"ls -la"}',
    });
    expect(event.fields).not.toHaveProperty('tool_input');
  });
});

describe('functionCallOutputEvent (PostToolUse shape)', () => {
  it('carries the output as content and tool_response with the resolved call', () => {
    const event = functionCallOutputEvent(
      { name: 'get_weather', args: canonicalArgs('{"location":"SF"}') },
      'sunny',
      TS
    );
    expect(event).toEqual({
      type: 'tool_response',
      timestamp: TS,
      content: 'sunny',
      fields: {
        tool_name: 'get_weather',
        tool_args: '{"location":"SF"}',
        content: 'sunny',
        tool_response: 'sunny',
      },
    });
  });

  it("uses tool_name '' and tool_args '{}' when the call cannot be resolved", () => {
    const event = functionCallOutputEvent(undefined, 'data', TS);
    expect(event.fields).toEqual({
      tool_name: '',
      tool_args: '{}',
      content: 'data',
      tool_response: 'data',
    });
  });

  it('falls back to the input text and omits tool_response for an empty output', () => {
    const event = functionCallOutputEvent(
      { name: 'run_shell', args: canonicalArgs('{"command":"true"}') },
      '',
      TS
    );
    expect(event.content).toBe('{"command":"true"}');
    expect(event.fields).not.toHaveProperty('tool_response');
  });
});

describe('message and text events', () => {
  it('builds the llm-input shape of ATR corpus-event', () => {
    expect(userMessageEvent('hi', TS)).toEqual({
      type: 'llm_input',
      timestamp: TS,
      content: 'hi',
      fields: { user_input: 'hi' },
    });
  });

  it('puts model text in agent_output', () => {
    expect(outputTextEvent('done', TS).fields).toEqual({ agent_output: 'done' });
  });
});

describe('toolDefinitionEvent (MCP tools/list shape)', () => {
  it('renames parameters to inputSchema and fills tool_name / tool_description', () => {
    const event = toolDefinitionEvent(
      {
        type: 'function',
        name: 'get_weather',
        description: 'Get weather',
        parameters: { type: 'object' },
        strict: true,
      },
      TS
    );
    expect(event.type).toBe('mcp_exchange');
    expect(JSON.parse(event.content)).toEqual({
      name: 'get_weather',
      description: 'Get weather',
      inputSchema: { type: 'object' },
    });
    expect(event.fields).toEqual({ tool_name: 'get_weather', tool_description: 'Get weather' });
  });

  it('omits empty fields', () => {
    const event = toolDefinitionEvent({ type: 'function', name: 'x' }, TS);
    expect(event.fields).toEqual({ tool_name: 'x' });
    expect(JSON.parse(event.content)).toEqual({ name: 'x', inputSchema: {} });
  });
});
