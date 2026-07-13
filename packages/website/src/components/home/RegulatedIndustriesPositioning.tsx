'use client';

/**
 * Regulated Industries Positioning section
 * Day 55 (2026-05-05) — adds 4 sub-sections aligning with strategic vision:
 *   1. Built on ATR (open standard upstream)
 *   2. Two-Track Solution (Real-time Protection + Audit-Ready Compliance)
 *   3. ATR Migrator Pro (commercial differentiator)
 *   4. 5-Framework Compliance (auto-mapping evidence)
 *
 * Memory refs: project_strategic_vision_2026_05_03, project_migrator_open_core_2026_05_05,
 * project_sovereign_ai_defense_2026_05_02
 */

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { ArrowRight, Shield, FileCheck, ArrowRightLeft, ScrollText } from 'lucide-react';
import {
  Eyebrow,
  SectionTitleV2,
  SectionV2,
  CardV2,
  CardKicker,
  SectionKicker,
} from './v2/primitives';

export default function RegulatedIndustriesPositioning() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <>
      {/* ── A. Built on ATR ── */}
      <SectionV2>
        <FadeInUp>
          <Eyebrow>{isZh ? '建立在開放標準之上' : 'Built on the open standard'}</Eyebrow>
          <SectionTitleV2>
            {isZh ? (
              <>
                Cisco 與 Microsoft 維護者已合併進上游的，
                <span className="text-brand-sage">就是這套 ATR 規則。</span>
              </>
            ) : (
              <>
                The same ATR rules Cisco and Microsoft maintainers{' '}
                <span className="text-brand-sage">merged upstream.</span>
              </>
            )}
          </SectionTitleV2>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
            {isZh
              ? 'PanGuard 是 ATR 開放標準的商業實作版本。ATR 是 MIT 永久免費的偵測標準，由 ATR 社群維護；PanGuard 把它包成受監管產業會買的整套平台——即時防護 + 可稽核合規證據 + 地端部署 + SLA。'
              : 'PanGuard is the commercial reference implementation of the ATR open standard. ATR is the MIT-licensed detection standard maintained by the ATR Community; PanGuard wraps it into the platform regulated industries need — real-time protection + audit-ready compliance evidence + on-prem + SLA.'}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a
              href="https://agentthreatrule.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-sage hover:underline"
            >
              agentthreatrule.org <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <span className="text-text-muted">·</span>
            <span className="font-mono text-[11px] uppercase tracking-micro text-text-muted">
              {isZh
                ? '7 個 PR 已合進 6 個生態系上游（含 Cisco 與 Microsoft）— 維護者接受的貢獻，非廠商背書'
                : '7 PRs merged upstream across 6 ecosystems (incl. Cisco + Microsoft) — maintainer-accepted contributions, not endorsements'}
            </span>
          </div>
        </FadeInUp>
      </SectionV2>

      {/* ── B. Two-Track Solution ── */}
      <SectionV2>
        <FadeInUp>
          <Eyebrow>{isZh ? '受監管產業要的兩件事' : 'What regulated industries need'}</Eyebrow>
          <SectionTitleV2>
            {isZh ? (
              <>
                一套平台，<span className="text-brand-sage">兩個採購窗口一次過。</span>
              </>
            ) : (
              <>
                One platform. <span className="text-brand-sage">Both procurement gates.</span>
              </>
            )}
          </SectionTitleV2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-muted">
            {isZh
              ? '銀行、保險、醫療的資安團隊跟合規團隊，不用各買各的廠商。'
              : 'Bank / insurance / healthcare CISO and GRC do not need to buy two vendors.'}
          </p>
        </FadeInUp>
        <div className="mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
          <FadeInUp>
            <CardV2 className="h-full">
              <Shield className="mb-4 h-7 w-7 text-brand-sage" />
              <h3 className="mb-3 text-xl font-bold text-text-primary">
                {isZh ? '即時防護' : 'Real-time Protection'}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-text-secondary">
                {isZh
                  ? '攻擊當下擋下、隔離、封鎖。L3 輸入/輸出守門 · L4 行為偵測 · L6 阻擋 + 隔離，通通已上線。'
                  : 'Detect, contain, block at the moment of attack. L3 input/output guardrails · L4 behavioral detection · L6 block + quarantine — all shipped.'}
              </p>
              <CardKicker>{isZh ? '資安部門的採購窗口' : 'CISO / SOC procurement gate'}</CardKicker>
            </CardV2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <CardV2 emphasized className="h-full">
              <FileCheck className="mb-4 h-7 w-7 text-brand-sage" />
              <h3 className="mb-3 text-xl font-bold text-text-primary">
                {isZh ? '可稽核合規' : 'Audit-Ready Compliance'}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-text-secondary">
                {isZh
                  ? '攻擊擋下之後，自動產出可稽核證據：每筆偵測都對到 ATR 規則 ID + 5 個合規框架條文。格式化為稽核級證據——規則 ID + 框架條文 + SHA-256 + Ed25519 簽章。'
                  : 'After an attack is blocked, the platform produces audit-ready evidence automatically: every detection links to ATR rule ID + clauses across 5 compliance frameworks. Formatted as auditor-ready evidence — rule ID + framework clause + SHA-256 + Ed25519 signature.'}
              </p>
              <CardKicker>
                {isZh ? '合規 / 法務的採購窗口' : 'GRC / Compliance / Legal procurement gate'}
              </CardKicker>
            </CardV2>
          </FadeInUp>
        </div>
      </SectionV2>

      {/* ── C. ATR Migrator Pro ── */}
      <SectionV2>
        <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-16">
          <FadeInUp className="lg:col-span-3">
            <Eyebrow>
              {isZh
                ? '不丟棄你既有的偵測投資'
                : 'Do not throw out your existing detection investment'}
            </Eyebrow>
            <h2 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-5xl">
              {isZh ? (
                <>
                  ATR Migrator — Sigma / YARA / Snort{' '}
                  <span className="text-brand-sage">一鍵升級成 AI Agent 規則。</span>
                </>
              ) : (
                <>
                  ATR Migrator — convert Sigma / YARA / Snort{' '}
                  <span className="text-brand-sage">into AI agent rules in seconds.</span>
                </>
              )}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-text-secondary">
              {isZh
                ? '銀行、保險、醫療這幾年累積了上千條 Sigma 跟 YARA 規則。EU AI Act 高風險義務 2027 年 12 月上路，這些規則完全管不到 AI Agent 的行為。手寫遷移要 6-12 個月，Migrator 一週搞定，還自動對照 5 個合規框架。'
                : 'F500 banks, insurance, and healthcare have accumulated thousands of Sigma and YARA detection rules. When EU AI Act high-risk obligations take effect in December 2027, those rules cannot cover AI agent behavior. Manual migration: 6-12 months. Migrator: under a week, with 5-framework compliance auto-mapping.'}
            </p>
            <div className="mt-6 rounded-xl border border-border bg-surface-hero p-4 font-mono text-xs sm:text-sm">
              <span className="select-none text-brand-sage">$ </span>
              <span className="font-semibold text-text-primary">
                npm install -g @panguard-ai/migrator-community
              </span>
              <br />
              <span className="select-none text-brand-sage">$ </span>
              <span className="text-text-secondary">panguard-migrate sigma/ --output atr/</span>
            </div>
            <div className="mt-6 space-y-3 text-sm leading-relaxed text-text-secondary">
              <p>
                <strong className="text-text-primary">
                  {isZh ? 'Community 免費(npm,MIT):' : 'Community Free (npm, MIT):'}
                </strong>{' '}
                {isZh
                  ? 'Sigma + YARA + Snort 解析器、中介表達式、ATR YAML 輸出、CLI。'
                  : 'Sigma + YARA + Snort parsers, IR transformer, ATR YAML output, CLI.'}
              </p>
              <p>
                <strong className="text-text-primary">
                  {isZh
                    ? 'Migrator Pro(PanGuard Enterprise):'
                    : 'Migrator Pro (PanGuard Enterprise):'}
                </strong>{' '}
                {isZh
                  ? '規則手工調到 Cisco merge PR 等級 · 5 框架合規自動對照 · SHA-256 簽章的稽核證據包 · Threat Cloud 整合 · 地端部署。'
                  : 'human enrichment to Cisco-merge-PR quality · 5-framework compliance auto-mapping · SHA-256 audit evidence pack · TC integration · on-prem deployment.'}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a
                href="https://www.npmjs.com/package/@panguard-ai/migrator-community"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-sage hover:underline"
              >
                {isZh ? '查看 npm package' : 'View on npm'} <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <span className="text-text-muted">·</span>
              <Link
                href="/contact?tier=enterprise"
                className="inline-flex items-center gap-1 font-semibold text-brand-sage hover:underline"
              >
                {isZh ? '詢問 Migrator Pro' : 'Ask about Migrator Pro'}{' '}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15} className="lg:col-span-2">
            <CardV2>
              <ArrowRightLeft className="mb-4 h-6 w-6 text-brand-sage" />
              <div className="space-y-4 text-sm">
                <div>
                  <CardKicker>{isZh ? '你的舊投資' : 'Your existing investment'}</CardKicker>
                  <p className="mt-1.5 text-text-secondary">
                    Sigma · YARA · Snort · regex packs · SIEM rules
                  </p>
                </div>
                <div className="border-t border-border-subtle pt-4">
                  <CardKicker>{isZh ? 'Migrator 產出' : 'Migrator output'}</CardKicker>
                  <p className="mt-1.5 text-text-secondary">
                    {isZh
                      ? 'ATR YAML（行為層）+ 5 框架 metadata + 測試案例 + 稽核軌跡'
                      : 'ATR YAML (behavioral layer) + 5-framework metadata + test cases + audit trail'}
                  </p>
                </div>
                <div className="border-t border-border-subtle pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-micro text-brand-sage">
                    {isZh ? '部署到' : 'Deploy to'}
                  </p>
                  <p className="mt-1.5 text-text-secondary">
                    {isZh
                      ? 'PanGuard Guard · ATR 引擎 · NeMo Guardrails · Cisco AI Defense · 任何接 ATR 的系統'
                      : 'PanGuard Guard · ATR engine · NeMo Guardrails · Cisco AI Defense · any ATR-compatible system'}
                  </p>
                </div>
              </div>
            </CardV2>
          </FadeInUp>
        </div>
      </SectionV2>

      {/* ── D. 5-Framework Compliance ── */}
      <SectionV2>
        <FadeInUp>
          <Eyebrow>{isZh ? '合規框架對照' : 'Compliance framework mapping'}</Eyebrow>
          <SectionTitleV2>
            {isZh ? (
              <>
                5 個框架，<span className="text-brand-sage">一份證據包。</span>
              </>
            ) : (
              <>
                Five frameworks. <span className="text-brand-sage">One evidence pack.</span>
              </>
            )}
          </SectionTitleV2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
            {isZh
              ? '每條 ATR 規則自動對到 5 個合規框架的條文。每筆偵測產出 PDF + JSON + HTML 證據，SHA-256 + ed25519 簽章保證不能竄改。Vanta、Drata、Lakera 架構上做不到這件事。'
              : 'Every ATR rule auto-maps to clauses across 5 compliance frameworks. Every detection produces PDF + JSON + HTML evidence with SHA-256 + ed25519 signature. Architecturally impossible for Vanta / Drata / Lakera.'}
          </p>
        </FadeInUp>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              name: 'EU AI Act',
              sub: isZh ? '高風險義務 2027 年底上路' : 'High-risk obligations Dec 2027',
            },
            { name: 'NIST AI RMF', sub: isZh ? '美國聯邦' : 'US federal' },
            { name: 'ISO/IEC 42001', sub: isZh ? '國際 AIMS' : 'International AIMS' },
            {
              name: 'OWASP Agentic 2026',
              sub: isZh ? 'Agent 攻擊框架' : 'Agent attack framework',
            },
            { name: 'OWASP LLM 2025', sub: isZh ? 'LLM Top 10' : 'LLM Top 10' },
          ].map((f, i) => (
            <FadeInUp key={f.name} delay={i * 0.05}>
              <div className="lift h-full rounded-2xl border border-border bg-surface-1 p-5">
                <ScrollText className="mb-3 h-5 w-5 text-brand-sage" />
                <h3 className="mb-1 text-sm font-bold text-text-primary">{f.name}</h3>
                <p className="text-xs text-text-muted">{f.sub}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
        <FadeInUp delay={0.4}>
          <SectionKicker>
            {isZh
              ? '完整 evidence pack 範例與 framework 對照表請見 /compliance'
              : 'Full evidence pack samples and framework mapping at /compliance'}
          </SectionKicker>
        </FadeInUp>
      </SectionV2>
    </>
  );
}
