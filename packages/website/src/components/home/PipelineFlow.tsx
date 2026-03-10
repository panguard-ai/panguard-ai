'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import {
  Terminal,
  Search,
  ShieldCheck,
  Brain,
  FileCode2,
  Cloud,
  ArrowDown,
} from 'lucide-react';

const stepKeys = ['install', 'scan', 'knownCheck', 'llmAnalysis', 'generateRule', 'uploadCloud'] as const;

const stepIcons = [Terminal, Search, ShieldCheck, Brain, FileCode2, Cloud];

const stepColors = [
  'border-brand-sage/30 bg-brand-sage/5',
  'border-brand-sage/30 bg-brand-sage/5',
  'border-blue-400/30 bg-blue-400/5',
  'border-purple-400/30 bg-purple-400/5',
  'border-orange-400/30 bg-orange-400/5',
  'border-brand-sage/30 bg-brand-sage/5',
];

const iconColors = [
  'text-brand-sage bg-brand-sage/10',
  'text-brand-sage bg-brand-sage/10',
  'text-blue-400 bg-blue-400/10',
  'text-purple-400 bg-purple-400/10',
  'text-orange-400 bg-orange-400/10',
  'text-brand-sage bg-brand-sage/10',
];

const numberColors = [
  'text-brand-sage',
  'text-brand-sage',
  'text-blue-400',
  'text-purple-400',
  'text-orange-400',
  'text-brand-sage',
];

export default function PipelineFlow() {
  const t = useTranslations('revolution.pipeline');

  return (
    <SectionWrapper>
      <div className="text-center mb-14">
        <FadeInUp>
          <h2 className="text-[clamp(20px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
            {t('title')}
          </h2>
          <p className="text-text-secondary mt-4 max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </FadeInUp>
      </div>

      <div className="max-w-2xl mx-auto">
        {stepKeys.map((key, i) => {
          const Icon = stepIcons[i];
          return (
            <div key={key}>
              <FadeInUp delay={i * 0.06}>
                <div className={`rounded-xl border p-5 flex items-start gap-4 ${stepColors[i]}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColors[i]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-mono font-bold ${numberColors[i]}`}>
                        {t(`steps.${key}.number`)}
                      </span>
                      <h3 className="text-sm font-bold text-text-primary">
                        {t(`steps.${key}.title`)}
                      </h3>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {t(`steps.${key}.desc`)}
                    </p>
                    <p className="text-xs text-text-muted mt-2 font-mono">
                      {t(`steps.${key}.detail`)}
                    </p>
                  </div>
                </div>
              </FadeInUp>
              {i < stepKeys.length - 1 && (
                <div className="flex justify-center py-1.5">
                  <ArrowDown className="w-4 h-4 text-text-muted/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FadeInUp delay={0.4}>
        <p className="text-center text-sm text-text-secondary font-semibold mt-10 max-w-lg mx-auto">
          {t('bottomLine')}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
