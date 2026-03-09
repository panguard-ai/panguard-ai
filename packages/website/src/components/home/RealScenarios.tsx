'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, RefreshCw, X, Check } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

const SCENARIOS = [
  { key: 'skillInstall', icon: ShieldCheck },
  { key: 'alwaysOn', icon: Clock },
  { key: 'supplyChain', icon: RefreshCw },
] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease },
  },
};

export default function RealScenarios() {
  const t = useTranslations('revolution.scenarios');

  return (
    <section className="bg-[#0e0f0e] px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary text-center"
        >
          {t('title')}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="text-base sm:text-lg text-text-muted text-center mt-4 max-w-2xl mx-auto"
        >
          {t('subtitle')}
        </motion.p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-12 space-y-8"
        >
          {SCENARIOS.map(({ key, icon: Icon }) => (
            <motion.div
              key={key}
              variants={cardVariants}
              className="bg-surface-1/30 border border-border border-l-2 border-l-panguard-green rounded-2xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-panguard-green font-semibold">
                  {t(`items.${key}.label`)}
                </span>
                <Icon className="w-5 h-5 text-panguard-green" />
              </div>

              <h3 className="text-xl font-bold text-text-primary mt-3">
                {t(`items.${key}.title`)}
              </h3>

              <p className="text-sm text-text-muted leading-relaxed mt-3">
                {t(`items.${key}.narrative`)}
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-text-muted leading-relaxed">
                      {t(`items.${key}.before`)}
                    </p>
                  </div>
                </div>

                <div className="bg-panguard-green/5 border border-panguard-green/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-panguard-green mt-0.5 shrink-0" />
                    <p className="text-sm text-text-muted leading-relaxed">
                      {t(`items.${key}.after`)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
