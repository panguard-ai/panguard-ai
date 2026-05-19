/**
 * Sentry — Edge runtime configuration.
 *
 * Loaded automatically by `withSentryConfig` for any code that runs in
 * Vercel/Next.js Edge runtime (edge middleware, edge route handlers).
 * Init is a no-op when SENTRY_DSN is unset.
 *
 * @module @panguard-ai/app/sentry.edge.config
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env['SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    release: process.env['NEXT_PUBLIC_GIT_SHA'] ?? 'dev',
    environment: process.env['NODE_ENV'] ?? 'production',
  });
}
