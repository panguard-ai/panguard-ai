'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardV2, CardKicker } from './primitives';

/** Rich-text renderer for <ink> tags — key phrase in paper ink on the PROVE card */
function inkRich(chunks: ReactNode): ReactNode {
  return <span className="text-paper-ink">{chunks}</span>;
}

/**
 * Section 04 — Protect & Prove. Deck p8: the same rulebook does two
 * things enterprises need. PROTECT stays in the dark deck language;
 * PROVE is a paper island — the site's only light-surface moment,
 * serif italic for the signed-document feel.
 */
export default function ProtectProve() {
  const t = useTranslations('homeV2.protectProve');

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <CardV2>
          <CardKicker>{t('protectKicker')}</CardKicker>
          <h3 className="mt-3 font-display text-2xl font-bold text-text-primary">
            {t('protectTitle')}
          </h3>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-micro text-brand-sage">
            {t('protectTag')}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{t('protectBody')}</p>
        </CardV2>

        <div className="paper lift rounded-2xl border border-paper-line p-6">
          <p className="font-mono text-[10px] uppercase tracking-micro text-paper-muted">
            {t('proveKicker')}
          </p>
          <h3 className="mt-3 font-serif text-3xl font-medium italic text-paper-ink">
            {t('proveTitle')}
          </h3>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-micro text-paper-muted">
            {t('proveTag')}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-paper-muted">
            {t.rich('proveBody', { ink: inkRich })}
          </p>
        </div>
      </div>

      <p className="mt-12 max-w-4xl font-display text-2xl font-bold leading-snug tracking-tight text-text-primary sm:text-3xl">
        {t.rich('collapse', { sage: sageRich })}
      </p>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">{t('honesty')}</p>

      <div className="mt-10">
        <Link
          href="/product/scan"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('cta')}
        </Link>
      </div>
    </SectionV2>
  );
}
