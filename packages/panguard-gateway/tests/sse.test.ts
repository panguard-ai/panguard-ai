import { describe, expect, it } from 'vitest';
import { formatSse, readSse, type SseMessage } from '../src/sse.js';

async function parse(chunks: readonly string[]): Promise<SseMessage[]> {
  const encoder = new TextEncoder();
  async function* source(): AsyncGenerator<Uint8Array> {
    for (const chunk of chunks) yield encoder.encode(chunk);
  }
  const out: SseMessage[] = [];
  for await (const message of readSse(source())) out.push(message);
  return out;
}

describe('readSse', () => {
  it('joins multi-line data and reads the event name', async () => {
    expect(await parse(['event: a\ndata: one\ndata: two\n\n'])).toEqual([
      { event: 'a', data: 'one\ntwo' },
    ]);
  });

  it('treats a CRLF split across chunks as one line end', async () => {
    const messages = await parse(['data: one\r', '\ndata: two\r\n\r\n']);
    expect(messages).toEqual([{ event: undefined, data: 'one\ntwo' }]);
  });

  it('ignores comments and drops an event the stream ended in the middle of', async () => {
    expect(await parse([': keep-alive\n', 'data: done\n\n', 'data: unfinished\n'])).toEqual([
      { event: undefined, data: 'done' },
    ]);
  });
});

describe('formatSse', () => {
  it('cannot be made to forge an SSE field through the event type', () => {
    const text = formatSse({ type: 'x\ndata: {"forged":true}', value: 1 });
    expect(text.split('\n').filter((line) => line.startsWith('data:'))).toHaveLength(1);
  });
});
