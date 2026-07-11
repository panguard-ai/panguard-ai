'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { STATS } from '@/lib/stats';

/**
 * Pricing — 3-card decision surface (2026-07-12).
 *   1. Community       $0 forever      — self-serve (GitHub install)
 *   2. Founding Pilot  $25K one-time   — self-serve (/scoping), the buyable paid entry
 *   3. Enterprise & up $150K+          — sales-led; full spec lives at /enterprise
 * The deep Enterprise / Migrator Pro / Sovereign / OEM specification moved to
 * /enterprise so this page stays a clean "which one am I?" decision, not a wall.
 */
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
                  <span className="text-brand-sage">免費</span>開始,
                  <br className="sm:hidden" />
                  要證明給稽核看時再升級
                </>
              ) : (
                <>
                  <span className="text-brand-sage">Free</span> to start,{' '}
                  <br className="sm:hidden" />
                  paid when you must prove it
                </>
              )}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mt-6 leading-[1.85]">
              {isZh
                ? '自架完整堆疊永久免費。當你要在銀行或企業資安審查中證明 agent 安全性時,再升級到付費方案。'
                : 'Self-host the full stack free forever. Upgrade to a paid plan when you need to prove your agents are secure inside a bank or enterprise security review.'}
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ─── 3 cards ─── */}
      <SectionWrapper>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {/* 1 · Community */}
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
                  {isZh ? '永久 · MIT' : 'forever · MIT'}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-[1.85] mt-4">
                {isZh
                  ? '個人開發者、小團隊,以及任何想自架完整堆疊的組織。'
                  : 'Individual developers, small teams, and anyone who wants to self-host the full stack.'}
              </p>
              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        `${STATS.atrRules} 條 ATR 偵測規則(MIT 授權)`,
                        'agents / endpoints / tenants 無上限',
                        '5 層已上線:稽核 · 防護 · 偵測 · 誘捕 · 反應',
                        'Threat Cloud 規則更新(< 24 小時)',
                        'GitHub + Discord 社群支援',
                        'pga CLI:scan · audit · guard · status',
                      ]
                    : [
                        `${STATS.atrRules} ATR detection rules (MIT licensed)`,
                        'Unlimited agents / endpoints / tenants',
                        '5 layers shipped: Audit · Protect · Detect · Deceive · Respond',
                        'Threat Cloud rule updates (< 24h)',
                        'Community support on GitHub + Discord',
                        'pga CLI: scan · audit · guard · status',
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
                className="inline-flex items-center justify-center gap-2 w-full bg-surface-1 border border-border text-text-primary font-semibold rounded-lg py-3 hover:border-brand-sage transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '立即安裝' : 'Install now'} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </FadeInUp>

          {/* 2 · Founding Pilot — highlighted, the buyable paid entry */}
          <FadeInUp delay={0.08}>
            <div className="relative bg-gradient-to-b from-surface-2 to-surface-1 rounded-xl border border-brand-sage/50 p-7 flex flex-col h-full ring-1 ring-brand-sage/20">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Founding Pilot' : 'Founding Pilot'}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
                  {isZh ? '限前 3 · 自助' : 'First 3 · self-serve'}
                </span>
              </div>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-text-primary">$25K</span>
                <span className="text-xs text-text-muted">
                  {isZh ? '一次性 · 90 天' : 'one-time · 90d'}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-[1.85] mt-4">
                {isZh
                  ? '要在企業或銀行資安審查中證明 agent 安全性的 AI 廠商與受監管團隊。'
                  : 'AI vendors and regulated teams that must prove agent security inside an enterprise or bank security review.'}
              </p>
              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        '90 天創辦人親帶交付',
                        'Day 3 初步掃描 + 發現報告(退費窗內)',
                        'ATR 引擎部署 + 客製 50-100 條規則包',
                        'SIEM webhook 整合',
                        '簽章合規證據包(EU AI Act / NIST AI RMF / ISO 42001 / OWASP)',
                        '7 天無條件退費 · $25K 全額抵入 Y1 Enterprise',
                      ]
                    : [
                        '90-day founder-led delivery',
                        'Day-3 initial scan + findings report (within refund window)',
                        'ATR engine deployment + custom 50-100 rule pack',
                        'SIEM webhook integration',
                        'Signed compliance evidence pack (EU AI Act / NIST AI RMF / ISO 42001 / OWASP)',
                        '7-day no-questions refund · $25K credits to Y1 Enterprise',
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
                href="/scoping"
                className="inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
              >
                {isZh ? '立即訂購' : 'Order now'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>

          {/* 3 · Enterprise & up — sales-led, deep spec at /enterprise */}
          <FadeInUp delay={0.16}>
            <div className="bg-surface-2 rounded-xl border border-border p-7 flex flex-col h-full">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isZh ? 'Enterprise 及以上' : 'Enterprise & up'}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-muted bg-surface-1 border border-border rounded-full px-2.5 py-0.5">
                  {isZh ? '洽談' : 'Sales-led'}
                </span>
              </div>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-text-primary">$150K</span>
                <span className="text-xs text-text-muted">{isZh ? '起 / 年' : '+ / yr'}</span>
              </div>
              <p className="text-sm text-text-secondary leading-[1.85] mt-4">
                {isZh
                  ? '受監管企業、活的合規證據、國家級部署與廠商 OEM。一條線收四種方案。'
                  : 'Regulated enterprises, living compliance evidence, nation-scale deployment, and vendor OEM — four plans, one line.'}
              </p>
              <div className="my-7 flex-1">
                <ul className="space-y-2.5">
                  {(isZh
                    ? [
                        'Enterprise:Scan + Guard + 支援,on-prem / airgap / SSO / SIEM',
                        'Migrator Pro:活的簽章合規證據,轉 15 種舊格式',
                        'Sovereign:國家級離網部署($5-20M / 國)',
                        'OEM:廠商內建 ATR 規則包(Cisco / 微軟級)',
                      ]
                    : [
                        'Enterprise: Scan + Guard + support, on-prem / airgap / SSO / SIEM',
                        'Migrator Pro: living signed compliance evidence, migrates 15 legacy formats',
                        'Sovereign: nation-scale airgap deployment ($5-20M / nation)',
                        'OEM: vendors embed the ATR rule pack (Cisco / Microsoft scale)',
                      ]
                  ).map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      <span className="text-[13px] text-text-secondary leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/enterprise"
                  className="inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
                >
                  {isZh ? '查看完整規格' : 'See full specification'}{' '}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/contact?tier=enterprise"
                  className="text-center text-[12px] text-brand-sage font-semibold hover:underline"
                >
                  {isZh ? '直接洽詢業務' : 'Or contact sales'}
                </Link>
              </div>
            </div>
          </FadeInUp>
        </div>

        {/* Founding-price note */}
        <FadeInUp delay={0.3}>
          <div className="mt-10 max-w-3xl mx-auto bg-surface-2 border border-border rounded-xl p-6 text-center">
            <p className="text-xs font-semibold text-brand-sage uppercase tracking-wider mb-2">
              {isZh ? '首 5 家 F500 創始價' : 'Founding 5 F500 pricing'}
            </p>
            <p className="text-sm text-text-secondary leading-[1.85]">
              {isZh
                ? '首 5 家 F500 Enterprise 客戶可鎖定 $100K × 2 年的創始價(標準區間 $250K-350K),交換公開 logo 與 case study 授權。第 6 家起恢復標準定價。'
                : 'The first 5 F500 Enterprise customers can lock a founding rate of $100K × 2 years (versus the standard $250K-350K range), in exchange for public logo and case-study rights. Standard pricing resumes from customer six.'}
            </p>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* ─── CTA ─── */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              {isZh ? '還在評估?' : 'Still evaluating?'}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-4 leading-relaxed">
              {isZh
                ? '採購問題 · on-prem 架構 · 合規 mapping 細節——直接寫信,48 小時內回。'
                : 'Procurement questions · on-prem architecture · compliance mapping specifics — email us, 48h response.'}
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
