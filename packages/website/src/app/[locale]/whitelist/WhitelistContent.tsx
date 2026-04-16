'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { ArrowRight, CheckCircle } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { ShieldIcon } from '@/components/ui/BrandIcons';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';

const STEPS = ['step1', 'step2', 'step3'] as const;

export default function WhitelistContent() {
  const t = useTranslations('whitelistPage');
  const stats = useEcosystemStats();

  const trustScore =
    stats.skillsScanned > 0
      ? (((stats.skillsScanned - stats.blacklistedSkills) / stats.skillsScanned) * 100).toFixed(1)
      : '99.4';

  const STAT_CARDS = [
    {
      key: 'totalScanned' as const,
      value: stats.skillsScanned.toLocaleString(),
    },
    {
      key: 'safeSkills' as const,
      value: stats.whitelistedSkills.toLocaleString(),
    },
    {
      key: 'trustScore' as const,
      value: `${trustScore}%`,
    },
  ];

  return (
    <div className="pt-20">
      {/* Hero */}
      <SectionWrapper>
        <FadeInUp>
          <div className="text-center max-w-[700px] mx-auto">
            <p className="text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold mb-3">
              {t('overline')}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">{t('title')}</h1>
            <p className="text-base text-text-secondary">{t('subtitle')}</p>
          </div>
        </FadeInUp>

        {/* Stat Cards */}
        <FadeInUp delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-[700px] mx-auto">
            {STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className="bg-surface-1 border border-border rounded-xl p-6 text-center"
              >
                <p className="text-3xl font-extrabold text-panguard-green">{card.value}</p>
                <p className="text-sm text-text-muted mt-1">{t(`stats.${card.key}`)}</p>
              </div>
            ))}
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* How it works */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-4">{t('howItWorks.title')}</h2>
            <p className="text-sm text-text-secondary mb-8">{t('howItWorks.description')}</p>
            <div className="space-y-4">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-panguard-green shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {i + 1}. {t(`howItWorks.${step}`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <FadeInUp>
          <div className="text-center max-w-[500px] mx-auto">
            <ShieldIcon className="w-10 h-10 text-panguard-green mx-auto mb-4" />
            <p className="text-lg font-semibold text-text-primary mb-6">{t('cta')}</p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 bg-panguard-green text-white font-semibold rounded-xl px-8 py-3.5 text-sm hover:bg-panguard-green-light transition-all duration-200 active:scale-[0.98]"
            >
              {t('ctaBtn')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </div>
  );
}
