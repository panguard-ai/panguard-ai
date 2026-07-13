'use client';

/**
 * BEAT 4 — ProofBand: the single credibility moment on the homepage.
 *
 * Merges the two previously duplicated proof sections:
 *   - SocialProof.tsx (adopter strip)
 *   - RegulatedIndustriesPositioning.tsx sub-section A
 *     (ATR rules merged upstream into Cisco AI Defense + Microsoft AGT —
 *      maintainer-accepted contributions, not vendor endorsements.)
 *
 * Adopter rules (inherited from SocialProof — strict, do not relax):
 * - Listed merges must be in the upstream's *official* repo.
 * - Community awesome-list merges do NOT belong here (they are catalogs,
 *   not platform adoption).
 * - Never list OWASP Foundation as an adopter — the OWASP Agentic Top 10
 *   mapping merged into precize's third-party implementation, not OWASP
 *   itself. The OWASP LLM Top 10 official repo PR is still pending.
 *
 * Stat row rule: hero badges own 672 rules + 97.2% garak recall — this band
 * must NOT repeat them. It shows the sources' other verified numbers only.
 */

import { useLocale } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { STATS } from '@/lib/stats';
import { Eyebrow, StatV2 } from '../v2/primitives';

/**
 * Verbatim source claim (RegulatedIndustriesPositioning sub-section A):
 * "7 production PRs merged across 6 ecosystems (incl. Cisco + Microsoft)".
 * The 6 comes from STATS.adoption.externalOrgs; the 7 is the source's
 * production-qualified subset (STATS.adoption.externalPRMerges counts all 13).
 */
const PRODUCTION_PR_MERGES = 7;

/** Adopter entries — names + detail sub-lines exactly as in SocialProof.tsx */
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
  {
    name: 'Gen Digital',
    detail: 'Norton / Avast — ATR rules merged upstream',
    highlight: false,
  },
];

export default function ProofBand() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  const stats: readonly { value: string; label: string }[] = [
    {
      value: `${PRODUCTION_PR_MERGES}`,
      label: isZh ? 'Production PR 已合併' : 'Production PRs merged',
    },
    {
      value: `${STATS.adoption.externalOrgs}`,
      label: isZh ? '生態系（含 Cisco + Microsoft）' : 'Ecosystems (incl. Cisco + Microsoft)',
    },
    {
      value: `${STATS.adoption.externalPRMerges}`,
      label: isZh ? '生態系 PR 已合併' : 'Ecosystem PRs merged',
    },
    {
      value: STATS.license,
      label: isZh ? 'ATR 開放標準授權' : 'ATR open standard license',
    },
  ];

  return (
    <section className="border-y border-border-subtle bg-surface-2">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <FadeInUp>
          <Eyebrow>
            {isZh ? (
              <>
                ATR 規則已上游合併進 Cisco AI Defense 與 Microsoft AGT——
                <span className="text-brand-sage">維護者接受的貢獻，非廠商背書。</span>
              </>
            ) : (
              <>
                ATR rules merged upstream into Cisco AI Defense and Microsoft AGT —{' '}
                <span className="text-brand-sage">maintainer-accepted contributions, not vendor endorsements.</span>
              </>
            )}
          </Eyebrow>

          {/* Adopter strip — pills, upstream official merges only */}
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
        </FadeInUp>

        {/* Compact stat row — sources' other verified numbers (never 672 / 97.2%) */}
        <FadeInUp delay={0.1}>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-border-subtle pt-8 sm:grid-cols-4">
            {stats.map((s) => (
              <StatV2 key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <div className="mt-10">
            <Link
              href="/atr/adopters"
              className="sheen lift inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1"
            >
              {isZh ? '查看所有採用者' : 'See all adopters'}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
