'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { STATS } from '@/lib/stats';

/**
 * Pricing page — 2-tier + Standards governance (no middle tier).
 *
 * Strategic choice: solo-founder + AI agent security + ATR moat means
 * classic Team/Business tiers are a trap. We ship:
 *   - Community $0 unlimited (sensor network)
 *   - Pilot $25K / 90d (F500 bridge)
 *   - Enterprise $150K-500K/yr (real revenue)
 *   - ATR Standards Organization (independent governance)
 * Middle tier is intentionally absent — explained in the "Why no middle tier" section.
 */

export default function PricingContent() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative min-h-[48vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '定價' : 'PRICING'}
            </p>
            <h1 className="text-[clamp(28px,5vw,56px)] font-extrabold leading-[1.06] tracking-tight text-text-primary max-w-3xl mx-auto">
              {isZh ? (
                <>
                  <span className="text-brand-sage">免費</span>給社群,
                  <br className="sm:hidden" />
                  <span className="text-brand-sage">認真</span>給 F500
                </>
              ) : (
                <>
                  <span className="text-brand-sage">Free</span> for the community,{' '}
                  <br className="sm:hidden" />
                  <span className="text-brand-sage">serious</span> for F500
                </>
              )}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="text-base sm:text-lg text-text-secondary max-w-3xl mx-auto mt-6 leading-[1.85] space-y-3">
              {isZh ? (
                <>
                  <p>
                    四條商業軌道，對應四種不同的客戶與付費理由。
                  </p>
                  <ul className="space-y-2 text-left max-w-2xl mx-auto">
                    <li>
                      <span className="text-text-primary font-semibold">Community（永久免費）</span>
                      ——做為全球 sensor 網路與標準擴散管道，不是收入來源。
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Enterprise SaaS</span>
                      ——解決受監管產業的合規證據缺口與既有規則資產升級。
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Sovereign AI 國家級 reference</span>
                      ——回應國家層級的 detection IP 主權需求。
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Vendor OEM 授權</span>
                      ——給已經把 ATR 規則出貨進自家產品的平台廠商。
                    </li>
                  </ul>
                  <p className="text-sm text-text-muted pt-2">
                    刻意不設中間 tier。理由在頁尾說明。
                  </p>
                </>
              ) : (
                <>
                  <p>Four revenue tracks, mapped to four distinct customer types and reasons to pay.</p>
                  <ul className="space-y-2 text-left max-w-2xl mx-auto">
                    <li>
                      <span className="text-text-primary font-semibold">Community (free forever)</span>
                      {' '}— global sensor network and standard adoption pipeline, not a revenue stream.
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Enterprise SaaS</span>
                      {' '}— closes the compliance-evidence gap for regulated industries and migrates their existing rule assets into the AI agent era.
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Sovereign AI national reference</span>
                      {' '}— addresses the detection-IP sovereignty gap at the nation-state level.
                    </li>
                    <li>
                      <span className="text-text-primary font-semibold">Vendor OEM license</span>
                      {' '}— for platform vendors already shipping ATR rules inside their own products.
                    </li>
                  </ul>
                  <p className="text-sm text-text-muted pt-2">
                    No middle tier — by design. Rationale at the bottom of the page.
                  </p>
                </>
              )}
            </div>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-2 bg-brand-sage/10 border border-brand-sage/30 rounded-full px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
                <span className="text-xs font-semibold text-brand-sage">
                  {isZh ? 'Community 今天可用' : 'Community ships today'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-full px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-amber-400">
                  {isZh ? 'Enterprise 早期客戶 2026 Q2 開始' : 'Enterprise early customers Q2 2026'}
                </span>
              </span>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ─── 3 tiers ─── */}
      <SectionWrapper>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Community */}
          <FadeInUp>
            <div className="bg-surface-2 rounded-xl border border-brand-sage/30 p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Community 社群版' : 'Community'}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
                  {isZh ? '今天可用' : 'Available today'}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-text-primary">$0</span>
                <span className="text-xs text-text-muted">
                  {isZh ? '永久免費 · MIT' : 'forever · MIT'}
                </span>
              </div>

              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mt-4 mb-1">
                {isZh ? '給誰' : 'Who it’s for'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85]">
                {isZh
                  ? '個人開發者、小團隊，以及任何想自架完整 7 層 PanGuard 堆疊的組織。功能與 Enterprise 完全相同——差別在自架部署與社群支援。'
                  : 'Individual developers, small teams, and any organisation that wants to self-host the full 7-layer PanGuard stack. Feature parity with Enterprise — only difference is self-hosted deployment and community support.'}
              </p>

              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        `${STATS.atrRules} 條 ATR 偵測規則(MIT 授權)`,
                        '無 agent / endpoint / tenant 數量上限',
                        '5 層今天已上線:L2 稽核 · L3 防護 · L4 偵測 · L5 誘捕 · L6 反應',
                        '2 層 2026 Q2/Q3 補:L1 探索 · L7 治理',
                        'Threat Cloud 感測器自動註冊 · 匿名遙測(可隨時停用)',
                        'Threat Cloud 規則更新(< 24 小時)',
                        'GitHub Issues + Discord 社群支援',
                        'pga CLI:scan · audit · up · guard · status · sensor',
                      ]
                    : [
                        `${STATS.atrRules} ATR detection rules (MIT licensed)`,
                        'Unlimited agents / endpoints / tenants',
                        '5 layers shipped today: L2 Audit · L3 Protect · L4 Detect · L5 Deceive · L6 Respond',
                        '2 layers coming Q2/Q3 2026: L1 Discover · L7 Govern',
                        'Auto-registers as Threat Cloud sensor · anonymous telemetry (opt-out anytime)',
                        'Threat Cloud rule updates (< 24h)',
                        'Community support via GitHub Issues + Discord',
                        'pga CLI: scan · audit · up · guard · status · sensor',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                      <span className="text-[13px] text-text-secondary leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '立即安裝' : 'Install now'} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </FadeInUp>

          {/* Pilot */}
          <FadeInUp delay={0.08}>
            <div className="bg-surface-2 rounded-xl border border-amber-400/30 p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Pilot 試點' : 'Pilot'}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-0.5">
                  {isZh ? 'F500 試水' : 'F500 bridge'}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-text-primary">$25K</span>
                <span className="text-xs text-text-muted">{isZh ? '/ 90 天' : '/ 90 days'}</span>
              </div>

              <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-400 mt-4 mb-1">
                {isZh ? '給誰' : 'Who it’s for'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85]">
                {isZh
                  ? 'F500 採購流程前的試水合約。IT Director 層級可審核通過，不需要進到 CFO 議程。試點結束後可全額抵入 Y1 Enterprise 年約。'
                  : 'A pre-procurement pilot contract for F500. The IT Director can approve it without reaching CFO. The full $25K credits toward the Year 1 Enterprise contract on upgrade.'}
              </p>

              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'On-prem / VPC / airgap 部署協助',
                        '每週 6 小時資深工程支援',
                        '樣本季度合規證據報告(EU AI Act / NIST AI RMF / ISO 42001 / OWASP Agentic 對應)',
                        '自訂 ATR rule pack 試做',
                        'SIEM webhook 整合樣板',
                        '90 天後升級 Enterprise 或乾淨結束',
                        '可 credit 全額 $25K 到 Y1 Enterprise 年約',
                      ]
                    : [
                        'On-prem / VPC / airgap deployment help',
                        '6 hours/week of senior engineering support',
                        'Sample quarterly compliance evidence report (EU AI Act / NIST AI RMF / ISO 42001 / OWASP Agentic mapping)',
                        'Custom ATR rule pack trial',
                        'SIEM webhook integration template',
                        'Clean exit or upgrade to Enterprise at day 90',
                        'Full $25K credit to Y1 Enterprise contract on upgrade',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[13px] text-text-secondary leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/contact?tier=pilot"
                className="inline-flex items-center justify-center gap-2 w-full bg-amber-400/10 border border-amber-400/40 text-amber-400 hover:bg-amber-400/20 font-semibold rounded-lg py-3 transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '申請 Pilot' : 'Request Pilot'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>

          {/* Enterprise */}
          <FadeInUp delay={0.16}>
            <div className="bg-gradient-to-b from-surface-2 to-surface-1 rounded-xl border border-brand-sage/40 p-7 flex flex-col h-full ring-1 ring-brand-sage/10">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Enterprise 企業版' : 'Enterprise'}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
                  {isZh ? '早期客戶招募中' : 'Early customers'}
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-text-primary">$150K</span>
                <span className="text-xs text-text-muted">
                  {isZh ? '起 · 客製年約' : 'floor · custom annual'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                {isZh ? '目標 $250-350K · 上限 $500K+' : 'Target $250-350K · up to $500K+'}
              </p>

              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mt-4 mb-1">
                {isZh ? '給誰' : 'Who it’s for'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85]">
                {isZh
                  ? '受監管產業——金融、醫療、半導體、半官方，以及任何在 EU AI Act、Colorado AI Act 等法規前提下，需要可稽核 AI Agent 安全層的組織。'
                  : 'Regulated industries — finance, healthcare, semiconductors, and quasi-government organisations that need an audit-ready AI agent security layer under EU AI Act, Colorado AI Act, and similar frameworks.'}
              </p>

              <div className="my-7 flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '三大核心模組' : 'Three core modules'}
                </p>
                <ul className="space-y-3 mb-5">
                  {(isZh
                    ? [
                        {
                          title: 'Migrator Pro',
                          line: '把過去 SOC 累積的 Sigma、YARA、Splunk 等舊規則，自動轉換成 AI Agent 規則。',
                        },
                        {
                          title: 'AI Compliance Audit Evidence Module',
                          line: '產出可直接送進稽核流程的合規證據包（NIST AI RMF、EU AI Act 等五大框架）。',
                        },
                        {
                          title: 'ATR 標準直線關係',
                          line: '提早取得 draft 規則，客戶規則可回流到上游、被 Cisco、Microsoft 等廠商採用。',
                        },
                      ]
                    : [
                        {
                          title: 'Migrator Pro',
                          line: 'Automatically converts legacy Sigma, YARA, and Splunk rules from your SOC into AI agent rules.',
                        },
                        {
                          title: 'AI Compliance Audit Evidence Module',
                          line: 'Produces compliance evidence packs ready for auditors (NIST AI RMF, EU AI Act, plus three more frameworks).',
                        },
                        {
                          title: 'Direct line to the ATR standard',
                          line: 'Early access to draft rules; customer-contributed rules can flow upstream and be adopted by Cisco, Microsoft, and others.',
                        },
                      ]
                  ).map((m) => (
                    <li key={m.title} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                      <div>
                        <p className="text-[13px] font-semibold text-text-primary leading-snug">
                          {m.title}
                        </p>
                        <p className="text-[12px] text-text-secondary mt-1 leading-[1.75]">
                          {m.line}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="text-[12px] text-text-muted leading-[1.85] mb-4">
                  {isZh
                    ? '一併提供：unlimited agents/tenants、on-prem 部署、SAML SSO、SCIM、SIEM webhook、AIAM（2026 Q3 上線）、SOC 2 Type 1 認證進行中（目標 2026 Q3）、專屬 Customer Success Manager。'
                    : 'Also included: unlimited agents/tenants, on-prem deployment, SAML SSO, SCIM, SIEM webhook, AIAM (target Q3 2026), SOC 2 Type 1 in flight (target Q3 2026), and a dedicated Customer Success Manager.'}
                </p>

                <a
                  href="#enterprise-spec"
                  className="text-[12px] text-brand-sage font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  {isZh ? '↓ 查看完整規格' : '↓ See full specification'}
                </a>
              </div>

              <Link
                href="/contact?tier=enterprise"
                className="inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '洽詢業務' : 'Contact sales'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>

        {/* Founding-F500 note */}
        <FadeInUp delay={0.3}>
          <div className="mt-10 max-w-4xl mx-auto bg-surface-2 border border-border rounded-xl p-6 text-center">
            <p className="text-xs font-semibold text-brand-sage uppercase tracking-wider mb-2">
              {isZh ? '首 5 家 F500 創始價' : 'Founding 5 F500 pricing'}
            </p>
            <p className="text-sm text-text-secondary leading-[1.85]">
              {isZh
                ? '首 5 家 F500 Enterprise 客戶可鎖定 $100K × 2 年的創始價（標準定價區間為 $250K–$350K），交換條件為公開 logo 與 case study 授權。第 6 家起恢復標準定價。'
                : 'The first 5 F500 Enterprise customers can lock the founding rate of $100K × 2 years (versus the standard $250K–$350K range), in exchange for public logo and case study rights. Standard pricing resumes from customer six onwards.'}
            </p>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ─── ENTERPRISE — 完整規格 ─── */}
      <SectionWrapper id="enterprise-spec" className="border-t border-border">
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? 'Enterprise 完整規格' : 'ENTERPRISE — FULL SPECIFICATION'}
            title={
              isZh
                ? 'Enterprise 方案的三大模組與平台基礎設施'
                : 'Three core modules plus included platform infrastructure'
            }
            subtitle={
              isZh
                ? '以下是 Enterprise 方案下提供的完整內容。三大核心模組各自獨立可用，平台基礎設施隨方案一併提供。'
                : 'The full content covered by the Enterprise plan. Each core module stands on its own; platform infrastructure is bundled with the contract.'
            }
          />

          {/* Module 1 */}
          <FadeInUp delay={0.05}>
            <div className="mt-12 bg-surface-2 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-2">
                {isZh ? '模組一 · Migrator Pro' : 'Module 1 · Migrator Pro'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 leading-tight">
                {isZh
                  ? '把過去 20 年累積的 SOC 偵測知識，自動銜接成 AI Agent 防護規則。'
                  : 'Bridge two decades of accumulated SOC detection IP into AI agent defense rules — automatically.'}
              </h3>
              <div className="space-y-4 text-[14px] text-text-secondary leading-[1.85]">
                <p>
                  {isZh
                    ? '銀行、醫院、半導體廠的 SOC 累積了大量 Sigma、YARA、Snort、Splunk 查詢，以及 CVE 對應規則。這些規則本身抓不到 prompt injection 或 tool poisoning，但底層的攻擊知識依然有效——SQL injection 沒消失，只是搬進了 tool call；命令注入沒消失，只是換了載體。'
                    : "Banks, hospitals, and semiconductor SOCs have built up large libraries of Sigma, YARA, Snort, Splunk queries, and CVE mappings. These rules don't directly catch prompt injection or tool poisoning, but the attack knowledge underneath still applies — SQL injection didn't vanish, it moved into tool calls; command injection didn't vanish, it changed substrate."}
                </p>
                <p>
                  {isZh
                    ? 'Migrator Pro 把 15 種來源格式自動轉換為 ATR 行為層規則，並補上一份可直接送進稽核流程的合規證據包。'
                    : 'Migrator Pro converts 15 source formats into ATR behavioral rules automatically, with a compliance evidence pack ready for auditors.'}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '支援的來源格式（共 15 種）' : 'Supported source formats (15 total)'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[13px] text-text-secondary font-mono">
                  {[
                    'Sigma',
                    'Splunk SPL',
                    'Elastic EQL',
                    'YARA',
                    'Snort',
                    'Falco',
                    'Semgrep',
                    'CodeQL',
                    'CVE-NVD',
                    'GHSA',
                    'OSV',
                    'CISA KEV',
                    'NVIDIA garak',
                    'Microsoft PyRIT',
                    'promptfoo',
                  ].map((f) => (
                    <span key={f} className="bg-surface-1 rounded px-2 py-1 text-center">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '附帶能力' : 'Capabilities included'}
                </p>
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'LLM 與人工聯合精修，品質達到 Cisco 已合併 PR 的水準',
                        '五大合規框架自動對照：EU AI Act、NIST AI RMF、ISO/IEC 42001、OWASP Agentic、OWASP LLM Top 10',
                        '稽核證據包附 SHA-256 與 Merkle tree 簽章',
                        '6 分頁 Web Dashboard、地端部署',
                        '客戶貢獻的規則可回流到 ATR 上游，被 Cisco、Microsoft 等下游廠商採用',
                      ]
                    : [
                        'Joint LLM and human refinement at the quality level of Cisco-merged PRs',
                        'Auto-mapping to five compliance frameworks: EU AI Act, NIST AI RMF, ISO/IEC 42001, OWASP Agentic, OWASP LLM Top 10',
                        'Audit evidence packs signed with SHA-256 and Merkle tree',
                        '6-tab Web Dashboard with on-prem deployment',
                        'Customer-contributed rules can flow back upstream into ATR and be adopted by Cisco, Microsoft, and other downstream vendors',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                      <span className="text-[14px] text-text-secondary leading-[1.85]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeInUp>

          {/* Module 2 */}
          <FadeInUp delay={0.1}>
            <div className="mt-6 bg-surface-2 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-2">
                {isZh
                  ? '模組二 · AI Compliance Audit Evidence Module'
                  : 'Module 2 · AI Compliance Audit Evidence Module'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 leading-tight">
                {isZh
                  ? '產出可被稽核員直接採用的合規證據——這是 Vanta、Drata 在架構上做不到的能力。'
                  : 'Produce compliance evidence auditors can use directly — a capability Vanta and Drata cannot architecturally deliver.'}
              </h3>
              <div className="space-y-4 text-[14px] text-text-secondary leading-[1.85]">
                <p>
                  {isZh
                    ? '每筆偵測事件都對應到具體的 ATR 規則 ID，並串連五大框架的條文：EU AI Act、Colorado AI Act、NIST AI RMF、ISO/IEC 42001、OWASP Agentic。報告為 PDF 與 JSON 雙格式輸出，附 SHA-256 與 Merkle tree 簽章。'
                    : 'Each detection event is mapped to a specific ATR rule ID and threaded across articles in five frameworks: EU AI Act, Colorado AI Act, NIST AI RMF, ISO/IEC 42001, and OWASP Agentic. Reports are delivered in PDF and JSON, signed with SHA-256 and Merkle tree.'}
                </p>
                <p>
                  {isZh
                    ? '為什麼 Vanta、Drata 做不到：他們沒有自家 detection engine，也沒有 ATR 標準作為偵測層。Lakera、Apono 則缺乏完整堆疊。PanGuard 是目前唯一能把「偵測事件 → ATR 規則 → 合規條文」一條線串起來的方案。'
                    : "Why Vanta and Drata cannot do this: they have no in-house detection engine, and they do not own ATR as the detection layer underneath. Lakera and Apono lack the full stack. PanGuard is the only product today that threads detection event → ATR rule → compliance article as a single audit-ready artefact."}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '已上線能力' : 'Shipped capabilities'}
                </p>
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'NIST AI RMF 100% 規則覆蓋（1,566 個 mapping，於 ATR v2.1.0 上線）',
                        'EU AI Act Article 9、12、14、15、50 自動對照',
                        '季度合規報告：每筆偵測 → ATR 規則 ID → 五大框架條文',
                        'PDF 與 JSON 雙格式，SHA-256 與 Merkle tree 不可竄改簽章',
                      ]
                    : [
                        'NIST AI RMF 100% rule coverage (1,566 mappings, shipped in ATR v2.1.0)',
                        'EU AI Act Articles 9, 12, 14, 15, and 50 auto-mapped',
                        'Quarterly compliance reports threading detection event → ATR rule ID → 5-framework articles',
                        'Tamper-evident PDF + JSON outputs signed with SHA-256 and Merkle tree',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                      <span className="text-[14px] text-text-secondary leading-[1.85]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeInUp>

          {/* Module 3 */}
          <FadeInUp delay={0.15}>
            <div className="mt-6 bg-surface-2 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-2">
                {isZh
                  ? '模組三 · ATR 標準維護方直線關係'
                  : 'Module 3 · Direct line to the ATR standards maintainer'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 leading-tight">
                {isZh
                  ? '客戶不是被動採用標準，而是直接參與 ATR 的演進。'
                  : "Customers don't passively adopt the standard — they participate in shaping ATR's roadmap."}
              </h3>
              <div className="space-y-4 text-[14px] text-text-secondary leading-[1.85]">
                <p>
                  {isZh
                    ? '客戶可在 draft 規則公開前 30 天即取得，便於在攻擊曝光前完成內部部署測試。客戶在 Migrator 中精修出來的規則，也可以選擇回流到 ATR 上游——一旦 merge，這些規則會被 Cisco AI Defense、Microsoft AGT 等下游廠商共同採用，等於把貴公司的偵測知識資產推廣到整個生態系。'
                    : "Customers receive draft rules 30 days before public release, allowing internal deployment testing before attacks become public. Rules refined inside Migrator can also be sent back upstream — once merged into ATR, those rules ship across the ecosystem to Cisco AI Defense, Microsoft AGT, and others, effectively distributing your detection IP across the industry."}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                  {isZh ? '直線關係內容' : 'What the relationship includes'}
                </p>
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'Draft 規則公開前 30 天即可取得',
                        '客戶貢獻規則的回流機制：可被 Cisco、Microsoft 等下游廠商採用',
                        '優先規則更新 SLA：4 小時內（Community 為 24 小時內）',
                        'Roadmap 投票權與季度高階主管 review',
                      ]
                    : [
                        'Early access to draft rules 30 days before public release',
                        "Upstream contribution path: customer rules can be adopted by Cisco, Microsoft, and other downstream vendors",
                        'Priority rule update SLA within 4 hours (Community SLA is within 24 hours)',
                        'Roadmap vote and quarterly executive review',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-1" />
                      <span className="text-[14px] text-text-secondary leading-[1.85]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeInUp>

          {/* Platform infrastructure */}
          <FadeInUp delay={0.2}>
            <div className="mt-6 bg-surface-1 rounded-xl border border-border p-7">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-3">
                {isZh ? '一併提供的平台基礎設施' : 'Platform infrastructure (included)'}
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {(isZh
                  ? [
                      'Agents、tenants、seats、sites 完全無上限',
                      'On-prem、VPC、airgap 部署',
                      'SAML SSO、SCIM、SIEM webhook、稽核日誌匯出',
                      'AIAM（agent identity、scope、delegation）—— 預計 2026 Q3 上線',
                      'F500 Logo 計畫，與 Cisco、Microsoft、NVIDIA 生態系 co-sell',
                      '專屬 Customer Success Manager',
                      'PanGuard Inc. SOC 2 Type 1 認證進行中（目標 2026 Q3）',
                      'SOC 2 Type II 目標 2027 H2',
                    ]
                  : [
                      'Truly unlimited agents, tenants, seats, and sites',
                      'On-prem, VPC, and airgap deployment',
                      'SAML SSO, SCIM, SIEM webhook, audit log export',
                      'AIAM — agent identity, scope, and delegation (target Q3 2026)',
                      'F500 Logo program; co-sell with Cisco, Microsoft, and NVIDIA ecosystem',
                      'Dedicated Customer Success Manager',
                      'PanGuard Inc. SOC 2 Type 1 in flight (target Q3 2026)',
                      'SOC 2 Type II target H2 2027',
                    ]
                ).map((f) => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                    <span className="text-[13px] text-text-secondary leading-[1.85]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── Sovereign National Reference Track ─── */}
      <SectionWrapper>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? '主權 AI 國家級' : 'SOVEREIGN AI NATIONAL REFERENCE'}
            title={
              isZh
                ? '為主權 AI 國家打造的 reference deployment'
                : 'Reference deployment for sovereign AI nations'
            }
            subtitle={
              isZh
                ? '每一個民主國家都在打造自己的主權 AI 模型與算力，但安全層仍向美國私企租用。ATR、Migrator、Compliance 三者構成這個缺口的開放標準答案。'
                : 'Every democracy is building sovereign AI models and compute, yet the security layer is still rented from US-private vendors. ATR, Migrator, and the Compliance module together form the open-standard answer to that gap.'
            }
          />

          <FadeInUp delay={0.1}>
            <div className="mt-12 grid lg:grid-cols-3 gap-6">
              {/* Path 1 */}
              <div className="bg-surface-2 rounded-xl border border-brand-sage/30 p-6 flex flex-col h-full">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-3">
                  {isZh ? 'Path 1 · 標準引用' : 'Path 1 · Standards Reference'}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-extrabold text-text-primary">$0</span>
                  <span className="text-xs text-text-muted">
                    {isZh ? '零商業義務' : 'no commercial obligation'}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-[1.85] flex-1">
                  {isZh
                    ? '由國家層級單位（如數位部會、NCSC、AI 安全機構）公開引用 ATR，作為該國 AI agent 安全的參考框架。'
                    : "A national-level body (digital ministry, NCSC, AI safety agency) publicly cites ATR as the country's reference framework for AI agent security."}
                </p>
                <p className="text-xs text-text-muted leading-[1.85] mt-3">
                  {isZh
                    ? '我們在 sovereign-ai-defense 頁面列出該國為 ecosystem reference。預計 1 至 2 週可完成正式對接。'
                    : 'We list the country as an ecosystem reference on the sovereign-ai-defense page. Estimated time to commit: 1–2 weeks.'}
                </p>
              </div>

              {/* Path 2 */}
              <div className="bg-surface-2 rounded-xl border border-blue-400/30 p-6 flex flex-col h-full">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-blue-400 mb-3">
                  {isZh ? 'Path 2 · 技術聯合驗證' : 'Path 2 · Technical Co-eval'}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-extrabold text-text-primary">$0</span>
                  <span className="text-xs text-text-muted">
                    {isZh ? '90 天，雙方零成本' : '90 days, zero cost'}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-[1.85] flex-1">
                  {isZh
                    ? '由國家紅隊以自有對抗樣本，對 ATR 全 330 條規則進行完整測試。我們提供偵測引擎、Migrator 工具與完整的失敗案例揭露。'
                    : "The national red team runs its own adversarial corpus against ATR's full 330-rule library. We provide the detection engine, Migrator tooling, and full failure-case disclosure."}
                </p>
                <p className="text-xs text-text-muted leading-[1.85] mt-3">
                  {isZh
                    ? '產出為獨立第三方驗證報告，所有測試 artifact 由該國保留。雙方零成本，週期 90 天。'
                    : 'Output is an independent third-party validation report. All testing artifacts remain with the nation. Zero cost on both sides over a 90-day cycle.'}
                </p>
              </div>

              {/* Path 3 */}
              <div className="bg-gradient-to-b from-surface-2 to-surface-1 rounded-xl border border-brand-sage/40 p-6 flex flex-col h-full ring-1 ring-brand-sage/10">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage mb-3">
                  {isZh ? 'Path 3 · 商業合約落地' : 'Path 3 · Commercial Reference Deployment'}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-extrabold text-text-primary">$5–20M</span>
                  <span className="text-xs text-text-muted">
                    {isZh ? '/ 多年合約' : '/ multi-year'}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-[1.85] flex-1">
                  {isZh
                    ? '國家級 reference deployment，包含完整 ATR、Migrator Pro、Compliance Module、Threat Cloud，以及在地部署與客製規則包。'
                    : 'Nation-scale reference deployment: full ATR, Migrator Pro, Compliance Module, Threat Cloud, in-region deployment, and custom rule packs.'}
                </p>
                <p className="text-xs text-text-muted leading-[1.85] mt-3">
                  {isZh
                    ? '由經認證的區域 enterprise vendor 夥伴負責落地與在地服務，PanGuard 擔任上游 ATR 標準維護方。商業模式對應 Linux Foundation 國家級合約與 Red Hat 聯邦合約之先例。'
                    : 'Delivery is handled by a certified regional enterprise vendor partner, with PanGuard as the upstream ATR standards maintainer. The structure follows the Linux Foundation national-contract and Red Hat federal-contract precedent.'}
                </p>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.25}>
            <div className="mt-10 bg-surface-2 border border-border rounded-xl p-6 text-center max-w-3xl mx-auto">
              <p className="text-xs font-semibold text-brand-sage uppercase tracking-wider mb-3">
                {isZh ? '為什麼國家層級會採用' : 'Why nations adopt this'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85]">
                {isZh
                  ? '主權 AI 由三個元素構成：主權的模型、主權的算力、主權的偵測知識資產。'
                  : 'Sovereign AI rests on three pillars: sovereign model, sovereign compute, and sovereign detection knowledge.'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85] mt-3">
                {isZh
                  ? '前兩項，各國已投入數十億美元自行建構；第三項目前仍向美國私企租用——而這正是主權 AI 計畫原本要消除的依賴。'
                  : 'Nations have already invested billions building the first two in-house. The third is still rented from US-private vendors — exactly the dependency that sovereign AI programs were designed to eliminate.'}
              </p>
              <p className="text-sm text-text-secondary leading-[1.85] mt-3">
                {isZh
                  ? 'Migrator 把一國 SOC 累積數十年的偵測知識（Sigma、YARA、Snort、SCADA 等）自動銜接到 AI Agent 時代，讓國家保留偵測知識的主權，無須丟棄、也無須回租。'
                  : "Migrator bridges decades of a nation's accumulated SOC detection IP (Sigma, YARA, Snort, SCADA, and others) into the AI agent era — letting the nation keep sovereignty over its detection knowledge, with no rewriting and no rental from foreign vendors."}
              </p>
              <a
                href="https://sovereign-ai-defense.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold mt-4 hover:underline"
              >
                {isZh ? '完整 Sovereign AI Defense 倡議書' : 'Full Sovereign AI Defense brief'}{' '}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── Vendor OEM License Track ─── */}
      <SectionWrapper dark>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? '平台廠商 OEM 授權' : 'VENDOR OEM LICENSE'}
            title={
              isZh
                ? '在自家 AI 安全產品中內建 ATR Pro Rule Pack'
                : 'Ship ATR Pro Rule Pack inside your AI security product'
            }
            subtitle={
              isZh
                ? 'Cisco AI Defense 已採用全部 330 條 ATR 規則；Microsoft AGT 採用 287 條並啟用每週自動同步；NVIDIA garak、Gen Digital Sage、IBM mcp-context-forge 的整合正在進行中。若貴公司的產品需要精修到 Cisco 已合併 PR 品質的版本——包含 draft 規則的早期存取、五大框架合規 metadata，以及白標部署——OEM tier 是為這個情境設計的方案。'
                : 'Cisco AI Defense ships all 330 ATR rules. Microsoft AGT ships 287 rules with weekly auto-sync. NVIDIA garak, Gen Digital Sage, and IBM mcp-context-forge integrations are in flight. For vendors who need the Cisco-merge-PR-quality enriched version — early access to draft rules, five-framework compliance metadata, white-label deployment — the OEM tier is purpose-built for that scenario.'
            }
          />

          <FadeInUp delay={0.1}>
            <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary mb-2">
                  {isZh ? 'OEM Use License' : 'OEM Use License'}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-extrabold text-text-primary">$2–10M</span>
                  <span className="text-xs text-text-muted">/ {isZh ? '年' : 'year'}</span>
                </div>
                <p className="text-[13px] text-text-secondary leading-[1.85] mb-4">
                  {isZh
                    ? '提供給 Cisco、Microsoft、NVIDIA、Gen Digital 等級的廠商，把已精修的 Pro Rule Pack 內建於自家產品。'
                    : 'For vendors at the scale of Cisco, Microsoft, NVIDIA, or Gen Digital, embedding the enriched Pro Rule Pack inside their own product.'}
                </p>
                <p className="text-[13px] text-text-secondary leading-[1.85]">
                  {isZh
                    ? '包含 draft 規則早期存取、五大框架合規 metadata、白標部署、客製攻擊類別，以及 ATR roadmap 投票權。'
                    : 'Includes early access to draft rules, five-framework compliance metadata, white-label deployment, custom attack classes, and ATR roadmap voting rights.'}
                </p>
              </div>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary mb-2">
                  {isZh ? '策略夥伴條款' : 'Strategic Partnership Terms'}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl font-bold text-text-primary">
                    {isZh ? '客製合約' : 'Custom'}
                  </span>
                </div>
                <p className="text-[13px] text-text-secondary leading-[1.85] mb-4">
                  {isZh
                    ? '專為與 ATR 進行長期 ecosystem 深度整合的廠商保留。'
                    : 'Reserved for vendors pursuing long-term ecosystem integration with ATR.'}
                </p>
                <p className="text-[13px] text-text-secondary leading-[1.85]">
                  {isZh
                    ? '可協商項目包含併購優先承購權、共同 GTM、工程協作、ATR Foundation 治理席位等。'
                    : 'Negotiable terms include M&A right of first refusal, joint GTM, engineering collaboration, and an ATR Foundation governance seat.'}
                </p>
              </div>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact?tier=oem"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-panguard-green text-white font-semibold text-sm hover:bg-panguard-green-light transition-colors"
              >
                {isZh ? '洽談 OEM 授權' : 'Discuss OEM license'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:adam@agentthreatrule.org?subject=PanGuard%20OEM%20License%20Inquiry"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-border text-text-secondary text-sm hover:border-brand-sage hover:text-text-primary transition-colors"
              >
                {isZh ? '直接寄信' : 'Email directly'}
              </a>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── Sample compliance evidence report ─── */}
      <SectionWrapper dark>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? '範例稽核報告' : 'SAMPLE AUDIT REPORT'}
            title={
              isZh ? 'Compliance Evidence 報告長什麼樣子' : 'What a Compliance Evidence report looks like'
            }
            subtitle={
              isZh
                ? '以下是 Enterprise 客戶每季收到的合規證據報告節錄。每筆偵測事件對應到 ATR 規則 ID，並串連到 EU AI Act、NIST AI RMF、ISO/IEC 42001 等框架的具體條文，可直接送進稽核流程。'
                : "Below is an excerpt from the quarterly compliance evidence report Enterprise customers receive. Each detection is mapped to an ATR rule ID and threaded through specific articles in EU AI Act, NIST AI RMF, ISO/IEC 42001, and other frameworks — ready to submit directly to auditors."
            }
          />
          <FadeInUp delay={0.2}>
            <div className="mt-12 bg-surface-2 rounded-xl border border-border p-6 sm:p-8">
              <p className="text-xs font-mono text-brand-sage/80 uppercase tracking-wider mb-5">
                {isZh ? '季度報告節錄' : 'Quarterly report excerpt'}
              </p>
              <pre className="text-xs sm:text-sm text-text-secondary font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {`Q2 2026 Detection Evidence Report · Acme Corp
──────────────────────────────────────────────

Total events intercepted by PanGuard Guard: 1,847

Mapping by compliance framework
──────────────────────────────────────────────
EU AI Act Article 12 (logging requirement):    612 events
  └─ Primary rules:  ATR-2026-00001, ATR-2026-00121, ATR-2026-00149
  └─ Retention:      7-year audit log archive (Enterprise)

NIST AI RMF Govern.1.1 (risk management):      488 events
  └─ Primary rules:  ATR-2026-00080..00096
  └─ Confidence:     ≥0.90 across all flagged events

ISO/IEC 42001 clause 6.2 (risk treatment):     347 events
  └─ Primary rules:  ATR-2026-00040, ATR-2026-00099

Colorado AI Act SB24-205 (disclosure):          44 events
OWASP Agentic Top 10 (ASI-01..10):             356 events (consolidated)

Auditor-ready artefacts
──────────────────────────────────────────────
  ✓ PDF report (signed, hash-verified)
  ✓ JSON export for SIEM ingestion
  ✓ Per-article evidence bundle
  ✓ ATR rule provenance chain`}
              </pre>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── ATR Standards Organization ─── */}
      <SectionWrapper>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? 'ATR 標準組織' : 'ATR STANDARDS ORGANIZATION'}
            title={
              isZh
                ? '開源標準 + 獨立治理 + 認證計畫'
                : 'Open standard, independent governance, certification program'
            }
            subtitle={
              isZh
                ? 'ATR 是 MIT 授權的開源偵測協定,治理獨立於 PanGuard。任何人、任何產品免費使用。Skill 認證由社群志願者免費審核(類 MITRE ATT&CK 模式)。唯一付費層是 Enterprise Member(類 Apache Software Foundation Platinum Sponsor)。'
                : 'ATR is an MIT-licensed open detection protocol with governance independent of PanGuard. Anyone, any product, can use it freely. Skill certification is run by community reviewers at no cost (MITRE ATT&CK model). The only paid surface is Enterprise Membership — modeled on the Apache Software Foundation Platinum Sponsor pattern.'
            }
          />

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <FadeInUp delay={0.1}>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary">
                  {isZh ? 'ATR Certified Skill' : 'ATR Certified Skill'}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {isZh ? '社群志願者審核' : 'community-run review'}
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-brand-sage">
                    {isZh ? '免費' : 'Free'}
                  </span>
                  <span className="text-xs text-text-muted">{isZh ? '永久' : 'forever'}</span>
                </div>
                <p className="text-[13px] text-text-secondary mt-4 leading-relaxed">
                  {isZh
                    ? "Skill 作者免費 submit PR 到 ATR repo · 社群志願 reviewer 透明審核(類 MITRE ATT&CK / Let's Encrypt 模式)· 通過後獲得徽章 + 自動上架 ATR registry + PanGuard Community 白名單。PanGuard 不收錢、不決定結果 — authority 靠透明度,不靠付費。"
                    : "Skill authors submit a PR free of charge to the ATR repo. Community volunteer reviewers audit transparently (MITRE ATT&CK / Let's Encrypt model). Certified skills get the badge, ATR registry listing, and PanGuard Community whitelist. PanGuard does not charge and does not decide outcomes — authority lives in transparency, not paywalls."}
                </p>
                <a
                  href="https://github.com/Agent-Threat-Rule/agent-threat-rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold mt-5 hover:underline"
                >
                  {isZh ? 'Submit 到 ATR GitHub' : 'Submit on ATR GitHub'}{' '}
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </FadeInUp>

            <FadeInUp delay={0.18}>
              <div className="bg-surface-2 rounded-xl border border-border p-6">
                <p className="text-sm font-bold text-text-primary">
                  {isZh ? 'ATR Enterprise Member' : 'ATR Enterprise Member'}
                </p>
                <p className="text-xs text-text-muted mt-2">
                  {isZh ? '年會員費' : 'annual membership'}
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-text-primary">$10K</span>
                  <span className="text-xs text-text-muted">/ {isZh ? '年' : 'year'}</span>
                </div>
                <p className="text-[13px] text-text-secondary mt-4 leading-relaxed">
                  {isZh
                    ? 'Logo 放 ATR 官網 · 治理投票權 · 優先 PR review · 早期 draft 規則 access · 年度 roadmap 會議發言權。類 MITRE Engenuity / ISO 工作組模式。'
                    : 'Logo on ATR registry · governance vote · priority PR review · early draft rule access · seat in annual roadmap meeting. Modeled on MITRE Engenuity and ISO working-group pattern.'}
                </p>
                <Link
                  href="/contact?tier=atr-member"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold mt-5 hover:underline"
                >
                  {isZh ? '申請會員' : 'Apply for membership'} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </FadeInUp>
          </div>
        </div>
      </SectionWrapper>

      {/* ─── Why no middle tier ─── */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <SectionTitle
            overline={isZh ? '為什麼沒有 Team / Business tier' : 'WHY NO TEAM / BUSINESS TIER'}
            title={isZh ? '中間 tier 對這個產品是陷阱' : 'Middle tier is a trap for this product'}
          />
          <FadeInUp delay={0.15}>
            <div className="mt-10 space-y-5 text-sm sm:text-base text-text-secondary leading-relaxed">
              <p>
                {isZh ? (
                  <>
                    <strong className="text-text-primary">
                      個人開發者 & SMB 的 value 是 sensor,不是 subscription。
                    </strong>
                    Agent security 的 runtime 本質對個人 dev value 有限 — 你跑 2 個 Claude
                    Code,不需要付月費 monitor。反而,每個 Community 安裝都是感測器,把威脅資訊餵回
                    Threat Cloud → 結晶成新 ATR 規則 → 所有人得益。這個 flywheel 用 paywall 會打破。
                  </>
                ) : (
                  <>
                    <strong className="text-text-primary">
                      For individual devs and SMB, the value is being a sensor, not a subscription.
                    </strong>{' '}
                    Agent security is runtime-centric — a developer running 2 Claude Code sessions
                    does not need a monthly bill to watch them. Each Community install is a sensor
                    that feeds telemetry back to Threat Cloud, which crystallizes new ATR rules,
                    which strengthens detection for everyone. A paywall breaks this flywheel.
                  </>
                )}
              </p>
              <p>
                {isZh ? (
                  <>
                    <strong className="text-text-primary">
                      Self-serve 中間 tier 需要的是規模化客服與通路團隊。
                    </strong>
                    100 個月費 $500 的 SMB 客戶等同於一支專責處理低 LTV 客戶的工程組——這會直接擠壓
                    為 F500 與主權客戶提供的工程時間。Snyk、Datadog 之所以能跑這個模式，背後是 50+
                    人的工程團隊與專屬客服管線。我們的公司形態目前不適合那個層級的自助訂閱。
                  </>
                ) : (
                  <>
                    <strong className="text-text-primary">
                      A self-serve middle tier needs a scaled customer-success and support
                      organisation.
                    </strong>{' '}
                    100 SMB customers at $500/month is equivalent to a full-time engineering team
                    supporting low-LTV accounts — and that directly squeezes the engineering time
                    F500 and sovereign customers actually pay for. Snyk and Datadog ran this model
                    with 50+ engineers behind a dedicated support pipeline. PanGuard is not that
                    shape today.
                  </>
                )}
              </p>
              <p>
                {isZh ? (
                  <>
                    <strong className="text-text-primary">F500 不需要中間 tier 當橋樑。</strong>
                    F500 security team 本來就用免費 Community 試水 90 天,要合規 + SOC2 + airgap 時跳
                    Pilot → Enterprise。這是 F500 實際的採購行為,不是付費 Team tier。
                  </>
                ) : (
                  <>
                    <strong className="text-text-primary">
                      F500 does not need a middle tier as a bridge.
                    </strong>{' '}
                    F500 security teams naturally pilot on free Community for 90 days, then jump to
                    Pilot → Enterprise when they need compliance, SOC2, and airgap. That matches
                    real F500 procurement behaviour — a paid Team tier sits in nobody&apos;s way.
                  </>
                )}
              </p>
              <p className="text-text-muted italic">
                {isZh
                  ? '如果 Y2 資料顯示中間有真實需求,我們會重新評估。今天的資料說:不要建。'
                  : "If Y2 data shows a real middle-tier demand, we will reevaluate. Today's data says: do not build it."}
              </p>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ─── CTA ─── */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              {isZh ? '還在評估?' : 'Still evaluating?'}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-4 leading-relaxed">
              {isZh
                ? 'GRC 採購問題 · on-prem 架構 · 合規 mapping 細節 · F500 logo 計畫 — 直接寫信,48 小時內回。'
                : 'GRC procurement questions · on-prem architecture · compliance mapping specifics · F500 logo program — email us, 48h response.'}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-6 py-3 transition-all"
              >
                {isZh ? '試 Community' : 'Try Community'} <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all"
              >
                {isZh ? '寫信給我們' : 'Contact us'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
