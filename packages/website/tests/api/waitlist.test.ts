import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/sheets', () => ({
  appendToSheet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

// Mock global fetch so backend API calls don't hit real network
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { POST } from '../../src/app/api/waitlist/route';
import { appendToSheet } from '@/lib/sheets';
import { checkRateLimit } from '@/lib/rate-limit';

// Real requests always carry Host; the route's CSRF check compares Origin/Referer against it.
function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Host: 'example.com', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue(true);
    // Default: backend API reachable and returns success
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { id: 1 } }),
    });
  });

  it('returns 200 for valid email', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('falls back to sheet storage when backend is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(200);
    expect(appendToSheet).toHaveBeenCalledWith(
      'waitlist',
      expect.arrayContaining(['test@example.com'])
    );
  });

  it('returns 403 for a cross-site Origin', async () => {
    const res = await POST(
      makeRequest({ email: 'test@example.com' }, { Origin: 'https://evil.example' })
    );
    expect(res.status).toBe(403);
    expect(appendToSheet).not.toHaveBeenCalled();
  });

  it('accepts a same-origin Origin', async () => {
    const res = await POST(
      makeRequest({ email: 'test@example.com' }, { Origin: 'https://example.com' })
    );
    expect(res.status).toBe(200);
  });

  it.each([
    ['an unparsable Origin', { Origin: 'null' }],
    ['a look-alike host that extends the real one', { Origin: 'https://example.com.evil.example' }],
    ['the same hostname on another port', { Origin: 'https://example.com:8443' }],
    ['a cross-site Referer without an Origin', { Referer: 'https://evil.example/form' }],
    ['a missing Host header', { Host: '' }],
  ])('returns 403 for %s', async (_label, headers) => {
    const res = await POST(makeRequest({ email: 'test@example.com' }, headers));
    expect(res.status).toBe(403);
    expect(appendToSheet).not.toHaveBeenCalled();
  });

  it('accepts a same-origin Referer without an Origin', async () => {
    const res = await POST(
      makeRequest({ email: 'test@example.com' }, { Referer: 'https://example.com/waitlist' })
    );
    expect(res.status).toBe(200);
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(makeRequest({ email: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false);
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(429);
  });

  it('returns 500 on server error', async () => {
    // Backend unreachable AND sheet fallback fails → 500
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));
    vi.mocked(appendToSheet).mockRejectedValueOnce(new Error('fail'));
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(500);
  });
});
