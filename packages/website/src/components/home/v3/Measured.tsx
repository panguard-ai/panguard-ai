'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, StatV2 } from '../v2/primitives';

/** Benchmarks with corpus context and lane-based FP honesty. */
export default function Measured() {
  const t = useTranslations('homeV3.measured');
  const b = STATS.benchmark;

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
        <StatV2 value={`${b.hackaprompt.recall}%`} label={t('b1Label')} />
        <StatV2 value={`${b.pint.precision}%`} label={t('b2Label')} />
        <StatV2 value={`${b.garak.recall}%`} label={t('b3Label')} />
        <StatV2 value={`${b.skill.recall}% / ${b.skill.fp}%`} label={t('b4Label')} />
      </dl>

      <p className="mt-10 max-w-3xl text-sm leading-relaxed text-text-muted">{t('honesty')}</p>

      <div className="mt-10">
        <Link
          href="/research/benchmarks"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('cta')}
        </Link>
      </div>
    </SectionV2>
  );
}
