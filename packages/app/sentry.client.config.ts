/**
 * Sentry — browser/client-side configuration.
 *
 * Loaded automatically by `withSentryConfig` for any code that runs in the
 * browser. Init is a no-op when NEXT_PUBLIC_SENTRY_DSN is unset so paid
 * customers can opt out by simply not setting the env var.
 *
 * @module @panguard-ai/app/sentry.client.config
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    release: process.env['NEXT_PUBLIC_GIT_SHA'] ?? 'dev',
    environment: process.env['NODE_ENV'] ?? 'production',
  });
}
