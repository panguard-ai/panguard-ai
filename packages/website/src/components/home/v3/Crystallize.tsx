'use client';

import { useTranslations } from 'next-intl';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, SectionKicker } from '../v2/primitives';

/** Freshness as an infrastructure property: attack → rule in ~1 hour. */
export default function Crystallize() {
  const t = useTranslations('homeV3.fresh');

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('body')}
      </p>
      <SectionKicker>{t('contrast')}</SectionKicker>
    </SectionV2>
  );
}
