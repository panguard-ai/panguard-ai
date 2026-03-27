'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import BrandLogo from '@/components/ui/BrandLogo';
import { ShieldIcon, ScanIcon } from '@/components/ui/BrandIcons';
import { useSkillScan } from '@/hooks/useSkillScan';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import { STATS } from '@/lib/stats';
import ScanAnimation from './ScanAnimation';
import ScanResultCard from './ScanResultCard';

const PLATFORM_NAMES = [
  'Claude Code', 'Claude Desktop', 'Cursor', 'OpenClaw', 'Codex CLI',
  'WorkBuddy', 'NemoClaw', 'ArkClaw', 'Windsurf', 'QClaw',
  'Cline', 'VS Code Copilot', 'Zed', 'Gemini CLI', 'Continue', 'Roo Code',
] as const;

function CountUp({ target, duration = 1.5 }: { readonly target: number; readonly duration?: number }) {
  const [count, setCount] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;

    if (from === target || target === 0) {
      setCount(target);
      return;
    }

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const now = Date.now();
      if (now >= endTime) {
        setCount(target);
        return;
      }
      const progress = (now - startTime) / (duration * 1000);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(from + eased * (target - from)));
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
  }, [target, duration]);

  return <>{count.toLocaleString()}</>;
}

function ScannerHeroInner() {
  const t = useTranslations('home.scannerHero');
  const eco = useEcosystemStats();
  const {
    url,
    setUrl,
    loading,
    result,
    report,
    meta,
    expanded,
    setExpanded,
    handleScan,
    animationPhase,
  } = useSkillScan();

  const statItems = [
    { value: eco.skillsScanned, label: t('statsScanned'), color: 'text-text-primary', suffix: '+' },
    { value: STATS.ecosystem.findingsCritical, label: t('statsCritical'), color: 'text-red-400', suffix: '' },
    { value: eco.atrRules, label: t('statsRules'), color: 'text-panguard-green', suffix: '' },
    { value: eco.threatsDetected, label: t('statsCrystallized'), color: 'text-text-primary', suffix: '' },
  ];

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
        {/* Logo */}
        <div className="mb-8 animate-[fadeIn_0.5s_ease_both]">
          <BrandLogo size={36} className="text-panguard-green mx-auto sm:w-12 sm:h-12" />
        </div>

        {/* Title block — data-driven */}
        <div className="mb-10 animate-[fadeUp_0.6s_0.1s_ease_both]">
          <h1 className="text-[clamp(24px,5vw,48px)] font-bold leading-[1.3] tracking-tight text-text-primary">
            {t('titleLine1')}
            <br />
            <span className="text-panguard-green">{t('titleLine2')}</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Scanner */}
        <div className="max-w-xl mx-auto animate-[fadeUp_0.5s_0.4s_ease_both]">
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
                placeholder="github.com/modelcontextprotocol/servers"
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

          <AnimatePresence>{loading && <ScanAnimation phase={animationPhase} />}</AnimatePresence>

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

          <p className="text-[11px] text-text-muted mt-3">{t('trustNote')}</p>
        </div>

        {/* Stats strip */}
        <div className="mt-10 animate-[fadeUp_0.5s_0.6s_ease_both]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {statItems.map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <p className={`text-2xl sm:text-3xl font-extrabold ${item.color} tabular-nums`}>
                  <CountUp target={item.value} />
                  {item.suffix}
                </p>
                <p className="text-[11px] sm:text-xs text-text-muted mt-1 uppercase tracking-wider font-medium">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Platform bar */}
        <div className="mt-8 animate-[fadeIn_0.5s_0.7s_ease_both]">
          <p className="text-xs text-text-muted mb-3">{t('platformLabel')}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-text-secondary">
            {PLATFORM_NAMES.map((name) => (
              <span key={name} className="whitespace-nowrap">{name}</span>
            ))}
          </div>
        </div>
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
