import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Database } from '@/lib/types';

/**
 * Server-side Supabase client for React Server Components and Route Handlers.
 * In Next.js 15, cookies() returns a Promise, so this is async.
 *
 * Return type is inferred from createServerClient so the Database generic
 * propagates correctly through postgrest-js 2.x's multi-parameter shape.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>,
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — Next forbids cookie mutation there.
            // Middleware refreshes cookies on the next request instead.
          }
        },
      },
    },
  );
}
