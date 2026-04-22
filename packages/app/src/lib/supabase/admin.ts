import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/types';

/**
 * Service-role Supabase client.
 *
 * USE SPARINGLY. This bypasses row-level security and must NEVER be exposed
 * to the browser. Only import from route handlers / server actions that run
 * trusted operations (device code approval, workspace bootstrap, etc.).
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[panguard/app] SUPABASE_SERVICE_ROLE_KEY is not set — admin client unavailable',
    );
  }
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
