import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono, Noto_Sans_TC } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { buildAlternates } from '@/lib/seo';
import { getNonce } from '@/lib/nonce';
import { CookieBannerLazy } from '@/components/CookieBannerLazy';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const locales = ['en', 'zh-TW'] as const;

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-cjk',
  display: 'swap',
});

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;

  const { locale } = params;

  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    metadataBase: new URL('https://panguard.ai'),
    title: {
      default: 'Panguard AI',
      template: '%s | Panguard AI',
    },
    description: t('description'),
    openGraph: {
      type: 'website',
      locale: locale === 'zh-TW' ? 'zh_TW' : 'en_US',
      url: 'https://panguard.ai',
      siteName: 'Panguard AI',
      title: t('title'),
      description: t('description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og-image.png'],
    },
    robots: { index: true, follow: true },
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    alternates: buildAlternates('/', locale),
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : undefined,
    },
  };
}

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Panguard AI',
    url: 'https://panguard.ai',
    logo: 'https://panguard.ai/favicon.png',
    description:
      'AI agent security for developers. Scan MCP skills, detect prompt injection and tool poisoning, protect AI agents in real time.',
    foundingDate: '2024',
    knowsAbout: [
      'AI agent security',
      'MCP security',
      'prompt injection detection',
      'tool poisoning',
      'ATR rules',
      'Agent Threat Rules',
      'AI threat detection',
      'skill auditing',
    ],
    sameAs: [
      'https://github.com/panguard-ai/panguard-ai',
      'https://x.com/panguard_ai',
      'https://linkedin.com/company/panguard-ai',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      url: 'https://panguard.ai/contact',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Panguard AI',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Linux, macOS, Windows',
    description:
      'AI agent security platform. Scan MCP skills, detect threats, protect AI agents. One command to install.',
    url: 'https://panguard.ai',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Community (Open Source)' },
    ],
    publisher: {
      '@type': 'Organization',
      name: 'Panguard AI, Inc.',
      url: 'https://panguard.ai',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: 'https://panguard.ai',
    name: 'Panguard AI',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://panguard.ai/blog?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
];

export default async function LocaleLayout(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }>
) {
  const params = await props.params;

  const { locale } = params;

  const { children } = props;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const nonce = await getNonce();

  return (
    <html
      lang={locale === 'zh-TW' ? 'zh-TW' : 'en'}
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${notoSansTC.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://plausible.io" />
        {/* RSS feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Panguard AI Blog"
          href="/feed.xml"
        />
        {/* Enable scroll-reveal animations only after JS is ready (prevents FOIC) */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              'document.documentElement.classList.add("js-ready");setTimeout(function(){document.documentElement.classList.add("fm-ready")},800)',
          }}
        />
        {/* jsonLd: SEO structured data (Organization, SoftwareApplication, WebSite) */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Plausible Analytics — privacy-friendly, no cookies, GDPR compliant */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            nonce={nonce}
            suppressHydrationWarning
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-surface-1 focus:border focus:border-brand-sage focus:rounded-lg focus:px-4 focus:py-2 focus:text-text-primary focus:text-sm"
        >
          Skip to content
        </a>
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieBannerLazy />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
