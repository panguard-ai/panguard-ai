'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { STATS } from '@/lib/stats';

const eco = STATS.ecosystem;
const total = eco.skillsScanned;
const safePercent = ((eco.findingsClean / total) * 100).toFixed(1);
const critPercent = ((eco.findingsCritical / total) * 100).toFixed(1);
const highPercent = ((eco.findingsHigh / total) * 100).toFixed(1);
const medPercent = ((eco.findingsMedium / total) * 100).toFixed(1);

const BUCKETS = [
  {
    labelKey: 'safe' as const,
    count: eco.findingsClean,
    percent: safePercent,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
  },
  {
    labelKey: 'critical' as const,
    count: eco.findingsCritical,
    percent: critPercent,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
  },
  {
    labelKey: 'high' as const,
    count: eco.findingsHigh,
    percent: highPercent,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
  {
    labelKey: 'medium' as const,
    count: eco.findingsMedium,
    percent: medPercent,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
  },
];

export default function EcosystemEvidence() {
  const t = useTranslations('home.evidence');

  const CONSEQUENCES = [
    { text: t('c1'), severity: 'CRITICAL' },
    { text: t('c2'), severity: 'CRITICAL' },
    { text: t('c3'), severity: 'CRITICAL' },
    { text: t('c4'), severity: 'HIGH' },
  ];

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        <FadeInUp className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.15em] text-red-400 font-semibold mb-3">
            {t('overline')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {t('title', { count: total.toLocaleString() })}
          </h2>
          <p className="text-base text-text-secondary mt-3">
            {t('subtitle', {
              entries: eco.entriesCrawled.toLocaleString(),
              sources: eco.registrySources,
            })}
          </p>
        </FadeInUp>

        <FadeInUp delay={0.15} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-12">
          {BUCKETS.map((b) => (
            <div
              key={b.labelKey}
              className={`${b.bg} border ${b.border} rounded-xl p-4 text-center`}
            >
              <p className={`text-2xl sm:text-3xl font-extrabold ${b.color}`}>{b.percent}%</p>
              <p className={`text-xs font-bold uppercase tracking-wider ${b.color} mt-1`}>
                {b.labelKey.toUpperCase()}
              </p>
              <p className="text-xs text-text-muted mt-1">{b.count.toLocaleString()} skills</p>
            </div>
          ))}
        </FadeInUp>

        <FadeInUp delay={0.3} className="bg-surface-1 border border-border rounded-2xl p-6">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4">
            {t('consequencesTitle')}
          </h3>
          <div className="space-y-3">
            {CONSEQUENCES.map((c) => (
              <div key={c.text} className="flex items-start gap-3">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                    c.severity === 'CRITICAL'
                      ? 'text-red-400 bg-red-400/10'
                      : 'text-orange-400 bg-orange-400/10'
                  }`}
                >
                  {c.severity}
                </span>
                <p className="text-sm text-text-secondary">{c.text}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-primary font-semibold mt-6 pt-4 border-t border-border">
            {t('conclusion')}
          </p>
        </FadeInUp>
      </div>
    </section>
  );
}
