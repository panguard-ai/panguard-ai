'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, X, Minus } from 'lucide-react';
import { Link } from '@/navigation';
import SectionWrapper from '../ui/SectionWrapper';
import SectionTitle from '../ui/SectionTitle';
import FadeInUp from '../FadeInUp';

const approaches = ['diy', 'outsource', 'panguard'] as const;
type Approach = (typeof approaches)[number];

const rows = [
  'setup',
  'cost',
  'detection',
  'response',
  'learning',
  'reporting',
  'maintenance',
  'scalability',
] as const;

function CellIcon({ value }: { value: string }) {
  if (value === 'yes') return <Check className="w-4 h-4 text-status-safe inline" />;
  if (value === 'no') return <X className="w-4 h-4 text-status-danger inline" />;
  if (value === 'partial') return <Minus className="w-4 h-4 text-status-warning inline" />;
  return <span className="text-text-secondary text-sm">{value}</span>;
}

export default function TheOldWay() {
  const t = useTranslations('home.theOldWay');
  const [mobileTab, setMobileTab] = useState<Approach>('panguard');

  return (
    <SectionWrapper>
      <SectionTitle title={t('title')} subtitle={t('subtitle')} />

      {/* Desktop: 3-column comparison table */}
      <FadeInUp delay={0.1}>
        <div className="hidden md:block mt-12 max-w-4xl mx-auto">
          <div className="grid grid-cols-4 gap-0 border border-border rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="bg-surface-1 p-4 border-b border-border" />
            {approaches.map((a) => (
              <div
                key={a}
                className={`p-4 text-center border-b border-border font-bold text-sm ${
                  a === 'panguard'
                    ? 'bg-brand-sage/10 border-t-2 border-t-brand-sage text-brand-sage'
                    : 'bg-surface-1 text-text-secondary'
                }`}
              >
                {t(`columns.${a}`)}
              </div>
            ))}

            {/* Data rows */}
            {rows.map((row) => (
              <>
                <div key={`label-${row}`} className="p-4 text-sm text-text-secondary border-b border-border/50 bg-surface-0">
                  {t(`rows.${row}.label`)}
                </div>
                {approaches.map((a) => (
                  <div
                    key={`${row}-${a}`}
                    className={`p-4 text-center text-sm border-b border-border/50 ${
                      a === 'panguard' ? 'bg-brand-sage/5' : 'bg-surface-0'
                    }`}
                  >
                    <CellIcon value={t(`rows.${row}.${a}`)} />
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
      </FadeInUp>

      {/* Mobile: tab switcher */}
      <div className="md:hidden mt-10">
        <FadeInUp>
          <div className="flex justify-center gap-2 flex-wrap">
            {approaches.map((a) => (
              <button
                key={a}
                onClick={() => setMobileTab(a)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  mobileTab === a
                    ? 'bg-brand-sage text-surface-0'
                    : 'bg-surface-1 text-text-secondary border border-border'
                }`}
              >
                {t(`columns.${a}`)}
              </button>
            ))}
          </div>
        </FadeInUp>

        <div key={mobileTab} className="mt-6 tab-content-enter">
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row}
                className={`flex justify-between items-center p-4 rounded-xl border ${
                  mobileTab === 'panguard' ? 'border-brand-sage/20 bg-brand-sage/5' : 'border-border bg-surface-1'
                }`}
              >
                <span className="text-sm text-text-secondary">{t(`rows.${row}.label`)}</span>
                <CellIcon value={t(`rows.${row}.${mobileTab}`)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <FadeInUp delay={0.2}>
        <div className="text-center mt-10">
          <Link
            href="/early-access"
            className="inline-flex items-center gap-2 text-sm text-brand-sage hover:text-brand-sage-light transition-colors font-medium"
          >
            {t('cta')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </FadeInUp>
    </SectionWrapper>
  );
}
