import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/w/', '/device/approve', '/onboarding'];

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

  const { response, userId } = await updateSession(request);

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

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
