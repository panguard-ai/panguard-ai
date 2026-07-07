'use client';

import { useTranslations } from 'next-intl';
import { useRuleStatsContext } from '@/contexts/RuleStatsContext';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2 } from '../v2/primitives';

/**
 * Architecture: inputs → deterministic engine → verdict → signed record.
 * Pure CSS flow, mono labels. The three guarantees below are the
 * doctrine-approved design invariants (zero telemetry, air-gap,
 * deterministic-evidence-only blocking).
 */
export default function ArchFlow() {
  const t = useTranslations('homeV3.arch');
  const { atrRules } = useRuleStatsContext();

  const stages = [
    { label: t('flowIn'), sub: t('flowInSub'), emphasized: false },
    { label: t('flowEngine'), sub: t('flowEngineSub', { count: atrRules }), emphasized: true },
    { label: t('flowVerdict'), sub: t('flowVerdictSub'), emphasized: false },
    { label: t('flowRecord'), sub: t('flowRecordSub'), emphasized: false },
  ];

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <div className="mt-12 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        {stages.map((stage, i) => (
          <div
            key={stage.label}
            className="flex flex-1 flex-col items-stretch gap-3 lg:flex-row lg:items-center"
          >
            {i > 0 && (
              <span
                aria-hidden
                className="self-center font-mono text-xl text-text-muted lg:rotate-0"
              >
                →
              </span>
            )}
            <div
              className={`flex-1 rounded-2xl border p-5 ${
                stage.emphasized
                  ? 'border-brand-sage/40 bg-surface-1'
                  : 'border-border bg-surface-1'
              }`}
            >
              <p className="font-mono text-[11px] uppercase tracking-micro text-text-primary">
                {stage.label}
              </p>
              <p className="mt-2 font-mono text-xs leading-relaxed text-text-muted">{stage.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <ul className="mt-10 grid gap-3 md:grid-cols-3">
        {[t('chip1'), t('chip2'), t('chip3')].map((chip) => (
          <li
            key={chip}
            className="rounded-xl border border-border-subtle bg-surface-0 px-4 py-3 text-sm leading-relaxed text-text-secondary"
          >
            {chip}
          </li>
        ))}
      </ul>
    </SectionV2>
  );
}
