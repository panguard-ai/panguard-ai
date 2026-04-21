'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { STATS } from '@/lib/stats';

export default function LiveStats() {
  const t = useTranslations('home.liveStats');

  const stats = [
    { label: t('rules'), value: STATS.atrRules.toString() },
    { label: t('garakPrompts'), value: '666' },
    { label: t('recall'), value: '97.1%' },
    { label: t('skillsScanned'), value: STATS.ecosystem.skillsScanned.toLocaleString() },
  ];

  return (
    <section className="relative px-5 sm:px-6 py-8 sm:py-12 bg-surface-2 border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <FadeInUp key={stat.label} delay={i * 0.05}>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-brand-sage tabular-nums">
                  {stat.value}
                </p>
                <p className="text-[10px] sm:text-xs text-text-muted mt-2 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
}
