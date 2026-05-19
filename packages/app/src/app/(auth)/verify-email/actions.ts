'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

const RESEND_COOLDOWN_MS = 60_000;
const RESEND_COOKIE = 'last_resend_at';

export interface ResendResult {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

/**
 * Re-issue a magic link to the currently authenticated (but unverified) user.
 * Cookie-based rate limit: one resend per 60 seconds.
 */
export async function resendVerification(): Promise<ResendResult> {
  const jar = await cookies();
  const last = jar.get(RESEND_COOKIE)?.value;
  if (last) {
    const lastMs = Number.parseInt(last, 10);
    if (Number.isFinite(lastMs)) {
      const elapsed = Date.now() - lastMs;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          ok: false,
          error: `Please wait ${retryAfterSeconds}s before requesting another link`,
          retryAfterSeconds,
        };
      }
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { ok: false, error: 'No active session. Please sign in again.' };
  }

  const emailRedirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[verify-email] resend failed', error.message);
    return {
      ok: false,
      error: 'We could not resend the magic link. Please try again shortly.',
    };
  }

  jar.set(RESEND_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60,
  });

  return { ok: true };
}
