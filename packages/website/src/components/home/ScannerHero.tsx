'use client';

import { Suspense, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import BrandLogo from '@/components/ui/BrandLogo';
import { ShieldIcon, ScanIcon } from '@/components/ui/BrandIcons';
import { useSkillScan } from '@/hooks/useSkillScan';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import { STATS } from '@/lib/stats';
import ScanAnimation from './ScanAnimation';
import ScanResultCard from './ScanResultCard';

// The 15 verified agent runtimes PanGuard auto-detects and registers into.
// VS Code Copilot and Zed are in preview (different config structures) and are
// deliberately excluded from the public count — keep this list at 15 to match
// STATS.adoption.platformsSupported.
const PLATFORM_NAMES = [
  'Claude Code',
  'Claude Desktop',
  'Cursor',
  'Hermes Agent',
  'OpenClaw',
  'Codex CLI',
  'WorkBuddy',
  'NemoClaw',
  'ArkClaw',
  'Windsurf',
  'QClaw',
  'Cline',
  'Gemini CLI',
  'Continue',
  'Roo Code',
] as const;

/* ─── Layer C: entrance choreography ───
   logo → headline → sub → ticker → scan card → badges.
   delayChildren 0.1 + stagger 0.07 keeps the full run under ~0.9s
   (badges, the last child, use a 0.45s duration to close the budget). */
const EASE_OUT_QUINT: readonly [number, number, number, number] = [0.22, 1, 0.36, 1];

interface HeroVariants {
  readonly container: Variants;
  readonly child: Variants;
  readonly childLast: Variants;
  readonly headline: Variants;
  readonly card: Variants;
}

function buildHeroVariants(reduced: boolean): HeroVariants {
  if (reduced) {
    const fade: Variants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
    };
    return {
      container: { hidden: {}, show: {} },
      child: fade,
      childLast: fade,
      headline: {
        hidden: { opacity: 0.6 },
        show: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
      },
      card: fade,
    };
  }
  const show = { opacity: 1, y: 0, filter: 'blur(0px)' };
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
    },
    child: {
      hidden: { opacity: 0, y: 14, filter: 'blur(5px)' },
      show: { ...show, transition: { duration: 0.55, ease: EASE_OUT_QUINT } },
    },
    childLast: {
      hidden: { opacity: 0, y: 14, filter: 'blur(5px)' },
      show: { ...show, transition: { duration: 0.45, ease: EASE_OUT_QUINT } },
    },
    // h1 stays readable for LCP: opacity only dips to 0.6, motion is y + blur.
    headline: {
      hidden: { opacity: 0.6, y: 14, filter: 'blur(5px)' },
      show: { ...show, transition: { duration: 0.55, ease: EASE_OUT_QUINT } },
    },
    card: {
      hidden: { opacity: 0, y: 14, scale: 0.985, filter: 'blur(5px)' },
      show: { ...show, scale: 1, transition: { duration: 0.55, ease: EASE_OUT_QUINT } },
    },
  };
}

/* ─── Layer B: event radar ping colors ─── */
const PING_IDLE_SAGE = 'rgba(139, 154, 142, 0.25)';
const PING_CLEAN_EMERALD = 'rgba(52, 211, 153, 0.35)';
const PING_THREAT_RED = 'rgba(248, 113, 113, 0.4)';

/** Infinite scrolling ticker for threat incidents */
function ThreatTicker({ items }: { readonly items: readonly string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden w-full py-3">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-surface-hero to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface-hero to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="text-xs sm:text-sm text-red-400/80 font-mono tracking-wide flex items-center gap-2"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400/60 shrink-0" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** Infinite scrolling platform names */
function PlatformTicker({ names }: { readonly names: readonly string[] }) {
  const doubled = [...names, ...names];
  return (
    <div className="relative overflow-hidden w-full py-2">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-surface-hero to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface-hero to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, ease: 'linear', repeat: Infinity }}
      >
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="text-xs text-text-secondary/70 font-medium flex items-center gap-1.5"
          >
            <span className="inline-block w-1 h-1 rounded-full bg-panguard-green/40 shrink-0" />
            {name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function ScannerHeroInner() {
  const t = useTranslations('home.scannerHero');
  const eco = useEcosystemStats();
  const {
    url,
    setUrl,
    pasteContent,
    setPasteContent,
    pasteContentType,
    setPasteContentType,
    scanMode,
    setScanMode,
    loading,
    result,
    report,
    meta,
    expanded,
    setExpanded,
    handleScan,
    animationPhase,
    history,
  } = useSkillScan();

  const tickerItems = [t('ticker1'), t('ticker2'), t('ticker3'), t('ticker4'), t('ticker5')];

  const prefersReducedMotion = useReducedMotion() ?? false;
  const heroVariants = useMemo(
    () => buildHeroVariants(prefersReducedMotion),
    [prefersReducedMotion]
  );

  /* Layer B: one semantic radar ping per completed scan. Keyed on the scan
     identity so a new result remounts the ping and replays it exactly once. */
  const scanPulse = useMemo(() => {
    if (!report || !meta) return null;
    const clean = report.riskLevel === 'LOW';
    return {
      key: `${meta.contentHash}-${meta.scannedAt}`,
      color: clean ? PING_CLEAN_EMERALD : PING_THREAT_RED,
      clean,
    };
  }, [report, meta]);

  /* Reduced motion: event feedback degrades to a card border-color transition
     (the card already carries transition-colors duration-300). */
  const cardBorderClass =
    prefersReducedMotion && scanPulse
      ? scanPulse.clean
        ? 'border-emerald-400/60'
        : 'border-red-400/60'
      : 'border-border hover:border-border-hover';

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface-hero">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      {/* Layer A: scan-beam grid reveal (pure CSS, transform-only) */}
      <div className="scan-reveal" aria-hidden="true">
        <div className="scan-reveal-layer" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,200vw)] h-[min(700px,200vw)] rounded-full pointer-events-none hero-orb" />

      <motion.div
        variants={heroVariants.container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center px-4 sm:px-6 pt-28 sm:pt-36 pb-16 max-w-3xl mx-auto overflow-hidden"
      >
        {/* Logo */}
        <motion.div variants={heroVariants.child} className="mb-8">
          <BrandLogo size={36} className="text-panguard-green mx-auto sm:w-12 sm:h-12" />
        </motion.div>

        {/* Title */}
        <div className="mb-6">
          <motion.h1
            variants={heroVariants.headline}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-text-primary break-words"
          >
            {t('titleLine1')} <span className="text-brand-sage">{t('titleLine2')}</span>
          </motion.h1>
          <motion.p
            variants={heroVariants.child}
            className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto"
          >
            {t('subtitle', { count: eco.skillsScanned.toLocaleString() })}
          </motion.p>
        </div>

        {/* Threat ticker */}
        <motion.div variants={heroVariants.child} className="mb-8">
          <ThreatTicker items={tickerItems} />
        </motion.div>

        {/* Scanner */}
        <motion.div variants={heroVariants.card} className="max-w-xl mx-auto">
          <div className="relative">
            {/* Layer B: idle radar ping (sage) — suppressed for reduced motion */}
            {!prefersReducedMotion && (
              <motion.div
                aria-hidden="true"
                className="absolute -inset-8 -z-10 rounded-3xl border border-current pointer-events-none"
                style={{ color: PING_IDLE_SAGE }}
                animate={{ scale: [0.92, 1.12], opacity: [0.3, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 5, ease: 'easeOut' }}
              />
            )}
            {/* Layer B: one semantic ping per scan result (emerald clean / red threats) */}
            {!prefersReducedMotion && scanPulse && (
              <motion.div
                key={scanPulse.key}
                aria-hidden="true"
                className="absolute -inset-8 -z-10 rounded-3xl border border-current pointer-events-none"
                style={{ color: scanPulse.color }}
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1.25, opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            )}
            <div
              className={`rounded-2xl border ${cardBorderClass} bg-surface-1 p-4 sm:p-5 text-left transition-colors duration-300 ease-out-quint`}
            >
              <p className="mb-3 font-mono text-[11px] uppercase tracking-micro text-brand-sage">
                {t('scanLabel')}
              </p>

              {/* Mode tabs */}
              <div className="flex gap-1 mb-3 bg-surface-hero/60 rounded-lg p-1 border border-border/60">
                <button
                  type="button"
                  onClick={() => setScanMode('url')}
                  className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${
                    scanMode === 'url'
                      ? 'bg-brand-sage/15 text-brand-sage border border-brand-sage/30'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t('tabUrl')}
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('paste')}
                  className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${
                    scanMode === 'paste'
                      ? 'bg-brand-sage/15 text-brand-sage border border-brand-sage/30'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t('tabPaste')}
                </button>
              </div>

              {scanMode === 'url' ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                      placeholder="github.com/modelcontextprotocol/servers"
                      className="w-full bg-surface-hero border border-border rounded-xl pl-10 pr-4 py-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage/30 transition-all"
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={handleScan}
                    disabled={loading || !url.trim()}
                    className="sheen lift shrink-0 flex items-center gap-2 rounded-xl bg-panguard-green px-7 py-4 text-sm font-semibold text-surface-hero transition-colors duration-300 ease-out-quint hover:bg-panguard-green-light disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-surface-hero/30 border-t-surface-hero rounded-full animate-spin" />
                    ) : (
                      <ShieldIcon className="w-4 h-4" />
                    )}
                    {t('scanBtn')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Content type selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPasteContentType('skill')}
                      className={`font-mono text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        pasteContentType === 'skill'
                          ? 'border-brand-sage/50 bg-brand-sage/10 text-brand-sage'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      SKILL.md
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasteContentType('mcp-config')}
                      className={`font-mono text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        pasteContentType === 'mcp-config'
                          ? 'border-brand-sage/50 bg-brand-sage/10 text-brand-sage'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      MCP Config
                    </button>
                  </div>
                  {/* Textarea */}
                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder={
                      pasteContentType === 'skill' ? t('placeholderSkill') : t('placeholderMcp')
                    }
                    className="w-full bg-surface-hero border border-border rounded-xl p-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage/30 transition-all font-mono resize-none"
                    rows={6}
                    disabled={loading}
                  />
                  <button
                    onClick={handleScan}
                    disabled={loading || !pasteContent.trim()}
                    className="sheen lift w-full flex items-center justify-center gap-2 rounded-xl bg-panguard-green px-7 py-4 text-sm font-semibold text-surface-hero transition-colors duration-300 ease-out-quint hover:bg-panguard-green-light disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-surface-hero/30 border-t-surface-hero rounded-full animate-spin" />
                    ) : (
                      <ShieldIcon className="w-4 h-4" />
                    )}
                    {t('scanBtn')}
                  </button>
                </div>
              )}
            </div>
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
        </motion.div>

        {/* Trust badges — 4 strongest signals only */}
        <motion.div variants={heroVariants.childLast} className="mt-8">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              t('badgeRules', { count: eco.atrRules }),
              t('badgeRecall'),
              t('badgeCisco'),
              t('badgeLicense'),
            ].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border bg-surface-1 px-3 py-1 font-mono text-[10px] uppercase tracking-micro text-text-muted"
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Scan history */}
        {history.length > 0 && (
          <div className="mt-6 animate-[fadeIn_0.5s_0.5s_ease_both]">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-micro text-text-muted">
              {t('historyLabel')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {history.slice(0, 5).map((h) => (
                <button
                  key={h.url + h.scannedAt}
                  type="button"
                  onClick={() => {
                    if (!h.url.startsWith('paste:')) {
                      setUrl(h.url);
                      setScanMode('url');
                    }
                  }}
                  className="font-mono text-[10px] px-2.5 py-1 rounded-full border border-border bg-surface-1 text-text-muted hover:border-border-hover hover:text-text-secondary transition-all flex items-center gap-1.5"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      h.riskLevel === 'CRITICAL'
                        ? 'bg-red-400'
                        : h.riskLevel === 'HIGH'
                          ? 'bg-orange-400'
                          : h.riskLevel === 'MEDIUM'
                            ? 'bg-yellow-400'
                            : 'bg-emerald-400'
                    }`}
                  />
                  {h.skillName ?? h.url.replace('github.com/', '')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Platform ticker */}
        <div className="mt-6 animate-[fadeIn_0.5s_0.6s_ease_both]">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-micro text-text-muted">
            {t('platformLabel')}
          </p>
          <PlatformTicker names={PLATFORM_NAMES} />
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-hero to-transparent pointer-events-none" />
    </section>
  );
}

/**
 * Static SSR skeleton shown BEFORE client hydration. Used as the Suspense
 * fallback so visitors see real PanGuard product framing during the first
 * ~200ms of paint instead of a blank dark grid. The interactive scanner form
 * boots underneath this and replaces it on hydration.
 */
function ScannerHeroSkeleton() {
  return (
    <section className="relative min-h-screen bg-surface-hero flex flex-col items-center justify-center overflow-hidden px-5 sm:px-6 pt-28 sm:pt-36 pb-16">
      {/* Layer A also runs pre-hydration (pure CSS) so the backdrop is
          consistent when the interactive hero swaps in. */}
      <div className="scan-reveal" aria-hidden="true">
        <div className="scan-reveal-layer" />
      </div>
      <div className="relative max-w-3xl w-full text-center space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-micro text-brand-sage">
          Scan your AI agent stack
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-text-primary">
          The open security standard
          <br />
          <span className="text-brand-sage">for the age of AI agents.</span>
        </h1>
        <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
          Drop in a GitHub URL or paste a SKILL/MCP manifest. PanGuard runs{' '}
          {STATS.totalRulesDisplay} ATR rules against it and tells you if it&apos;s safe to install.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-4">
          <span className="rounded-full border border-border bg-surface-1 px-3 py-1 font-mono text-[10px] uppercase tracking-micro text-text-muted">
            {STATS.totalRulesDisplay} ATR rules
          </span>
          <span className="rounded-full border border-border bg-surface-1 px-3 py-1 font-mono text-[10px] uppercase tracking-micro text-text-muted">
            Garak {STATS.benchmark.garak.recall}% recall
          </span>
          <span className="rounded-full border border-border bg-surface-1 px-3 py-1 font-mono text-[10px] uppercase tracking-micro text-text-muted">
            Rules merged upstream
          </span>
          <span className="rounded-full border border-border bg-surface-1 px-3 py-1 font-mono text-[10px] uppercase tracking-micro text-text-muted">
            MIT licensed
          </span>
        </div>
      </div>
    </section>
  );
}

export default function ScannerHero() {
  return (
    <Suspense fallback={<ScannerHeroSkeleton />}>
      <ScannerHeroInner />
    </Suspense>
  );
}
