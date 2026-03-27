'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import FadeInUp from '@/components/FadeInUp';

const ease = [0.22, 1, 0.36, 1] as const;

/* ── Inline SVG Icons (no emoji, no external deps) ────────────── */

function ClockIcon({ className = '' }: { readonly className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CertificateIcon({ className = '' }: { readonly className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function NetworkIcon({ className = '' }: { readonly className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/* ── Pillar data ──────────────────────────────────────────────── */

interface Pillar {
  readonly titleKey: string;
  readonly descKey: string;
  readonly icon: typeof ClockIcon;
  readonly color: string;
  readonly iconBg: string;
}

const PILLARS: readonly Pillar[] = [
  {
    titleKey: 'pillar1Title',
    descKey: 'pillar1Desc',
    icon: ClockIcon,
    color: 'text-emerald-400',
    iconBg: 'bg-emerald-400/10',
  },
  {
    titleKey: 'pillar2Title',
    descKey: 'pillar2Desc',
    icon: CertificateIcon,
    color: 'text-sky-400',
    iconBg: 'bg-sky-400/10',
  },
  {
    titleKey: 'pillar3Title',
    descKey: 'pillar3Desc',
    icon: NetworkIcon,
    color: 'text-yellow-400',
    iconBg: 'bg-yellow-400/10',
  },
] as const;

/* ── Competitive table data ───────────────────────────────────── */

interface CompRow {
  readonly featureKey: string;
  readonly panguardKey: string;
  readonly ciscoKey: string;
  readonly owaspKey: string;
}

const COMP_ROWS: readonly CompRow[] = [
  {
    featureKey: 'compSpeed',
    panguardKey: 'panguardSpeed',
    ciscoKey: 'ciscoSpeed',
    owaspKey: 'owaspSpeed',
  },
  {
    featureKey: 'compSetup',
    panguardKey: 'panguardSetup',
    ciscoKey: 'ciscoSetup',
    owaspKey: 'owaspSetup',
  },
  {
    featureKey: 'compCost',
    panguardKey: 'panguardCost',
    ciscoKey: 'ciscoCost',
    owaspKey: 'owaspCost',
  },
  {
    featureKey: 'compFor',
    panguardKey: 'panguardFor',
    ciscoKey: 'ciscoFor',
    owaspKey: 'owaspFor',
  },
] as const;

/* ── Component ────────────────────────────────────────────────── */

export default function WhyPanguard() {
  const t = useTranslations('home.whyPanguard');

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <FadeInUp>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">
            {t('title')}
          </h2>
        </FadeInUp>

        {/* 3 Pillars */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {PILLARS.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.titleKey}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.15, ease }}
                className="bg-surface-1 border border-border rounded-xl p-6 transition-colors duration-300 hover:border-panguard-green/40"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${pillar.iconBg} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-5 h-5 ${pillar.color}`} />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">
                  {t(pillar.titleKey)}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{t(pillar.descKey)}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Competitive Table — desktop */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.5, ease }}
          className="mt-16"
        >
          <h3 className="text-lg font-semibold text-text-secondary mb-6">{t('compTitle')}</h3>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 pr-4 text-text-muted font-medium w-1/4" />
                  <th className="text-left py-3 px-4 text-panguard-green font-semibold w-1/4">
                    PanGuard
                  </th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium w-1/4">
                    Cisco DefenseClaw
                  </th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium w-1/4">OWASP</th>
                </tr>
              </thead>
              <tbody>
                {COMP_ROWS.map((row) => (
                  <tr key={row.featureKey} className="border-b border-border/30">
                    <td className="py-3 pr-4 text-text-secondary font-medium">
                      {t(row.featureKey)}
                    </td>
                    <td className="py-3 px-4 text-text-primary bg-panguard-green/5 border-x border-panguard-green/20">
                      {t(row.panguardKey)}
                    </td>
                    <td className="py-3 px-4 text-text-muted">{t(row.ciscoKey)}</td>
                    <td className="py-3 px-4 text-text-muted">{t(row.owaspKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="sm:hidden space-y-4">
            {/* PanGuard card */}
            <div className="border border-panguard-green/40 bg-panguard-green/5 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-panguard-green mb-3">PanGuard</h4>
              <div className="space-y-2">
                {COMP_ROWS.map((row) => (
                  <div key={`pg-${row.featureKey}`} className="flex justify-between text-sm">
                    <span className="text-text-muted">{t(row.featureKey)}</span>
                    <span className="text-text-primary font-medium">{t(row.panguardKey)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cisco card */}
            <div className="border border-border/50 bg-surface-1/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-text-secondary mb-3">Cisco DefenseClaw</h4>
              <div className="space-y-2">
                {COMP_ROWS.map((row) => (
                  <div key={`cisco-${row.featureKey}`} className="flex justify-between text-sm">
                    <span className="text-text-muted">{t(row.featureKey)}</span>
                    <span className="text-text-muted">{t(row.ciscoKey)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OWASP card */}
            <div className="border border-border/50 bg-surface-1/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-text-secondary mb-3">OWASP</h4>
              <div className="space-y-2">
                {COMP_ROWS.map((row) => (
                  <div key={`owasp-${row.featureKey}`} className="flex justify-between text-sm">
                    <span className="text-text-muted">{t(row.featureKey)}</span>
                    <span className="text-text-muted">{t(row.owaspKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
