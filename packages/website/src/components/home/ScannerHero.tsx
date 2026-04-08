'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import BrandLogo from '@/components/ui/BrandLogo';
import { ShieldIcon, ScanIcon } from '@/components/ui/BrandIcons';
import { useSkillScan } from '@/hooks/useSkillScan';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import ScanAnimation from './ScanAnimation';
import ScanResultCard from './ScanResultCard';

const PLATFORM_NAMES = [
  'Claude Code',
  'Claude Desktop',
  'Cursor',
  'OpenClaw',
  'Codex CLI',
  'WorkBuddy',
  'NemoClaw',
  'ArkClaw',
  'Windsurf',
  'QClaw',
  'Cline',
  'VS Code Copilot',
  'Zed',
  'Gemini CLI',
  'Continue',
  'Roo Code',
] as const;

/** Infinite scrolling ticker for threat incidents */
function ThreatTicker({ items }: { readonly items: readonly string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden w-full py-3">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
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
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
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

        {/* Title */}
        <div className="mb-6 animate-[fadeUp_0.6s_0.1s_ease_both]">
          <h1 className="text-[clamp(24px,5vw,48px)] font-bold leading-[1.3] tracking-tight text-text-primary">
            {t('titleLine1')} — <span className="text-panguard-green">{t('titleLine2')}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
            {t('subtitle', { count: eco.skillsScanned.toLocaleString() })}
          </p>
        </div>

        {/* Threat ticker */}
        <div className="mb-8 animate-[fadeIn_0.5s_0.2s_ease_both]">
          <ThreatTicker items={tickerItems} />
        </div>

        {/* Scanner */}
        <div className="max-w-xl mx-auto animate-[fadeUp_0.5s_0.3s_ease_both]">
          <p className="text-xs uppercase tracking-[0.15em] text-text-muted font-semibold mb-3">
            {t('scanLabel')}
          </p>

          {/* Mode tabs */}
          <div className="flex gap-1 mb-3 bg-surface-1/50 rounded-lg p-1 border border-border/50">
            <button
              type="button"
              onClick={() => setScanMode('url')}
              className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${
                scanMode === 'url'
                  ? 'bg-panguard-green/15 text-panguard-green border border-panguard-green/30'
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
                  ? 'bg-panguard-green/15 text-panguard-green border border-panguard-green/30'
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
          ) : (
            <div className="space-y-3">
              {/* Content type selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPasteContentType('skill')}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    pasteContentType === 'skill'
                      ? 'border-panguard-green/50 bg-panguard-green/10 text-panguard-green'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                >
                  SKILL.md
                </button>
                <button
                  type="button"
                  onClick={() => setPasteContentType('mcp-config')}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    pasteContentType === 'mcp-config'
                      ? 'border-panguard-green/50 bg-panguard-green/10 text-panguard-green'
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
                  pasteContentType === 'skill'
                    ? t('placeholderSkill')
                    : t('placeholderMcp')
                }
                className="w-full bg-surface-1/80 backdrop-blur-sm border border-border rounded-xl p-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-panguard-green focus:ring-1 focus:ring-panguard-green/30 transition-all font-mono resize-none"
                rows={6}
                disabled={loading}
              />
              <button
                onClick={handleScan}
                disabled={loading || !pasteContent.trim()}
                className="w-full bg-panguard-green text-white font-semibold rounded-xl px-7 py-4 text-sm hover:bg-panguard-green-light transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ShieldIcon className="w-4 h-4" />
                )}
                {t('scanBtn')}
              </button>
            </div>
          )}

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

        {/* Trust badges */}
        <div className="mt-10 animate-[fadeUp_0.5s_0.5s_ease_both]">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {[
              t('badgeOwasp'),
              t('badgeRules', { count: eco.atrRules }),
              t('badgeRecall'),
              t('badgeCisco'),
              t('badgeSafeMcp'),
              t('badgePlatforms'),
              t('badgeLicense'),
              t('badgeScanned', { count: eco.skillsScanned.toLocaleString() }),
            ].map((badge) => (
              <span
                key={badge}
                className="text-[11px] sm:text-xs text-text-muted border border-border/50 rounded-full px-3 py-1.5 bg-surface-1/30"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Scan history */}
        {history.length > 0 && (
          <div className="mt-6 animate-[fadeIn_0.5s_0.5s_ease_both]">
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">{t('historyLabel')}</p>
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
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border/50 bg-surface-1/30 text-text-muted hover:border-panguard-green/40 hover:text-text-secondary transition-all flex items-center gap-1.5"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    h.riskLevel === 'CRITICAL' ? 'bg-red-400' :
                    h.riskLevel === 'HIGH' ? 'bg-orange-400' :
                    h.riskLevel === 'MEDIUM' ? 'bg-yellow-400' : 'bg-emerald-400'
                  }`} />
                  {h.skillName ?? h.url.replace('github.com/', '')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Platform ticker */}
        <div className="mt-6 animate-[fadeIn_0.5s_0.6s_ease_both]">
          <p className="text-xs text-text-muted mb-2">{t('platformLabel')}</p>
          <PlatformTicker names={PLATFORM_NAMES} />
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
