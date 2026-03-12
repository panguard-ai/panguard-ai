'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const CATEGORIES = [
  { key: 'promptInjection', rules: 5 },
  { key: 'toolPoisoning', rules: 4 },
  { key: 'contextExfiltration', rules: 3 },
  { key: 'agentManipulation', rules: 3 },
  { key: 'privilegeEscalation', rules: 2 },
  { key: 'excessiveAutonomy', rules: 2 },
  { key: 'skillCompromise', rules: 7 },
  { key: 'dataPoisoning', rules: 1 },
  { key: 'modelSecurity', rules: 2 },
] as const;

export default function ThreatsOverview() {
  const t = useTranslations('revolution.threats');

  return (
    <section className="bg-[#0a0a0a] px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary text-center mb-12 sm:mb-16 max-w-3xl mx-auto"
        >
          {t('title')}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.05 * i, ease }}
              className="bg-surface-1/50 border border-border rounded-xl p-5 hover:border-brand-sage/40 transition-colors duration-300"
            >
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                {t(`categories.${cat.key}`)}
              </h3>
              <p className="text-xs text-text-muted">{t('ruleCount', { count: cat.rules })}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3, ease }}
          className="text-center text-xs sm:text-sm text-text-muted mt-8"
        >
          {t('statsLine')}
        </motion.p>
      </div>
    </section>
  );
}
