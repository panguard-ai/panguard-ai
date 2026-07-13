'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Eyebrow, SectionTitleV2, SectionV2 } from './v2/primitives';

const DEMOS: readonly { key: string; image: string; alt: string; width: number; height: number }[] =
  [
    {
      key: 'overview',
      image: '/demo/dashboard-overview.png',
      alt: 'PanGuard dashboard Overview — posture at a glance, 747 ATR rules active, on-device detection, optional Layer C and collective defense both off by default',
      width: 1920,
      height: 1082,
    },
    {
      key: 'runtime',
      image: '/demo/dashboard-runtime.png',
      alt: 'PanGuard Runtime — live allow / deny / ask decisions from the MCP proxy as agents call tools, including a denied action and a low-confidence ask',
      width: 1920,
      height: 1086,
    },
    {
      key: 'skills',
      image: '/demo/dashboard-skills.png',
      alt: 'PanGuard Skills — 152 installed MCP skills across platforms, whitelisted versus tracked, with quarantine and trust actions',
      width: 1920,
      height: 1088,
    },
    {
      key: 'coverage',
      image: '/demo/dashboard-coverage.png',
      alt: 'PanGuard Coverage — agent platforms detected on the machine and whether each is protected: Claude Code, Cursor, Codex CLI, Gemini CLI configured',
      width: 1920,
      height: 1083,
    },
    {
      key: 'rules',
      image: '/demo/dashboard-rules.png',
      alt: 'PanGuard Rules — all 747 loaded ATR detection rules with severity, searchable; updates apply only on pga upgrade, never auto-pulled',
      width: 1920,
      height: 1085,
    },
    {
      key: 'threatcloud',
      image: '/demo/dashboard-threat-cloud.png',
      alt: 'PanGuard Threat Cloud — anonymous collective defense, off by default; shares matched rule IDs only, never prompts, code, files or hostname',
      width: 1920,
      height: 1090,
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
