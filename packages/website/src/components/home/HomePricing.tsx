'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';
import SectionWrapper from '../ui/SectionWrapper';
import SectionTitle from '../ui/SectionTitle';
import FadeInUp from '../FadeInUp';

const PLAN_COUNT = 4;
const FEATURE_COUNTS = [3, 4, 5, 5];

export default function HomePricing() {
  const t = useTranslations('home.homePricing');

  return (
    <SectionWrapper id="pricing">
      <SectionTitle overline={t('overline')} title={t('title')} subtitle={t('subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
        {Array.from({ length: PLAN_COUNT }).map((_, i) => {
          const isRecommended = i === 2; // Pro
          return (
            <FadeInUp key={i} delay={i * 0.06}>
              <div
                className={`rounded-2xl border p-6 h-full flex flex-col ${
                  isRecommended
                    ? 'border-brand-sage bg-surface-1 ring-1 ring-brand-sage/20 card-glow-pulse'
                    : 'border-border bg-surface-1'
                }`}
              >
                {isRecommended && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-sage bg-brand-sage/10 rounded-full px-2.5 py-0.5 self-start mb-3">
                    {t('recommended')}
                  </span>
                )}
                <h3 className="text-lg font-bold text-text-primary">{t(`plans.${i}.name`)}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-text-primary">
                    {t(`plans.${i}.price`)}
                  </span>
                  <span className="text-sm text-text-muted">{t(`plans.${i}.period`)}</span>
                </div>
                <p className="text-sm text-text-secondary mt-2">{t(`plans.${i}.desc`)}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {Array.from({ length: FEATURE_COUNTS[i] }).map((_, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                      {t(`plans.${i}.features.${fi}`)}
                    </li>
                  ))}
                </ul>
                <Link
                  href={i === 0 ? '/docs/getting-started' : '/pricing'}
                  className={`mt-6 text-center font-semibold rounded-full px-6 py-3 transition-all duration-200 block ${
                    isRecommended
                      ? 'bg-brand-sage text-surface-0 hover:bg-brand-sage-light'
                      : 'border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage'
                  }`}
                >
                  {t(`plans.${i}.cta`)}
                </Link>
              </div>
            </FadeInUp>
          );
        })}
      </div>

      <FadeInUp delay={0.3}>
        <div className="mt-12 bg-surface-1 border border-border rounded-2xl p-8 max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-text-primary text-center">{t('reportTitle')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center sm:text-left">
                <p className="text-sm font-semibold text-text-primary">{t(`reports.${i}.name`)}</p>
                <p className="text-xs text-text-muted mt-1">{t(`reports.${i}.controls`)}</p>
                <p className="text-xl font-extrabold text-brand-sage mt-2">{t(`reports.${i}.price`)}</p>
                <p className="text-[10px] text-text-muted mt-0.5 line-through opacity-60">{t(`reports.${i}.market`)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary text-center mt-4">{t('reportNote')}</p>
          <div className="text-center mt-4">
            <Link
              href="/compliance"
              className="inline-flex items-center gap-2 text-brand-sage font-medium hover:gap-3 transition-all text-sm"
            >
              {t('reportCta')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </FadeInUp>

      <p className="text-xs text-text-muted text-center mt-6">{t('disclaimer')}</p>
    </SectionWrapper>
  );
}
