'use client';

import { useTranslations } from 'next-intl';
import { STATS } from '@/lib/stats';
import { Eyebrow } from './v2/primitives';

/**
 * Upstream adopters only. Strict rules:
 * - Listed merges must be in the upstream's *official* repo.
 * - Community awesome-list merges do NOT belong here (they are catalogs,
 *   not platform adoption).
 * - Never list OWASP Foundation as an adopter — the OWASP Agentic Top 10
 *   mapping merged into precize's third-party implementation, not OWASP itself.
 *   The OWASP LLM Top 10 official repo PR is still pending.
 */
const ADOPTERS: readonly { name: string; detail: string; highlight?: boolean }[] = [
  {
    name: 'Cisco AI Defense',
    detail: `${STATS.adoption.ciscoRulesMerged} rules merged · skill-scanner packs (PR #79 + #99)`,
    highlight: true,
  },
  {
    name: 'Microsoft AGT',
    detail: `${STATS.adoption.microsoftRulesMerged} rules merged · community-rules examples (PR #908 + #1277)`,
    highlight: true,
  },
  { name: 'NVIDIA Garak', detail: `${STATS.benchmark.garak.recall}% recall · PR open` },
];

export default function SocialProof() {
  const t = useTranslations('home.socialProof');

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Eyebrow>{t('overline')}</Eyebrow>
        <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
          {ADOPTERS.map((a) => (
            <div
              key={a.name}
              className={`lift rounded-xl border ${
                a.highlight ? 'border-brand-sage/40' : 'border-border hover:border-border-hover'
              } bg-surface-1 px-5 py-4 transition-colors duration-300 ease-out-quint`}
            >
              <span className="block text-sm font-semibold text-text-primary sm:text-base">
                {a.name}
              </span>
              <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-micro text-text-muted">
                {a.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
