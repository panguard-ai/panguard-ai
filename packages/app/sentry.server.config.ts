/**
 * Sentry — Node.js (server runtime) configuration.
 *
 * Loaded automatically by `withSentryConfig` for any code that runs on the
 * Node server (API routes, server components, route handlers). Init is a
 * no-op when SENTRY_DSN is unset.
 *
 * @module @panguard-ai/app/sentry.server.config
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
