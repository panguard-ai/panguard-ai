'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { useRuleStatsContext } from '@/contexts/RuleStatsContext';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardV2, CardKicker } from './primitives';

/**
 * Section 02 — The Rulebook. Deck p6: "I built that rulebook: ATR."
 * Three-layer stack (ATR rules / ATD taxonomy / engine), live rule
 * count interpolated from the stats context, crosswalks line, one CTA.
 */
export default function AtrRulebook() {
  const t = useTranslations('homeV2.rulebook');
  const { atrRules } = useRuleStatsContext();

  const cards = [
    {
      kicker: t('card1Kicker'),
      title: t('card1Title'),
      tag: t('card1Tag'),
      body: t('card1Body', { count: atrRules }),
      emphasized: true,
    },
    {
      kicker: t('card2Kicker'),
      title: t('card2Title'),
      tag: t('card2Tag'),
      body: t('card2Body'),
      emphasized: false,
    },
    {
      kicker: t('card3Kicker'),
      title: t('card3Title'),
      tag: t('card3Tag'),
      body: t('card3Body'),
      emphasized: false,
    },
  ];

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('sub', { count: atrRules })}
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <CardV2 key={card.kicker} emphasized={card.emphasized}>
            <CardKicker>{card.kicker}</CardKicker>
            <h3 className="mt-3 font-display text-xl font-bold text-text-primary">{card.title}</h3>
            <p className="mt-1 font-mono text-xs text-brand-sage">{card.tag}</p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">{card.body}</p>
          </CardV2>
        ))}
      </div>

      <p className="mt-10 max-w-4xl text-sm leading-relaxed text-text-muted">{t('crosswalks')}</p>

      <div className="mt-10">
        <Link
          href="/atr"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('cta')}
        </Link>
      </div>
    </SectionV2>
  );
}
