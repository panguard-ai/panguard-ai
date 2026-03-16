'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '@/components/ui/BrandLogo';
import { ShieldIcon, ScanIcon } from '@/components/ui/BrandIcons';
import { useSkillScan } from '@/hooks/useSkillScan';
import ScanAnimation from './ScanAnimation';
import ScanResultCard from './ScanResultCard';
import LiveCounterBar from './LiveCounterBar';

const ease = [0.22, 1, 0.36, 1] as const;

function ScannerHeroInner() {
  const t = useTranslations('home.scannerHero');
  const {
    url, setUrl, loading, result, report, meta,
    expanded, setExpanded, handleScan, animationPhase,
  } = useSkillScan();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(107,143,113,1) 1px, transparent 1px), linear-gradient(90deg, rgba(107,143,113,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,200vw)] h-[min(700px,200vw)] rounded-full pointer-events-none hero-orb" />

      <div className="relative z-10 text-center px-5 sm:px-6 pt-28 pb-16 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease }}
          className="mb-8"
        >
          <BrandLogo size={36} className="text-panguard-green mx-auto sm:w-12 sm:h-12" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="mb-10"
        >
          <h1 className="text-[clamp(24px,5vw,48px)] font-bold leading-[1.25] tracking-tight text-text-primary">
            {t('titleLine1')}
            <br />
            <span className="text-text-primary/70">{t('titleLine2')}</span>
            <br />
            <span className="text-red-400">{t('titleLine3')}</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-panguard-green font-semibold">
            {t('mission')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease }}
          className="max-w-xl mx-auto"
        >
          <p className="text-xs uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">
            {t('scanLabel')}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                placeholder="github.com/owner/repo"
                className="w-full bg-surface-1/80 backdrop-blur-sm border border-border rounded-xl pl-10 pr-4 py-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-panguard-green focus:ring-1 focus:ring-panguard-green/30 transition-all"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleScan}
              disabled={loading || !url.trim()}
              className="shrink-0 bg-panguard-green text-white font-semibold rounded-xl px-7 py-4 text-sm hover:bg-panguard-green-light transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldIcon className="w-4 h-4" />
              )}
              {t('scanBtn')}
            </button>
          </div>

          <AnimatePresence>
            {loading && <ScanAnimation phase={animationPhase} />}
          </AnimatePresence>

          {result && !result.ok && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-400/10 border border-red-400/30 rounded-xl p-4 text-sm text-red-400 text-left"
            >
              {result.error}
            </motion.div>
          )}

          <AnimatePresence>
            {report && meta && (
              <ScanResultCard
                report={report}
                meta={meta}
                expanded={expanded}
                setExpanded={setExpanded}
                url={url}
              />
            )}
          </AnimatePresence>

          <p className="text-[11px] text-text-muted mt-3">
            {t('trustNote')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7, ease }}
          className="mt-8"
        >
          <LiveCounterBar />
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0e0f0e] to-transparent pointer-events-none" />
    </section>
  );
}

export default function ScannerHero() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <ScannerHeroInner />
    </Suspense>
  );
}
