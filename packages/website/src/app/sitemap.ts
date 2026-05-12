import type { MetadataRoute } from 'next';
import { blogPosts } from '@/data/blog-posts';
import { GLOSSARY } from '@/data/glossary';
import { COMPARE } from '@/data/compare';

const locales = ['en', 'zh-TW'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://panguard.ai';
  // Use a stable date for static pages instead of current build time
  const stableDate = '2026-03-01T00:00:00Z';

  const pages = [
    '/',
    '/product',
    '/product/scan',
    '/product/guard',
    '/product/skill-auditor',
    '/integrations',
    '/security',
    '/technology',
    '/how-it-works',
    '/threat-cloud',
    '/about',
    '/open-source',
    '/company',
    '/contact',
    '/solutions/developers',
    '/blog',
    '/docs',
    '/docs/api',
    '/docs/getting-started',
    '/docs/deployment',
    '/docs/advanced-setup',
    '/docs/skill-auditor',
    '/docs/scan',
    '/docs/guard',
    '/docs/cli',
    '/docs/benchmark',
    '/compare',
    '/product/mcp',
    '/migrator',
    '/pricing',
    '/atr',
    '/glossary',
    '/compare',
    '/research/benchmarks',
    '/compliance',
    '/resources',
    '/press',
    '/trust',
    '/legal/privacy',
    '/legal/terms',
    '/legal/cookies',
    '/legal/acceptable-use',
    '/legal/responsible-disclosure',
    '/faq',
  ];

  const getFrequency = (path: string): 'weekly' | 'monthly' => {
    if (path === '/' || path === '/blog') return 'weekly';
    return 'monthly';
  };

  const getPriority = (path: string): number => {
    if (path === '/') return 1.0;
    if (path.startsWith('/product') || path === '/integrations') return 0.8;
    if (path === '/how-it-works' || path === '/threat-cloud' || path === '/about') return 0.8;
    if (path === '/migrator' || path === '/pricing' || path === '/atr') return 0.9;
    if (path === '/blog' || path === '/docs') return 0.7;
    return 0.6;
  };

  // English = no prefix (as-needed), Chinese = /zh-TW prefix
  const localeUrl = (locale: string, path: string) => {
    const suffix = path === '/' ? '' : path;
    return locale === 'en' ? `${base}${suffix}` : `${base}/${locale}${suffix}`;
  };

  const staticEntries = locales.flatMap((locale) =>
    pages.map((path) => ({
      url: localeUrl(locale, path),
      lastModified: stableDate,
      changeFrequency: getFrequency(path),
      priority: getPriority(path),
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, localeUrl(l, path)])),
      },
    }))
  );

  const blogEntries = locales.flatMap((locale) =>
    blogPosts.map((post) => ({
      url: localeUrl(locale, `/blog/${post.slug}`),
      lastModified: post.date,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, localeUrl(l, `/blog/${post.slug}`)])),
      },
    }))
  );

  const glossaryEntries = locales.flatMap((locale) =>
    GLOSSARY.map((entry) => ({
      url: localeUrl(locale, `/glossary/${entry.slug}`),
      lastModified: entry.lastReviewed,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, localeUrl(l, `/glossary/${entry.slug}`)]),
        ),
      },
    })),
  );

  const compareEntries = locales.flatMap((locale) =>
    COMPARE.map((c) => ({
      url: localeUrl(locale, `/compare/${c.slug}`),
      lastModified: c.lastReviewed,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, localeUrl(l, `/compare/${c.slug}`)])),
      },
    })),
  );

  return [...staticEntries, ...blogEntries, ...glossaryEntries, ...compareEntries];
}
