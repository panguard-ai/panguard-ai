'use client';

import { useTranslations } from 'next-intl';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardV2, CardKicker } from './primitives';

/**
 * Section 01 — The Gap. Deck p2: three-era cards, ending on
 * "New attack surface, no shared standard. That's the gap."
 */
export default function TheGap() {
  const t = useTranslations('homeV2.gap');

  const cards = [
    { kicker: t('card1Kicker'), title: t('card1Title'), body: t('card1Body'), emphasized: false },
    { kicker: t('card2Kicker'), title: t('card2Title'), body: t('card2Body'), emphasized: false },
    { kicker: t('card3Kicker'), title: t('card3Title'), body: t('card3Body'), emphasized: true },
  ];

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('body')}
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <CardV2 key={card.kicker} emphasized={card.emphasized}>
            <CardKicker>{card.kicker}</CardKicker>
            <h3 className="mt-3 font-display text-xl font-bold text-text-primary">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{card.body}</p>
          </CardV2>
        ))}
      </div>

      <p className="mt-12 max-w-4xl font-display text-2xl font-bold leading-snug tracking-tight text-text-primary sm:text-3xl">
        {t.rich('punch', { sage: sageRich })}
      </p>
    </SectionV2>
  );
}
