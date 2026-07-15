'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Terminal, Copy, Check, ArrowUp, Star, ExternalLink } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import { STATS } from '@/lib/stats';

const INSTALL_COMMAND = 'npm install -g panguard && pga up';

// Button recipes (v2 language): emerald strictly for the primary action.
const PRIMARY_CTA =
  'sheen lift inline-flex items-center justify-center gap-2 rounded-xl bg-panguard-green px-6 py-3 text-sm font-semibold text-surface-hero transition-colors duration-300 ease-out-quint hover:bg-panguard-green-light';
const SECONDARY_CTA =
  'lift inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1';

export default function CTARoadmap() {
  const t = useTranslations('home.ctaRoadmap');
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(INSTALL_COMMAND)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard API unavailable
      });
  }

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="border-t border-border-subtle bg-surface-hero">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="max-w-3xl">
          {/* Install CTA */}
          <FadeInUp>
            <div className="rounded-2xl border border-border bg-surface-1 p-4 font-mono transition-colors duration-300 ease-out-quint hover:border-border-hover">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Terminal className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  <code className="select-all truncate text-sm text-brand-sage">
                    {INSTALL_COMMAND}
                  </code>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 rounded-lg p-2 transition-colors duration-200 hover:bg-surface-2"
                  aria-label="Copy install command"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-panguard-green" />
                  ) : (
                    <Copy className="h-4 w-4 text-text-muted" />
                  )}
                </button>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-micro text-text-muted">
              {t('installNote', { rules: STATS.atrRules })}
            </p>
          </FadeInUp>

          {/* Divider */}
          <div className="my-14 border-t border-border-subtle" />

          {/* Mission */}
          <FadeInUp delay={0.15}>
            <h2 className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-micro text-text-muted">
              <span aria-hidden className="inline-block h-px w-8 bg-border-hover" />
              {t('missionTitle')}
            </h2>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mt-8 space-y-4">
              <p className="font-display text-2xl font-bold leading-[1.15] tracking-tight text-text-primary sm:text-3xl">
                {t('mission1')}
              </p>
              <p className="font-display text-2xl font-bold leading-[1.15] tracking-tight text-text-primary sm:text-3xl">
                {t('mission2')}
              </p>
              <p className="font-display text-2xl font-bold leading-[1.15] tracking-tight text-text-primary sm:text-3xl">
                {t('mission3')}
              </p>
              <p className="font-display text-2xl font-bold leading-[1.15] tracking-tight text-brand-sage sm:text-3xl">
                {t('mission4')}
              </p>
            </div>
          </FadeInUp>

          {/* Divider */}
          <div className="my-14 border-t border-border-subtle" />

          {/* Bottom CTA Buttons */}
          <FadeInUp delay={0.3}>
            <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:gap-4">
              <a
                href="https://www.npmjs.com/package/@panguard-ai/panguard"
                target="_blank"
                rel="noopener noreferrer"
                className={PRIMARY_CTA}
              >
                <Terminal className="h-4 w-4" />
                {t('installNow')}
              </a>

              <button onClick={handleScrollToTop} className={SECONDARY_CTA}>
                <ArrowUp className="h-4 w-4" />
                {t('scanSkill')}
              </button>

              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className={SECONDARY_CTA}
              >
                <Star className="h-4 w-4" />
                GitHub
              </a>
            </div>
          </FadeInUp>

          {/* Bottom metadata */}
          <FadeInUp delay={0.35}>
            <div className="mt-10">
              <p className="font-mono text-[10px] uppercase tracking-micro text-text-muted">
                MIT Licensed <span className="mx-1">{'/'}</span>{' '}
                <a
                  href="https://doi.org/10.5281/zenodo.19178002"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-text-secondary"
                >
                  {t('paperPublished')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}
