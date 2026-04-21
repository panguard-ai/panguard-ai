'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';

const TIERS_EN = [
  {
    id: 'community',
    name: 'Community',
    price: '$0',
    desc: 'Open source CLI + 311 ATR rules',
    cta: 'Get Started',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: '$500',
    period: '/mo',
    desc: 'Up to 5 seats · Threat Cloud dashboard',
    cta: 'Join Waitlist',
    href: '/early-access',
  },
  {
    id: 'business',
    name: 'Business',
    price: 'Custom',
    desc: 'Unlimited seats · on-prem · SLA',
    cta: 'Contact Sales',
    href: '/contact?tier=business',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$150K+',
    period: '/yr',
    desc: 'AIAM · airgap · 4-framework compliance',
    cta: 'Contact Sales',
    href: '/contact?tier=enterprise',
  },
];

const TIERS_ZH = [
  {
    id: 'community',
    name: 'Community 社群版',
    price: '$0',
    desc: '開源 CLI + 311 條 ATR 規則',
    cta: '開始使用',
    href: 'https://github.com/panguard-ai/panguard-ai',
    external: true,
  },
  {
    id: 'team',
    name: 'Team 團隊版',
    price: '$500',
    period: '/月',
    desc: '最多 5 席 · Threat Cloud 儀表板',
    cta: '加入 Waitlist',
    href: '/early-access',
  },
  {
    id: 'business',
    name: 'Business 商用版',
    price: '客製',
    desc: '無限席次 · 地端部署 · SLA',
    cta: '洽詢業務',
    href: '/contact?tier=business',
  },
  {
    id: 'enterprise',
    name: 'Enterprise 企業版',
    price: '$150K+',
    period: '/年',
    desc: 'AIAM · airgap · 4 框架合規',
    cta: '洽詢業務',
    href: '/contact?tier=enterprise',
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
        title={isZh ? '從社群版到企業版 4 個檔次' : '4 tiers from community to enterprise'}
        subtitle={
          isZh
            ? 'Community 永久免費開源。Team / Business / Enterprise 2026 Q2 上線。'
            : 'Community is free and open source forever. Team / Business / Enterprise launching Q2 2026.'
        }
      />
      <div className="max-w-6xl mx-auto mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            ? '完整功能比較與 FAQ 請見 /pricing 頁面'
            : 'Full feature comparison and FAQ at /pricing'}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
