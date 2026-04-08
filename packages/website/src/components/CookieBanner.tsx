'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';

const COOKIE_NAME = 'pg_consent';

export default function CookieBanner() {
  const t = useTranslations('cookieBanner');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = document.cookie.split('; ').find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const setConsent = (value: 'all' | 'essential') => {
    const maxAge = 365 * 24 * 60 * 60; // 1 year
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('ariaLabel')}
      className="fixed bottom-3 right-3 sm:right-4 z-50 max-w-sm"
    >
      <div className="bg-surface-1/95 backdrop-blur-sm border border-border rounded-xl shadow-lg px-4 py-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          {t('message')}{' '}
          <Link
            href="/legal/cookies"
            className="text-brand-sage hover:text-brand-sage-light underline"
          >
            {t('learnMore')}
          </Link>
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setConsent('all')}
            className="bg-brand-sage text-surface-0 font-semibold text-xs rounded-full px-4 py-1.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
          >
            {t('acceptAll')}
          </button>
          <button
            onClick={() => setConsent('essential')}
            className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold text-xs rounded-full px-4 py-1.5 transition-all duration-200"
          >
            {t('essentialOnly')}
          </button>
        </div>
      </div>
    </div>
  );
}
