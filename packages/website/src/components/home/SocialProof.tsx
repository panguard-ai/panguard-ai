'use client';

import { useTranslations } from 'next-intl';
import { STATS } from '@/lib/stats';

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
    detail: `${STATS.adoption.ciscoRulesMerged} ATR rules merged (PR #79 + #99)`,
    highlight: true,
  },
  {
    name: 'Microsoft AGT',
    detail: `${STATS.adoption.microsoftRulesMerged} ATR rules merged (PR #908 + #1277)`,
    highlight: true,
  },
  { name: 'NVIDIA Garak', detail: '97.1% recall · PR open' },
];

export default function SocialProof() {
  const t = useTranslations('home.socialProof');

  return (
    <section className="relative px-5 sm:px-6 py-10 sm:py-14 border-b border-border/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.15em] text-text-muted font-semibold mb-6">
            {t('overline')}
          </p>
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
            {ADOPTERS.map((a) => (
              <div key={a.name} className="flex flex-col items-center gap-1">
                <span
                  className={`text-sm sm:text-base font-bold ${a.highlight ? 'text-panguard-green' : 'text-text-secondary'}`}
                >
                  {a.name}
                </span>
                <span className="text-[10px] text-text-muted">{a.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
