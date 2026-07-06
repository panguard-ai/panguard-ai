'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import FadeInUp from '@/components/FadeInUp';
import { Eyebrow, SectionTitleV2 } from '@/components/home/v2/primitives';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import { STATS } from '@/lib/stats';

type Severity = 'CRITICAL' | 'HIGH';

interface Incident {
  readonly id: string;
  /** 1-based index into the realIncidents i18n keys (incident{n}Name / incident{n}Desc). */
  readonly key: number;
  readonly severity: Severity;
  readonly cvss: string;
  readonly source: string;
  readonly sourceUrl: string;
}

/**
 * Name + description are rendered from i18n (incident{key}Name / incident{key}Desc)
 * so the zh-TW page shows the Chinese prose, not the English source sentence.
 * CVE ids, CVSS, and severity labels stay in English by design.
 */
const INCIDENTS: readonly Incident[] = [
  {
    id: 'mcpjam',
    key: 1,
    severity: 'CRITICAL',
    cvss: '9.8',
    source: 'CVE-2026-23744',
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2026-23744',
  },
  {
    id: 'claude-code',
    key: 2,
    severity: 'CRITICAL',
    cvss: '8.7',
    source: 'CVE-2025-59536 + CVE-2026-21852',
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2025-59536',
  },
  {
    id: 'azure-mcp',
    key: 3,
    severity: 'HIGH',
    cvss: '7.5',
    source: 'CVE-2026-26118',
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2026-26118',
  },
  {
    id: 'postmark',
    key: 4,
    severity: 'HIGH',
    cvss: '--',
    source: 'ATR ClawHub scan',
    sourceUrl: 'https://github.com/panguard-ai/panguard-ai',
  },
] as const;

const SEVERITY_STYLES: Record<Severity, { text: string; bg: string; border: string }> = {
  CRITICAL: {
    text: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
  },
  HIGH: {
    text: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
  },
};

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * BEAT 2 — "why now" full-bleed band. Sits immediately after the hero:
 * tonal shift to surface-1 with top/bottom hairlines marks the first
 * rhythm break of the page. Tighter vertical padding than SectionV2 —
 * a band, not a chapter.
 */
export default function RealIncidents() {
  const t = useTranslations('home.realIncidents');
  const eco = useEcosystemStats();

  const scannedSkills = STATS.ecosystem.skillsScanned;
  const criticalHigh = STATS.ecosystem.findingsCritical + STATS.ecosystem.findingsHigh;
  const riskPercent =
    eco.skillsScanned > 0 ? ((criticalHigh / scannedSkills) * 100).toFixed(1) : '13.5';

  function handleScanClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="relative border-y border-border-subtle bg-surface-1">
      {/* Subtle threat tint anchored top-left — decorative only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 0% 0%, rgba(239,68,68,0.04), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        {/* Headline */}
        <FadeInUp className="mb-12 lg:mb-14">
          <Eyebrow>{t('subtitle')}</Eyebrow>
          <SectionTitleV2>{t('title')}</SectionTitleV2>
        </FadeInUp>

        {/* Incident Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INCIDENTS.map((incident, index) => {
            const styles = SEVERITY_STYLES[incident.severity];

            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.1, ease }}
                className="lift flex flex-col rounded-2xl border border-border bg-surface-2 p-6 transition-colors duration-300 ease-out-quint hover:border-border-hover"
              >
                {/* Header: name + badge */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-text-primary">
                    {t(`incident${incident.key}Name`)}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-micro ${styles.text} ${styles.bg} ${styles.border}`}
                  >
                    {incident.severity}
                  </span>
                  {incident.cvss !== '--' && (
                    <span className={`font-mono text-xs ${styles.text}`}>CVSS {incident.cvss}</span>
                  )}
                </div>

                {/* Description */}
                <p className="mb-4 flex-1 text-sm leading-relaxed text-text-secondary">
                  {t(`incident${incident.key}Desc`)}
                </p>

                {/* Source link */}
                <a
                  href={incident.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-text-muted underline underline-offset-4 transition-colors duration-200 hover:text-text-secondary"
                >
                  {incident.source}
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <FadeInUp delay={0.5} className="mt-14 border-t border-border-subtle pt-8">
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            {t('scanCount', {
              count: eco.skillsScanned.toLocaleString(),
              percent: riskPercent,
            })}
          </p>
          <button
            type="button"
            onClick={handleScanClick}
            className="sheen lift mt-6 inline-flex items-center rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-2"
          >
            {t('cta')}
          </button>
        </FadeInUp>
      </div>
    </section>
  );
}
