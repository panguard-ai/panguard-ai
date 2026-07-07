'use client';

import { useTranslations } from 'next-intl';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2 } from '../v2/primitives';

/** The problem, in product terms — tight, no history lesson. */
export default function WhyWords() {
  const t = useTranslations('homeV3.why');
  const chips = [t('chip1'), t('chip2'), t('chip3')];

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('body')}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-xl border border-border bg-surface-1 px-4 py-2 font-mono text-sm text-text-secondary"
          >
            {chip}
          </span>
        ))}
      </div>
    </SectionV2>
  );
}
