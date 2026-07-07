'use client';

import { useTranslations } from 'next-intl';
import { useRuleStatsContext } from '@/contexts/RuleStatsContext';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardV2, SectionKicker } from './primitives';

/**
 * Section 06 — Flywheel. Deck p4+p5 merged: the accumulation thesis
 * (every attack caught anywhere becomes a rule that protects everyone)
 * plus the machine-speed contrast against committee-era rulebooks.
 */
export default function Flywheel() {
  const t = useTranslations('homeV2.flywheel');
  const { atrRules } = useRuleStatsContext();

  const inputs = [t('in1'), t('in2'), t('in3'), t('in4')];

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('body')}
      </p>

      {/* Flywheel diagram: four inputs → accumulating corpus → machine speed */}
      <div className="mt-14 flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-8">
        <div className="flex w-full max-w-xs flex-col gap-3 md:w-auto">
          {inputs.map((label) => (
            <span
              key={label}
              className="rounded-xl border border-border bg-surface-1 px-4 py-2 text-center font-mono text-sm text-text-secondary md:text-left"
            >
              {label}
            </span>
          ))}
        </div>

        <span aria-hidden className="rotate-90 font-mono text-xl text-text-muted md:rotate-0">
          →
        </span>

        <div className="flex h-[180px] w-[180px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-brand-sage/50 px-4 text-center">
          <span className="font-display text-xl font-bold text-text-primary">
            {t('corpusLabel')}
          </span>
          <span className="mt-1 font-mono text-2xl tabular-nums text-brand-sage">{atrRules}</span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-micro text-text-muted">
            {t('corpusTag')}
          </span>
        </div>

        <span aria-hidden className="rotate-90 font-mono text-xl text-text-muted md:rotate-0">
          →
        </span>

        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary">{t('speedLabel')}</span>
          <span aria-hidden className="font-mono text-sm text-text-muted">
            →
          </span>
        </div>
      </div>

      {/* Old world vs ATR contrast */}
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <CardV2>
          <h3 className="font-display text-xl font-bold text-text-secondary">{t('oldTitle')}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('oldBody')}</p>
        </CardV2>
        <CardV2 emphasized>
          <h3 className="font-display text-xl font-bold text-text-primary">{t('newTitle')}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('newBody')}</p>
        </CardV2>
      </div>

      <p className="mt-8 max-w-3xl text-base leading-relaxed text-text-secondary">{t('crystal')}</p>

      <SectionKicker>{t('kicker')}</SectionKicker>
    </SectionV2>
  );
}
