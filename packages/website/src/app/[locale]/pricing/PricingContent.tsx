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
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
              {isZh
                ? 'AI agent 安全需要一個感測器網路和一個 F500 平台。Community 安裝餵感測器網路;Enterprise 拿到平台與合規證據套件。中間 tier 不適合這類產品 — 我們刻意跳過。'
                : 'AI agent security needs both a sensor network and an F500-grade platform. Community installs feed the network. Enterprise gets the platform + compliance evidence kit. We skip the middle tier on purpose — and explain why below.'}
            </p>
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

              <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                {isZh
                  ? '完整 7 層堆疊,無 agent 數量上限,所有 feature 與 Enterprise 一樣。唯一差別是自架 + 社群支援。'
                  : 'Full 7-layer stack, unlimited agents, every feature Enterprise has. Only difference: self-host + community support.'}
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

              <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                {isZh
                  ? 'F500 採購前的試水合約。IT Director 層級可 approve,不需進 CFO 議程。結束時 credit $25K 到 Y1 Enterprise 合約。'
                  : 'F500 POC-before-procurement contract. IT director can approve without reaching CFO. Full $25K credits against Y1 Enterprise contract on upgrade.'}
              </p>

              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'On-prem / VPC / airgap 部署協助',
                        '每週 6 小時 engineering 時間(founder 親上)',
                        '樣本季度合規證據報告(EU AI Act / NIST AI RMF / ISO 42001 / OWASP Agentic 對應)',
                        '自訂 ATR rule pack 試做',
                        'SIEM webhook 整合樣板',
                        '90 天後升級 Enterprise 或乾淨結束',
                        '可 credit 全額 $25K 到 Y1 Enterprise 年約',
                      ]
                    : [
                        'On-prem / VPC / airgap deployment help',
                        '6 hr/week engineering time (founder directly)',
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

              <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                {isZh
                  ? '不賣 feature spec,賣「ATR 標準維護者的直接關係 + F500 合規證據套件」。'
                  : 'We do not sell feature specs — we sell a direct channel to the ATR standard maintainer plus an F500-ready compliance evidence kit.'}
              </p>

              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        '完全無上限:agents / tenants / seats / sites',
                        'On-prem / VPC / airgap 部署',
                        'SAML SSO · SCIM · SIEM webhook · audit export',
                        'AIAM:agent 身分 + scope + delegation(2026 Q3)',
                        '★ AI Compliance Audit Evidence Module(季度報告對應 EU AI Act · Colorado · NIST AI RMF · ISO 42001 · OWASP Agentic)',
                        '優先規則更新 SLA:< 4 小時(vs Community < 24 小時)',
                        'F500 Logo 計畫 · Cisco/Microsoft/NVIDIA 生態系 co-sell',
                        'ATR 標準組織直接 relationship + 早期 draft 規則 access',
                        '專屬 CSM · 季度高管審閱 · roadmap 發言權',
                        'PanGuard Inc. SOC2 Type II 認證(目標 2027 Q2)',
                      ]
                    : [
                        'Truly unlimited: agents / tenants / seats / sites',
                        'On-prem / VPC / airgap deployment',
                        'SAML SSO · SCIM · SIEM webhook · audit export',
                        'AIAM: agent identity + scope + delegation (Q3 2026)',
                        '★ AI Compliance Audit Evidence Module — quarterly reports mapping every detection to EU AI Act · Colorado · NIST AI RMF · ISO 42001 · OWASP Agentic',
                        'Priority rule update SLA: < 4h (vs < 24h Community)',
                        'F500 Logo program · co-sell with Cisco / Microsoft / NVIDIA ecosystem',
                        'Direct relationship with ATR standard maintainer · early draft rule access',
                        'Dedicated CSM · quarterly executive review · roadmap voice',
                        'PanGuard Inc. SOC2 Type II (target Q2 2027)',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                      <span className="text-[13px] text-text-secondary leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
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
            <p className="text-sm text-text-secondary leading-relaxed">
              {isZh
                ? '首 5 家 F500 Enterprise 客戶鎖定 $100K × 2 年(normal $250K),換 logo 公開 + case study 權。此後恢復標準定價。'
                : 'First 5 F500 Enterprise customers lock $100K × 2 years (normal $250K) in exchange for public logo + case study rights. Standard pricing applies thereafter.'}
            </p>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ─── AI Compliance Audit Evidence Module highlight ─── */}
      <SectionWrapper dark>
        <div className="max-w-5xl mx-auto">
          <SectionTitle
            overline={isZh ? '★ Enterprise 核心 product' : '★ ENTERPRISE CORE PRODUCT'}
            title={
              isZh ? 'AI Compliance Audit Evidence Module' : 'AI Compliance Audit Evidence Module'
            }
            subtitle={
              isZh
                ? '這是 Vanta / Drata 做不出、Lakera / Apono 做不出的東西 — 因為他們沒完整 detection engine + ATR standard + audit log。PanGuard 是唯一能把 "偵測事件 → ATR 規則 → 合規框架條文" 串起來的產品。'
                : 'Vanta / Drata cannot build this (no detection engine). Lakera / Apono cannot (not enough stack). PanGuard is the only product that threads detection event → ATR rule → compliance framework article as a single audit-ready artifact.'
            }
          />
          <FadeInUp delay={0.2}>
            <div className="mt-12 bg-surface-2 rounded-xl border border-border p-6 sm:p-8">
              <p className="text-xs font-mono text-brand-sage/80 uppercase tracking-wider mb-5">
                {isZh ? '範例季度報告節錄' : 'Sample quarterly report excerpt'}
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
                      Solo founder 做不好 self-serve middle tier。
                    </strong>
                    100 個 $500/月 SMB 客戶 = 全職處理 low-LTV support,擠壓我給 F500 的時間。Snyk /
                    Datadog 模式有 50-person 工程團隊支撐;我們今天不是那個 shape。
                  </>
                ) : (
                  <>
                    <strong className="text-text-primary">
                      A solo founder cannot run a self-serve middle tier well.
                    </strong>{' '}
                    100 × $500/mo SMB customers = full-time low-LTV support, squeezing the
                    engineering time F500 customers actually pay for. Snyk / Datadog ran that model
                    with 50+ engineers. We are not that shape today.
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
