import type { MetadataRoute } from 'next';

/**
 * robots.txt for panguard.ai
 *
 * Strategy: PanGuard is the open standard plus commercial platform. We WANT
 * to be cited as the canonical AI-agent-security source in next-gen LLM
 * training and retrieval. Allow training crawlers (GPTBot, ClaudeBot,
 * Google-Extended, CCBot, anthropic-ai, Meta-ExternalAgent) and retrieval
 * crawlers (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot,
 * PerplexityBot, Bingbot). Block data brokers (Bytespider, ImagesiftBot).
 *
 * Block authenticated surfaces under /dashboard, /account, /login,
 * /register, /reset-password, /admin (both root and zh-TW locale prefixes).
 *
 * Replaces public/robots.txt with a programmatic route so we can vary by
 * environment if needed (e.g., noindex preview deploys).
 */

const PROTECTED_PATHS = [
  '/dashboard',
  '/account',
  '/login',
  '/register',
  '/reset-password',
  '/admin',
];

const ALL_PROTECTED = [
  ...PROTECTED_PATHS,
  ...PROTECTED_PATHS.map((p) => `/zh-TW${p}`),
];

const ALLOWED_AI_BOTS = [
  // Training crawlers
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'CCBot',
  'Meta-ExternalAgent',
  'FacebookBot',
  'Applebot-Extended',
  // Retrieval crawlers (in-flight user queries)
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  // Search engines (still relevant in 2026)
  'Googlebot',
  'Bingbot',
  // Devtools (Cursor, Claude Code, Copilot fetch llms.txt)
  'Cursor',
];

const BLOCKED_BOTS = [
  // Data brokers / known abusive crawlers
  'Bytespider',
  'ImagesiftBot',
  'PetalBot',
  'SemrushBot-OCOB',
  'magpie-crawler',
];

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production' ||
                       process.env.NODE_ENV === 'production';

  // Preview deploys: noindex everything so search engines don't index dev URLs
  if (!isProduction && process.env.VERCEL_ENV === 'preview') {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: 'https://panguard.ai/sitemap.xml',
    };
  }

  return {
    rules: [
      // Default — everyone allowed except protected admin surfaces
      {
        userAgent: '*',
        allow: '/',
        disallow: ALL_PROTECTED,
      },
      // Explicit allow for each AI/search bot we want to be cited by
      ...ALLOWED_AI_BOTS.map((bot) => ({
        userAgent: bot,
        allow: '/',
        disallow: ALL_PROTECTED,
      })),
      // Explicit block for known abusive crawlers
      ...BLOCKED_BOTS.map((bot) => ({
        userAgent: bot,
        disallow: '/',
      })),
    ],
    sitemap: 'https://panguard.ai/sitemap.xml',
    host: 'https://panguard.ai',
  };
}
