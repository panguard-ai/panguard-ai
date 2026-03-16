'use client';

import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import { STATS } from '@/lib/stats';

export default function WhyPanguard() {
  const t = useTranslations('home.whyPanguard');

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-5xl mx-auto">
        {/* Title */}
        <FadeInUp>
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-3">
              {t('overline')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h2>
            <p className="text-base text-text-secondary mt-3 max-w-2xl mx-auto">{t('subtitle')}</p>
          </div>
        </FadeInUp>

        {/* Blind Spot — what EDR sees vs cannot see */}
        <FadeInUp delay={0.1}>
          <div className="grid md:grid-cols-2 gap-5 mb-12">
            <div className="bg-surface-1 rounded-xl border border-border p-6">
              <p className="text-sm font-bold text-text-primary mb-4">{t('edrSees')}</p>
              <ul className="space-y-2.5 text-sm text-text-secondary">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                  {t('sees1')}
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                  {t('sees2')}
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                  {t('sees3')}
                </li>
              </ul>
            </div>
            <div className="bg-surface-1 rounded-xl border border-red-400/30 p-6">
              <p className="text-sm font-bold text-red-400 mb-4">{t('edrMisses')}</p>
              <ul className="space-y-2.5 text-sm text-text-secondary">
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {t('miss1')}
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {t('miss2')}
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {t('miss3')}
                </li>
                <li className="flex items-start gap-2.5">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {t('miss4')}
                </li>
              </ul>
            </div>
          </div>
        </FadeInUp>

        {/* Quick comparison table */}
        <FadeInUp delay={0.2}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-text-tertiary font-medium border-b border-border">
                    {t('capability')}
                  </th>
                  <th className="py-3 px-4 font-semibold border-b text-center text-brand-sage border-brand-sage/40">
                    PanGuard
                  </th>
                  <th className="py-3 px-4 font-semibold border-b text-center text-text-secondary border-border">
                    CrowdStrike
                  </th>
                  <th className="py-3 px-4 font-semibold border-b text-center text-text-secondary border-border">
                    Snyk
                  </th>
                  <th className="py-3 px-4 font-semibold border-b text-center text-text-secondary border-border">
                    Lakera
                  </th>
                </tr>
              </thead>
              <tbody>
                {['row1', 'row2', 'row3', 'row4', 'row5'].map((key) => (
                  <tr key={key} className="border-b border-border/50">
                    <td className="py-3 px-4 text-text-primary font-medium">
                      {t(`table.${key}.feature`)}
                    </td>
                    <td className="py-3 px-4 text-center bg-brand-sage/5">
                      <CellIcon value={t(`table.${key}.panguard`)} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <CellIcon value={t(`table.${key}.crowdstrike`)} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <CellIcon value={t(`table.${key}.snyk`)} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <CellIcon value={t(`table.${key}.lakera`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-text-muted mt-4">
            {t('bottomLine', { rules: STATS.totalRulesDisplay })}
          </p>
        </FadeInUp>
      </div>
    </section>
  );
}

function CellIcon({ value }: { value: string }) {
  if (value === 'yes') return <Check className="w-4 h-4 text-brand-sage mx-auto" />;
  if (value === 'no') return <X className="w-4 h-4 text-text-muted mx-auto" />;
  return <span className="text-xs text-text-secondary">{value}</span>;
}
