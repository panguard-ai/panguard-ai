import { NextResponse } from 'next/server';
import { appendToSheet } from '@/lib/sheets';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { validateWaitlist } from '@/lib/validate';

const WAITLIST_API = process.env.WAITLIST_API_URL || '';

const ALLOWED_API_ORIGINS = new Set([
  'https://panguard-api-production.up.railway.app',
  // add other production origins here
]);

// Validate WAITLIST_API_URL origin against allowlist at module load so
// misconfiguration is caught immediately rather than per-request.
if (WAITLIST_API) {
  try {
    const url = new URL(WAITLIST_API);
    if (!ALLOWED_API_ORIGINS.has(url.origin) && url.hostname !== 'localhost') {
      // Log to stderr so it surfaces in server logs without leaking the value.
      console.error(
        '[waitlist] WAITLIST_API_URL origin is not in ALLOWED_API_ORIGINS — requests will be blocked'
      );
    }
  } catch {
    // Malformed URL — requests will be skipped since WAITLIST_API will fail the
    // origin check inside the handler.
  }
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = validateWaitlist(body);
    if (!data) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Primary: send to auth backend (DB + verification email + Google Sheets sync)
    if (WAITLIST_API) {
      // Guard against misconfigured or attacker-supplied origins.
      let originAllowed = false;
      try {
        const parsedUrl = new URL(WAITLIST_API);
        originAllowed =
          ALLOWED_API_ORIGINS.has(parsedUrl.origin) || parsedUrl.hostname === 'localhost';
      } catch {
        // Malformed URL — skip backend call
      }
      if (!originAllowed) {
        return NextResponse.json({ error: 'misconfigured WAITLIST_API_URL' }, { status: 500 });
      }

      try {
        const backendRes = await fetch(`${WAITLIST_API}/api/waitlist/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, source: 'website' }),
        });
        const backendData = await backendRes.json();

        if (backendRes.ok && backendData.ok) {
          return NextResponse.json({ ok: true, data: backendData.data });
        }

        // If already on waitlist, still return success to user
        if (backendRes.status === 409) {
          return NextResponse.json({ ok: true, message: 'Already on waitlist' });
        }

        // Backend error — fall through to Google Sheets fallback
      } catch {
        // Backend unreachable — fall through to Google Sheets fallback
      }
    }

    // Fallback: write directly to Google Sheets if backend is unavailable
    await appendToSheet('waitlist', [new Date().toISOString(), data.email, 'early-access']);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
