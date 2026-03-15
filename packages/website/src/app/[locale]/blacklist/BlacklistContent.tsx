'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { ArrowRight, AlertTriangle, ShieldOff } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { STATS } from '@/lib/stats';

const STAT_CARDS = [
  {
    key: 'maliciousFound' as const,
    value: STATS.ecosystem.maliciousFound.toString(),
    color: 'text-red-400',
  },
  {
    key: 'critical' as const,
    value: STATS.ecosystem.findingsCritical.toString(),
    color: 'text-red-400',
  },
  {
    key: 'high' as const,
    value: STATS.ecosystem.findingsHigh.toString(),
    color: 'text-orange-400',
  },
];

const STEPS = ['step1', 'step2', 'step3'] as const;

export default function BlacklistContent() {
  const t = useTranslations('blacklistPage');

  return (
    <div className="pt-20">
      {/* Hero */}
      <SectionWrapper>
        <FadeInUp>
          <div className="text-center max-w-[700px] mx-auto">
            <p className="text-[11px] uppercase tracking-[0.15em] text-red-400 font-semibold mb-3">
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
                className="bg-surface-1 border border-red-400/20 rounded-xl p-6 text-center"
              >
                <p className={`text-3xl font-extrabold ${card.color}`}>{card.value}</p>
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
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-text-primary">
                    {i + 1}. {t(`howItWorks.${step}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* Severity Breakdown */}
      <SectionWrapper>
        <FadeInUp>
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-8">{t('severity.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Critical */}
              <div className="bg-surface-1 border border-red-400/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldOff className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-bold text-red-400 uppercase">
                    {t('severity.critical')}
                  </span>
                  <span className="text-2xl font-extrabold text-red-400 ml-auto">
                    {STATS.ecosystem.findingsCritical}
                  </span>
                </div>
                <p className="text-xs text-text-muted">{t('severity.criticalDesc')}</p>
              </div>
              {/* High */}
              <div className="bg-surface-1 border border-orange-400/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <span className="text-sm font-bold text-orange-400 uppercase">
                    {t('severity.high')}
                  </span>
                  <span className="text-2xl font-extrabold text-orange-400 ml-auto">
                    {STATS.ecosystem.findingsHigh}
                  </span>
                </div>
                <p className="text-xs text-text-muted">{t('severity.highDesc')}</p>
              </div>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper dark>
        <FadeInUp>
          <div className="text-center max-w-[600px] mx-auto">
            <ShieldOff className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center justify-center gap-2 bg-panguard-green text-white font-semibold rounded-xl px-8 py-3.5 text-sm hover:bg-panguard-green-light transition-all duration-200 active:scale-[0.98]"
              >
                {t('ctaInstall')} <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/Agent-Threat-Rule/agent-threat-rules/issues/new?title=Threat+Report&body=Describe+the+malicious+skill..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-red-400/40 text-red-400 font-semibold rounded-xl px-8 py-3.5 text-sm hover:bg-red-400/10 transition-all duration-200"
              >
                {t('ctaReport')} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </div>
  );
}
