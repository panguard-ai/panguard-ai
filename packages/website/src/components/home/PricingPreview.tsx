'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';

// Pricing v4 (LOCKED 2026-04-22): Community + Pilot + Enterprise + ATR governance.
// NO middle tier (Team/Business). The /pricing page explains why.

const TIERS_EN = [
  {
    id: 'community',
    name: 'Community',
    price: '$0',
    period: ' forever',
    desc: 'Open source · 419 ATR rules · MIT · self-host · unlimited',
    cta: 'Get Started',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'pilot',
    name: 'Pilot',
    price: '$25K',
    period: ' / 90d',
    desc: 'F500 POC before procurement · IT director can approve · credits to Y1 Enterprise',
    cta: 'Request Pilot',
    href: '/contact?tier=pilot',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$150-500K',
    period: ' / yr',
    desc: 'Migrator Pro · 5-framework signed evidence · airgap · SLA · CSM',
    cta: 'Contact Sales',
    href: '/contact?tier=enterprise',
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    price: '$5-20M',
    period: ' / nation',
    desc: 'Nation-state airgap · multi-tenant · custom compliance · Cisco/AMD/NVIDIA JV pre-integrated',
    cta: 'Sovereign Desk',
    href: '/contact?tier=sovereign',
  },
];

const TIERS_ZH = [
  {
    id: 'community',
    name: 'Community 社群版',
    price: '$0',
    period: ' 永久',
    desc: '開源 · 419 條 ATR 規則 · MIT · 自架 · 無上限',
    cta: '立即使用',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'pilot',
    name: 'Pilot 試點',
    price: '$25K',
    period: ' / 90 天',
    desc: 'F500 採購前試水合約 · IT 主管可審批 · 全額 credit 到 Y1 Enterprise',
    cta: '申請 Pilot',
    href: '/contact?tier=pilot',
  },
  {
    id: 'enterprise',
    name: 'Enterprise 企業版',
    price: '$150-500K',
    period: ' / 年',
    desc: 'Migrator Pro · 5 框架 signed evidence · 離網 · SLA · 專屬 CSM',
    cta: '洽詢業務',
    href: '/contact?tier=enterprise',
  },
  {
    id: 'sovereign',
    name: 'Sovereign 主權級',
    price: '$5-20M',
    period: ' / 國家',
    desc: '主權國家 airgap · 多 tenant · 客製化合規 · Cisco/AMD/NVIDIA JV 預整合',
    cta: '主權團隊洽詢',
    href: '/contact?tier=sovereign',
  },
];

export default function PricingPreview() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const tiers = isZh ? TIERS_ZH : TIERS_EN;

  return (
    <SectionWrapper>
      <SectionTitle
        overline={isZh ? '定價' : 'PRICING'}
        title={isZh ? '開放核心 · 不做中間 tier' : 'Open-core · No middle tier'}
        subtitle={
          isZh
            ? 'Community 永久免費開源(餵感測網路)。Enterprise 拿到平台 + 5 框架合規證據包。中間 tier 是陷阱 — /pricing 解釋為什麼。'
            : 'Community is free and open source forever (feeds the sensor network). Enterprise gets the platform + 5-framework compliance evidence kit. The middle tier is a trap — /pricing explains why.'
        }
      />
      <div className="max-w-7xl mx-auto mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier, i) => (
          <FadeInUp key={tier.id} delay={i * 0.06}>
            <div className="bg-surface-2 rounded-xl border border-border p-6 flex flex-col h-full hover:border-brand-sage/50 transition-colors">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                {tier.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-text-primary">{tier.price}</span>
                {tier.period && <span className="text-xs text-text-muted">{tier.period}</span>}
              </div>
              <p className="text-xs text-text-muted mt-3 min-h-[2.5rem]">{tier.desc}</p>
              <div className="flex-1" />
              {tier.external ? (
                <a
                  href={tier.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-2.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
                >
                  {tier.cta} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Link
                  href={tier.href}
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full bg-brand-sage text-surface-0 font-semibold rounded-lg py-2.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
                >
                  {tier.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </FadeInUp>
        ))}
      </div>
      <FadeInUp delay={0.3}>
        <p className="text-center text-xs text-text-muted mt-8">
          {isZh
            ? '完整功能比較、ATR Enterprise Member ($10K/年) 治理層、與 FAQ 請見 /pricing'
            : 'Full feature comparison, ATR Enterprise Member tier ($10K/yr governance), and FAQ at /pricing'}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
