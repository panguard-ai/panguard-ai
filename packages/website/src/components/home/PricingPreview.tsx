'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { STATS } from '@/lib/stats';
import { Eyebrow, SectionTitleV2, SectionV2, CardV2, SectionKicker } from './v2/primitives';

// Pricing 3-card model (2026-07-12): Community (free) · Founding Pilot ($25K,
// self-serve at /scoping) · Enterprise & up (sales-led, full spec at /enterprise).

const TIERS_EN = [
  {
    id: 'community',
    name: 'Community',
    price: '$0',
    period: ' forever',
    desc: `Open source · ${STATS.totalRulesDisplay} ATR rules · MIT · self-host · unlimited`,
    cta: 'Install now',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'pilot',
    name: 'Founding Pilot',
    price: '$25K',
    period: ' one-time',
    desc: 'Prove agent security in a bank/enterprise review · 90-day founder-led · self-serve',
    cta: 'Order now',
    href: '/scoping',
  },
  {
    id: 'enterprise',
    name: 'Enterprise & up',
    price: '$150K',
    period: ' + / yr',
    desc: 'Enterprise · Migrator Pro · Sovereign · OEM — living signed evidence, airgap, per-nation',
    cta: 'See full spec',
    href: '/enterprise',
  },
];

const TIERS_ZH = [
  {
    id: 'community',
    name: 'Community 社群版',
    price: '$0',
    period: ' 永久',
    desc: `開源 · ${STATS.totalRulesDisplay} 條 ATR 規則 · MIT · 自架 · 無上限`,
    cta: '立即安裝',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'pilot',
    name: 'Founding Pilot',
    price: '$25K',
    period: ' 一次性',
    desc: '在銀行/企業資安審查證明 agent 安全 · 90 天創辦人親帶 · 自助下單',
    cta: '立即訂購',
    href: '/scoping',
  },
  {
    id: 'enterprise',
    name: 'Enterprise 及以上',
    price: '$150K',
    period: ' 起 / 年',
    desc: 'Enterprise · Migrator Pro · Sovereign · OEM — 活的簽章證據、離網、按國家授權',
    cta: '查看完整規格',
    href: '/enterprise',
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
          {isZh ? '免費開始,需要時再升級' : 'Free to start, paid when you must prove it'}
        </SectionTitleV2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          {isZh
            ? '自架完整堆疊永久免費。要在銀行或企業資安審查中證明 agent 安全時,$25K Founding Pilot 自助下單即可開始;更大的部署走洽談。'
            : 'Self-host the full stack free forever. When you must prove agent security in a bank or enterprise review, the $25K Founding Pilot is self-serve; larger deployments are sales-led.'}
        </p>
      </FadeInUp>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {tiers.map((tier, i) => {
          const emphasized = tier.id === 'pilot';
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
            ? 'Enterprise、Migrator Pro、Sovereign 與 OEM 完整規格請見 /enterprise'
            : 'Full Enterprise, Migrator Pro, Sovereign & OEM specification at /enterprise'}
        </SectionKicker>
      </FadeInUp>
    </SectionV2>
  );
}
