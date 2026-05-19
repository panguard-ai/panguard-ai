import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://tc.panguard.ai https://api.panguard.ai wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  // agent-threat-rules ships rule YAMLs accessed at runtime via
  // require.resolve('agent-threat-rules/package.json') in atr-rules.ts +
  // report-generator.ts. Turbopack can't statically trace that path and
  // bails the build; marking it as a server external defers resolution
  // to runtime, where the dep is available.
  serverExternalPackages: ['agent-threat-rules'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry options per official Next.js Sentry docs.
// Source map upload requires SENTRY_AUTH_TOKEN in CI at build time.
const sentryOptions = {
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
};

export default withSentryConfig(withNextIntl(nextConfig), sentryOptions);
