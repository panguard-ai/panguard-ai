/**
 * Server-sent events, both directions: reading the provider's stream and
 * writing the client's.
 *
 * @module @panguard-ai/panguard-gateway/sse
 */

export interface SseMessage {
  readonly event: string | undefined;
  readonly data: string;
}

/**
 * Parse an SSE byte stream (WHATWG rules: CR, LF or CRLF line ends, `data`
 * lines joined with LF, comment lines ignored, a blank line dispatches, an
 * unfinished event at the end is dropped).
 */
export async function* readSse(body: AsyncIterable<Uint8Array>): AsyncGenerator<SseMessage> {
  const decoder = new TextDecoder();
  let buffer = '';
  let event: string | undefined;
  let data: string[] = [];
  let skipLf = false;

  const lines = function* (): Generator<string> {
    for (;;) {
      // A CR ends a line; an LF right after it belongs to the same line end,
      // even when it arrives in the next chunk.
      if (skipLf && buffer.length > 0) {
        if (buffer.startsWith('\n')) buffer = buffer.slice(1);
        skipLf = false;
      }
      const end = buffer.search(/[\r\n]/);
      if (end === -1) return;
      const line = buffer.slice(0, end);
      skipLf = buffer[end] === '\r';
      buffer = buffer.slice(end + 1);
      yield line;
    }
  };

  const take = (line: string): SseMessage | undefined => {
    if (line === '') {
      if (data.length === 0) {
        event = undefined;
        return undefined;
      }
      const message = { event, data: data.join('\n') };
      event = undefined;
      data = [];
      return message;
    }
    if (line.startsWith(':')) return undefined;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data = [...data, value];
    return undefined;
  };

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    for (const line of lines()) {
      const message = take(line);
      if (message) yield message;
    }
  }
  buffer += decoder.decode();
  for (const line of lines()) {
    const message = take(line);
    if (message) yield message;
  }
  // An event the stream ended in the middle of is not dispatched (WHATWG).
}

/** One event in the form the spec's examples use: `event:` then `data:`. */
export function formatSse(event: Readonly<Record<string, unknown>>): string {
  // The type comes from upstream; a line break in it would forge an SSE field.
  const type = typeof event['type'] === 'string' ? event['type'].replace(/[\r\n]/g, '') : 'message';
  return `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export const SSE_DONE = 'data: [DONE]\n\n';
