'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/navigation';
import {
  CheckIcon,
  ScanIcon,
  ShieldIcon,
  TerminalIcon,
  AnalyticsIcon,
  GlobalIcon,
} from '@/components/ui/BrandIcons';
import type { MaturityLevel } from '@/lib/stats';

const ease = [0.22, 1, 0.36, 1] as const;

const productIcons = [CheckIcon, ScanIcon, ShieldIcon, TerminalIcon, AnalyticsIcon, GlobalIcon];

const productMaturity: MaturityLevel[] = ['GA', 'GA', 'GA', 'Beta', 'GA', 'GA'];

const maturityStyles: Record<MaturityLevel, { bg: string; dot: string }> = {
  GA: { bg: 'bg-green-900/30 text-green-400', dot: 'bg-green-400' },
  Beta: { bg: 'bg-yellow-900/30 text-yellow-400', dot: 'bg-yellow-400' },
  ComingSoon: { bg: 'bg-gray-800 text-gray-500', dot: 'bg-gray-500' },
};

export default function ProductOverview() {
  const t = useTranslations('home.productOverview');
  const products = t.raw('products') as Array<{ name: string; desc: string; href: string }>;

  return (
    <section className="bg-surface-0 px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary">
            {t('title')}
          </h2>
          <p className="text-base sm:text-lg text-gray-400 mt-4 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {products.map((product, i) => {
            const Icon = productIcons[i];
            const maturity = productMaturity[i];
            const style = maturityStyles[maturity];
            const isThreatCloud = i === 5;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06, ease }}
                className={`rounded-2xl border p-4 sm:p-6 ${
                  isThreatCloud
                    ? 'border-panguard-green/40 bg-panguard-green/5'
                    : 'border-border bg-surface-1/50'
                }`}
              >
                {Icon && <Icon className="w-6 h-6 text-panguard-green mb-3" />}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    {product.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {maturity === 'ComingSoon' ? 'Soon' : maturity}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">{product.desc}</p>
                <Link
                  href={product.href || '#'}
                  className="text-sm text-panguard-green hover:text-panguard-green-light font-medium mt-3 inline-block transition-colors"
                >
                  {t('learnMore')} &rarr;
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
