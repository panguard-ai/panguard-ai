import { NextResponse } from 'next/server';

const TC_URL = process.env['THREAT_CLOUD_URL'] || 'https://tc.panguard.ai';

export async function GET() {
  try {
    const resp = await fetch(`${TC_URL}/api/contributors`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) {
      return NextResponse.json({ ok: false, data: [] }, { status: resp.status });
    }
    const data = await resp.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ ok: false, data: [] }, { status: 502 });
  }
}
