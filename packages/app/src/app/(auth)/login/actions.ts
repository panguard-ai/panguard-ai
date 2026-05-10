'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

const MagicLinkInput = z.object({
  email: z.string().email().max(320),
  redirect: z
    .string()
    .regex(/^\/[a-zA-Z0-9/_\-?=&%.]*$/, 'invalid redirect path')
    .optional()
    .nullable(),
});

export interface MagicLinkResult {
  ok: boolean;
  email?: string;
  error?: string;
}

// In-memory rate limit (per-process). Good enough as a first line of defence;
// prod should use Upstash/Redis or Supabase rate-limit policies.
const lastSendByEmail = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;

export async function sendMagicLink(formData: FormData): Promise<MagicLinkResult> {
  const parsed = MagicLinkInput.safeParse({
    email: formData.get('email'),
    redirect: formData.get('redirect'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const email = parsed.data.email.toLowerCase();
  const now = Date.now();
  const last = lastSendByEmail.get(email) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return {
      ok: false,
      error: 'Please wait a moment before requesting another link.',
    };
  }
  lastSendByEmail.set(email, now);

  const supabase = await createClient();
  const redirectParam = parsed.data.redirect
    ? `?redirect=${encodeURIComponent(parsed.data.redirect)}`
    : '';
  const emailRedirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback${redirectParam}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[auth] signInWithOtp failed', error.message);
    return {
      ok: false,
      error: 'We could not send a magic link right now. Please try again in a moment.',
    };
  }

  return { ok: true, email };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Clear any leftover Supabase cookies (Next 15: cookies() is async).
  const jar = await cookies();
  for (const c of jar.getAll()) {
    if (c.name.startsWith('sb-')) jar.delete(c.name);
  }
  redirect('/login');
}
