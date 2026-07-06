'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';

/** One quiet line of mission above the footer — the vision, without the pitch. */
export default function MissionLine() {
  const t = useTranslations('homeV3.mission');

  return (
    <section className="border-t border-border-subtle bg-surface-hero">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p className="max-w-3xl text-base leading-relaxed text-text-secondary">
          {t('text')}{' '}
          <Link href="/about" className="link-reveal text-text-primary">
            {t('link')} →
          </Link>
        </p>
      </div>
    </section>
  );
}
