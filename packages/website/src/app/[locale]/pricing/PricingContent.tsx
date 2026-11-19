'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';

/**
 * Pricing — two columns (2026-11-18).
 *   1. Community        free, MIT, no paywall — what the open-source release does today
 *   2. Organizations    no public price — services built with design partners, contact us
 * The earlier price list (Founding Pilot, Enterprise, Migrator Pro, Sovereign, OEM) was
 * taken down: none of those paid services can be delivered yet, so none carries a price.
 * List only what ships today; anything not shipped is labelled as in development.
 */

const COMMUNITY_EN = [
  'ATR detection rules (MIT licensed), updated with each release',
  'pga scan / pga audit: check a skill or MCP server before you install it; SARIF output and a non-zero exit code for CI',
  'Tool-call hook: checks the commands, file writes and web fetches an agent is about to run, and returns allow, ask or deny',
  'MCP proxy: checks calls to the MCP servers it wraps',
  'Local dashboard, no account, no telemetry by default',
  'Rule proposals from pga audit stay on your machine until you submit them yourself',
  'Support on GitHub Issues',
];

const COMMUNITY_ZH = [
  'ATR 偵測規則（MIT 授權），隨每次發版更新',
  'pga scan / pga audit：安裝前檢查 skill 或 MCP server；輸出 SARIF，發現威脅時回傳非零結束碼，可直接接 CI',
  '工具呼叫 hook：在 agent 執行指令、寫檔、抓網頁之前檢查，回應放行、詢問或阻擋',
  'MCP proxy：檢查送往它所包裝的 MCP server 的呼叫',
  '本機儀表板，不需帳號，預設不回傳任何資料',
  'pga audit 產生的規則提案留在你的機器上，由你自己決定是否送出',
  '在 GitHub Issues 提問與回報',
];

const ORG_EN = [
  'One policy and one overview across many machines',
  'Records signed for auditors and insurers to read',
  'On-premises deployment and maintenance',
];

const ORG_ZH = [
  '多台機器共用一套政策與一個總覽',
  '加簽的紀錄，交給稽核與保險公司讀',
  '地端部署與維護',
];

function FeatureList({ items, muted }: { items: readonly string[]; muted?: boolean }) {
  return (
    <ul className="space-y-2.5">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2.5">
          <Check
            className={`w-4 h-4 shrink-0 mt-0.5 ${muted ? 'text-text-muted' : 'text-brand-sage'}`}
          />
          <span className="text-[13px] text-text-secondary leading-snug">{f}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingContent() {
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
              {isZh ? '定價' : 'PRICING'}
            </p>
            <h1 className="text-[clamp(28px,5vw,56px)] font-extrabold leading-[1.06] tracking-tight text-text-primary max-w-3xl mx-auto">
              {isZh ? (
                <>
                  開源版<span className="text-brand-sage">免費</span>，不設付費牆
                </>
              ) : (
                <>
                  The open-source edition is <span className="text-brand-sage">free</span>. No
                  paywall.
                </>
              )}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mt-6 leading-[1.85]">
              {isZh
                ? 'PanGuard 開源版以 MIT 授權釋出，在一台機器上的檢查與阻擋全部免費。跨多台機器、要交給第三方的服務還在和設計夥伴一起開發，沒有公開價格。'
                : 'PanGuard is released under the MIT license. Everything it checks and blocks on a machine is free. Services that span many machines or produce records for third parties are still being built with design partners and have no public price.'}
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ─── 2 columns ─── */}
      <SectionWrapper>
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {/* 1 · Community */}
          <FadeInUp>
            <div className="bg-surface-2 rounded-xl border border-brand-sage/30 p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Community 社群版' : 'Community'}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
                  {isZh ? '今天可用' : 'Available today'}
                </span>
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-text-primary">
                  {isZh ? '免費' : 'Free'}
                </span>
                <span className="text-xs text-text-muted">MIT</span>
              </div>
              <p className="text-sm text-text-secondary leading-[1.85] mt-4">
                {isZh
                  ? '個人開發者、團隊，以及任何想在自己機器上保護 AI agent 的人。'
                  : 'Individual developers, teams, and anyone protecting AI agents on their own machines.'}
              </p>
              <div className="my-7 flex-1">
                <FeatureList items={isZh ? COMMUNITY_ZH : COMMUNITY_EN} />
              </div>
              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '到 GitHub 安裝' : 'Install from GitHub'} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </FadeInUp>

          {/* 2 · Organizations and insurers — no public price */}
          <FadeInUp delay={0.08}>
            <div className="bg-surface-2 rounded-xl border border-border p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? '企業與保險' : 'Organizations & insurers'}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-muted bg-surface-1 border border-border rounded-full px-2.5 py-0.5">
                  {isZh ? '與設計夥伴開發中' : 'In development with design partners'}
                </span>
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-text-primary">
                  {isZh ? '聯絡我們' : 'Contact us'}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-[1.85] mt-4">
                {isZh
                  ? '這些服務還不是現成產品。如果你的組織需要，告訴我們你的情況，我們會照實說明現在做得到什麼。'
                  : 'These services are not a finished product yet. If your organization needs them, tell us about your setup and we will say plainly what we can do today.'}
              </p>
              <div className="my-7 flex-1">
                <FeatureList items={isZh ? ORG_ZH : ORG_EN} muted />
              </div>
              <Link
                href="/contact?tier=enterprise"
                className="inline-flex items-center justify-center gap-2 w-full bg-surface-1 border border-border text-text-primary font-semibold rounded-lg py-3 hover:border-brand-sage transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '寫信給我們' : 'Write to us'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
