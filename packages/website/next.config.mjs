import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint at build runs against monorepo-shared rules whose plugin versions
  // resolve differently on Vercel's deployment image vs. local dev. Local
  // `pnpm build` passes; Vercel deploy was failing mid-lint with non-fatal
  // style nits. Lint still runs in CI via `pnpm lint` — turning it off here
  // keeps deploys green without weakening pre-merge gates.
  eslint: { ignoreDuringBuilds: true },
  // typecheck runs locally + in dedicated CI step (`pnpm typecheck` passes).
  // Vercel's build image resolves workspace-linked .d.ts inconsistently for
  // @panguard-ai/scan-core export types — visible only at build time, not
  // a real type error. Skip the duplicate check at deploy to ship; CI still
  // enforces correctness.
  typescript: { ignoreBuildErrors: true },
  // agent-threat-rules ships an optional ONNX embedding loader that imports
  // @xenova/transformers behind a dynamic require. The migrator-community
  // validator dynamically imports agent-threat-rules from /api/migrate; that
  // transitive load pulls the embedding module into the static analysis even
  // though it's not used in the migration code path. Treating it as a server
  // external lets the runtime resolution decide whether the optional dep is
  // available without blowing up the build trace.
  serverExternalPackages: ['agent-threat-rules', '@panguard-ai/migrator-community'],
  async redirects() {
    // Routes intentionally hidden from public navigation while their content
    // isn't ready for customer scrutiny. 2026-05-19 audit (Day 5 trust pass):
    //   UN-HIDDEN: /legal/dpa (DPA template hard-links to it),
    //              /legal/security (CISOs check this first),
    //              /changelog (engineering trust signal, ATR releases live),
    //              /status (operational trust),
    //              /demo (substantial Demo Request flow exists, points
    //                     real prospects to live ATR tools).
    //   STILL HIDDEN: /customers (0 paying customers — don't fake it),
    //                 /partners (no signed partnerships yet),
    //                 /solutions/{enterprise,smb} (positioning still v1),
    //                 /careers (not hiring),
    //                 /product/manager (deprecated path),
    //                 /legal/sla (no SLA committed yet).
    const hiddenRoutes = [
      '/legal/sla',
      '/customers/:slug*',
      '/customers',
      '/partners',
      '/solutions/enterprise',
      '/solutions/smb',
      '/careers',
      '/product/manager',
    ];

    // The authenticated customer dashboard lives at app.panguard.ai. The
    // marketing site used to have a /console/fleet preview that was an
    // unauthenticated empty shell — removed 2026-04-24. Any inbound links
    // or bookmarks get forwarded to the real app.
    const consoleRedirects = [
      { source: '/console', destination: 'https://app.panguard.ai/', permanent: false },
      { source: '/console/:path*', destination: 'https://app.panguard.ai/', permanent: false },
      { source: '/zh-TW/console', destination: 'https://app.panguard.ai/', permanent: false },
      {
        source: '/zh-TW/console/:path*',
        destination: 'https://app.panguard.ai/',
        permanent: false,
      },
    ];

    const productRedirects = [
      { source: '/product/trap', destination: '/product/guard', permanent: false },
      { source: '/zh-TW/product/trap', destination: '/zh-TW/product/guard', permanent: false },
      { source: '/product/chat', destination: '/product/guard', permanent: false },
      { source: '/zh-TW/product/chat', destination: '/zh-TW/product/guard', permanent: false },
      { source: '/product/report', destination: '/product/scan', permanent: false },
      { source: '/zh-TW/product/report', destination: '/zh-TW/product/scan', permanent: false },
      { source: '/docs/trap', destination: '/docs/guard', permanent: false },
      { source: '/zh-TW/docs/trap', destination: '/zh-TW/docs/guard', permanent: false },
      { source: '/docs/chat', destination: '/docs/guard', permanent: false },
      { source: '/zh-TW/docs/chat', destination: '/zh-TW/docs/guard', permanent: false },
      { source: '/docs/report', destination: '/docs/scan', permanent: false },
      { source: '/zh-TW/docs/report', destination: '/zh-TW/docs/scan', permanent: false },
      // 2026-06-14 launch trust pass: /early-access led with a fabricated $500/mo
      // "Team Tier"; /docs/api's Swagger/OpenAPI links 404 in prod. Hide both and
      // point inbound traffic at the real free-install path until rebuilt.
      { source: '/early-access', destination: '/docs/getting-started', permanent: false },
      { source: '/zh-TW/early-access', destination: '/zh-TW/docs/getting-started', permanent: false },
      { source: '/docs/api', destination: '/docs/getting-started', permanent: false },
      { source: '/zh-TW/docs/api', destination: '/zh-TW/docs/getting-started', permanent: false },
    ];

    return [
      ...hiddenRoutes.flatMap((source) => [
        { source, destination: '/', permanent: false },
        { source: `/zh-TW${source}`, destination: '/', permanent: false },
      ]),
      ...consoleRedirects,
      ...productRedirects,
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/windows',
          has: [{ type: 'host', value: 'get.panguard.ai' }],
          destination: '/api/install/windows',
        },
        {
          source: '/win',
          has: [{ type: 'host', value: 'get.panguard.ai' }],
          destination: '/api/install/windows',
        },
        {
          source: '/install.ps1',
          has: [{ type: 'host', value: 'get.panguard.ai' }],
          destination: '/api/install/windows',
        },
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'get.panguard.ai' }],
          destination: '/api/install',
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // CSP is now set dynamically in middleware.ts with nonce-based script-src
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
