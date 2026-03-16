'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowUp, Star, Terminal } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

export default function FinalCTANew() {
  const t = useTranslations('home.finalCta');

  return (
    <section className="bg-gradient-to-b from-[#0a0a0a] to-[#0d2614] px-5 sm:px-6 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary"
        >
          {t('title')}{' '}
          <span className="text-brand-sage">{t('titleHighlight')}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: 0.15, ease }}
          className="text-base text-gray-400 mt-4 max-w-xl mx-auto leading-relaxed"
        >
          {t('subtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3, ease }}
          className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mt-8"
        >
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center justify-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 text-sm hover:brightness-110 transition-all duration-200 active:scale-[0.98]"
          >
            <ArrowUp className="w-4 h-4" />
            {t('scanNow')}
          </button>

          <div className="inline-flex items-center gap-2 border border-border rounded-full px-5 py-3 bg-surface-1">
            <Terminal className="w-4 h-4 text-text-muted" />
            <code className="text-xs text-brand-sage font-mono select-all">
              curl -fsSL https://get.panguard.ai | bash
            </code>
          </div>

          <a
            href="https://github.com/panguard-ai/panguard-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-text-tertiary font-semibold rounded-full px-6 py-3.5 text-sm transition-all duration-200"
          >
            <Star className="w-4 h-4" /> Star on GitHub
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4, ease }}
          className="text-sm text-text-muted mt-10 max-w-lg mx-auto"
        >
          {t('bottomLine')}
        </motion.p>
      </div>
    </section>
  );
}
