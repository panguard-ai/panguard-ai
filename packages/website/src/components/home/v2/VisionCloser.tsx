'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { sageRich, Eyebrow } from './primitives';

/**
 * Closing section — deck p18 end state. Full-bleed hero-dark closer:
 * open-rules thesis headline, the Linux :: Red Hat analogy line,
 * and a single scan-first CTA.
 */
export default function VisionCloser() {
  const t = useTranslations('homeV2.vision');

  return (
    <section className="border-t border-border-subtle bg-surface-hero">
      <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
        <Eyebrow>{t('eyebrow')}</Eyebrow>

        <h2 className="mt-8 max-w-5xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          {t.rich('title', { sage: sageRich })}
        </h2>

        <p className="mt-8 font-mono text-sm tracking-wide text-text-muted">{t('analogy')}</p>

        <div className="mt-12">
          <Link
            href="/scan"
            className="sheen lift inline-block rounded-xl bg-panguard-green px-6 py-3 font-semibold text-surface-hero transition-colors duration-300 ease-out-quint hover:bg-panguard-green-light"
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
