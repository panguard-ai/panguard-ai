'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { STATS } from '@/lib/stats';

/**
 * /enterprise — deep specification page for sales-led plans.
 * The full Enterprise spec, Migrator Pro, Sovereign national reference tracks,
 * Vendor OEM license, sample audit report, and ATR membership were moved here
 * from /pricing so the pricing page stays a clean 3-card decision surface.
 */
export default function EnterpriseContent() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative px-5 sm:px-6 lg:px-[120px] py-16 sm:py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '銷售洽談方案 · 完整規格' : 'SALES-LED PLANS · FULL SPECIFICATION'}
            </p>
            <h1 className="text-[clamp(28px,5vw,52px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              {isZh ? 'Enterprise、Migrator Pro 與主權級' : 'Enterprise, Migrator Pro & Sovereign'}
            </h1>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mt-6 leading-[1.85]">
              {isZh
                ? '受監管 production agent、活的簽章合規證據、國家級離網部署與廠商 OEM 授權的完整規格。定價一律洽談。'
                : 'The full specification for regulated production agents, living signed compliance evidence, nation-scale airgap deployment, and vendor OEM licensing. All pricing is sales-led.'}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact?tier=enterprise"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all text-sm"
              >
                {isZh ? '洽詢業務' : 'Contact sales'} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-6 py-3 transition-all text-sm"
              >
                {isZh ? '← 回定價' : '← Back to pricing'}
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

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
                        '客戶貢獻的規則可回流到 ATR 上游——即 ATR 規則被合併進 Cisco、Microsoft repo 的同一條路徑（維護者接受的貢獻，非廠商背書）',
                      ]
                    : [
                        'Joint LLM and human refinement at the quality level of Cisco-merged PRs',
                        'Auto-mapping to five compliance frameworks: EU AI Act, NIST AI RMF, ISO/IEC 42001, OWASP Agentic, OWASP LLM Top 10',
                        'Audit evidence packs signed with SHA-256 and Merkle tree',
                        '6-tab Web Dashboard with on-prem deployment',
                        'Customer-contributed rules can flow back upstream into ATR — the same path by which ATR rules were merged into Cisco and Microsoft repos (maintainer-accepted contributions, not vendor endorsements)',
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
                    ? '每筆偵測事件都對應到具體的 ATR 規則 ID，並串連六大框架的條文：EU AI Act、Colorado AI Act、NIST AI RMF、ISO/IEC 42001、OWASP Agentic Top 10、OWASP LLM Top 10。報告為 PDF 與 JSON 雙格式輸出，附 SHA-256 與 Merkle tree 簽章。'
                    : 'Each detection event is mapped to a specific ATR rule ID and threaded across articles in six frameworks: EU AI Act, Colorado AI Act, NIST AI RMF, ISO/IEC 42001, OWASP Agentic Top 10, and OWASP LLM Top 10. Reports are delivered in PDF and JSON, signed with SHA-256 and Merkle tree.'}
                </p>
                <p>
                  {isZh
                    ? '為什麼 Vanta、Drata 做不到：他們沒有自家 detection engine，也沒有 ATR 標準作為偵測層。Lakera、Apono 則缺乏完整堆疊。PanGuard 是目前唯一能把「偵測事件 → ATR 規則 → 合規條文」一條線串起來的方案。'
                    : 'Why Vanta and Drata cannot do this: they have no in-house detection engine, and they do not own ATR as the detection layer underneath. Lakera and Apono lack the full stack. PanGuard is the only product today that threads detection event → ATR rule → compliance article as a single audit-ready artefact.'}
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
                        '季度合規報告：每筆偵測 → ATR 規則 ID → 六大框架條文',
                        'PDF 與 JSON 雙格式，SHA-256 與 Merkle tree 不可竄改簽章',
                      ]
                    : [
                        'NIST AI RMF 100% rule coverage (1,566 mappings, shipped in ATR v2.1.0)',
                        'EU AI Act Articles 9, 12, 14, 15, and 50 auto-mapped',
                        'Quarterly compliance reports threading detection event → ATR rule ID → 6-framework articles',
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
                    ? '客戶可在 draft 規則公開前 30 天即取得，便於在攻擊曝光前完成內部部署測試。客戶在 Migrator 中精修出來的規則，也可以選擇回流到 ATR 上游——一旦 merge，便走上 ATR 規則被合併進 Cisco AI Defense（production skill-scanner 規則包，PR #99）與 Microsoft AGT（community-rules 範例，PR #1277）的同一條上游路徑，協助把貴公司的偵測知識資產推廣到採用 ATR 的各 repo——維護者接受的貢獻，非廠商背書。'
                    : 'Customers receive draft rules 30 days before public release, allowing internal deployment testing before attacks become public. Rules refined inside Migrator can also be sent back upstream — once merged into ATR, they travel the same upstream path by which ATR rules were merged into Cisco AI Defense (production skill-scanner rule packs, PR #99) and Microsoft AGT (community-rules examples, PR #1277), helping distribute your detection IP across repos that consume ATR — maintainer-accepted contributions, not vendor endorsements.'}
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
                        '客戶貢獻規則的回流機制：規則可提交至 ATR 上游——ATR 規則已被合併進 Cisco、Microsoft repo（維護者接受，非廠商背書）',
                        '優先規則更新 SLA：4 小時內（Community 為 24 小時內）',
                        'Roadmap 投票權與季度高階主管 review',
                      ]
                    : [
                        'Early access to draft rules 30 days before public release',
                        'Upstream contribution path: customer rules can be submitted to ATR, whose rules have been merged into Cisco and Microsoft repos (maintainer-accepted, not vendor endorsements)',
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
                      'F500 Logo 計畫與生態系 co-sell 規劃',
                      '專屬 Customer Success Manager',
                      'PanGuard Inc. SOC 2 Type 1 認證進行中（目標 2026 Q3）',
                      'SOC 2 Type II 目標 2027 H2',
                    ]
                  : [
                      'Truly unlimited agents, tenants, seats, and sites',
                      'On-prem, VPC, and airgap deployment',
                      'SAML SSO, SCIM, SIEM webhook, audit log export',
                      'AIAM — agent identity, scope, and delegation (target Q3 2026)',
                      'F500 Logo program and ecosystem co-sell motion',
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
                    ? `由國家紅隊以自有對抗樣本，對 ATR 全 ${STATS.totalRulesDisplay} 條規則進行完整測試。我們提供偵測引擎、Migrator 工具與完整的失敗案例揭露。`
                    : `The national red team runs its own adversarial corpus against ATR's full ${STATS.totalRulesDisplay}-rule library. We provide the detection engine, Migrator tooling, and full failure-case disclosure.`}
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
                href="/sovereign"
                className="inline-flex items-center gap-1.5 text-xs text-brand-sage font-semibold mt-4 hover:underline"
              >
                {isZh ? '完整 Sovereign AI Defense 倡議書' : 'Full Sovereign AI Defense brief'}{' '}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.3}>
            <div className="mt-10 max-w-4xl mx-auto">
              <p className="text-center text-xs uppercase tracking-wider font-semibold text-brand-sage mb-4">
                {isZh ? '開始合作' : 'Start engagement'}
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Link
                  href="/contact?tier=sovereign&path=1"
                  className="flex flex-col items-center text-center gap-1 px-5 py-4 rounded-xl border border-brand-sage/40 hover:border-brand-sage hover:bg-brand-sage/5 transition-colors"
                >
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage">
                    {isZh ? 'Path 1 · 標準引用' : 'Path 1 · Standards Reference'}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {isZh ? '申請正式對接 · $0' : 'Request reference · $0'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {isZh ? '1–2 週可上線' : '1–2 weeks to live'}
                  </span>
                </Link>
                <Link
                  href="/contact?tier=sovereign&path=2"
                  className="flex flex-col items-center text-center gap-1 px-5 py-4 rounded-xl border border-blue-400/40 hover:border-blue-400 hover:bg-blue-400/5 transition-colors"
                >
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-400">
                    {isZh ? 'Path 2 · 技術聯合驗證' : 'Path 2 · Technical Co-eval'}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {isZh ? '啟動 90 天驗證 · $0' : 'Start 90-day eval · $0'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {isZh ? '第三方驗證報告' : 'Third-party report'}
                  </span>
                </Link>
                <Link
                  href="/contact?tier=sovereign&path=3"
                  className="flex flex-col items-center text-center gap-1 px-5 py-4 rounded-xl border border-brand-sage bg-brand-sage/10 hover:bg-brand-sage/20 transition-colors"
                >
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-brand-sage">
                    {isZh ? 'Path 3 · 商業合約' : 'Path 3 · Commercial'}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">$5–20M</span>
                  <span className="text-[11px] text-text-muted">
                    {isZh ? '多年期 reference' : 'Multi-year reference'}
                  </span>
                </Link>
              </div>
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
                ? `ATR 規則已被合併進上游廠商的規則包——由維護者接受的貢獻，非廠商背書。${STATS.totalRulesDisplay} 條 ATR 規則包已合併進 Cisco AI Defense skill-scanner 規則包並用於 production（PR #99）；${STATS.adoption.microsoftRulesMerged} 條已合併進 Microsoft AGT 的 community-rules 範例（PR #1277）；NVIDIA garak 的整合正在進行中。若貴公司的產品需要精修到 Cisco 已合併 PR 品質的版本——包含 draft 規則的早期存取、五大框架合規 metadata，以及白標部署——OEM tier 是為這個情境設計的方案。`
                : `ATR rules have been merged upstream into vendor rule packs — maintainer-accepted contributions, not vendor endorsements. The ${STATS.totalRulesDisplay}-rule ATR pack is merged into Cisco AI Defense skill-scanner rule packs, in production (PR #99); ${STATS.adoption.microsoftRulesMerged} rules are merged into Microsoft AGT community-rules examples (PR #1277); NVIDIA garak integration is in flight. For vendors who need the Cisco-merge-PR-quality enriched version — early access to draft rules, five-framework compliance metadata, white-label deployment — the OEM tier is purpose-built for that scenario.`
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
              isZh
                ? 'Compliance Evidence 報告長什麼樣子'
                : 'What a Compliance Evidence report looks like'
            }
            subtitle={
              isZh
                ? '以下是 Enterprise 客戶每季收到的合規證據報告節錄。每筆偵測事件對應到 ATR 規則 ID，並串連到 EU AI Act、NIST AI RMF、ISO/IEC 42001 等框架的具體條文，可直接送進稽核流程。'
                : 'Below is an excerpt from the quarterly compliance evidence report Enterprise customers receive. Each detection is mapped to an ATR rule ID and threaded through specific articles in EU AI Act, NIST AI RMF, ISO/IEC 42001, and other frameworks — ready to submit directly to auditors.'
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
OWASP LLM Top 10:2025 (LLM01..10):             289 events (consolidated)

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
                ? 'ATR 是 MIT 授權的開源偵測協定，治理獨立於 PanGuard。任何人、任何產品免費使用。Skill 認證由社群志願者免費審核（類 MITRE ATT&CK 模式）。唯一付費層是 Enterprise Member(類 Apache Software Foundation Platinum Sponsor)。'
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
                    ? "Skill 作者免費 submit PR 到 ATR repo · 社群志願 reviewer 透明審核(類 MITRE ATT&CK / Let's Encrypt 模式)· 通過後獲得徽章 + 自動上架 ATR registry + PanGuard Community 白名單。PanGuard 不收錢、不決定結果 — authority 靠透明度，不靠付費。"
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
    </>
  );
}
