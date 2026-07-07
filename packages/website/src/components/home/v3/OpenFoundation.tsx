'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2 } from '../v2/primitives';

/**
 * Open standards, at arm's length: ATR is an independent standard this
 * product follows — stated as a supply-chain fact, not an endorsement.
 */
export default function OpenFoundation() {
  const t = useTranslations('homeV3.open');

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('body')}
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/atr/spec"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('ctaSpec')}
        </Link>
        <Link
          href="/atr/crosswalks"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('ctaCross')}
        </Link>
      </div>
    </SectionV2>
  );
}
