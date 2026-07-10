'use client';

/**
 * v4 BEAT 3 — Positioning Split (promoted core positioning).
 *
 * Composes the two positioning sub-sections lifted from
 * RegulatedIndustriesPositioning.tsx into ONE two-column section:
 *   Left  — "One platform. Both procurement gates." headline + copy +
 *           the two procurement-gate rows + the point-tools money quote.
 *   Right — signed evidence-pack visual as a paper island (the site's
 *           light-surface moment, serif italic signed-document feel).
 *   Below — compact framework chips strip rendered from STATS
 *           (truth rule: never hardcode framework counts; the source's
 *           "Five frameworks" headline number is dropped because the
 *           canonical list length differs).
 *
 * Replaces sections B + D of RegulatedIndustriesPositioning on the
 * homepage. That component is untouched and stays for other routes.
 */

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Shield, FileCheck, BadgeCheck } from 'lucide-react';
import { Eyebrow, SectionTitleV2, SectionV2, SectionKicker } from '../v2/primitives';
import { STATS } from '@/lib/stats';

const FRAMEWORKS = STATS.complianceFrameworkList;
const FRAMEWORK_COUNT = FRAMEWORKS.length;

/** One row of the signed evidence-pack ledger (paper island). */
function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-mono text-[10px] uppercase tracking-micro text-paper-muted">
        {label}
      </span>
      <span className="text-right font-mono text-xs text-paper-ink">{value}</span>
    </div>
  );
}

/** Compact procurement-gate row for the left column. */
function GateRow({
  icon,
  title,
  kicker,
}: {
  icon: React.ReactNode;
  title: string;
  kicker: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div>
        <p className="text-sm font-bold text-text-primary">{title}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-micro text-text-muted">
          {kicker}
        </p>
      </div>
    </div>
  );
}

export default function PositioningSplit() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <SectionV2>
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        {/* ── Left: procurement gates ── */}
        <FadeInUp>
          <Eyebrow>{isZh ? '受監管產業要的兩件事' : 'What regulated industries need'}</Eyebrow>
          <SectionTitleV2 className="lg:text-5xl">
            {isZh ? (
              <>
                一套平台,<span className="text-brand-sage">兩個採購窗口一次過。</span>
              </>
            ) : (
              <>
                One platform. <span className="text-brand-sage">Both procurement gates.</span>
              </>
            )}
          </SectionTitleV2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-text-muted">
            {isZh
              ? '銀行、保險、醫療的資安團隊跟合規團隊,不用各買各的廠商。'
              : 'Bank / insurance / healthcare CISO and GRC do not need to buy two vendors.'}
          </p>

          <div className="mt-10 space-y-6">
            <GateRow
              icon={<Shield className="mt-0.5 h-5 w-5 shrink-0 text-brand-sage" />}
              title={isZh ? '即時防護' : 'Real-time Protection'}
              kicker={isZh ? '資安部門的採購窗口' : 'CISO / SOC procurement gate'}
            />
            <GateRow
              icon={<FileCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-sage" />}
              title={isZh ? '可稽核合規' : 'Audit-Ready Compliance'}
              kicker={isZh ? '合規 / 法務的採購窗口' : 'GRC / Compliance / Legal procurement gate'}
            />
          </div>

          <p className="mt-10 max-w-xl border-l-2 border-brand-sage/60 pl-4 text-base font-semibold leading-relaxed text-text-primary sm:text-lg">
            {isZh
              ? '偵測工具沒有合規證據,合規工具沒有即時偵測——單一產品做不到這件事。'
              : 'Detection tools have no evidence. Compliance tools have no detection. No point product does both.'}
          </p>
        </FadeInUp>

        {/* ── Right: signed evidence pack (paper island) ── */}
        <FadeInUp delay={0.15}>
          <div className="paper lift rounded-2xl border border-paper-line p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-micro text-paper-muted">
              {isZh ? '簽章證據包' : 'Signed evidence pack'}
            </p>
            <h3 className="mt-3 font-serif text-3xl font-medium italic text-paper-ink">
              {isZh ? '可稽核合規' : 'Audit-Ready Compliance'}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-paper-muted">
              {isZh
                ? `攻擊擋下之後,自動產出可稽核證據:每筆偵測都對到 ATR 規則 ID + ${FRAMEWORK_COUNT} 個合規框架條文。格式化為稽核級證據 —— 規則 ID + 框架條文 + SHA-256 + Ed25519 簽章。`
                : `After an attack is blocked, the platform produces audit-ready evidence automatically: every detection links to ATR rule ID + clauses across ${FRAMEWORK_COUNT} compliance frameworks. Formatted as auditor-ready evidence — rule ID + framework clause + SHA-256 + Ed25519 signature.`}
            </p>

            <div className="mt-6 space-y-3 border-t border-paper-line pt-5">
              <LedgerRow
                label={isZh ? '偵測' : 'Detection'}
                value={isZh ? 'ATR 規則 ID + 測試案例' : 'ATR rule ID + test case'}
              />
              <LedgerRow
                label={isZh ? '框架對照' : 'Framework mapping'}
                value={
                  isZh ? `${FRAMEWORK_COUNT} 個合規框架` : `${FRAMEWORK_COUNT} compliance frameworks`
                }
              />
              <LedgerRow label={isZh ? '格式' : 'Formats'} value="PDF + JSON + HTML" />
              <LedgerRow label={isZh ? '雜湊' : 'Integrity'} value="SHA-256" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-paper-line pt-4">
              <BadgeCheck aria-hidden className="h-4 w-4 shrink-0 text-paper-ink" />
              <span className="font-mono text-[10px] uppercase tracking-micro text-paper-ink">
                ed25519 signed
              </span>
              <span aria-hidden className="text-paper-muted">
                ·
              </span>
              <span className="font-mono text-[10px] uppercase tracking-micro text-paper-muted">
                SHA-256
              </span>
            </div>
          </div>
        </FadeInUp>
      </div>

      {/* ── Framework chips strip (canonical list from STATS — never hardcode counts) ── */}
      <FadeInUp delay={0.2}>
        <div className="mt-16 border-t border-border-subtle pt-8">
          <p className="font-mono text-[11px] uppercase tracking-micro text-text-muted">
            {isZh ? '每個框架,一份證據包。' : 'Every framework. One evidence pack.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {FRAMEWORKS.map((name) => (
              <span
                key={name}
                className="rounded-full border border-border bg-surface-1 px-3 py-1.5 font-mono text-[11px] text-text-secondary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </FadeInUp>

      <FadeInUp delay={0.3}>
        <SectionKicker>
          {isZh
            ? '完整 evidence pack 範例與 framework 對照表請見 /compliance'
            : 'Full evidence pack samples and framework mapping at /compliance'}
        </SectionKicker>
      </FadeInUp>
    </SectionV2>
  );
}
