'use client';

import { useTranslations } from 'next-intl';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import { STATS } from '@/lib/stats';

const ADOPTERS: readonly { name: string; detail: string; highlight?: boolean }[] = [
  { name: 'Cisco AI Defense', detail: '34 ATR rules merged', highlight: true },
  { name: 'OWASP', detail: 'Agentic Top 10 PR' },
  { name: 'SAFE-MCP', detail: '91.8% coverage' },
];

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-4 py-3">
      <div className="text-2xl sm:text-3xl font-extrabold text-panguard-green tabular-nums">
        {value}
      </div>
      <div className="text-[11px] text-text-muted mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function SocialProof() {
  const t = useTranslations('home.socialProof');
  const eco = useEcosystemStats();

  return (
    <section className="relative px-5 sm:px-6 py-12 sm:py-16 border-b border-border/30">
      <div className="max-w-4xl mx-auto">
        {/* Adoption logos */}
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-4">
            {t('overline')}
          </p>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {ADOPTERS.map((a) => (
              <div key={a.name} className="flex flex-col items-center gap-1">
                <span
                  className={`text-sm sm:text-base font-bold ${a.highlight ? 'text-panguard-green' : 'text-text-secondary'}`}
                >
                  {a.name}
                </span>
                <span className="text-[10px] text-text-muted">{a.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live metrics */}
        <div className="bg-surface-1/50 border border-border/50 rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <StatCard value={eco.atrRules.toString()} label={t('statRules')} />
            <StatCard
              value={
                eco.skillsScanned > 1000
                  ? `${Math.round(eco.skillsScanned / 1000)}K+`
                  : eco.skillsScanned.toString()
              }
              label={t('statScanned')}
            />
            <StatCard value={`${STATS.benchmark.skill.recall}%`} label={t('statRecall')} />
            <StatCard value={`${STATS.benchmark.pint.precision}%`} label={t('statPrecision')} />
          </div>
        </div>
      </div>
    </section>
  );
}
