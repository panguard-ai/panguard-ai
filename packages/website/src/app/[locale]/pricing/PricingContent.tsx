'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';

const TIERS = [
  {
    id: 'community',
    name: 'Community',
    price: '$0',
    description: 'Free and open source. Perfect for developers.',
    cta: {
      text: 'Get Started on GitHub',
      href: 'https://github.com/panguard-ai/panguard-ai',
      external: true,
    },
    features: [
      'Full ATR access (311 rules)',
      'CLI installation',
      'Community support',
      'Open source license',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$500',
    period: '/month',
    description: 'For small teams scaling AI agent governance.',
    cta: { text: 'Join Waitlist', href: '/early-access' },
    features: [
      'Everything in Community',
      'Up to 5 team members',
      'Threat Cloud dashboard',
      'Priority scanning',
      'Email support',
    ],
    highlighted: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 'Custom',
    description: 'For organizations needing enterprise features.',
    cta: { text: 'Contact Sales', href: '/contact?tier=business' },
    features: [
      'Everything in Team',
      'Unlimited team members',
      'Custom integrations',
      'SLA support',
      'On-premises deployment',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'from $150K',
    period: '/year',
    description: 'Mission-critical deployments and compliance.',
    cta: { text: 'Contact Sales', href: '/contact?tier=enterprise' },
    features: [
      'Everything in Business',
      'Dedicated account manager',
      'SOC2 Type II compliance',
      '24/7 phone support',
      'Custom SLA',
    ],
  },
];

export default function PricingContent() {
  const t = useTranslations('pricing');

  return (
    <>
      <section className="relative min-h-[50vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-28 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative text-center w-full">
          <FadeInUp>
            <h1 className="text-[clamp(24px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              {t('title')} <span className="text-brand-sage">{t('titleHighlight')}</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              {t('subtitle')}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="mt-8 inline-block bg-brand-sage/10 border border-brand-sage/20 rounded-full px-6 py-2.5">
              <p className="text-sm text-brand-sage font-medium">{t('note')}</p>
            </div>
          </FadeInUp>
        </div>
      </section>

      <SectionWrapper>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier, i) => (
              <FadeInUp key={tier.id} delay={i * 0.08}>
                <div
                  className={`rounded-xl border p-8 flex flex-col h-full transition-all duration-200 ${
                    tier.highlighted
                      ? 'bg-brand-sage/5 border-brand-sage/30 ring-2 ring-brand-sage/20 scale-105 md:scale-100 lg:scale-105'
                      : 'bg-surface-2 border-border hover:border-brand-sage/50'
                  }`}
                >
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    {tier.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-text-primary">{tier.price}</span>
                    {tier.period && <span className="text-xs text-text-muted">{tier.period}</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-3">{tier.description}</p>

                  <div className="flex-1" />

                  <div className="my-8">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                      {t('features')}
                    </p>
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                          <span className="text-sm text-text-secondary">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {tier.cta.external ? (
                    <a
                      href={tier.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold transition-all duration-200 active:scale-[0.98] text-sm ${
                        tier.highlighted
                          ? 'bg-brand-sage text-surface-0 hover:bg-brand-sage-light'
                          : 'border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage'
                      }`}
                    >
                      {tier.cta.text} <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      href={tier.cta.href}
                      className={`inline-flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold transition-all duration-200 active:scale-[0.98] text-sm ${
                        tier.highlighted
                          ? 'bg-brand-sage text-surface-0 hover:bg-brand-sage-light'
                          : 'border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage'
                      }`}
                    >
                      {tier.cta.text} <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              {t('faqTitle')}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-4">{t('faqSubtitle')}</p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 mt-8 text-brand-sage font-semibold hover:text-brand-sage-light transition-colors"
            >
              {t('contactUs')} <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
