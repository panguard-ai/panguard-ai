'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { STATS } from '@/lib/stats';
import { Eyebrow, SectionTitleV2, SectionV2, CardV2, SectionKicker } from './v2/primitives';

// Pricing v4 (LOCKED 2026-04-22): Community + Pilot + Enterprise + ATR governance.
// NO middle tier (Team/Business). The /pricing page explains why.

const TIERS_EN = [
  {
    id: 'community',
    name: 'Community',
    price: '$0',
    period: ' forever',
    desc: `Open source · ${STATS.totalRulesDisplay} ATR rules · MIT · self-host · unlimited`,
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
    desc: 'Nation-state airgap · multi-tenant · custom compliance · on-prem, per-nation',
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
    desc: `開源 · ${STATS.totalRulesDisplay} 條 ATR 規則 · MIT · 自架 · 無上限`,
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
    desc: '主權國家 airgap · 多 tenant · 客製化合規 · 地端部署 · 按國家授權',
    cta: '主權團隊洽詢',
    href: '/contact?tier=sovereign',
  },
];

// Button recipes (v2 language): emerald strictly for the primary action.
const PRIMARY_CTA =
  'sheen lift mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-panguard-green px-6 py-3 text-sm font-semibold text-surface-hero transition-colors duration-300 ease-out-quint hover:bg-panguard-green-light';
const SECONDARY_CTA =
  'lift mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1';

export default function PricingPreview() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const tiers = isZh ? TIERS_ZH : TIERS_EN;

  return (
    <SectionV2>
      <FadeInUp>
        <Eyebrow>{isZh ? '定價' : 'PRICING'}</Eyebrow>
        <SectionTitleV2>
          {isZh ? '開放核心 · 不做中間 tier' : 'Open-core · No middle tier'}
        </SectionTitleV2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          {isZh
            ? 'Community 永久免費開源(餵感測網路)。Enterprise 拿到平台 + 5 框架合規證據包。中間 tier 是陷阱 — /pricing 解釋為什麼。'
            : 'Community is free and open source forever (feeds the sensor network). Enterprise gets the platform + 5-framework compliance evidence kit. The middle tier is a trap — /pricing explains why.'}
        </p>
      </FadeInUp>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier, i) => {
          const emphasized = tier.id === 'community';
          const ctaClass = emphasized ? PRIMARY_CTA : SECONDARY_CTA;
          return (
            <FadeInUp key={tier.id} delay={i * 0.06} className="h-full">
              <CardV2
                emphasized={emphasized}
                className={`flex h-full flex-col ${emphasized ? '' : 'hover:border-border-hover'}`}
              >
                <p
                  className={`font-mono text-[10px] uppercase tracking-micro ${
                    emphasized ? 'text-brand-sage' : 'text-text-muted'
                  }`}
                >
                  {tier.name}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-medium text-text-primary">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="font-mono text-[10px] uppercase tracking-micro text-text-muted">
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-text-muted">
                  {tier.desc}
                </p>
                <div className="flex-1" />
                {tier.external ? (
                  <a
                    href={tier.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={ctaClass}
                  >
                    {tier.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link href={tier.href} className={ctaClass}>
                    {tier.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </CardV2>
            </FadeInUp>
          );
        })}
      </div>

      <FadeInUp delay={0.3}>
        <SectionKicker>
          {isZh
            ? '完整功能比較、ATR Enterprise Member ($10K/年) 治理層、與 FAQ 請見 /pricing'
            : 'Full feature comparison, ATR Enterprise Member tier ($10K/yr governance), and FAQ at /pricing'}
        </SectionKicker>
      </FadeInUp>
    </SectionV2>
  );
}
