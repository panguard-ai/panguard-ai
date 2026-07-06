import { NextResponse } from 'next/server';
import { appendToSheet } from '@/lib/sheets';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { validateContact } from '@/lib/validate';

/**
 * CSRF defense: reject cross-site POSTs. A same-origin form submit always
 * carries an Origin (or at least Referer) header whose host matches the
 * request host. A forged cross-site request will carry a different host.
 * Returns true when the request is same-origin (or has no host to compare,
 * which only happens for same-origin server-to-server calls that omit both
 * headers entirely — those are not browser-driven CSRF vectors).
 */
function isSameOrigin(req: Request): boolean {
  const host = req.headers.get('host');
  if (!host) return false;
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const source = origin || referer;
  // No Origin and no Referer: not a browser cross-site form post. Allow.
  if (!source) return true;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = validateContact(body);
    if (!data) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    await appendToSheet('contact', [
      new Date().toISOString(),
      data.name,
      data.email,
      data.company,
      data.type,
      data.message,
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
