import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

/**
 * RFC 8628-style device authorization endpoint.
 * Called by the CLI to start a device flow.
 *
 * Response shape mirrors the OAuth 2.0 Device Authorization Grant response:
 *   https://datatracker.ietf.org/doc/html/rfc8628#section-3.2
 */
export async function POST(_req: NextRequest) {
  const deviceCode = randomBytes(32).toString('base64url');
  const userCode = `${randomGroup(4)}-${randomGroup(4)}`;
  const ttlSeconds = 600; // 10 minutes
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('device_codes').insert({
      device_code: deviceCode,
      user_code: userCode,
      workspace_id: null,
      user_id: null,
      issued_api_key_id: null,
      approved_at: null,
      expires_at: expiresAt,
    });
    if (error) throw error;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/device/code] failed', err);
    return NextResponse.json(
      { error: 'server_error', error_description: 'unable to create device code' },
      { status: 500 }
    );
  }

  const verificationUri = `${env.NEXT_PUBLIC_APP_URL}/device`;
  const verificationUriComplete = `${verificationUri}?code=${userCode}`;

  return NextResponse.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    verification_uri_complete: verificationUriComplete,
    expires_in: ttlSeconds,
    interval: 5,
  });
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // drop easily-confused chars
function randomGroup(n: number): string {
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) {
    const idx = bytes[i]! % ALPHABET.length;
    out += ALPHABET[idx];
  }
  return out;
}
