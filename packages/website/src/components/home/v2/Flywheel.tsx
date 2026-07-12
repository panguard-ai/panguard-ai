'use client';

import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { useRuleStatsContext } from '@/contexts/RuleStatsContext';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, CardV2, SectionKicker } from './primitives';

/**
 * Section 03 — Flywheel. Deck p4+p5 merged: the accumulation thesis
 * (every attack caught anywhere becomes a rule that protects everyone)
 * plus the machine-speed contrast against committee-era rulebooks.
 *
 * The diagram is animated: attack signals stream from the four inputs into
 * the corpus, the corpus ring slowly revolves (the deck's circular-arrow
 * motif), and freshly minted "+1 rule" chips stream out toward the
 * ~1 hr / attack label. Static under prefers-reduced-motion.
 */

const CYCLE = 3.6;

/** A connector lane with dots streaming left→right (rotates 90° on mobile). */
function FlowLane({ dots, chip }: { dots: number; chip?: string }) {
  const laneClass =
    'relative h-6 w-24 shrink-0 overflow-hidden rotate-90 md:rotate-0 my-[-14px] md:my-0';
  return (
    <span aria-hidden className={laneClass}>
      <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border-hover" />
      {Array.from({ length: dots }, (_, i) => (
        <motion.span
          key={i}
          className={
            chip
              ? 'absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-panguard-green/40 bg-surface-1 px-1.5 py-px font-mono text-[9px] leading-none text-panguard-green'
              : 'absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-panguard-green shadow-[0_0_6px_rgba(52,211,153,0.8)]'
          }
          initial={{ x: chip ? -40 : -6, opacity: 0 }}
          animate={{ x: 96, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: chip ? CYCLE / 2 : CYCLE / 2,
            delay: (i * CYCLE) / (dots * 2),
            repeat: Infinity,
            repeatDelay: CYCLE / 2,
            ease: 'linear',
          }}
        >
          {chip ?? null}
        </motion.span>
      ))}
    </span>
  );
}

export default function Flywheel() {
  const t = useTranslations('homeV2.flywheel');
  const { atrRules } = useRuleStatsContext();
  const reducedMotion = useReducedMotion();

  const inputs = [t('in1'), t('in2'), t('in3'), t('in4')];

  const staticArrow = (
    <span aria-hidden className="rotate-90 font-mono text-xl text-text-muted md:rotate-0">
      →
    </span>
  );

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
        {t('body')}
      </p>

      {/* Flywheel diagram: four inputs → accumulating corpus → machine speed */}
      <div className="mt-14 flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-6">
        <div className="flex w-full max-w-xs flex-col gap-3 md:w-auto">
          {inputs.map((label, i) => (
            <motion.span
              key={label}
              className="rounded-xl border border-border bg-surface-1 px-4 py-2 text-center font-mono text-sm text-text-secondary md:text-left"
              animate={
                reducedMotion
                  ? undefined
                  : { borderColor: ['#2E2A27', 'rgba(52,211,153,0.45)', '#2E2A27'] }
              }
              transition={{
                duration: 1.2,
                delay: (i * CYCLE) / 8,
                repeat: Infinity,
                repeatDelay: CYCLE - 1.2,
              }}
            >
              {label}
            </motion.span>
          ))}
        </div>

        {reducedMotion ? staticArrow : <FlowLane dots={4} />}

        <div className="relative flex h-[180px] w-[180px] shrink-0 items-center justify-center">
          {/* Revolving arc — the deck's circular-arrow motif around the corpus */}
          {!reducedMotion && (
            <motion.svg
              aria-hidden
              viewBox="0 0 100 100"
              className="absolute inset-[-10px] h-[200px] w-[200px]"
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            >
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="rgba(52,211,153,0.55)"
                strokeWidth="1"
                strokeDasharray="60 235"
                strokeLinecap="round"
              />
            </motion.svg>
          )}
          <motion.div
            className="flex h-[180px] w-[180px] flex-col items-center justify-center rounded-full border-2 border-brand-sage/50 px-4 text-center"
            animate={reducedMotion ? undefined : { scale: [1, 1.02, 1] }}
            transition={{ duration: CYCLE / 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="font-display text-xl font-bold text-text-primary">
              {t('corpusLabel')}
            </span>
            <span className="mt-1 font-mono text-2xl tabular-nums text-brand-sage">{atrRules}</span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-micro text-text-muted">
              {t('corpusTag')}
            </span>
          </motion.div>
        </div>

        {reducedMotion ? staticArrow : <FlowLane dots={1} chip="+1 rule" />}

        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-text-primary">{t('speedLabel')}</span>
          <span aria-hidden className="font-mono text-sm text-text-muted">
            →
          </span>
        </div>
      </div>

      {/* Old world vs ATR contrast */}
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <CardV2>
          <h3 className="font-display text-xl font-bold text-text-secondary">{t('oldTitle')}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('oldBody')}</p>
        </CardV2>
        <CardV2 emphasized>
          <h3 className="font-display text-xl font-bold text-text-primary">{t('newTitle')}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t('newBody')}</p>
        </CardV2>
      </div>

      <p className="mt-8 max-w-3xl text-base leading-relaxed text-text-secondary">{t('crystal')}</p>

      <SectionKicker>{t('kicker')}</SectionKicker>
    </SectionV2>
  );
}
