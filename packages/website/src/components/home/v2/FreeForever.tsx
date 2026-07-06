'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import CopyCommand from './CopyCommand';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardV2, CardKicker } from './primitives';

/**
 * Section 07 — Free Forever. Community is the complete protection:
 * two-step install, shipped-today vs roadmap split, docs CTA.
 */
export default function FreeForever() {
  const t = useTranslations('homeV2.free');

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('body')}
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <CopyCommand command="npm install -g @panguard-ai/panguard" copiedLabel={t('copied')} />
        <CopyCommand command="panguard setup" copiedLabel={t('copied')} />
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <CardV2 emphasized>
          <CardKicker>{t('shippedLabel')}</CardKicker>
          <p className="mt-3 font-mono text-sm leading-relaxed text-text-secondary">
            {t('shipped')}
          </p>
        </CardV2>
        <CardV2 provisional>
          <CardKicker>{t('roadmapLabel')}</CardKicker>
          <p className="mt-3 font-mono text-sm leading-relaxed text-text-secondary">
            {t('roadmap')}
          </p>
        </CardV2>
      </div>

      <div className="mt-12">
        <Link
          href="/docs/getting-started"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('ctaDocs')}
        </Link>
      </div>
    </SectionV2>
  );
}
