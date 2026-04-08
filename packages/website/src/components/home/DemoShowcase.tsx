'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const DEMOS = [
  {
    key: 'clean' as const,
    image: '/demo/demo-clean.png',
    alt: 'PanGuard scanner showing clean scan result for anthropics/claude-code',
  },
  {
    key: 'mcp' as const,
    image: '/demo/demo-mcp.png',
    alt: 'PanGuard detecting hardcoded secrets in MCP config',
  },
] as const;

export default function DemoShowcase() {
  const t = useTranslations('home.demo');
  const [active, setActive] = useState(0);

  return (
    <section className="relative px-5 sm:px-6 py-12 sm:py-16 border-b border-border/30 bg-surface-2/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold mb-3">
            {t('overline')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h2>
          <p className="text-sm text-text-secondary mt-3 max-w-lg mx-auto">{t('subtitle')}</p>
        </div>

        {/* Tab buttons */}
        <div className="flex justify-center gap-3 mb-6">
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
        <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl">
          <Image
            src={DEMOS[active].image}
            alt={DEMOS[active].alt}
            width={1440}
            height={900}
            className="w-full h-auto"
            priority={active === 0}
          />
          {/* Overlay gradient at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0e0f0e] to-transparent pointer-events-none" />
        </div>

        {/* Caption */}
        <p className="text-center text-[11px] text-text-muted mt-4">
          {t(`captions.${DEMOS[active].key}`)}
        </p>
      </div>
    </section>
  );
}
