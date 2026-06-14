'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';

// Mission/soul line. Placed below the flywheel (a scrolling reader is already
// bought in) — NOT the hero, which holds the locked positioning headline.
// Copy from the hero-recast research (the "trust" vision belongs as a fold
// mission line, not as a load-bearing headline). Inline EN/ZH.

export default function MissionBand() {
  const isZh = useLocale() === 'zh-TW';
  return (
    <section className="relative px-5 sm:px-6 py-20 sm:py-28 border-y border-border/30 bg-surface-1/30">
      <FadeInUp className="max-w-3xl mx-auto text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand-sage font-semibold mb-5">
          {isZh ? '我們的使命' : 'Our mission'}
        </p>
        <h2 className="text-[clamp(26px,4vw,44px)] font-bold text-text-primary leading-[1.2]">
          {isZh ? '世界將如何信任 AI agent。' : 'How the world will trust AI agents.'}
        </h2>
        <p className="mt-5 text-base text-text-secondary leading-relaxed max-w-xl mx-auto">
          {isZh
            ? '每一次安裝都多一個 sensor；每一個 sensor 都讓這套人人共用的開放標準更強。'
            : 'Every install adds a sensor; every sensor strengthens the open standard everyone detects against.'}
        </p>
      </FadeInUp>
    </section>
  );
}
