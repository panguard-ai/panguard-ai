'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import FadeInUp from '@/components/FadeInUp';
import { Search, ShieldAlert, Sparkles, Globe, ArrowRight } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

interface Step {
  readonly icon: typeof Search;
  readonly titleKey: string;
  readonly subtitleKey: string;
  readonly timingKey: string;
  readonly detailKey: string;
  readonly color: string;
  readonly borderColor: string;
  readonly iconBg: string;
}

const steps: readonly Step[] = [
  {
    icon: Search,
    titleKey: 'step1.title',
    subtitleKey: 'step1.subtitle',
    timingKey: 'step1.timing',
    detailKey: 'step1.detail',
    color: 'text-emerald-400',
    borderColor: 'hover:border-emerald-400/50',
    iconBg: 'bg-emerald-400/10',
  },
  {
    icon: ShieldAlert,
    titleKey: 'step2.title',
    subtitleKey: 'step2.subtitle',
    timingKey: 'step2.timing',
    detailKey: 'step2.detail',
    color: 'text-red-400',
    borderColor: 'hover:border-red-400/50',
    iconBg: 'bg-red-400/10',
  },
  {
    icon: Sparkles,
    titleKey: 'step3.title',
    subtitleKey: 'step3.subtitle',
    timingKey: 'step3.timing',
    detailKey: 'step3.detail',
    color: 'text-yellow-400',
    borderColor: 'hover:border-yellow-400/50',
    iconBg: 'bg-yellow-400/10',
  },
  {
    icon: Globe,
    titleKey: 'step4.title',
    subtitleKey: 'step4.subtitle',
    timingKey: 'step4.timing',
    detailKey: 'step4.detail',
    color: 'text-emerald-400',
    borderColor: 'hover:border-emerald-400/50',
    iconBg: 'bg-emerald-400/10',
  },
] as const;

interface Competitor {
  readonly labelKey: string;
  readonly descKey: string;
  readonly highlight: boolean;
}

const competitors: readonly Competitor[] = [
  { labelKey: 'compare.cisco.label', descKey: 'compare.cisco.desc', highlight: false },
  { labelKey: 'compare.owasp.label', descKey: 'compare.owasp.desc', highlight: false },
  { labelKey: 'compare.panguard.label', descKey: 'compare.panguard.desc', highlight: true },
] as const;

function StepCard({
  step,
  index,
}: {
  readonly step: Step;
  readonly index: number;
}) {
  const t = useTranslations('home.howItWorks');
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.15, ease }}
      className={`group relative bg-surface-1 border border-border rounded-xl p-6 flex-1 min-w-0 transition-colors duration-300 ${step.borderColor}`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg ${step.iconBg} flex items-center justify-center mb-4`}>
        <Icon className={`w-5 h-5 ${step.color}`} strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-text-primary mb-1">
        {t(step.titleKey)}
      </h3>

      {/* Subtitle */}
      <p className="text-sm text-text-secondary mb-2">
        {t(step.subtitleKey)}
      </p>

      {/* Timing badge */}
      <span className={`inline-block text-xs font-mono ${step.color} opacity-80`}>
        {t(step.timingKey)}
      </span>

      {/* Hover detail overlay */}
      <div className="absolute inset-0 rounded-xl bg-surface-2/95 backdrop-blur-sm p-6 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
        <p className="text-sm text-text-secondary leading-relaxed">
          {t(step.detailKey)}
        </p>
      </div>
    </motion.div>
  );
}

function StepArrow({ index }: { readonly index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: index * 0.15 + 0.1, ease }}
      className="hidden md:flex items-center justify-center flex-shrink-0 px-1"
    >
      <ArrowRight className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
    </motion.div>
  );
}

export default function HowItWorks() {
  const t = useTranslations('home.howItWorks');

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <FadeInUp>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">
            {t('title')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed">
            {t('subtitle')}
          </p>
        </FadeInUp>

        {/* 4-step flow */}
        <div className="mt-12 flex flex-col md:flex-row md:items-stretch gap-4 md:gap-0">
          {steps.map((step, i) => (
            <div key={step.titleKey} className="flex flex-col md:flex-row md:items-stretch flex-1 min-w-0">
              <StepCard step={step} index={i} />
              {i < steps.length - 1 && <StepArrow index={i} />}
            </div>
          ))}
        </div>

        {/* Competitive comparison */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.6, ease }}
          className="mt-16 space-y-3"
        >
          {competitors.map((comp) => (
            <div
              key={comp.labelKey}
              className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-4 py-3 rounded-lg ${
                comp.highlight
                  ? 'border border-panguard-green/40 bg-panguard-green/5'
                  : 'border border-border/50 bg-surface-1/50'
              }`}
            >
              <span
                className={`text-sm font-semibold whitespace-nowrap ${
                  comp.highlight ? 'text-panguard-green-light' : 'text-text-secondary'
                }`}
              >
                {t(comp.labelKey)}
              </span>
              <span className="hidden sm:inline text-text-muted">--</span>
              <span
                className={`text-sm ${
                  comp.highlight ? 'text-text-primary' : 'text-text-muted'
                }`}
              >
                {t(comp.descKey)}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
