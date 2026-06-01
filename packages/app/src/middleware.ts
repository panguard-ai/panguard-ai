import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/w/', '/partner/', '/device/approve', '/onboarding'];

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // App routes only serve authenticated UI — a restrictive CSP reduces
  // the blast radius if a dependency introduces an XSS vector.
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Next.js inline scripts require unsafe-inline without nonce infra
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://tc.panguard.ai https://*.vercel-insights.com https://*.vercel-analytics.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Static assets and Next internals pass through.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/device/') || // device flow is polled by CLIs without auth
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const { response, userId, emailConfirmed } = await updateSession(request);

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (needsAuth && !userId) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  // If already logged in, bounce away from /login.
  if (pathname === '/login' && userId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Email-verification gate: any signed-in user without a confirmed email is
  // funnelled to /verify-email. The verify page, sign-out, and the magic-link
  // exchange / error pages must stay reachable so the user can complete or
  // recover from verification.
  if (userId && !emailConfirmed) {
    const isExempt =
      pathname.startsWith('/verify-email') ||
      pathname.startsWith('/auth/sign-out') ||
      pathname.startsWith('/auth/callback') ||
      pathname.startsWith('/auth/error') ||
      pathname === '/login';
    if (!isExempt) {
      return NextResponse.redirect(new URL('/verify-email', request.url));
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
