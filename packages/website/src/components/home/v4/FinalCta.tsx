'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUp, Check, Copy, Star, Terminal } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';

/**
 * v4 BEAT 10 — the closer. Hero-dark band with the two-tone closing
 * headline, the install command rendered as a shell prompt line, and
 * the secondary CTA pair (Scan a Skill / GitHub). No stats here —
 * the hero owns all numbers.
 */

const INSTALL_COMMAND = 'npm install -g @panguard-ai/panguard && pga up';
const COPY_FEEDBACK_MS = 2000;
const GITHUB_URL = 'https://github.com/panguard-ai/panguard-ai';

// Button recipe (v2 language): hairline secondary, emerald stays with the terminal action.
const SECONDARY_CTA =
  'lift inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1';

export default function FinalCta() {
  const t = useTranslations('home.finalCta');
  const tCta = useTranslations('home.ctaRoadmap');
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(INSTALL_COMMAND)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      })
      .catch(() => {
        // Clipboard API unavailable (permissions / non-secure context) — no-op.
      });
  }

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="border-t border-border-subtle bg-surface-hero">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="max-w-3xl">
          {/* Two-tone closing headline */}
          <FadeInUp>
            <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block text-text-primary">{t('title')}</span>
              <span className="block text-brand-sage">{t('titleHighlight')}</span>
            </h2>
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary">
              {t('bottomLine')}
            </p>
          </FadeInUp>

          {/* Install command as a shell prompt line */}
          <FadeInUp delay={0.15}>
            <div className="mt-12 rounded-2xl border border-border bg-surface-1 p-4 font-mono transition-colors duration-300 ease-out-quint hover:border-border-hover">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Terminal aria-hidden className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  <span aria-hidden className="select-none text-text-muted">
                    $
                  </span>
                  <code className="select-all truncate text-sm text-brand-sage">
                    {INSTALL_COMMAND}
                  </code>
                </div>
                <button
                  type="button"
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

          {/* Secondary CTA row */}
          <FadeInUp delay={0.2}>
            <div className="mt-8 flex flex-col flex-wrap gap-3 sm:flex-row sm:gap-4">
              <button type="button" onClick={handleScrollToTop} className={SECONDARY_CTA}>
                <ArrowUp className="h-4 w-4" />
                {tCta('scanSkill')}
              </button>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={SECONDARY_CTA}
              >
                <Star className="h-4 w-4" />
                GitHub
              </a>
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}
