'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { ShieldIcon, AnalyticsIcon, GlobalIcon } from '@/components/ui/BrandIcons';
import BrandLogo from '@/components/ui/BrandLogo';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { STATS } from '@/lib/stats';

/* ────────────────────────────  Product config  ──────────────────────── */

const productConfigs = [
  /* ── Core Pillars ── */
  {
    key: 'atr' as const,
    icon: AnalyticsIcon,
    badgeColor: 'bg-brand-sage/10 text-brand-sage border-brand-sage/20',
    description: `ATR (Agent Threat Rules) is an open, executable standard for detecting AI agent threats. YAML-based rules across 10 categories cover prompt injection, tool poisoning, skill compromise, unauthorized access, data exfiltration, and more. ATR gives the security community a shared language for AI agent threats. Rules are open-source, human-readable, and machine-enforceable.`,
    descriptionZh: `ATR（Agent Threat Rules）是偵測 AI Agent 威脅的開放、可執行標準。以 YAML 為基礎的規則橫跨 10 大威脅類別，涵蓋 prompt injection、tool poisoning、skill compromise、未授權存取、資料外洩等。ATR 讓資安社群擁有一套描述 AI Agent 威脅的共同語言。規則開源、人類可讀、且可由機器強制執行。`,
    features: [
      'Rules across 10 threat categories, growing continuously',
      'YAML-based, human-readable rule format',
      'Covers prompt injection, tool poisoning, skill compromise, data exfiltration',
      'Open-source -- community-contributed and reviewed',
      'Machine-enforceable by Guard and any compatible engine',
      'Versioned rule lifecycle: draft, experimental, stable, deprecated',
    ],
    featuresZh: [
      '規則橫跨 10 大威脅類別，持續增長',
      '以 YAML 為基礎、人類可讀的規則格式',
      '涵蓋 prompt injection、tool poisoning、skill compromise、資料外洩',
      '開源——由社群貢獻並審核',
      '可由 Guard 及任何相容引擎強制執行',
      '版本化的規則生命週期：draft、experimental、stable、deprecated',
    ],
    href: '/atr',
  },
  {
    key: 'threatCloud' as const,
    icon: GlobalIcon,
    badgeColor: 'bg-brand-sage/10 text-brand-sage border-brand-sage/20',
    description: `Threat Cloud is a self-hosted collective intelligence network. Every Panguard install contributes anonymized threat signals; the pipeline auto-generates ATR rules from real-world attacks. ${STATS.threatIntel.sources} threat intel sources, ${STATS.threatIntel.validatedRecords.toLocaleString()} validated IoC records, and ${STATS.threatIntel.promotedRules} community-promoted rules -- all synced every hour. The more nodes participate, the stronger everyone's defense.`,
    descriptionZh: `Threat Cloud 是可自架的集體威脅情報網路。每一個 Panguard 安裝都會貢獻匿名化的威脅訊號；pipeline 再從真實世界的攻擊自動產生 ATR 規則。${STATS.threatIntel.sources} 個威脅情報來源、${STATS.threatIntel.validatedRecords.toLocaleString()} 筆已驗證 IoC 記錄、${STATS.threatIntel.promotedRules} 條社群晉升規則——全部每小時同步。參與的節點越多，所有人的防禦就越強。`,
    features: [
      `${STATS.threatIntel.sources} threat intel sources with ${STATS.threatIntel.validatedRecords.toLocaleString()} validated records`,
      'Auto-generates ATR rules from collective data',
      `${STATS.threatIntel.promotedRules} community-promoted rules, synced every ${STATS.threatIntel.syncInterval}`,
      'Self-hosted -- your data never leaves your infrastructure',
      'Anomaly signals from Guard and Scan deployments worldwide',
      'Confidence scoring and rule lifecycle management',
    ],
    featuresZh: [
      `${STATS.threatIntel.sources} 個威脅情報來源，${STATS.threatIntel.validatedRecords.toLocaleString()} 筆已驗證記錄`,
      '從集體資料自動產生 ATR 規則',
      `${STATS.threatIntel.promotedRules} 條社群晉升規則，每 ${STATS.threatIntel.syncInterval} 同步一次`,
      '可自架——你的資料永不離開自己的基礎設施',
      '匯集全球 Guard 與 Scan 部署的異常訊號',
      '信心評分與規則生命週期管理',
    ],
    href: '/threat-cloud',
  },
  {
    key: 'guard' as const,
    icon: ShieldIcon,
    badgeColor: 'bg-brand-sage/10 text-brand-sage border-brand-sage/20',
    description: `Panguard Guard is the enforcement engine. A 4-agent pipeline (Detect, Analyze, Respond, Report) processes AI agent events through ${STATS.totalRulesDisplay} ATR detection rules. Built-in Skill Auditor runs ${STATS.skillAuditChecks} checks before any AI skill is installed. Three response modules auto-block IPs, kill processes, and quarantine files.`,
    descriptionZh: `Panguard Guard 是強制執行引擎。4-agent pipeline（Detect、Analyze、Respond、Report）以 ${STATS.totalRulesDisplay} 條 ATR 偵測規則處理 AI Agent 事件。內建的 Skill Auditor 會在任何 AI skill 安裝前執行 ${STATS.skillAuditChecks} 項檢查。三個回應模組可自動封鎖 IP、終止程序、隔離檔案。`,
    features: [
      '4-agent AI pipeline: Detect, Analyze, Respond, Report',
      `${STATS.totalRulesDisplay} ATR detection rules`,
      `Skill Auditor: ${STATS.skillAuditChecks}-layer pre-install security gate`,
      '3 auto-response modules: IP Blocker, Process Killer, File Quarantine',
      'Works with Claude Code, Claude Desktop, Cursor, OpenClaw, Codex, WorkBuddy, NemoClaw, ArkClaw, Windsurf, QClaw, Cline, VS Code Copilot, Zed, Gemini CLI, Continue, Roo Code, and any MCP-compatible AI agent',
      'Supports Linux, macOS, Windows, Docker, Kubernetes',
    ],
    featuresZh: [
      '4-agent AI pipeline：Detect、Analyze、Respond、Report',
      `${STATS.totalRulesDisplay} 條 ATR 偵測規則`,
      `Skill Auditor：${STATS.skillAuditChecks} 層安裝前安全閘門`,
      '3 個自動回應模組：IP Blocker、Process Killer、File Quarantine',
      '可搭配 Claude Code、Claude Desktop、Cursor、OpenClaw、Codex、WorkBuddy、NemoClaw、ArkClaw、Windsurf、QClaw、Cline、VS Code Copilot、Zed、Gemini CLI、Continue、Roo Code 及任何相容 MCP 的 AI Agent',
      '支援 Linux、macOS、Windows、Docker、Kubernetes',
    ],
    href: '/product/guard',
  },
];

/* ════════════════════════  Component  ═══════════════════════ */

export default function ProductOverviewContent() {
  const t = useTranslations('product.overview');
  const isZh = useLocale() === 'zh-TW';

  return (
    <>
      <p id="definition" className="sr-only">
        Panguard AI secures AI agents through three pillars: ATR (the open standard for agent threat
        rules), Threat Cloud (collective immunity network), and Guard (the enforcement engine with
        skill audit and auto-response).
      </p>

      {/* ───────────── Hero ───────────── */}
      <section className="pt-24 pb-4 px-6 text-center">
        <FadeInUp>
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
            {t('overline')}
          </p>
          <h1 className="text-[clamp(40px,5vw,64px)] font-bold text-text-primary leading-[1.08] max-w-4xl mx-auto">
            {t('title')}
            <br />
            <span className="text-brand-sage">{t('titleHighlight')}</span>
          </h1>
          <p className="text-text-secondary mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </FadeInUp>
        <FadeInUp delay={0.1}>
          <div className="mt-10 max-w-[240px] mx-auto">
            {/* CSS phone frame */}
            <div className="relative rounded-[36px] border-4 border-border bg-surface-1 p-2 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-surface-0 rounded-b-xl z-10" />
              {/* Screen */}
              <div className="rounded-[28px] bg-surface-0 overflow-hidden pt-6">
                {/* Status bar */}
                <div className="flex items-center justify-center gap-1.5 px-4 py-2">
                  <BrandLogo size={14} className="text-brand-sage" />
                  <span className="text-[10px] font-semibold text-text-primary">PANGUARD</span>
                </div>
                {/* Protected badge */}
                <div className="px-4 py-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-status-safe/10 flex items-center justify-center mx-auto">
                    <BrandLogo size={18} className="text-status-safe" />
                  </div>
                  <p className="text-xs font-semibold text-status-safe mt-2">Protected</p>
                  <p className="text-[9px] text-text-muted mt-0.5">3 endpoints active</p>
                </div>
                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-px bg-border mx-3">
                  {[
                    { v: '847', l: 'Blocked' },
                    { v: '99.9%', l: 'Uptime' },
                    { v: '0', l: 'Alerts' },
                  ].map((s) => (
                    <div key={s.l} className="bg-surface-0 py-2 text-center">
                      <p className="text-xs font-bold text-text-primary">{s.v}</p>
                      <p className="text-[8px] text-text-muted">{s.l}</p>
                    </div>
                  ))}
                </div>
                {/* Recent */}
                <div className="px-3 py-3 space-y-1.5">
                  {[
                    { t: 'SSH blocked', c: 'bg-status-caution' },
                    { t: 'Model updated', c: 'bg-status-safe' },
                    { t: 'Scan complete', c: 'bg-status-info' },
                  ].map((e) => (
                    <div key={e.t} className="flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${e.c} shrink-0`} />
                      <span className="text-[9px] text-text-tertiary">{e.t}</span>
                    </div>
                  ))}
                </div>
                {/* Bottom spacer for home indicator */}
                <div className="h-4" />
              </div>
            </div>
          </div>
        </FadeInUp>
      </section>

      {/* ───────────── Product Sections ───────────── */}
      {productConfigs.map((product, i) => (
        <SectionWrapper key={product.key} dark={i % 2 === 1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Info */}
            <FadeInUp>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                    <product.icon className="w-5 h-5 text-brand-sage" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-text-primary">
                      {t(`products.${product.key}.name`)}
                    </h2>
                    <span
                      className={`inline-block ${product.badgeColor} border text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full`}
                    >
                      {t(`products.${product.key}.badge`)}
                    </span>
                  </div>
                </div>

                <p className="text-xl text-text-primary font-medium mt-2 mb-4">
                  {t(`products.${product.key}.tagline`)}
                </p>

                <p className="text-text-secondary leading-relaxed">
                  {isZh ? product.descriptionZh : product.description}
                </p>

                <Link
                  href={product.href}
                  className="inline-flex items-center gap-2 mt-6 text-brand-sage hover:text-brand-sage-light font-medium transition-colors group"
                >
                  {isZh ? '深入了解 ' : 'Learn more about '}
                  {t(`products.${product.key}.name`)}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </FadeInUp>

            {/* Right: Features */}
            <FadeInUp delay={0.1}>
              <div className="bg-surface-1 rounded-2xl border border-border p-8 card-glow">
                <p className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-5">
                  {t('capabilities')}
                </p>
                <ul className="space-y-4">
                  {(isZh ? product.featuresZh : product.features).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-text-secondary"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-sage mt-2 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeInUp>
          </div>
        </SectionWrapper>
      ))}

      {/* ───────────── Bottom CTA ───────────── */}
      <SectionWrapper>
        <FadeInUp>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-[clamp(20px,3.5vw,40px)] font-bold text-text-primary leading-[1.1]">
              {t('cta.title')}
            </h2>
            <p className="text-text-secondary mt-4 leading-relaxed">{t('cta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                href="https://docs.panguard.ai/quickstart"
                className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                {t('cta.cta1')}
              </Link>
              <Link
                href="/atr"
                className="border border-border text-text-secondary font-semibold rounded-full px-8 py-3.5 hover:border-brand-sage hover:text-text-primary transition-all duration-200"
              >
                {t('cta.cta2')}
              </Link>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>
    </>
  );
}
