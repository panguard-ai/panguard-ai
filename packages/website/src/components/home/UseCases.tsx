'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { ShieldCheck, Radio, Globe, MessageSquareCode } from 'lucide-react';

const cardIcons = [ShieldCheck, Radio, Globe, MessageSquareCode];

const cardKeys = ['audit', 'guard', 'community', 'agent'] as const;

const cardColors = [
  'border-brand-sage/30',
  'border-blue-400/30',
  'border-purple-400/30',
  'border-orange-400/30',
];

const iconColors = [
  'text-brand-sage bg-brand-sage/10',
  'text-blue-400 bg-blue-400/10',
  'text-purple-400 bg-purple-400/10',
  'text-orange-400 bg-orange-400/10',
];

export default function UseCases() {
  const t = useTranslations('home.useCases');

  return (
    <SectionWrapper id="use-cases">
      <div className="text-center mb-14">
        <SectionTitle overline={t('overline')} title={t('title')} subtitle={t('subtitle')} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {cardKeys.map((key, i) => {
          const Icon = cardIcons[i];
          return (
            <FadeInUp key={key} delay={i * 0.08}>
              <div
                className={`rounded-2xl border bg-surface-1/50 ${cardColors[i]} p-5 sm:p-6 h-full flex flex-col`}
              >
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColors[i]}`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">{t(`cards.${key}.title`)}</h3>
                </div>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed flex-1">
                  {t(`cards.${key}.description`)}
                </p>

                {/* Command snippet */}
                <div className="mt-4 rounded-lg bg-surface-0 px-3 py-2.5 border border-border">
                  <p className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                    {t(`cards.${key}.snippetLabel`)}
                  </p>
                  <code className="text-xs text-brand-sage font-mono leading-relaxed block whitespace-pre-wrap">
                    {t(`cards.${key}.snippet`)}
                  </code>
                </div>
              </div>
            </FadeInUp>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
