'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, AlertTriangle, Shield } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';

type Severity = 'CRITICAL' | 'HIGH';

interface NotableSkill {
  name: string;
  downloads: number;
  severity: Severity;
  summary: string;
  detail: string;
}

const NOTABLE_SKILLS: readonly NotableSkill[] = [
  {
    name: 'tesla-fleet-api',
    downloads: 2839,
    severity: 'CRITICAL',
    summary: "Can override your agent's system prompt",
    detail:
      'Controls your Tesla fleet -- prompt injection allows full override of agent instructions, enabling unauthorized vehicle commands.',
  },
  {
    name: 'walletconnect-agent',
    downloads: 2206,
    severity: 'CRITICAL',
    summary: "Can override your agent's system prompt",
    detail:
      'Connects to your crypto wallet -- prompt injection allows an attacker to redirect transactions or exfiltrate private keys.',
  },
  {
    name: 'clawsec',
    downloads: 9491,
    severity: 'HIGH',
    summary: 'A security tool with security holes',
    detail:
      'Ironically, this security-focused skill contains resource exhaustion and data exfiltration patterns that undermine the protections it claims to provide.',
  },
  {
    name: 'safe-exec',
    downloads: 2142,
    severity: 'HIGH',
    summary: "Named 'safe' but isn't safe",
    detail:
      'Despite its reassuring name, this skill contains unsafe code execution patterns that bypass sandbox restrictions.',
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

export default function Evidence() {
  const t = useTranslations('home.evidence');
  const eco = useEcosystemStats();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const totalScanned = eco.skillsScanned;
  const riskPercent =
    totalScanned > 0 ? ((eco.threatsDetected / totalScanned) * 100).toFixed(1) : '13.4';

  function handleToggle(index: number) {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }

  function handleScanClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-4xl mx-auto">
        {/* Headline */}
        <FadeInUp className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {t('title', {
              count: totalScanned.toLocaleString(),
              percent: riskPercent,
            })}
          </h2>
          <p className="text-base text-text-secondary mt-3">{t('subtitle')}</p>
        </FadeInUp>

        {/* Case Cards */}
        <div className="space-y-3">
          {NOTABLE_SKILLS.map((skill, index) => {
            const isExpanded = expandedIndex === index;
            const styles = SEVERITY_STYLES[skill.severity];

            return (
              <FadeInUp key={skill.name} delay={0.1 * index}>
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  className="w-full text-left bg-surface-1 border border-border rounded-xl p-4 sm:p-5 transition-colors hover:border-border/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {skill.severity === 'CRITICAL' ? (
                        <AlertTriangle className={`w-4 h-4 shrink-0 ${styles.text}`} />
                      ) : (
                        <Shield className={`w-4 h-4 shrink-0 ${styles.text}`} />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-text-primary">
                            {skill.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${styles.text} ${styles.bg}`}
                          >
                            {skill.severity}
                          </span>
                          <span className="text-xs text-text-muted">
                            {skill.downloads.toLocaleString()} downloads
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mt-0.5">{skill.summary}</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    </motion.div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className={`mt-3 pt-3 border-t ${styles.border}`}>
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {skill.detail}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </FadeInUp>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <FadeInUp delay={0.5} className="text-center mt-10">
          <p className="text-sm text-text-muted">
            {t('dontTakeOurWord')}{' '}
            <button
              type="button"
              onClick={handleScanClick}
              className="inline-flex items-center gap-1 text-accent hover:text-accent/80 font-semibold underline underline-offset-2 transition-colors"
            >
              {t('scanYours')}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </p>
        </FadeInUp>
      </div>
    </section>
  );
}
