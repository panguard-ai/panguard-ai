'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import CopyCommand from '../v2/CopyCommand';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2 } from '../v2/primitives';

/** Quickstart: three numbered steps, each a real command. */
export default function GetStarted() {
  const t = useTranslations('homeV3.start');

  const steps = [
    { n: '01', label: t('step1'), cmd: 'npm install -g @panguard-ai/panguard' },
    { n: '02', label: t('step2'), cmd: 'panguard setup' },
    { n: '03', label: t('step3'), cmd: 'pga scan ./skill.md' },
  ];

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <ol className="mt-12 grid gap-4 lg:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n} className="rounded-2xl border border-border bg-surface-1 p-6">
            <p className="font-mono text-[11px] uppercase tracking-micro text-text-muted">
              <span className="text-brand-sage">{step.n}</span> · {step.label}
            </p>
            <CopyCommand command={step.cmd} copiedLabel={t('copied')} className="mt-4 w-full" />
          </li>
        ))}
      </ol>

      <p className="mt-10 max-w-3xl text-sm leading-relaxed text-text-muted">{t('free')}</p>

      <div className="mt-8">
        <Link
          href="/docs/getting-started"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('cta')}
        </Link>
      </div>
    </SectionV2>
  );
}
