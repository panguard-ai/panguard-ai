import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { fillMessageTokens } from '@/lib/message-tokens';

const filledByLocale = new Map<string, AbstractIntlMessages>();

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? 'en';

  let messages = filledByLocale.get(locale);
  if (!messages) {
    messages = fillMessageTokens<AbstractIntlMessages>(
      (await import(`../../messages/${locale}.json`)).default
    );
    filledByLocale.set(locale, messages);
  }

  return { locale, messages };
});
