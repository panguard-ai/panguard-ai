import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectParam = searchParams.get('redirect');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[auth/callback] exchange failed', error.message);
    return NextResponse.redirect(
      `${origin}/auth/error?reason=${encodeURIComponent(error.message)}`
    );
  }

  // After a successful exchange, confirm the user is verified before sending
  // them into protected paths. Magic-link click sets email_confirmed_at, so
  // this is a safety net for rare OAuth-without-verified-email flows.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !user.email_confirmed_at) {
    return NextResponse.redirect(`${origin}/verify-email`);
  }

  const safe = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';
  return NextResponse.redirect(`${origin}${safe}`);
}
