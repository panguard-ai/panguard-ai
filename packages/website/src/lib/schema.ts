/**
 * Schema.org JSON-LD builders for SEO + AEO.
 *
 * All schemas link back to a stable @id (https://panguard.ai/#org for the
 * Organization, https://panguard.ai/#person-adam for the founder) so
 * downstream knowledge graphs can deduplicate.
 *
 * Update STATS in src/lib/stats.ts; schemas pull from there for numeric
 * fields. Hardcoded strings stay here to keep schemas immutable across
 * stat refreshes.
 */

import { STATS } from './stats';

const ORG_ID = 'https://panguard.ai/#org';
const PERSON_ADAM_ID = 'https://panguard.ai/#person-adam';

export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'PanGuard AI',
  alternateName: 'Panguard AI',
  legalName: 'Panguard AI, Inc.',
  url: 'https://panguard.ai',
  logo: 'https://panguard.ai/favicon.png',
  description:
    'The open standard plus commercial platform for AI agent security. ATR is the rule standard. PanGuard is the runtime, compliance, and migration layer.',
  foundingDate: '2026-05-12',
  founder: { '@id': PERSON_ADAM_ID },
  knowsAbout: [
    'AI agent security',
    'Agent Threat Rules',
    'ATR detection standard',
    'prompt injection detection',
    'tool poisoning',
    'MCP security',
    'skill auditing',
    'AI compliance',
    'OWASP Agentic Top 10',
    'NIST AI RMF',
    'EU AI Act compliance',
  ],
  sameAs: [
    'https://github.com/panguard-ai/panguard-ai',
    'https://github.com/Agent-Threat-Rule/agent-threat-rules',
    'https://www.npmjs.com/package/panguard',
    'https://www.npmjs.com/package/agent-threat-rules',
    'https://linkedin.com/company/panguard-ai',
    'https://doi.org/10.5281/zenodo.19178002',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'sales@panguard.ai',
      url: 'https://panguard.ai/contact',
    },
    {
      '@type': 'ContactPoint',
      contactType: 'security',
      email: 'security@panguard.ai',
      url: 'https://panguard.ai/.well-known/security.txt',
    },
  ],
} as const;

export const PERSON_ADAM_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': PERSON_ADAM_ID,
  name: 'Adam Lin',
  alternateName: '林冠辛',
  givenName: 'Adam',
  familyName: 'Lin',
  jobTitle: 'Founder',
  worksFor: { '@id': ORG_ID },
  email: 'adam@agentthreatrule.org',
  url: 'https://panguard.ai/about',
  knowsAbout: [
    'AI agent security',
    'Agent Threat Rules',
    'prompt injection',
    'open detection standards',
    'AI compliance',
    'OWASP Agentic Top 10',
  ],
  sameAs: ['https://github.com/eeee2345', 'https://linkedin.com/in/adamlin-panguard'],
  knowsLanguage: ['en', 'zh-Hant', 'zh-TW'],
  nationality: { '@type': 'Country', name: 'Taiwan' },
} as const;

export const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://panguard.ai/#website',
  url: 'https://panguard.ai',
  name: 'PanGuard AI',
  publisher: { '@id': ORG_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://panguard.ai/blog?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: ['en', 'zh-TW'],
} as const;

/**
 * SoftwareApplication schema for a specific PanGuard product page.
 */
export function softwareApplicationSchema(opts: {
  name: string;
  description: string;
  url: string;
  category?: string;
  pricing?: 'free' | 'commercial' | 'mixed';
  version?: string;
  applicationSubCategory?: string;
}) {
  const {
    name,
    description,
    url,
    category = 'SecurityApplication',
    pricing = 'mixed',
    version = STATS.cliVersion,
    applicationSubCategory,
  } = opts;

  const offers =
    pricing === 'free'
      ? [{ '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Community (Open Source)' }]
      : pricing === 'commercial'
        ? [
            {
              '@type': 'Offer',
              priceSpecification: {
                '@type': 'PriceSpecification',
                priceCurrency: 'USD',
                minPrice: '150000',
                maxPrice: '500000',
              },
              name: 'Enterprise (annual)',
              url: 'https://panguard.ai/contact?tier=enterprise',
            },
            {
              '@type': 'Offer',
              priceSpecification: {
                '@type': 'PriceSpecification',
                priceCurrency: 'USD',
                minPrice: '500000',
                maxPrice: '2000000',
              },
              name: 'Migrator Pro (annual)',
              url: 'https://panguard.ai/contact?tier=migrator',
            },
          ]
        : [
            { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Community (Open Source)' },
            {
              '@type': 'Offer',
              priceSpecification: {
                '@type': 'PriceSpecification',
                priceCurrency: 'USD',
                minPrice: '150000',
                maxPrice: '500000',
              },
              name: 'Enterprise (annual)',
              url: 'https://panguard.ai/contact?tier=enterprise',
            },
          ];

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url,
    applicationCategory: category,
    ...(applicationSubCategory ? { applicationSubCategory } : {}),
    operatingSystem: 'macOS, Linux, Windows',
    softwareVersion: version,
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: pricing !== 'commercial',
    offers,
    publisher: { '@id': ORG_ID },
    author: { '@id': PERSON_ADAM_ID },
    datePublished: '2026-01-01',
    dateModified: STATS.lastUpdated,
    sameAs: ['https://github.com/panguard-ai/panguard-ai'],
  } as Record<string, unknown>;
}

/**
 * Pricing-page schema. Emits a SoftwareApplication whose offers mirror the
 * four canonical tiers on /pricing (Community $0, Enterprise $150K-500K/yr,
 * Migrator Pro $500K-2M/yr, Sovereign $5-20M). Google treats SoftwareApplication offers as a
 * pricing-eligible product, so this is what makes the pricing rich result
 * eligible.
 *
 * NOTE: aggregateRating is intentionally omitted. We have no real, verifiable
 * review/rating data, and Google penalizes fabricated ratings. Add an
 * `aggregateRating` block here ONLY when there is a genuine source.
 */
export function pricingApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': 'https://panguard.ai/pricing#software',
    name: 'PanGuard AI',
    description:
      'AI agent security platform built on the open ATR detection standard. Community tier is free and open source; Enterprise, Migrator Pro and Sovereign add hosted compliance, evidence packs, and managed runtime guard.',
    url: 'https://panguard.ai/pricing',
    applicationCategory: 'SecurityApplication',
    applicationSubCategory: 'AI Agent Security',
    operatingSystem: 'macOS, Linux, Windows',
    softwareVersion: STATS.cliVersion,
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    publisher: { '@id': ORG_ID },
    author: { '@id': PERSON_ADAM_ID },
    datePublished: '2026-01-01',
    dateModified: STATS.lastUpdated,
    sameAs: ['https://github.com/panguard-ai/panguard-ai'],
    offers: [
      {
        '@type': 'Offer',
        name: 'Community',
        description: 'Unlimited open-source scanning and detection. MIT licensed.',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: 'https://panguard.ai/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Enterprise (annual)',
        description:
          'Annual platform license: managed runtime guard, compliance reporting, and evidence packs.',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'USD',
          minPrice: '150000',
          maxPrice: '500000',
        },
        availability: 'https://schema.org/InStock',
        url: 'https://panguard.ai/contact?tier=enterprise',
      },
      {
        '@type': 'Offer',
        name: 'Migrator Pro (annual)',
        description:
          'Signed, continuously re-scanned compliance evidence — the flagship migration + evidence engine.',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'USD',
          minPrice: '500000',
          maxPrice: '2000000',
        },
        availability: 'https://schema.org/InStock',
        url: 'https://panguard.ai/contact?tier=migrator',
      },
      {
        '@type': 'Offer',
        name: 'Sovereign / OEM',
        description: 'On-prem, air-gapped, per-nation deployment. The ceiling beyond Sigma.',
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'USD',
          minPrice: '5000000',
          maxPrice: '20000000',
        },
        availability: 'https://schema.org/InStock',
        url: 'https://panguard.ai/contact?tier=sovereign',
      },
    ],
  } as Record<string, unknown>;
}

/**
 * Dataset schema for benchmark publications and ecosystem scan reports.
 */
export function datasetSchema(opts: {
  name: string;
  description: string;
  url: string;
  datePublished: string;
  variableMeasured?: string[];
  recordCount?: number;
  doi?: string;
  distributionFormat?: 'application/json' | 'text/csv';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: STATS.lastUpdated,
    creator: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    author: { '@id': PERSON_ADAM_ID },
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    ...(opts.variableMeasured ? { variableMeasured: opts.variableMeasured } : {}),
    ...(opts.recordCount ? { size: `${opts.recordCount} records` } : {}),
    ...(opts.doi
      ? {
          identifier: {
            '@type': 'PropertyValue',
            propertyID: 'DOI',
            value: opts.doi,
            url: `https://doi.org/${opts.doi}`,
          },
        }
      : {}),
    ...(opts.distributionFormat
      ? {
          distribution: {
            '@type': 'DataDownload',
            encodingFormat: opts.distributionFormat,
            contentUrl: opts.url,
          },
        }
      : {}),
  } as Record<string, unknown>;
}

/**
 * TechArticle schema for docs and engineering blog posts.
 */
export function techArticleSchema(opts: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  dependencies?: string;
  proficiencyLevel?: 'Beginner' | 'Expert';
  programmingLanguage?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: { '@id': PERSON_ADAM_ID },
    publisher: { '@id': ORG_ID },
    ...(opts.dependencies ? { dependencies: opts.dependencies } : {}),
    ...(opts.proficiencyLevel ? { proficiencyLevel: opts.proficiencyLevel } : {}),
    ...(opts.programmingLanguage ? { programmingLanguage: opts.programmingLanguage } : {}),
    ...(opts.image ? { image: opts.image } : { image: 'https://panguard.ai/og-image.png' }),
    inLanguage: 'en',
  } as Record<string, unknown>;
}

/**
 * DefinedTerm schema for glossary entries — "what is X" pages.
 * Pairs with TechArticle for full context.
 */
export function definedTermSchema(opts: {
  name: string;
  description: string;
  url: string;
  termCode?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'PanGuard AI Security Glossary',
      url: 'https://panguard.ai/glossary',
    },
    ...(opts.termCode ? { termCode: opts.termCode } : {}),
  } as Record<string, unknown>;
}
