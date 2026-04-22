/**
 * Environment variable access with graceful failure.
 * Never throws at module load so that `next build` can still produce a bundle
 * even when secrets are not yet set (they'll be populated on Vercel).
 */

const missing: string[] = [];

function read(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  missing.push(name);
  return '';
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: read('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: read('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: read('SUPABASE_SERVICE_ROLE_KEY'),
  TC_API_URL: read('TC_API_URL', 'https://tc.panguard.ai'),
  TC_INTERNAL_SECRET: read('TC_INTERNAL_SECRET'),
  PANGUARD_REPORT_SIGNING_KEY: read('PANGUARD_REPORT_SIGNING_KEY'),
  NEXT_PUBLIC_APP_URL: read('NEXT_PUBLIC_APP_URL', 'http://localhost:3001'),
} as const;

export function assertEnv(names: ReadonlyArray<keyof typeof env>): void {
  const bad = names.filter((n) => !env[n]);
  if (bad.length > 0) {
    const msg = `[panguard/app] Missing required env vars: ${bad.join(', ')}. Copy .env.local.example to .env.local and fill in values.`;
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }
}

export function getMissingEnvVars(): ReadonlyArray<string> {
  return [...missing];
}
