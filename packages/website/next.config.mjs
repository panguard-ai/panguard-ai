import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const hiddenRoutes = [
      '/status',
      '/legal/security',
      '/legal/sla',
      '/legal/dpa',
      '/demo',
      '/customers/:slug*',
      '/customers',
      '/partners',
      '/solutions/enterprise',
      '/solutions/smb',
      '/careers',
      '/product/manager',
      '/changelog',
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
