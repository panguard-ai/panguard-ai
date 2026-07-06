'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import FadeInUp from '@/components/FadeInUp';
import { Search, ShieldAlert, Sparkles, Globe, ArrowRight } from 'lucide-react';
import { SectionV2 } from './v2/primitives';

const ease = [0.22, 1, 0.36, 1] as const;

interface Step {
  readonly icon: typeof Search;
  readonly titleKey: string;
  readonly subtitleKey: string;
  readonly timingKey: string;
  readonly detailKey: string;
  readonly color: string;
  readonly iconBg: string;
}

// Accent discipline (v2 language): sage = identity, red = threat data only.
const steps: readonly Step[] = [
  {
    icon: Search,
    titleKey: 'step1.title',
    subtitleKey: 'step1.subtitle',
    timingKey: 'step1.timing',
    detailKey: 'step1.detail',
    color: 'text-brand-sage',
    iconBg: 'bg-brand-sage/10',
  },
  {
    icon: ShieldAlert,
    titleKey: 'step2.title',
    subtitleKey: 'step2.subtitle',
    timingKey: 'step2.timing',
    detailKey: 'step2.detail',
    color: 'text-red-400',
    iconBg: 'bg-red-400/10',
  },
  {
    icon: Sparkles,
    titleKey: 'step3.title',
    subtitleKey: 'step3.subtitle',
    timingKey: 'step3.timing',
    detailKey: 'step3.detail',
    color: 'text-brand-sage',
    iconBg: 'bg-brand-sage/10',
  },
  {
    icon: Globe,
    titleKey: 'step4.title',
    subtitleKey: 'step4.subtitle',
    timingKey: 'step4.timing',
    detailKey: 'step4.detail',
    color: 'text-brand-sage',
    iconBg: 'bg-brand-sage/10',
  },
] as const;

function StepCard({ step, index }: { readonly step: Step; readonly index: number }) {
  const t = useTranslations('home.howItWorks');
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.15, ease }}
      className="group relative min-w-0 flex-1 rounded-2xl border border-border bg-surface-1 p-6 transition-colors duration-300 ease-out-quint hover:border-border-hover"
    >
      {/* Mono step number + icon */}
      <div className="mb-4 flex items-start justify-between">
        <span className="font-mono text-[11px] uppercase tracking-micro text-brand-sage">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.iconBg}`}>
          <Icon className={`h-5 w-5 ${step.color}`} strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-1 text-base font-semibold text-text-primary">{t(step.titleKey)}</h3>

      {/* Subtitle */}
      <p className="mb-3 text-sm leading-relaxed text-text-secondary">{t(step.subtitleKey)}</p>

      {/* Timing badge */}
      <span
        className={`inline-block font-mono text-[10px] uppercase tracking-micro ${step.color}`}
      >
        {t(step.timingKey)}
      </span>

      {/* Hover detail overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center rounded-2xl bg-surface-2/95 p-6 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
        <p className="text-sm leading-relaxed text-text-secondary">{t(step.detailKey)}</p>
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
      className="hidden flex-shrink-0 items-center justify-center px-1 md:flex"
    >
      <ArrowRight className="h-5 w-5 text-text-muted" strokeWidth={1.5} />
    </motion.div>
  );
}

export default function HowItWorks() {
  const t = useTranslations('home.howItWorks');

  return (
    <SectionV2>
      {/* Section header */}
      <FadeInUp>
        <h2 className="max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          {t('title')}
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          {t('subtitle')}
        </p>
      </FadeInUp>

      {/* 4-step flow */}
      <div className="mt-14 flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
        {steps.map((step, i) => (
          <div
            key={step.titleKey}
            className="flex min-w-0 flex-1 flex-col md:flex-row md:items-stretch"
          >
            <StepCard step={step} index={i} />
            {i < steps.length - 1 && <StepArrow index={i} />}
          </div>
        ))}
      </div>
    </SectionV2>
  );
}
