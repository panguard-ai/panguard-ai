'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { Eyebrow, SectionTitleV2, SectionV2, CardV2 } from './v2/primitives';

// Pricing (2026-11-18): the open-source edition is free with no paywall; services
// for organizations and insurers have no public price until they can be delivered.

const TIERS_EN = [
  {
    id: 'community',
    name: 'Community',
    price: 'Free',
    period: ' · MIT',
    desc: 'Open source · ATR rules · pre-install scan · tool-call hook · no account',
    cta: 'Install from GitHub',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'organizations',
    name: 'Organizations & insurers',
    price: 'Contact us',
    period: '',
    desc: 'Many machines, signed records for third parties, on-premises · in development with design partners',
    cta: 'Write to us',
    href: '/contact?tier=enterprise',
  },
];

const TIERS_ZH = [
  {
    id: 'community',
    name: 'Community 社群版',
    price: '免費',
    period: ' · MIT',
    desc: '開源 · ATR 規則 · 安裝前掃描 · 工具呼叫 hook · 不需帳號',
    cta: '到 GitHub 安裝',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'organizations',
    name: '企業與保險',
    price: '聯絡我們',
    period: '',
    desc: '多台機器、給第三方的加簽紀錄、地端部署 · 與設計夥伴開發中',
    cta: '寫信給我們',
    href: '/contact?tier=enterprise',
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
          {isZh ? '開源版免費，不設付費牆' : 'The open-source edition is free. No paywall.'}
        </SectionTitleV2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          {isZh
            ? '一台機器上的檢查與阻擋全部免費。跨多台機器、要交給第三方的服務還在和設計夥伴開發，沒有公開價格。'
            : 'Everything PanGuard checks and blocks on a machine is free. Services that span many machines or produce records for third parties are still in development with design partners and have no public price.'}
        </p>
      </FadeInUp>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 max-w-4xl">
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
    </SectionV2>
  );
}
