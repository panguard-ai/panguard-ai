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

export default function RegulatedIndustriesPositioning() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <>
      {/* ── A. Built on ATR ── */}
      <section className="border-y border-border bg-surface-1/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted font-semibold mb-4">
              {isZh ? '建立在開放標準之上' : 'Built on the open standard'}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-6 max-w-3xl">
              {isZh
                ? 'Cisco 跟 Microsoft 已經放進產品的,就是這套規則。'
                : 'The same rules Cisco and Microsoft already ship in production.'}
            </h2>
            <p className="text-base sm:text-lg text-text-secondary max-w-3xl leading-relaxed">
              {isZh
                ? 'PanGuard 是 ATR 開放標準的商業實作版本。ATR 是 MIT 永久免費的偵測標準,由 ATR 社群維護;PanGuard 把它包成受監管產業會買的整套平台——即時防護 + 可稽核合規證據 + 地端部署 + SLA。'
                : 'PanGuard is the commercial reference implementation of the ATR open standard. ATR is the MIT-licensed detection standard maintained by the ATR Community; PanGuard wraps it into the platform regulated industries need — real-time protection + audit-ready compliance evidence + on-prem + SLA.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <a
                href="https://agentthreatrule.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-panguard-green font-semibold hover:underline inline-flex items-center gap-1"
              >
                agentthreatrule.org <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted font-mono text-xs">
                {isZh
                  ? '4 個 PR 已合進 Cisco + Microsoft 的產品'
                  : '4 PRs merged into Cisco + Microsoft production'}
              </span>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ── B. Two-Track Solution ── */}
      <section className="bg-surface-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted font-semibold mb-4 text-center">
              {isZh ? '受監管產業要的兩件事' : 'What regulated industries need'}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-3 text-center">
              {isZh ? '一套平台,兩個採購窗口一次過。' : 'One platform. Both procurement gates.'}
            </h2>
            <p className="text-base text-text-muted max-w-2xl mx-auto text-center mb-12">
              {isZh
                ? '銀行、保險、醫療的資安團隊跟合規團隊,不用各買各的廠商。'
                : 'Bank / insurance / healthcare CISO and GRC do not need to buy two vendors.'}
            </p>
          </FadeInUp>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <FadeInUp>
              <div className="bg-surface-2 rounded-xl border border-border p-7 h-full">
                <Shield className="w-7 h-7 text-panguard-green mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  {isZh ? '即時防護' : 'Real-time Protection'}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {isZh
                    ? '攻擊當下擋下、隔離、封鎖。L3 輸入/輸出守門 · L4 行為偵測 · L6 阻擋 + 隔離,通通已上線。'
                    : 'Detect, contain, block at the moment of attack. L3 input/output guardrails · L4 behavioral detection · L6 block + quarantine — all shipped.'}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  {isZh ? '資安部門的採購窗口' : 'CISO / SOC procurement gate'}
                </p>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <div className="bg-surface-2 rounded-xl border border-panguard-green/40 p-7 h-full">
                <FileCheck className="w-7 h-7 text-panguard-green mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  {isZh ? '可稽核合規' : 'Audit-Ready Compliance'}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  {isZh
                    ? '攻擊擋下之後,自動產出可稽核證據:每筆偵測都對到 ATR 規則 ID + 5 個合規框架條文 + SHA-256 + HMAC 簽章。auditor 認的格式。'
                    : 'After an attack is blocked, the platform produces audit-ready evidence automatically: every detection links to ATR rule ID + clauses across 5 compliance frameworks + SHA-256 + HMAC integrity. Accepted by auditors.'}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  {isZh ? '合規 / 法務的採購窗口' : 'GRC / Compliance / Legal procurement gate'}
                </p>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* ── C. ATR Migrator Pro ── */}
      <section className="border-y border-border bg-gradient-to-b from-surface-0 to-surface-1/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-center">
            <FadeInUp className="lg:col-span-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-panguard-green font-semibold mb-4">
                {isZh
                  ? '不丟棄你既有的偵測投資'
                  : 'Do not throw out your existing detection investment'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-5">
                {isZh
                  ? 'ATR Migrator — Sigma / YARA / Snort 一鍵升級成 AI Agent 規則。'
                  : 'ATR Migrator — convert Sigma / YARA / Snort into AI agent rules in seconds.'}
              </h2>
              <p className="text-base text-text-secondary leading-relaxed mb-6">
                {isZh
                  ? '銀行、保險、醫療這幾年累積了上千條 Sigma 跟 YARA 規則。EU AI Act 8/2 開罰那天,這些規則完全管不到 AI Agent 的行為。手寫遷移要 6-12 個月,Migrator 一週搞定,還自動對照 5 個合規框架。'
                  : 'F500 banks, insurance, and healthcare have accumulated thousands of Sigma and YARA detection rules. When EU AI Act enforcement begins August 2, those rules cannot cover AI agent behavior. Manual migration: 6-12 months. Migrator: under a week, with 5-framework compliance auto-mapping.'}
              </p>
              <div className="bg-surface-3 rounded-lg p-4 mb-6 font-mono text-xs sm:text-sm border border-border">
                <span className="text-text-muted">$ </span>
                <span className="text-panguard-green font-bold">
                  npm install -g @panguard-ai/migrator-community
                </span>
                <br />
                <span className="text-text-muted">$ </span>
                <span className="text-text-primary">panguard-migrate sigma/ --output atr/</span>
              </div>
              <div className="text-sm text-text-secondary leading-relaxed space-y-3">
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
                  className="text-panguard-green font-semibold hover:underline inline-flex items-center gap-1"
                >
                  {isZh ? '查看 npm package' : 'View on npm'} <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <span className="text-text-muted">·</span>
                <Link
                  href="/contact?tier=enterprise"
                  className="text-panguard-green font-semibold hover:underline inline-flex items-center gap-1"
                >
                  {isZh ? '詢問 Migrator Pro' : 'Ask about Migrator Pro'}{' '}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </FadeInUp>
            <FadeInUp delay={0.15} className="lg:col-span-2">
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <ArrowRightLeft className="w-6 h-6 text-panguard-green mb-4" />
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-1">
                      {isZh ? '你的舊投資' : 'Your existing investment'}
                    </p>
                    <p className="text-text-secondary">
                      Sigma · YARA · Snort · regex packs · SIEM rules
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-1">
                      {isZh ? 'Migrator 產出' : 'Migrator output'}
                    </p>
                    <p className="text-text-secondary">
                      {isZh
                        ? 'ATR YAML(行為層)+ 5 框架 metadata + 測試案例 + 稽核軌跡'
                        : 'ATR YAML (behavioral layer) + 5-framework metadata + test cases + audit trail'}
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs uppercase tracking-wider text-panguard-green font-semibold mb-1">
                      {isZh ? '部署到' : 'Deploy to'}
                    </p>
                    <p className="text-text-secondary">
                      {isZh
                        ? 'PanGuard Guard · ATR 引擎 · NeMo Guardrails · Cisco AI Defense · 任何接 ATR 的系統'
                        : 'PanGuard Guard · ATR engine · NeMo Guardrails · Cisco AI Defense · any ATR-compatible system'}
                    </p>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* ── D. 5-Framework Compliance ── */}
      <section className="bg-surface-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <FadeInUp>
            <div className="text-center mb-12">
              <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted font-semibold mb-4">
                {isZh ? '合規框架對照' : 'Compliance framework mapping'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-3">
                {isZh ? '5 個框架,一份證據包。' : 'Five frameworks. One evidence pack.'}
              </h2>
              <p className="text-base text-text-secondary max-w-2xl mx-auto">
                {isZh
                  ? '每條 ATR 規則自動對到 5 個合規框架的條文。每筆偵測產出 PDF + JSON + HTML 證據,SHA-256 + HMAC 簽章保證不能竄改。Vanta、Drata、Lakera 架構上做不到這件事。'
                  : 'Every ATR rule auto-maps to clauses across 5 compliance frameworks. Every detection produces PDF + JSON + HTML evidence with SHA-256 + HMAC integrity. Architecturally impossible for Vanta / Drata / Lakera.'}
              </p>
            </div>
          </FadeInUp>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {[
              { name: 'EU AI Act', sub: isZh ? '2026/8/2 強制' : 'Aug 2 enforcement' },
              { name: 'NIST AI RMF', sub: isZh ? '美國聯邦' : 'US federal' },
              { name: 'ISO/IEC 42001', sub: isZh ? '國際 AIMS' : 'International AIMS' },
              {
                name: 'OWASP Agentic 2026',
                sub: isZh ? 'Agent 攻擊框架' : 'Agent attack framework',
              },
              { name: 'OWASP LLM 2025', sub: isZh ? 'LLM Top 10' : 'LLM Top 10' },
            ].map((f, i) => (
              <FadeInUp key={f.name} delay={i * 0.05}>
                <div className="bg-surface-2 rounded-lg border border-border p-5 h-full">
                  <ScrollText className="w-5 h-5 text-panguard-green mb-3" />
                  <h3 className="text-sm font-bold text-text-primary mb-1">{f.name}</h3>
                  <p className="text-xs text-text-muted">{f.sub}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
          <FadeInUp delay={0.4}>
            <p className="text-center text-sm text-text-muted mt-10">
              {isZh
                ? '完整 evidence pack 範例與 framework 對照表請見 /compliance'
                : 'Full evidence pack samples and framework mapping at /compliance'}
            </p>
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
