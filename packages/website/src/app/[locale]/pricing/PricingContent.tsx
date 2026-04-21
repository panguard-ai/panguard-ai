'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { STATS } from '@/lib/stats';

type TierId = 'community' | 'team' | 'business' | 'enterprise';

interface Tier {
  id: TierId;
  name: string;
  nameZh: string;
  price: string;
  period?: string;
  periodZh?: string;
  description: string;
  descriptionZh: string;
  status: 'today' | 'Q2_2026' | 'contact';
  highlighted?: boolean;
  cta: { text: string; textZh: string; href: string; external?: boolean };
  features: { en: string; zh: string }[];
}

const TIERS: readonly Tier[] = [
  {
    id: 'community',
    name: 'Community',
    nameZh: 'Community 社群版',
    price: '$0',
    description: 'Everything you need to protect your own agents, free forever. MIT license.',
    descriptionZh: '保護自己 agent 所需的全部功能,永久免費。MIT 授權。',
    status: 'today',
    cta: {
      text: 'Install Now',
      textZh: '立即安裝',
      href: 'https://github.com/panguard-ai/panguard-ai',
      external: true,
    },
    features: [
      {
        en: `${STATS.atrRules} ATR detection rules (MIT, open-source)`,
        zh: `${STATS.atrRules} 條 ATR 偵測規則(MIT 開源)`,
      },
      {
        en: 'pga CLI: scan, audit, up, guard, status, sensor',
        zh: 'pga CLI:scan、audit、up、guard、status、sensor',
      },
      {
        en: 'Guard daemon — 11 runtime response actions',
        zh: 'Guard daemon — 11 種 runtime 反應動作',
      },
      {
        en: 'Integrated honeypot (Trap via trap-bridge)',
        zh: '整合蜜罐(trap-bridge)',
      },
      {
        en: 'Threat Cloud sensor registration + rule updates',
        zh: 'Threat Cloud 感測器註冊 + 規則更新',
      },
      { en: '17 platforms supported', zh: '支援 17 個平台' },
      { en: 'Full source on GitHub — audit every line', zh: '完整 GitHub 源碼 — 每行可稽核' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    nameZh: 'Team 團隊版',
    price: '$500',
    period: '/month',
    periodZh: '/月',
    description:
      'Hosted dashboard + multi-seat Threat Cloud for teams that ship agents in production.',
    descriptionZh: '託管儀表板 + 多席次 Threat Cloud,給 production 出 agent 的團隊。',
    status: 'Q2_2026',
    highlighted: true,
    cta: { text: 'Join Waitlist', textZh: '加入 Waitlist', href: '/early-access' },
    features: [
      { en: 'Everything in Community', zh: 'Community 版所有功能' },
      {
        en: 'Hosted Threat Cloud dashboard (no self-host)',
        zh: '託管 Threat Cloud 儀表板(免自架)',
      },
      { en: 'Up to 5 seats + SSO-lite', zh: '最多 5 席 + 輕 SSO' },
      { en: 'Centralized fleet view across agent installs', zh: '所有 agent 安裝的集中式艦隊視圖' },
      { en: 'Priority rule updates from TC crystallization', zh: 'TC 結晶的優先規則更新' },
      { en: 'Email support · 48h response', zh: 'Email 支援 · 48 小時回覆' },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    nameZh: 'Business 商用版',
    price: '$2K',
    period: '/month',
    periodZh: '/月',
    description:
      'On-prem deployment, unlimited seats, compliance exports. For orgs with a GRC team.',
    descriptionZh: '地端部署、無限席次、合規匯出。適合有 GRC 團隊的組織。',
    status: 'contact',
    cta: { text: 'Contact Sales', textZh: '洽詢業務', href: '/contact?tier=business' },
    features: [
      { en: 'Everything in Team', zh: 'Team 版所有功能' },
      { en: 'On-prem or VPC deployment', zh: '地端或 VPC 部署' },
      { en: 'Unlimited seats + SAML SSO', zh: '無限席次 + SAML SSO' },
      { en: 'Custom ATR rule packs per tenant', zh: '每租戶客製 ATR 規則包' },
      { en: 'Audit log export + SIEM integration', zh: '稽核日誌匯出 + SIEM 整合' },
      { en: 'SLA: 99.9% uptime · 24h support response', zh: 'SLA:99.9% 可用 · 24 小時支援回覆' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    nameZh: 'Enterprise 企業版',
    price: '$150K+',
    period: '/year',
    periodZh: '/年',
    description:
      'AIAM + 4-framework compliance + airgap deployment. For Fortune 500 and regulated industries.',
    descriptionZh: 'AIAM + 4 框架合規 + airgap 部署。給 F500 與受管制產業。',
    status: 'contact',
    cta: { text: 'Contact Sales', textZh: '洽詢業務', href: '/contact?tier=enterprise' },
    features: [
      { en: 'Everything in Business', zh: 'Business 版所有功能' },
      {
        en: 'AIAM — agent identity, scope, delegation (Q3 2026)',
        zh: 'AIAM — agent 身分、scope、delegation(2026 Q3)',
      },
      {
        en: '4-framework reports: EU AI Act · Colorado · NIST AI RMF · ISO 42001',
        zh: '4 框架報告:EU AI Act · Colorado · NIST AI RMF · ISO 42001',
      },
      { en: 'Airgap deployment (no internet egress)', zh: 'Airgap 部署(無對外流量)' },
      { en: 'SOC2 Type II + dedicated CSM', zh: 'SOC2 Type II + 專屬客戶成功經理' },
      { en: 'Custom SLA · 24/7 incident line', zh: '客製 SLA · 24/7 事件專線' },
    ],
  },
];

function StatusTag({ status, isZh }: { status: Tier['status']; isZh: boolean }) {
  if (status === 'today') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
        {isZh ? '今天可用' : 'Available today'}
      </span>
    );
  }
  if (status === 'Q2_2026') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {isZh ? '2026 Q2' : 'Q2 2026'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-muted bg-surface-3 border border-border rounded-full px-2.5 py-0.5">
      {isZh ? '洽談' : 'Contact'}
    </span>
  );
}

export default function PricingContent() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <>
      <section className="relative min-h-[50vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-28 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '定價' : 'PRICING'}
            </p>
            <h1 className="text-[clamp(24px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              {isZh ? (
                <>
                  Community 永遠 <span className="text-brand-sage">免費 · 開源 · 功能完整</span>
                </>
              ) : (
                <>
                  Community is{' '}
                  <span className="text-brand-sage">free, open, and full-featured</span> forever
                </>
              )}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
              {isZh
                ? 'Team / Business / Enterprise 加的是「我們幫你托管」跟「我們幫你對審計員」。核心偵測能力永遠在 Community 裡。'
                : 'Team / Business / Enterprise add hosted infrastructure and auditor-ready compliance. Detection capability itself stays in Community, always.'}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="mt-8 inline-block bg-brand-sage/10 border border-brand-sage/20 rounded-full px-6 py-2.5">
              <p className="text-sm text-brand-sage font-medium">
                {isZh
                  ? 'Team/Business/Enterprise 2026 Q2 上線 · Community 今天 npm install 就能跑'
                  : 'Team / Business / Enterprise launch Q2 2026 · Community ships today via npm'}
              </p>
            </div>
          </FadeInUp>
        </div>
      </section>

      <SectionWrapper>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIERS.map((tier, i) => (
              <FadeInUp key={tier.id} delay={i * 0.08}>
                <div
                  className={`rounded-xl border p-6 sm:p-7 flex flex-col h-full transition-all duration-200 ${
                    tier.highlighted
                      ? 'bg-brand-sage/5 border-brand-sage/30 ring-1 ring-brand-sage/20'
                      : 'bg-surface-2 border-border hover:border-brand-sage/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                      {isZh ? tier.nameZh : tier.name}
                    </h3>
                    <StatusTag status={tier.status} isZh={isZh} />
                  </div>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-text-primary">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-xs text-text-muted">
                        {isZh && tier.periodZh ? tier.periodZh : tier.period}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-text-muted mt-3 leading-relaxed min-h-[2.5rem]">
                    {isZh ? tier.descriptionZh : tier.description}
                  </p>

                  <div className="my-7">
                    <ul className="space-y-2.5">
                      {tier.features.map((feature, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-brand-sage shrink-0 mt-0.5" />
                          <span className="text-[13px] text-text-secondary leading-snug">
                            {isZh ? feature.zh : feature.en}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex-1" />

                  {tier.cta.external ? (
                    <a
                      href={tier.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold transition-all duration-200 active:scale-[0.98] text-sm ${
                        tier.highlighted
                          ? 'bg-brand-sage text-surface-0 hover:bg-brand-sage-light'
                          : 'bg-brand-sage text-surface-0 hover:bg-brand-sage-light'
                      }`}
                    >
                      {isZh ? tier.cta.textZh : tier.cta.text} <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      href={tier.cta.href}
                      className={`inline-flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold transition-all duration-200 active:scale-[0.98] text-sm ${
                        tier.highlighted
                          ? 'bg-brand-sage text-surface-0 hover:bg-brand-sage-light'
                          : 'border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage'
                      }`}
                    >
                      {isZh ? tier.cta.textZh : tier.cta.text} <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <SectionTitle
            overline={isZh ? '為什麼這樣分層' : 'WHY THIS SHAPE'}
            title={isZh ? 'Community 不是試用版' : 'Community is not a trial'}
            subtitle={
              isZh
                ? '我們的敘事是:「核心偵測能力永遠開源」。Team+ 賣的是托管、多人、合規 — 不是功能。'
                : 'Our stance: detection capability stays open-source forever. Team+ sells hosted infrastructure, multi-seat, compliance — not features.'
            }
          />
          <FadeInUp delay={0.2}>
            <div className="mt-10 grid sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-surface-2 rounded-lg border border-border p-5">
                <p className="font-semibold text-text-primary mb-2">
                  {isZh ? 'Community 不限時不限機' : 'No time / machine caps'}
                </p>
                <p className="text-text-secondary leading-relaxed text-[13px]">
                  {isZh
                    ? '裝多少台都一樣免費。每台都是 Threat Cloud sensor,貢獻匿名偵測換規則更新。'
                    : 'Install on as many machines as you want — same MIT license. Each install is a Threat Cloud sensor, contributes anonymous detections in exchange for rule updates.'}
                </p>
              </div>
              <div className="bg-surface-2 rounded-lg border border-border p-5">
                <p className="font-semibold text-text-primary mb-2">
                  {isZh ? 'Team+ 明確標時程' : 'Team+ has explicit timelines'}
                </p>
                <p className="text-text-secondary leading-relaxed text-[13px]">
                  {isZh
                    ? 'Team 2026 Q2。Enterprise AIAM Q3。4 框架合規 Q2。不做 vaporware,也不藏 Coming Soon。'
                    : 'Team Q2 2026. Enterprise AIAM Q3. 4-framework compliance Q2. No vaporware, no hidden Coming Soon — dates on panguard.ai.'}
                </p>
              </div>
              <div className="bg-surface-2 rounded-lg border border-border p-5">
                <p className="font-semibold text-text-primary mb-2">
                  {isZh ? '沒有「升級才能解鎖」' : 'No unlock-on-upgrade'}
                </p>
                <p className="text-text-secondary leading-relaxed text-[13px]">
                  {isZh
                    ? 'Community 一開始就有 11 response action、3 層 AI 漏斗、蜜罐。不是閹割版。'
                    : 'Community ships with 11 response actions, the 3-layer AI funnel, and the honeypot from day 1. Not a stripped version.'}
                </p>
              </div>
              <div className="bg-surface-2 rounded-lg border border-border p-5">
                <p className="font-semibold text-text-primary mb-2">
                  {isZh ? '合規才是 Team+ 真正差別' : 'Compliance is the real Team+ delta'}
                </p>
                <p className="text-text-secondary leading-relaxed text-[13px]">
                  {isZh
                    ? 'EU AI Act 2026-08 與 Colorado 2026-06 強制執行。Business+ 提供可交給稽核員的框架對應報告。'
                    : 'EU AI Act enforces 2026-08, Colorado 2026-06. Business+ ships auditor-ready per-rule framework mappings. That is what you pay for.'}
                </p>
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              {isZh ? '還有問題?' : 'Still have questions?'}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-4">
              {isZh
                ? 'GRC 採購、on-prem 架構、合規映射細節 — 直接寫信,48 小時內回。'
                : 'GRC procurement, on-prem architecture, compliance mapping details — email us, 48h response.'}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 mt-8 text-brand-sage font-semibold hover:text-brand-sage-light transition-colors"
            >
              {isZh ? '寫信給我們' : 'Contact us'} <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
