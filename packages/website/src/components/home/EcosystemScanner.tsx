'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import CountUp from '../animations/CountUp';
import FadeInUp from '../FadeInUp';
import { ScanIcon, ShieldIcon, NetworkIcon } from '@/components/ui/BrandIcons';
import { STATS } from '@/lib/stats';

const ease = [0.22, 1, 0.36, 1] as const;

export default function EcosystemScanner() {
  const t = useTranslations('home.ecosystemScanner');

  return (
    <section className="bg-[#090a09] px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        {/* Rule stats - real numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-8">
          {/* Sigma Rules */}
          <FadeInUp delay={0}>
            <div className="bg-surface-1/60 border border-border rounded-2xl p-5 text-center">
              <ShieldIcon className="w-6 h-6 text-panguard-green mx-auto mb-3" />
              <div className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                <CountUp target={STATS.atrRules} />
              </div>
              <p className="text-xs text-text-muted mt-1">Sigma {t('rules')}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{t('sigmaDesc')}</p>
            </div>
          </FadeInUp>

          {/* YARA Rules */}
          <FadeInUp delay={0.08}>
            <div className="bg-surface-1/60 border border-border rounded-2xl p-5 text-center">
              <ScanIcon className="w-6 h-6 text-panguard-green mx-auto mb-3" />
              <div className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                <CountUp target={STATS.atrPatterns} />
              </div>
              <p className="text-xs text-text-muted mt-1">YARA {t('rules')}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{t('yaraDesc')}</p>
            </div>
          </FadeInUp>

          {/* ATR Rules */}
          <FadeInUp delay={0.16}>
            <div className="bg-surface-1/60 border border-border rounded-2xl p-5 text-center">
              <NetworkIcon className="w-6 h-6 text-[#DAA520] mx-auto mb-3" />
              <div className="text-2xl sm:text-3xl font-extrabold text-text-primary">
                <CountUp target={STATS.atrRules} />
              </div>
              <p className="text-xs text-text-muted mt-1">ATR {t('rules')}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{t('atrDesc')}</p>
            </div>
          </FadeInUp>
        </div>

        {/* Total integrated rules */}
        <FadeInUp delay={0.24}>
          <div className="bg-surface-1/40 border border-border rounded-2xl p-5 sm:p-6 max-w-xl mx-auto text-center">
            <div className="text-3xl sm:text-4xl font-extrabold text-panguard-green">
              {STATS.totalRulesDisplay}
            </div>
            <p className="text-sm text-text-secondary mt-2">{t('totalRulesDesc')}</p>
            <p className="text-xs text-text-muted mt-1">{t('growingDaily')}</p>
          </div>
        </FadeInUp>

        {/* CTA */}
        <FadeInUp delay={0.3}>
          <p className="text-center text-sm text-gray-400 mt-8">{t('cta')}</p>
        </FadeInUp>
      </div>
    </section>
  );
}
