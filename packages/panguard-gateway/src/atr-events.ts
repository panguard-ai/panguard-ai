/**
 * Open Responses items -> ATR events.
 *
 * Each builder reproduces the event ATR itself builds for the same data, so a
 * rule sees what ATR's benign-corpus gate measured it on:
 *   - function_call         -> PreToolUse event of src/hook-handler.ts
 *   - function_call_output  -> PostToolUse event of src/hook-handler.ts
 *   - role=user message     -> llm-input shape of src/corpus-event.ts
 *   - output_text           -> llm_output with agent_output
 *   - tools[] definition    -> src/cli/mcp-tools-document.ts, MCP shape
 * ATR exports none of these builders, so they are restated here.
 *
 * @module @panguard-ai/panguard-gateway/atr-events
 */

import type { AgentEvent } from 'agent-threat-rules';
import { isObject, parseJson, stringifyJson, type JsonObject } from './json.js';

export interface CanonicalArgs {
  /** JSON.stringify of the parsed arguments; the raw string when they are not JSON. */
  readonly canonical: string;
  /** The parsed arguments when they form a JSON object. */
  readonly object: JsonObject | undefined;
  /** False when the model's arguments string is not valid JSON. */
  readonly valid: boolean;
}

/**
 * A model writes its own JSON: spacing and escapes (`é`, `\/`) differ from
 * what JSON.stringify produces, and ATR's hook hands rules JSON.stringify output.
 * Parsing and re-serializing makes the two agree (key order is kept).
 */
export function canonicalArgs(argumentsJson: string): CanonicalArgs {
  const parsed = parseJson(argumentsJson);
  // Not JSON, or nested too deep to re-serialize: rules read the raw string.
  const canonical = parsed === undefined ? undefined : stringifyJson(parsed);
  if (canonical === undefined) return { canonical: argumentsJson, object: undefined, valid: false };
  return { canonical, object: isObject(parsed) ? parsed : undefined, valid: true };
}

/** The hook's input text: the `content` argument when it is a string, else the JSON args. */
function inputText(args: CanonicalArgs): string {
  const content = args.object?.['content'];
  return typeof content === 'string' ? content : args.canonical;
}

/** function_call (checkpoint S4) -> PreToolUse `tool_call` event. */
export function functionCallEvent(
  name: string,
  args: CanonicalArgs,
  timestamp: string
): AgentEvent {
  const content = inputText(args);
  return {
    type: 'tool_call',
    timestamp,
    content,
    fields: { tool_name: name, tool_args: args.canonical, content },
  };
}

/** The call a tool output answers, as far as the gateway could resolve it. */
export interface ResolvedCall {
  readonly name: string;
  readonly args: CanonicalArgs | undefined;
}

/**
 * function_call_output (checkpoint R3) -> PostToolUse `tool_response` event.
 * An unresolved call gets tool_name '' and tool_args '{}', which is what the
 * hook produces for a host that sends no tool input.
 */
export function functionCallOutputEvent(
  call: ResolvedCall | undefined,
  output: string,
  timestamp: string
): AgentEvent {
  const toolArgs = call?.args?.canonical ?? '{}';
  const content = output !== '' ? output : call?.args ? inputText(call.args) : toolArgs;
  return {
    type: 'tool_response',
    timestamp,
    content,
    fields: {
      tool_name: call?.name ?? '',
      tool_args: toolArgs,
      content,
      ...(output !== '' ? { tool_response: output } : {}),
    },
  };
}

/** role=user message text (checkpoint R4) -> `llm_input`. */
export function userMessageEvent(text: string, timestamp: string): AgentEvent {
  return { type: 'llm_input', timestamp, content: text, fields: { user_input: text } };
}

/** Model text (checkpoints S6/S7) -> `llm_output`. */
export function outputTextEvent(text: string, timestamp: string): AgentEvent {
  return { type: 'llm_output', timestamp, content: text, fields: { agent_output: text } };
}

/**
 * A function tool from the request's tools[] (checkpoint R1), restated as the
 * MCP tool definition ATR's `tools/list` scan reads: `parameters` becomes
 * `inputSchema`, the anchor of the full-schema poisoning rules. Evaluate it on
 * an engine built with `toolDefinitions: true`.
 */
export function toolDefinitionEvent(tool: JsonObject, timestamp: string): AgentEvent {
  const name = tool['name'];
  const description = tool['description'];
  const definition = {
    name,
    ...(description !== undefined ? { description } : {}),
    inputSchema: tool['parameters'] ?? {},
  };
  const fields: Record<string, string> = {
    ...(typeof name === 'string' && name !== '' ? { tool_name: name } : {}),
    ...(typeof description === 'string' && description !== ''
      ? { tool_description: description }
      : {}),
  };
  return {
    type: 'mcp_exchange',
    timestamp,
    // A definition too deep to serialize keeps only its name and description fields.
    content: stringifyJson(definition) ?? '',
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
  };
}

/**
 * A provider-hosted tool's receipt item (checkpoint S9). The tool already ran,
 * so this is only scanned and recorded, never blocked.
 */
export function hostedReceiptEvent(item: JsonObject, timestamp: string): AgentEvent {
  const text = stringifyJson(item) ?? '';
  const type = typeof item['type'] === 'string' ? item['type'] : '';
  return {
    type: 'tool_response',
    timestamp,
    content: text,
    fields: { tool_name: type, content: text, tool_response: text },
  };
}
