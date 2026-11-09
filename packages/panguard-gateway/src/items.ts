/**
 * Reading Open Responses items (spec 2026-04-24): the text the gateway can
 * inspect, and what it cannot (images, files, video, encrypted content).
 *
 * @module @panguard-ai/panguard-gateway/items
 */

import { isObject, str, type JsonObject } from './json.js';

/** Content part types whose text the gateway reads. */
const TEXT_PARTS: ReadonlySet<string> = new Set(['input_text', 'output_text', 'text']);

export interface ItemText {
  /** Concatenated text parts. */
  readonly text: string;
  /** Parts the gateway cannot inspect (images, files, video, unknown types). */
  readonly opaqueParts: number;
}

/**
 * Text of a message `content` or a function_call_output `output`: either a
 * string or an array of content parts.
 */
export function textOf(content: unknown): ItemText {
  if (typeof content === 'string') return { text: content, opaqueParts: 0 };
  if (!Array.isArray(content)) return { text: '', opaqueParts: 0 };
  const texts: string[] = [];
  let opaqueParts = 0;
  for (const part of content) {
    const type = isObject(part) ? str(part, 'type') : undefined;
    const text = isObject(part) ? str(part, 'text') : undefined;
    if (type !== undefined && TEXT_PARTS.has(type) && text !== undefined) texts.push(text);
    else opaqueParts += 1;
  }
  return { text: texts.join('\n'), opaqueParts };
}

/** The request's `input` as a list of items; a bare string is one user message. */
export function inputItems(input: unknown): readonly unknown[] {
  if (typeof input === 'string') return [{ type: 'message', role: 'user', content: input }];
  return Array.isArray(input) ? input : [];
}

/** A message item; the spec allows the `type` to be omitted on input messages. */
export function isMessage(item: JsonObject): boolean {
  const type = str(item, 'type');
  return (type === 'message' || type === undefined) && typeof item['role'] === 'string';
}

export function isFunctionCall(item: JsonObject): boolean {
  return str(item, 'type') === 'function_call';
}

export function isFunctionCallOutput(item: JsonObject): boolean {
  return str(item, 'type') === 'function_call_output';
}

/**
 * Results of tools other than functions (provider tools such as a local shell
 * or computer use, prefixed or not). They reach the model like a function
 * output does, so they are scanned the same way.
 */
export function isOtherToolOutput(item: JsonObject): boolean {
  const type = str(item, 'type') ?? '';
  return type !== 'function_call_output' && type.endsWith('_output');
}

/** Input item types the gateway reads or knowingly cannot read. */
const KNOWN_INPUT_TYPES: ReadonlySet<string> = new Set([
  'message',
  'function_call',
  'function_call_output',
  'reasoning',
  'compaction',
  'item_reference',
]);

/** An input item of a type the gateway neither scans nor recognizes. */
export function isUnknownInputItem(item: JsonObject): boolean {
  const type = str(item, 'type');
  if (type === undefined) return !isMessage(item);
  return !KNOWN_INPUT_TYPES.has(type) && !isOtherToolOutput(item);
}

/**
 * Provider-hosted tool receipts: provider-prefixed item types (`slug:*`) and
 * `*_call` items other than function_call. The provider ran these tools; the
 * gateway sees only what it reports afterwards.
 */
export function isHostedToolReceipt(item: JsonObject): boolean {
  const type = str(item, 'type') ?? '';
  if (type === 'function_call') return false;
  return type.includes(':') || type.endsWith('_call');
}

/** Item types whose content is encrypted or otherwise not inspectable. */
export function isOpaqueItem(item: JsonObject): boolean {
  const type = str(item, 'type');
  return (
    type === 'compaction' ||
    type === 'item_reference' ||
    (type === 'reasoning' && item['encrypted_content'] !== undefined)
  );
}
