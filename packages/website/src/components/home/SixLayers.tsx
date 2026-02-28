'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import {
  ScanIcon,
  ShieldIcon,
  ChatIcon,
  TrapIcon,
  ReportIcon,
  GlobalIcon,
} from '@/components/ui/BrandIcons';
import SectionWrapper from '../ui/SectionWrapper';
import SectionTitle from '../ui/SectionTitle';
import FadeInUp from '../FadeInUp';

const products = [
  { key: 'scan', icon: ScanIcon, href: '/product/scan', core: true },
  { key: 'guard', icon: ShieldIcon, href: '/product/guard', core: true },
  { key: 'chat', icon: ChatIcon, href: '/product/chat', core: true },
  { key: 'trap', icon: TrapIcon, href: '/product/trap', core: false },
  { key: 'report', icon: ReportIcon, href: '/product/report', core: false },
  { key: 'threatCloud', icon: GlobalIcon, href: '/product', core: false },
] as const;

export default function SixLayers() {
  const t = useTranslations('home.sixLayers');

  return (
    <SectionWrapper dark>
      <SectionTitle overline={t('overline')} title={t('title')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12 max-w-5xl mx-auto">
        {products.map((p, i) => (
          <FadeInUp key={p.key} delay={i * 0.06} className="h-full">
            <Link
              href={p.href}
              className="group block bg-surface-0 rounded-xl p-6 border border-border hover:-translate-y-1 hover:border-brand-sage/40 transition-all duration-300 card-glow h-full"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand-sage/10 flex items-center justify-center">
                  <p.icon size={20} className="text-brand-sage" />
                </div>
                {p.core && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-brand-sage bg-brand-sage/10 rounded-full px-2 py-0.5">
                    {t('coreLabel')}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-text-primary">{t(`${p.key}.title`)}</h3>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                {t(`${p.key}.desc`)}
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-brand-sage mt-4 font-medium group-hover:gap-2 transition-all">
                {t('learnMore')} <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.4}>
        <p className="text-text-tertiary text-center text-sm mt-8">
          {t('subtitle')}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
