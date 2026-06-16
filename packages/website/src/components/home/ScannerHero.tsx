'use client';

import { Suspense, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Terminal, Copy, Check, ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import { Link } from '@/navigation';
import { INSTALL_COMMAND } from './CTARoadmap';

const PLATFORM_NAMES = [
  'Claude Code',
  'Claude Desktop',
  'Cursor',
  'OpenClaw',
  'Codex CLI',
  'WorkBuddy',
  'Windsurf',
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
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0C0A09] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0C0A09] to-transparent z-10 pointer-events-none" />
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
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0C0A09] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0C0A09] to-transparent z-10 pointer-events-none" />
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
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const [copied, setCopied] = useState(false);

  const tickerItems = [t('ticker1'), t('ticker2'), t('ticker3'), t('ticker4'), t('ticker5')];

  function copyInstall() {
    navigator.clipboard
      .writeText(INSTALL_COMMAND)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard API unavailable
      });
  }

  return (
    <section className="relative min-h-[100svh] flex items-start sm:items-center justify-center overflow-hidden bg-surface-hero">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,200vw)] h-[min(700px,200vw)] rounded-full pointer-events-none hero-orb" />

      <div className="relative z-10 text-center px-4 sm:px-6 pt-28 pb-16 max-w-3xl mx-auto overflow-hidden">
        {/* Logo */}
        <div className="mb-8 animate-[fadeIn_0.5s_ease_both]">
          <BrandLogo size={36} className="text-panguard-green mx-auto sm:w-12 sm:h-12" />
        </div>

        {/* Title */}
        <div className="mb-5 animate-[fadeUp_0.6s_0.1s_ease_both]">
          <h1 className="text-[clamp(22px,5vw,48px)] font-bold leading-[1.2] tracking-tight text-text-primary break-words">
            {t('titleLine1')} <span className="text-panguard-green">{t('titleLine2')}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
            {t('subtitle')}
          </p>
          <p className="mt-3 text-sm font-medium text-panguard-green">
            {isZh
              ? '永久免費 · MIT 授權 · 免註冊 · 跑起來就是你自己的 Threat Cloud 感測器'
              : 'Free forever · MIT-licensed · no account · runs as your own Threat Cloud sensor'}
          </p>
        </div>

        {/* Threat ticker — real attacks happening now */}
        <div className="mb-6 animate-[fadeIn_0.5s_0.2s_ease_both]">
          <ThreatTicker items={tickerItems} />
        </div>

        {/* Install-first CTA */}
        <div className="max-w-xl mx-auto animate-[fadeUp_0.5s_0.3s_ease_both]">
          <p className="text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold mb-3">
            {isZh ? '一行裝起來,幾秒就跑' : 'Install free — running in seconds'}
          </p>

          <div className="bg-surface-1/80 backdrop-blur-sm border border-border rounded-xl p-4 font-mono text-left">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Terminal className="w-4 h-4 text-text-muted flex-shrink-0" />
                <code className="text-sm text-brand-sage select-all truncate">
                  {INSTALL_COMMAND}
                </code>
              </div>
              <button
                onClick={copyInstall}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-surface-2 transition-colors duration-200"
                aria-label={isZh ? '複製安裝指令' : 'Copy install command'}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-panguard-green" />
                ) : (
                  <Copy className="w-4 h-4 text-text-muted" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://docs.panguard.ai/quickstart"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-panguard-green text-white font-semibold rounded-xl px-7 py-3 text-sm hover:bg-panguard-green-light transition-all duration-200 active:scale-[0.98]"
            >
              {isZh ? '開始使用 — 免費' : 'Get started — free'}
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/scan"
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              {isZh ? '只想查一個 skill?在瀏覽器掃它 →' : 'Just want to check one skill? Scan it →'}
            </Link>
          </div>

          <p className="text-[11px] text-text-muted mt-4">{t('trustNote')}</p>
        </div>

        {/* Trust badges — 4 strongest signals only */}
        <div className="mt-8 animate-[fadeUp_0.5s_0.5s_ease_both]">
          <div className="flex flex-wrap justify-center gap-2">
            {[t('badgeRules'), t('badgeRecall'), t('badgeCisco'), t('badgeLicense')].map(
              (badge) => (
                <span
                  key={badge}
                  className="text-[11px] text-text-muted border border-border/40 rounded-full px-3 py-1 bg-surface-1/20"
                >
                  {badge}
                </span>
              )
            )}
          </div>
        </div>

        {/* Platform ticker */}
        <div className="mt-6 animate-[fadeIn_0.5s_0.6s_ease_both]">
          <p className="text-xs text-text-muted mb-2">{t('platformLabel')}</p>
          <PlatformTicker names={PLATFORM_NAMES} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0C0A09] to-transparent pointer-events-none" />
    </section>
  );
}

/**
 * Static SSR skeleton shown BEFORE client hydration. Mirrors the install-first
 * hero so the first paint already shows the positioning + free-install line
 * instead of a blank dark grid.
 */
function ScannerHeroSkeleton() {
  return (
    <section className="relative min-h-[100svh] bg-surface-hero flex flex-col items-center justify-center px-5 sm:px-6 py-24">
      <div className="max-w-3xl w-full text-center space-y-5">
        <p className="text-sm font-medium text-brand-sage uppercase tracking-wider">
          The open standard for AI agent security
        </p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
          The open security standard{' '}
          <span className="text-panguard-green">for the age of AI agents.</span>
        </h1>
        <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
          Open, MIT-licensed detection rules for attacks on AI agents — the CVE and Sigma of the
          agent world. 650+ rules across 10 categories, already adopted by Microsoft, Cisco and
          MISP.
        </p>
        <p className="text-sm font-medium text-panguard-green">
          Free forever · MIT-licensed · no account · runs as your own Threat Cloud sensor
        </p>
        <div className="max-w-xl mx-auto bg-surface-1 border border-border-default rounded-xl p-4 font-mono text-left">
          <code className="text-sm text-brand-sage">{INSTALL_COMMAND}</code>
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
