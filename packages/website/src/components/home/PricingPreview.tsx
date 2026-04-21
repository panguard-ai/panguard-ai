'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';

const TIERS = [
  {
    id: 'community',
    price: '$0',
    cta: 'getStarted',
    ctaHref: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'team',
    price: '$500',
    period: '/mo',
    cta: 'joinWaitlist',
    ctaHref: '/early-access',
  },
  {
    id: 'business',
    price: 'Custom',
    cta: 'contactSales',
    ctaHref: '/contact?tier=business',
  },
  {
    id: 'enterprise',
    price: '$150K+',
    period: '/yr',
    cta: 'contactSales',
    ctaHref: '/contact?tier=enterprise',
  },
];

export default function PricingPreview() {
  const t = useTranslations('home.pricingPreview');

  return (
    <SectionWrapper>
      <SectionTitle
        overline={t('overline')}
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <div className="max-w-6xl mx-auto mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {TIERS.map((tier, i) => (
          <FadeInUp key={tier.id} delay={i * 0.06}>
            <div className="bg-surface-2 rounded-xl border border-border p-6 flex flex-col h-full hover:border-brand-sage/50 transition-colors">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                {t(`tier.${tier.id}.name`)}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-text-primary">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-xs text-text-muted">{tier.period}</span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-3 line-clamp-2">
                {t(`tier.${tier.id}.desc`)}
              </p>
              <div className="flex-1" />
              {tier.external ? (
                <a
                  href={tier.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-2.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
                >
                  {t(`cta.${tier.cta}`)} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Link
                  href={tier.ctaHref}
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-2.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
                >
                  {t(`cta.${tier.cta}`)} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </FadeInUp>
        ))}
      </div>
      <FadeInUp delay={0.3}>
        <p className="text-center text-xs text-text-muted mt-8">
          {t('note')}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
