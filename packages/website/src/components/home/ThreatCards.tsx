'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { KeyRound, MessageSquareOff, Bot, ShieldAlert } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

const threatIcons = [KeyRound, MessageSquareOff, Bot, ShieldAlert] as const;

export default function ThreatCards() {
  const t = useTranslations('revolution.hero.threats');

  return (
    <section className="bg-[#0a0a0a] px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary text-center mb-10"
        >
          {t('title')}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {([0, 1, 2, 3] as const).map((i) => {
            const Icon = threatIcons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08, ease }}
                className="bg-red-950/20 border border-red-900/30 rounded-xl p-5 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-300">{t(`items.${i}.label`)}</p>
                    <p className="text-xs text-red-400/70 mt-1">{t(`items.${i}.detail`)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
