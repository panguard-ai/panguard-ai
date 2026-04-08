'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const DEMOS: readonly { key: string; image: string; alt: string; width: number; height: number }[] =
  [
    {
      key: 'dashboard',
      image: '/demo/guard-dashboard.png',
      alt: 'PanGuard Guard Dashboard — 188 rules active, real-time protection status, 3-layer detection',
      width: 1440,
      height: 900,
    },
    {
      key: 'rules',
      image: '/demo/guard-rules.png',
      alt: 'PanGuard Detection Rules — 188 ATR rules, auto-sync from Threat Cloud, community contribution',
      width: 1440,
      height: 900,
    },
    {
      key: 'threatcloud',
      image: '/demo/guard-threat-cloud.png',
      alt: 'PanGuard Threat Cloud — anonymous threat intelligence sharing, 176 rules received',
      width: 1440,
      height: 900,
    },
  ];

export default function DemoShowcase() {
  const t = useTranslations('home.demo');
  const [active, setActive] = useState(0);

  return (
    <section className="relative px-5 sm:px-6 py-12 sm:py-20 border-b border-border/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold mb-3">
            {t('overline')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h2>
          <p className="text-sm text-text-secondary mt-3 max-w-lg mx-auto">{t('subtitle')}</p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
          {DEMOS.map((demo, i) => (
            <button
              key={demo.key}
              type="button"
              onClick={() => setActive(i)}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                active === i
                  ? 'border-panguard-green/50 bg-panguard-green/10 text-panguard-green'
                  : 'border-border text-text-muted hover:text-text-secondary hover:border-border/80'
              }`}
            >
              {t(`tabs.${demo.key}`)}
            </button>
          ))}
        </div>

        {/* Screenshot */}
        <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-2xl bg-surface-0 min-h-[200px] sm:min-h-0">
          <Image
            src={DEMOS[active].image}
            alt={DEMOS[active].alt}
            width={DEMOS[active].width}
            height={DEMOS[active].height}
            className="w-full h-auto"
            priority={active === 0}
          />
        </div>

        {/* Caption */}
        <p className="text-center text-[11px] text-text-muted mt-4">
          {t(`captions.${DEMOS[active].key}`)}
        </p>
      </div>
    </section>
  );
}
