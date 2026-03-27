'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import FadeInUp from '@/components/FadeInUp';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import { STATS } from '@/lib/stats';

type Severity = 'CRITICAL' | 'HIGH';

interface Incident {
  readonly id: string;
  readonly name: string;
  readonly severity: Severity;
  readonly cvss: string;
  readonly description: string;
  readonly source: string;
  readonly sourceUrl: string;
}

const INCIDENTS: readonly Incident[] = [
  {
    id: 'mcpjam',
    name: 'MCPJam Inspector',
    severity: 'CRITICAL',
    cvss: '9.8',
    description: 'Default 0.0.0.0 binding, one HTTP request = RCE. All versions before v1.4.3.',
    source: 'CVE-2026-23744',
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2026-23744',
  },
  {
    id: 'claude-code',
    name: 'Claude Code (Anthropic)',
    severity: 'CRITICAL',
    cvss: '8.7',
    description: 'Hooks + MCP config exploited for arbitrary shell execution and API key theft.',
    source: 'CVE-2025-59536 + CVE-2026-21852',
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2025-59536',
  },
  {
    id: 'azure-mcp',
    name: 'Azure MCP Server',
    severity: 'HIGH',
    cvss: '7.5',
    description: 'SSRF steals managed identity tokens. Attacker gains Azure resource access.',
    source: 'CVE-2026-26118',
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2026-26118',
  },
  {
    id: 'postmark',
    name: 'postmark-mcp',
    severity: 'HIGH',
    cvss: '--',
    description: 'Clean for 15 versions. v1.0.16 added silent BCC forwarding 3K-15K emails/day.',
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
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        {/* Headline */}
        <FadeInUp className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('title')}</h2>
          <p className="text-base text-text-secondary mt-3">{t('subtitle')}</p>
        </FadeInUp>

        {/* Incident Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {INCIDENTS.map((incident, index) => {
            const styles = SEVERITY_STYLES[incident.severity];

            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.1, ease }}
                className={`bg-surface-1 border ${styles.border} rounded-xl p-5 flex flex-col`}
              >
                {/* Header: name + badge */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-mono font-semibold text-text-primary">
                    {incident.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${styles.text} ${styles.bg}`}
                  >
                    {incident.severity}
                  </span>
                  {incident.cvss !== '--' && (
                    <span className={`text-xs font-mono ${styles.text}`}>CVSS {incident.cvss}</span>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed mb-3 flex-1">
                  {incident.description}
                </p>

                {/* Source link */}
                <a
                  href={incident.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors duration-200 underline underline-offset-2"
                >
                  {incident.source}
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <FadeInUp delay={0.5} className="text-center mt-10">
          <p className="text-sm text-text-secondary mb-4">
            {t('scanCount', {
              count: eco.skillsScanned.toLocaleString(),
              percent: riskPercent,
            })}
          </p>
          <button
            type="button"
            onClick={handleScanClick}
            className="inline-flex items-center gap-2 bg-panguard-green text-white font-semibold rounded-full px-8 py-3 text-sm hover:brightness-110 transition-all duration-200 active:scale-[0.98]"
          >
            {t('cta')}
          </button>
        </FadeInUp>
      </div>
    </section>
  );
}
