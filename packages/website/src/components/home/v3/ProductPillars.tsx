'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardKicker } from '../v2/primitives';

/**
 * The four product surfaces — the core of a software site.
 * Each card: kicker, title, one-job description, the actual command,
 * and a link to its product page. Evidence keeps the paper treatment.
 */
export default function ProductPillars() {
  const t = useTranslations('homeV3.products');

  const pillars = [
    { k: 'p1', href: '/product/scan', paper: false },
    { k: 'p2', href: '/product/guard', paper: false },
    { k: 'p3', href: '/compliance', paper: true },
    { k: 'p4', href: '/threat-cloud', paper: false },
  ] as const;

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {pillars.map(({ k, href, paper }) => (
          <Link
            key={k}
            href={href}
            className={
              paper
                ? 'paper lift group flex flex-col rounded-2xl border border-paper-line p-6'
                : 'lift group flex flex-col rounded-2xl border border-border bg-surface-1 p-6 transition-colors duration-300 ease-out-quint hover:border-border-hover'
            }
          >
            {paper ? (
              <p className="font-mono text-[10px] uppercase tracking-micro text-paper-muted">
                {t(`${k}Kicker`)}
              </p>
            ) : (
              <CardKicker>{t(`${k}Kicker`)}</CardKicker>
            )}
            <h3
              className={`mt-3 font-display text-2xl font-bold ${
                paper ? 'text-paper-ink' : 'text-text-primary'
              }`}
            >
              {t(`${k}Title`)}
            </h3>
            <p
              className={`mt-2 text-sm leading-relaxed ${
                paper ? 'text-paper-muted' : 'text-text-secondary'
              }`}
            >
              {t(`${k}Body`)}
            </p>
            <p
              className={`mt-5 font-mono text-[13px] ${
                paper ? 'text-paper-muted' : 'text-text-muted'
              }`}
            >
              <span className={paper ? 'text-paper-ink' : 'text-brand-sage'}>$ </span>
              {t(`${k}Cmd`)}
            </p>
          </Link>
        ))}
      </div>
    </SectionV2>
  );
}
