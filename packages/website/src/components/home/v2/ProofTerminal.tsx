'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';
import { sageRich, Eyebrow, SectionTitleV2, SectionV2, StatV2, SectionKicker } from './primitives';

/**
 * Section 03 — Proof. Deck p7: "It runs. Here's the attack getting caught."
 * Real pga scan capture (2026-07-02, ATR v3.5.3 bundle — do not "fix" the
 * version/count, it is a verbatim terminal capture), then the benchmark
 * row from STATS and the lane-based honesty paragraph.
 */
export default function ProofTerminal() {
  const t = useTranslations('homeV2.proof');

  return (
    <SectionV2>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <SectionTitleV2>{t.rich('title', { sage: sageRich })}</SectionTitleV2>

      <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-surface-hero p-6 font-mono text-sm">
        <div className="space-y-1.5">
          <div className="whitespace-nowrap">
            <span className="text-brand-sage">$</span>{' '}
            <span className="text-text-primary">pga scan openclaw-skill-twitter-helper.md</span>
          </div>
          <div className="term-dim whitespace-nowrap">loading ATR v3.5.3 (655 rules)…</div>
          <div className="whitespace-nowrap">
            <span className="term-critical">✗ CRITICAL</span>
            <span className="text-text-secondary">
              {' '}
              ATR-2026-00220 · Base64-Encoded RCE via Raw IP · confidence 92%
            </span>
          </div>
          <div className="whitespace-nowrap">
            <span className="term-critical">✗ CRITICAL</span>
            <span className="text-text-secondary">
              {' '}
              ATR-2026-00121 · Malicious Code in Skill Package · confidence 91%
            </span>
          </div>
          <div className="whitespace-nowrap">
            <span className="term-high">✗ HIGH</span>
            <span className="text-text-secondary">
              {' '}
              ATR-2026-00225 · Hardcoded Suspicious IP in Skill · confidence 92%
            </span>
          </div>
          <div className="term-dim whitespace-nowrap">
            verdict: 3 threats — a live malware dropper, caught before the agent loaded it
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-muted">{t('terminalCaption')}</p>

      <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-border-subtle pt-8 sm:grid-cols-4">
        <StatV2 value={`${STATS.benchmark.hackaprompt.recall}%`} label={t('b1Label')} />
        <StatV2 value={`${STATS.benchmark.pint.precision}%`} label={t('b2Label')} />
        <StatV2 value={`${STATS.benchmark.garak.recall}%`} label={t('b3Label')} />
        <StatV2
          value={`${STATS.benchmark.skill.recall}% / ${STATS.benchmark.skill.fp}%`}
          label={t('b4Label')}
        />
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-text-muted">{t('honesty')}</p>

      <div className="mt-10">
        <Link
          href="/research/benchmarks"
          className="lift inline-block rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
        >
          {t('cta')}
        </Link>
      </div>

      <SectionKicker>{t('kicker')}</SectionKicker>
    </SectionV2>
  );
}
