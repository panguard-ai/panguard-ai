'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { ExternalLink } from 'lucide-react';
import { STATS } from '@/lib/stats';

const CATEGORIES = [
  { name: 'Prompt Injection', count: 21 },
  { name: 'Tool Poisoning', count: 6 },
  { name: 'Data Exfiltration', count: 7 },
  { name: 'Credential Theft', count: 5 },
  { name: 'Excessive Autonomy', count: 4 },
  { name: 'Context Manipulation', count: 3 },
  { name: 'Model Security', count: 2 },
  { name: 'Multi-Agent Threats', count: 2 },
  { name: 'Agent Manipulation', count: 2 },
];

export default function ATRStandard() {
  const t = useTranslations('home.atrStandard');

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        <FadeInUp className="text-center mb-10">
          <p className="text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold mb-3">
            {t('overline')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h2>
          <p className="text-base text-text-secondary mt-3 max-w-2xl mx-auto">{t('subtitle')}</p>
        </FadeInUp>

        <FadeInUp delay={0.1} className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-10">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-panguard-green">{STATS.atrRules}</p>
            <p className="text-xs text-text-muted mt-1">{t('rules')}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-text-primary">9</p>
            <p className="text-xs text-text-muted mt-1">{t('categories')}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-text-primary">{STATS.atrPatterns}+</p>
            <p className="text-xs text-text-muted mt-1">{t('patterns')}</p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.2} className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="bg-surface-1 border border-border rounded-lg px-3 py-2.5 flex items-center justify-between min-w-0"
            >
              <span className="text-xs text-text-secondary leading-tight">{cat.name}</span>
              <span className="text-xs font-bold text-panguard-green shrink-0 ml-2">
                {cat.count}
              </span>
            </div>
          ))}
        </FadeInUp>

        <FadeInUp delay={0.3} className="text-center">
          <p className="text-sm text-text-muted mb-4">{t('bottomLine')}</p>
          <a
            href="https://github.com/Agent-Threat-Rule/agent-threat-rules"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-panguard-green hover:text-panguard-green-light transition-colors"
          >
            {t('viewGithub')} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </FadeInUp>
      </div>
    </section>
  );
}
