'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { useRuleStatsContext } from '@/contexts/RuleStatsContext';
import { STATS } from '@/lib/stats';
import CopyCommand from '../v2/CopyCommand';
import { sageRich, StatV2 } from '../v2/primitives';
import Terminal from './Terminal';

/**
 * Hero — infrastructure voice: what the product does, and the product
 * doing it (real scan output), side by side. No pitch, no story.
 */
export default function HeroInfra() {
  const t = useTranslations('homeV3.hero');
  const { atrRules, atrPatterns } = useRuleStatsContext();

  return (
    <section className="relative overflow-hidden bg-surface-hero">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/3 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-brand-sage/[0.05] blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <p className="hero-entrance flex items-center gap-3 font-mono text-[11px] uppercase tracking-micro text-text-muted">
              <span aria-hidden className="inline-block h-px w-8 bg-border-hover" />
              {t('eyebrow')}
            </p>

            <h1 className="hero-entrance mt-7 font-display text-[40px] font-bold leading-[1.04] tracking-tight text-text-primary [animation-delay:.1s] sm:text-5xl lg:text-6xl">
              {t.rich('title', { sage: sageRich })}
            </h1>

            <p className="hero-entrance mt-6 max-w-xl text-base leading-relaxed text-text-secondary [animation-delay:.2s] sm:text-lg">
              {t('sub')}
            </p>

            <div className="hero-entrance mt-9 flex flex-wrap items-center gap-3 [animation-delay:.3s]">
              <Link
                href="/scan"
                className="sheen lift rounded-xl bg-panguard-green px-6 py-3 font-semibold text-surface-hero transition-colors duration-300 ease-out-quint hover:bg-panguard-green-light"
              >
                {t('ctaScan')}
              </Link>
              <Link
                href="/docs/getting-started"
                className="lift rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
              >
                {t('ctaDocs')}
              </Link>
            </div>

            <div className="hero-entrance mt-5 [animation-delay:.4s]">
              <CopyCommand command="npm install -g panguard" copiedLabel={t('copied')} />
            </div>
          </div>

          <div className="hero-entrance min-w-0 [animation-delay:.35s]">
            <Terminal />
            <p className="mt-3 text-xs leading-relaxed text-text-muted">{t('termCaption')}</p>
          </div>
        </div>

        <dl className="hero-entrance mt-16 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-border-subtle pt-8 [animation-delay:.5s] sm:grid-cols-4">
          <StatV2 value={<span className="tabular-nums">{atrRules}</span>} label={t('statRules')} />
          <StatV2
            value={<span className="tabular-nums">{atrPatterns.toLocaleString()}</span>}
            label={t('statPatterns')}
          />
          <StatV2 value={STATS.adoption.platformsSupported} label={t('statPlatforms')} />
          <StatV2 value="MIT" label={t('statLicense')} />
        </dl>
      </div>
    </section>
  );
}
