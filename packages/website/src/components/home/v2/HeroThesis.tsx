'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { useRuleStatsContext } from '@/contexts/RuleStatsContext';
import CopyCommand from './CopyCommand';
import { sageRich, StatV2 } from './primitives';

/**
 * Section 0 — Hero. The deck v11 cover, public edition:
 * thesis headline, hacked-by-words subline, scan-first CTA,
 * live KPI strip (rule count from the live stats context).
 */
export default function HeroThesis() {
  const t = useTranslations('homeV2.hero');
  const { atrRules } = useRuleStatsContext();

  return (
    <section className="relative overflow-hidden bg-surface-hero">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-sage/[0.05] blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-36 sm:px-6 sm:pb-24 sm:pt-44 lg:px-8">
        <p className="hero-entrance flex items-center gap-3 font-mono text-[11px] uppercase tracking-micro text-text-muted">
          <span aria-hidden className="inline-block h-px w-8 bg-border-hover" />
          {t('eyebrow')}
        </p>

        <h1 className="hero-entrance mt-8 max-w-5xl font-display text-[44px] font-bold leading-[1.02] tracking-tight text-text-primary [animation-delay:.1s] sm:text-6xl lg:text-7xl">
          {t.rich('title', { sage: sageRich })}
        </h1>

        <div className="hero-entrance mt-8 max-w-2xl space-y-3 text-base leading-relaxed text-text-secondary [animation-delay:.2s] sm:text-lg">
          <p>{t('sub1')}</p>
          <p>{t('sub2')}</p>
        </div>

        <div className="hero-entrance mt-10 flex flex-wrap items-center gap-3 [animation-delay:.3s] sm:gap-4">
          <Link
            href="/scan"
            className="sheen lift rounded-xl bg-panguard-green px-6 py-3 font-semibold text-surface-hero transition-colors duration-300 ease-out-quint hover:bg-panguard-green-light"
          >
            {t('ctaScan')}
          </Link>
          <Link
            href="/atr"
            className="lift rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
          >
            {t('ctaStandard')}
          </Link>
          <span className="hidden font-mono text-[10px] uppercase tracking-micro text-text-muted sm:inline">
            {t('installLabel')}
          </span>
          <CopyCommand
            command="npm install -g @panguard-ai/panguard"
            copiedLabel={t('copied')}
            className="hidden md:inline-flex"
          />
        </div>

        <dl className="hero-entrance mt-16 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-border-subtle pt-8 [animation-delay:.45s] sm:mt-20 sm:grid-cols-4">
          <StatV2 value={<span className="tabular-nums">{atrRules}</span>} label={t('statRules')} />
          <StatV2 value="3" label={t('statProduction')} />
          <StatV2 value="8" label={t('statMerged')} />
          <StatV2 value={t('statSpeedValue')} label={t('statSpeed')} />
        </dl>
      </div>
    </section>
  );
}
