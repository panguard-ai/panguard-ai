'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { STATS } from '@/lib/stats';
import { StatV2 } from './v2/primitives';

export default function LiveStats() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  const stats = [
    {
      label: isZh ? 'ATR 規則數' : 'ATR rules',
      value: STATS.totalRulesDisplay,
    },
    {
      label: isZh ? 'Garak 對抗樣本' : 'Garak prompts',
      value: STATS.benchmark.garak.samples.toLocaleString(),
    },
    {
      label: isZh ? 'Garak recall' : 'Garak recall',
      value: `${STATS.benchmark.garak.recall}%`,
    },
    {
      label: isZh ? '已掃描技能' : 'Skills scanned',
      value: STATS.ecosystem.skillsScanned.toLocaleString(),
    },
  ];

  return (
    <section className="border-y border-border-subtle bg-surface-2">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <FadeInUp key={stat.label} delay={i * 0.05}>
              <StatV2
                value={<span className="tabular-nums">{stat.value}</span>}
                label={stat.label}
              />
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
}
