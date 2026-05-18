import { getRequestConfig } from 'next-intl/server';

/**
 * Supported locales (v3.0 multilingual rollout).
 *
 * Tier 1 — stable, production-ready: en, zh-TW, zh-CN, ja, es
 *   Reviewed in-house; safe for customer-facing UI.
 *
 * Tier 2 — experimental, native-reviewer pending: ar
 *   Translation is LLM-generated and needs Arabic native review before
 *   sovereign customer demo (HUMAIN). Functional but use cautiously.
 *   Tracked in Phase 1A.5; scheduled native reviewer engagement
 *   ($500-1000 budget) before v3.1 ship.
 */
const SUPPORTED_LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja', 'es', 'ar'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupported(locale: string | undefined): locale is SupportedLocale {
  return !!locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: SupportedLocale = isSupported(requested) ? requested : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
