'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import BrandLogo from '@/components/ui/BrandLogo';
import FadeInUp from '@/components/FadeInUp';

interface ComingSoonContentProps {
  productKey: 'report';
}

export default function ComingSoonContent({ productKey }: ComingSoonContentProps) {
  const t = useTranslations('comingSoon');

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-6 py-24">
      <FadeInUp>
        <div className="text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-surface-1 border border-border flex items-center justify-center mx-auto mb-6">
            <BrandLogo size={28} className="text-brand-sage opacity-40" />
          </div>

          <span className="inline-block text-[11px] uppercase tracking-[0.12em] text-text-muted font-semibold bg-surface-1 border border-border rounded-full px-4 py-1.5 mb-6">
            {t('badge')}
          </span>

          <h1 className="text-[clamp(28px,4vw,48px)] font-bold text-text-primary leading-[1.1] mb-4">
            {t(`${productKey}.title`)}
          </h1>

          <p className="text-text-secondary text-lg leading-relaxed mb-8">
            {t(`${productKey}.subtitle`)}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/panguard-ai/panguard-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
            >
              {t(`${productKey}.followProgress`)}
            </a>
            <Link
              href="/"
              className="border border-border text-text-secondary font-semibold text-sm rounded-full px-6 py-3 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
            >
              {t('backHome')}
            </Link>
          </div>
        </div>
      </FadeInUp>
    </section>
  );
}
