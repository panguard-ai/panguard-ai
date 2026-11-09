/**
 * Talking to the provider: which client headers travel upstream, and the
 * HTTP and WebSocket addresses of its Responses endpoint.
 *
 * @module @panguard-ai/panguard-gateway/upstream
 */

import type { IncomingHttpHeaders } from 'node:http';

/**
 * Client headers passed to the provider. Anything else (cookies, proxy and
 * hop-by-hop headers) stays at the gateway unless configured.
 */
export const FORWARDED_HEADERS: readonly string[] = [
  'authorization',
  'openai-organization',
  'openai-project',
  'openai-beta',
  'idempotency-key',
  'user-agent',
  'accept-language',
];

export function forwardHeaders(
  incoming: IncomingHttpHeaders,
  extra: readonly string[]
): Record<string, string> {
  const names = new Set([...FORWARDED_HEADERS, ...extra.map((h) => h.toLowerCase())]);
  const pairs = [...names].flatMap((name): [string, string][] => {
    const value = incoming[name];
    if (typeof value === 'string') return [[name, value]];
    if (Array.isArray(value)) return [[name, value.join(', ')]];
    return [];
  });
  return Object.fromEntries(pairs);
}

export function upstreamHttpUrl(base: string, path: string): string {
  return `${base}${path}`;
}

export function upstreamWsUrl(base: string): string {
  const url = new URL(`${base}/responses`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export async function postUpstream(
  base: string,
  path: string,
  body: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<Response> {
  return fetch(upstreamHttpUrl(base, path), {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body,
    signal,
  });
}
