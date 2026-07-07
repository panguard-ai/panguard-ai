'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Eyebrow, SectionTitleV2, SectionV2 } from './v2/primitives';

const DEMOS: readonly { key: string; image: string; alt: string; width: number; height: number }[] =
  [
    {
      key: 'dashboard',
      image: '/demo/guard-dashboard.png',
      alt: 'PanGuard Guard Dashboard — live ATR rules active, real-time protection status, deterministic on-device detection',
      width: 1440,
      height: 900,
    },
    {
      key: 'rules',
      image: '/demo/guard-rules.png',
      alt: 'PanGuard Detection Rules — ATR rules auto-synced from Threat Cloud, community contribution',
      width: 1440,
      height: 900,
    },
    {
      key: 'threatcloud',
      image: '/demo/guard-threat-cloud.png',
      alt: 'PanGuard Threat Cloud — anonymous threat intelligence sharing, detection rules received',
      width: 1440,
      height: 900,
    },
  ];

export default function DemoShowcase() {
  const t = useTranslations('home.demo');
  const [active, setActive] = useState(0);

  return (
    <SectionV2>
      <Eyebrow>{t('overline')}</Eyebrow>
      <SectionTitleV2>{t('title')}</SectionTitleV2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('subtitle')}
      </p>

      {/* Tab buttons */}
      <div className="mt-10 flex flex-wrap gap-2 sm:gap-3">
        {DEMOS.map((demo, i) => (
          <button
            key={demo.key}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-xl border px-4 py-2 font-mono text-[11px] uppercase tracking-micro transition-colors duration-300 ease-out-quint ${
              active === i
                ? 'border-brand-sage/40 bg-brand-sage/5 text-brand-sage'
                : 'border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
            }`}
          >
            {t(`tabs.${demo.key}`)}
          </button>
        ))}
      </div>

      {/* Screenshot */}
      <div className="relative mt-6 min-h-[200px] max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-lg shadow-black/25 sm:min-h-0">
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
      <p className="mt-4 max-w-5xl text-xs text-text-muted">{t(`captions.${DEMOS[active].key}`)}</p>
    </SectionV2>
  );
}
