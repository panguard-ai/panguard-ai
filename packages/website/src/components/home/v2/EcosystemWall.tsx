'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardV2 } from './primitives';

/**
 * Section 05 — Ecosystem wall. Deck p9: three honesty tiers.
 * Tier 1 ships ATR in production, tier 2 has merged public PRs,
 * tier 3 is engagement only — labeled as such, never inflated.
 */

// Proper nouns stay hardcoded; the sub-lines (prose claims, rule-pack sizes
// as merged at the time of each PR) come from homeV2.ecosystem messages so
// zh-TW gets real translations. Full list with PR links lives at /atr/adopters.
const TIER2_MERGES = [
  'Microsoft PyRIT',
  'OWASP A-S-R-H',
  'MISP / CIRCL',
  'SigmaHQ',
] as const;

function TierLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-micro text-text-muted">{children}</p>
  );
}

export default function EcosystemWall() {
  const t = useTranslations('homeV2.ecosystem');

  const TIER1_ADOPTERS = [
    { name: 'Cisco AI Defense', sub: t('tier1Sub1') },
    { name: 'Microsoft Agent Governance Toolkit', sub: t('tier1Sub2') },
    { name: 'Gen Digital', sub: t('tier1Sub3') },
  ];

  const TIER3_CONVERSATIONS = [
    { name: 'NIST', sub: t('tier3Sub1') },
    { name: 'OASIS', sub: t('tier3Sub2') },
    { name: 'Taiwan ITRI-AIEC', sub: t('tier3Sub3') },
    { name: 'India CeRAI', sub: t('tier3Sub4') },
  ];

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <div className="mt-12">
        <TierLabel>{t('tier1')}</TierLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {TIER1_ADOPTERS.map((adopter) => (
            <CardV2 key={adopter.name}>
              <h3 className="font-display text-lg font-bold text-text-primary">{adopter.name}</h3>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-micro text-text-muted">
                {adopter.sub}
              </p>
            </CardV2>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <TierLabel>{t('tier2')}</TierLabel>
        <div className="mt-4 flex flex-wrap gap-3">
          {TIER2_MERGES.map((name) => (
            <span
              key={name}
              className="rounded-xl border border-border bg-surface-1 px-4 py-2 text-sm text-text-primary"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <TierLabel>{t('tier3')}</TierLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {TIER3_CONVERSATIONS.map((item) => (
            <CardV2 key={item.name} provisional>
              <h3 className="font-display text-base font-bold text-text-secondary">{item.name}</h3>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-micro text-text-muted">
                {item.sub}
              </p>
            </CardV2>
          ))}
        </div>
      </div>

      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-text-muted">{t('caption')}</p>

      <div className="mt-10">
        <Link
          href="/atr/adopters"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('cta')}
        </Link>
      </div>
    </SectionV2>
  );
}
