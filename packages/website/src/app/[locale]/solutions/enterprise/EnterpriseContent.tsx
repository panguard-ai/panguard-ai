'use client';

import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  ShieldIcon,
  TeamIcon,
  NetworkIcon,
  AnalyticsIcon,
  SettingsIcon,
  SupportIcon,
  LockIcon,
} from '@/components/ui/BrandIcons';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import FadeInUp from '@/components/FadeInUp';

const benefitIcons = [TeamIcon, NetworkIcon, AnalyticsIcon, LockIcon, SettingsIcon, SupportIcon];
const benefitKeys = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'] as const;
const statKeys = ['stat1', 'stat2', 'stat3'] as const;

export default function EnterpriseContent() {
  const t = useTranslations('solutions.enterprise');

  const tools = t.raw('integrations.tools') as string[];

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <NavBar />
      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 lg:px-[120px] pt-20 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <FadeInUp>
              <div className="inline-flex items-center gap-2 bg-surface-1 border border-border rounded-full px-4 py-1.5 mb-6">
                <TeamIcon className="w-3.5 h-3.5 text-brand-sage" />
                <span className="text-xs text-text-secondary font-medium">{t('overline')}</span>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <h1 className="text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-6">
                {t('title')}
                <br />
                <span className="text-brand-sage">{t('titleHighlight')}</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-2xl mx-auto">
                {t('subtitle')}
              </p>
            </FadeInUp>
            <FadeInUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/docs/getting-started"
                  className="bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                >
                  Install Free
                </Link>
                <Link
                  href="/docs/getting-started"
                  className="border border-border text-text-secondary font-semibold text-sm rounded-full px-8 py-3.5 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
                >
                  Get Started Free
                </Link>
              </div>
            </FadeInUp>
          </div>
        </section>

        {/* SLA bar */}
        <section className="px-6 lg:px-[120px] py-12 border-t border-border">
          <FadeInUp>
            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3 sm:gap-8 text-center">
              {statKeys.map((key, i) => (
                <div key={key}>
                  <p
                    className={`text-3xl font-bold ${i === 2 ? 'text-brand-sage' : 'text-text-primary'}`}
                  >
                    {t(`stats.${key}.value`)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">{t(`stats.${key}.label`)}</p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </section>

        {/* Benefits */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <FadeInUp>
              <h2 className="text-2xl font-bold text-text-primary text-center mb-12">
                {t('features.title')}
              </h2>
            </FadeInUp>
            <div className="grid md:grid-cols-2 gap-5 md:gap-8">
              {benefitKeys.map((key, i) => {
                const Icon = benefitIcons[i];
                return (
                  <FadeInUp key={key} delay={i * 0.1}>
                    <div className="flex gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-surface-1 border border-border flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand-sage" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-text-primary mb-1">
                          {t(`features.${key}.title`)}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {t(`features.${key}.desc`)}
                        </p>
                      </div>
                    </div>
                  </FadeInUp>
                );
              })}
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border bg-surface-1">
          <FadeInUp>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-3">{t('pricing.title')}</h2>
              <p className="text-text-secondary mb-8 max-w-xl mx-auto">{t('pricing.subtitle')}</p>
              <div className="bg-surface-0 rounded-2xl p-8 border border-border max-w-sm mx-auto text-center">
                <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-2">
                  Enterprise
                </p>
                <p className="text-3xl font-extrabold text-text-primary">Free &amp; Open Source</p>
                <p className="text-sm text-text-tertiary mt-2">Self-hosted, no licensing fees</p>
                <Link
                  href="/docs/getting-started"
                  className="mt-5 block text-center bg-brand-sage text-surface-0 font-semibold rounded-full px-5 py-3 text-sm hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                >
                  Install Now
                </Link>
              </div>
            </div>
          </FadeInUp>
        </section>

        {/* Integrations */}
        <section className="px-6 lg:px-[120px] py-12 border-t border-border">
          <FadeInUp>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-6">
                {t('integrations.title')}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {tools.map((tool) => (
                  <span
                    key={tool}
                    className="bg-surface-1 border border-border rounded-full px-4 py-2 text-sm text-text-secondary"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </FadeInUp>
        </section>

        {/* CTA */}
        <section className="px-6 lg:px-[120px] py-16 border-t border-border">
          <FadeInUp>
            <div className="max-w-2xl mx-auto text-center">
              <ShieldIcon className="w-10 h-10 text-brand-sage mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-text-primary mb-3">{t('cta.title')}</h2>
              <p className="text-text-secondary mb-6">{t('cta.desc')}</p>
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold text-sm rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </section>
      </main>
      <Footer />
    </div>
  );
}
