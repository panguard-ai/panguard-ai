import type { MetadataRoute } from 'next';
import { blogPosts } from '@/data/blog-posts';
import { GLOSSARY } from '@/data/glossary';
import { COMPARE } from '@/data/compare';
import { LAYERS } from '@/lib/layers';

const locales = ['en', 'zh-TW'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://panguard.ai';
  // Use a stable date for static pages instead of current build time
  const stableDate = '2026-03-01T00:00:00Z';

  // Every path here must return a 200 in BOTH locales. Routes that redirect
  // (see next.config.mjs `redirects()`) are intentionally excluded so the
  // sitemap never advertises a non-canonical URL:
  //   hidden -> '/' : /customers(/*), /partners, /solutions/enterprise,
  //                   /solutions/smb, /careers, /product/manager, /legal/sla
  //   merged product/docs : /product/{trap,chat,report},
  //                         /docs/{trap,chat,report}
  const pages = [
    '/',
    // product
    '/product',
    '/product/scan',
    '/product/guard',
    '/product/skill-auditor',
    '/product/mcp',
    // platform / marketing
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
    '/migrator',
    '/pricing',
    // NOTE: /customers, /partners, /solutions/{enterprise,smb}, /careers,
    // /product/manager, /legal/sla all redirect to '/' (see next.config.mjs)
    // and are deliberately absent.
    '/layers',
    '/community',
    '/evidence-pack',
    '/demo',
    '/early-access',
    '/scan',
    '/blacklist',
    '/whitelist',
    // blog + docs hubs
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
    // ATR standard
    '/atr',
    '/atr/spec',
    '/atr/governance',
    '/atr/crosswalks',
    '/atr/adopters',
    '/atr/cite',
    // research + resources
    '/research/benchmarks',
    '/research/96k-scan',
    '/research/mcp-ecosystem-scan',
    '/compliance',
    '/resources',
    '/press',
    '/trust',
    '/status',
    '/sub-processors',
    '/changelog',
    // reference / comparison
    '/glossary',
    '/compare',
    '/faq',
    // legal
    '/legal/privacy',
    '/legal/terms',
    '/legal/cookies',
    '/legal/acceptable-use',
    '/legal/responsible-disclosure',
    '/legal/security',
    '/legal/dpa',
    '/legal/msa',
    '/legal/refund',
    '/legal/sow',
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
    if (path.startsWith('/atr/')) return 0.85;
    if (path === '/blog' || path === '/docs') return 0.7;
    return 0.6;
  };

  // English = no prefix (as-needed), Chinese = /zh-TW prefix
  const localeUrl = (locale: string, path: string) => {
    const suffix = path === '/' ? '' : path;
    return locale === 'en' ? `${base}${suffix}` : `${base}/${locale}${suffix}`;
  };

  // hreflang alternates: en, zh-TW, and x-default (-> the English URL, matching
  // lib/seo.ts buildAlternates so page <head> and sitemap agree).
  const alternatesFor = (path: string) => ({
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, localeUrl(l, path)])),
      'x-default': localeUrl('en', path),
    },
  });

  const staticEntries = locales.flatMap((locale) =>
    pages.map((path) => ({
      url: localeUrl(locale, path),
      lastModified: stableDate,
      changeFrequency: getFrequency(path),
      priority: getPriority(path),
      alternates: alternatesFor(path),
    }))
  );

  // Blog: the Chinese version of a post is served at /zh-TW/blog/<base-slug>
  // via a language toggle; "<slug>-zh" entries are duplicate/redirecting URLs
  // (blog/[slug] strips the -zh suffix), so they are excluded here. Emit one
  // canonical entry per base slug across both locales.
  const canonicalPosts = blogPosts.filter((post) => !post.slug.endsWith('-zh'));
  const blogEntries = locales.flatMap((locale) =>
    canonicalPosts.map((post) => ({
      url: localeUrl(locale, `/blog/${post.slug}`),
      lastModified: post.date,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: alternatesFor(`/blog/${post.slug}`),
    }))
  );

  const glossaryEntries = locales.flatMap((locale) =>
    GLOSSARY.map((entry) => ({
      url: localeUrl(locale, `/glossary/${entry.slug}`),
      lastModified: entry.lastReviewed,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      alternates: alternatesFor(`/glossary/${entry.slug}`),
    }))
  );

  const compareEntries = locales.flatMap((locale) =>
    COMPARE.map((c) => ({
      url: localeUrl(locale, `/compare/${c.slug}`),
      lastModified: c.lastReviewed,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
      alternates: alternatesFor(`/compare/${c.slug}`),
    }))
  );

  const layerEntries = locales.flatMap((locale) =>
    LAYERS.map((layer) => ({
      url: localeUrl(locale, `/layers/${layer.slug}`),
      lastModified: stableDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: alternatesFor(`/layers/${layer.slug}`),
    }))
  );

  return [...staticEntries, ...blogEntries, ...glossaryEntries, ...compareEntries, ...layerEntries];
}
