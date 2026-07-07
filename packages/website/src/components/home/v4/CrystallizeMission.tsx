'use client';

import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, ShieldAlert, Sparkles, Globe, ArrowRight } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2 } from '../v2/primitives';

/**
 * BEAT 8 — Crystallize + Mission.
 * Merges the threat-crystallization flow (formerly HowItWorks) with the
 * mission mantra (formerly inside CTARoadmap). This is the page's ONE
 * crystallization telling and its ONE mission moment: no stats, no install
 * command, no CTA button — the final CTA beat owns those.
 */

const ease = [0.22, 1, 0.36, 1] as const;

type StepId = 'step1' | 'step2' | 'step3' | 'step4';

interface Step {
  readonly icon: typeof Search;
  readonly id: StepId;
  /** Accent discipline (v2 language): red = threat data only (detect/block). */
  readonly threat: boolean;
}

const STEPS: readonly Step[] = [
  { icon: Search, id: 'step1', threat: false },
  { icon: ShieldAlert, id: 'step2', threat: true },
  { icon: Sparkles, id: 'step3', threat: false },
  { icon: Globe, id: 'step4', threat: false },
] as const;

function StepCard({ step, index }: { readonly step: Step; readonly index: number }) {
  const t = useTranslations('home.howItWorks');
  const reduceMotion = useReducedMotion();
  const Icon = step.icon;
  const accent = step.threat ? 'text-status-danger' : 'text-brand-sage';
  const iconBg = step.threat ? 'bg-status-danger/10' : 'bg-brand-sage/10';

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.12, ease }}
      className="min-w-0 flex-1 rounded-2xl border border-border bg-surface-1 p-5 transition-colors duration-300 ease-out-quint hover:border-border-hover"
    >
      {/* Mono step number (always sage) + icon */}
      <div className="mb-4 flex items-start justify-between">
        <span className="font-mono text-[11px] uppercase tracking-micro text-brand-sage">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${accent}`} strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="mb-1 text-base font-semibold text-text-primary">{t(`${step.id}.title`)}</h3>

      <p className="mb-3 text-sm leading-relaxed text-text-secondary">{t(`${step.id}.subtitle`)}</p>

      <span className={`inline-block font-mono text-[10px] uppercase tracking-micro ${accent}`}>
        {t(`${step.id}.timing`)}
      </span>
    </motion.div>
  );
}

function StepArrow({ index }: { readonly index: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: index * 0.12 + 0.1, ease }}
      className="hidden flex-shrink-0 items-center justify-center px-1 md:flex"
    >
      <ArrowRight className="h-5 w-5 text-text-muted" strokeWidth={1.5} />
    </motion.div>
  );
}

function MissionStatement() {
  const t = useTranslations('home.ctaRoadmap');
  const line =
    'font-display text-2xl font-bold leading-snug tracking-tight text-text-primary sm:text-3xl';

  return (
    <div className="mt-20 border-t border-border-subtle pt-14 sm:mt-24">
      <FadeInUp>
        <Eyebrow>{t('missionTitle')}</Eyebrow>
      </FadeInUp>

      <FadeInUp delay={0.1}>
        <div className="mt-8 max-w-3xl space-y-3">
          <p className={line}>{t('mission1')}</p>
          <p className={line}>{t('mission2')}</p>
          <p className={line}>{t('mission3')}</p>
          <p className="font-display text-2xl font-bold leading-snug tracking-tight text-brand-sage sm:text-3xl">
            {t('mission4')}
          </p>
        </div>
      </FadeInUp>
    </div>
  );
}

export default function CrystallizeMission() {
  const t = useTranslations('homeV4.crystallizeMission');
  const tHow = useTranslations('home.howItWorks');

  return (
    <SectionV2>
      {/* Section header */}
      <FadeInUp>
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          {tHow('subtitle')}
        </p>
      </FadeInUp>

      {/* 4-step crystallization flow */}
      <div className="mt-14 flex flex-col gap-3 md:flex-row md:items-stretch md:gap-0">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex min-w-0 flex-1 flex-col md:flex-row md:items-stretch">
            <StepCard step={step} index={i} />
            {i < STEPS.length - 1 && <StepArrow index={i} />}
          </div>
        ))}
      </div>

      {/* The page's one mission moment */}
      <MissionStatement />
    </SectionV2>
  );
}
