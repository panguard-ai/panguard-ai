'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import { STATS } from '@/lib/stats';

/* ─────────────────────────────────────────────────────────────────
   InstallHero — one-command install, played out in a live terminal.
   The scanner moved to /scan; the hero now sells the 30-second path:
   type the command → rules load → agents detected → guard active.
   Pure framer-motion + CSS (no canvas, no new deps, CSP-safe).
   ───────────────────────────────────────────────────────────────── */

const INSTALL_CMD = 'curl -fsSL https://get.panguard.ai | bash';

// The 15 verified agent runtimes PanGuard auto-detects (2 more in preview,
// deliberately excluded — keep in sync with STATS.adoption.platformsSupported).
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

/* ─── terminal script ───
   type: 'cmd' lines get typed character-by-character; 'out' lines print
   whole. Transcript stays in English in both locales — it is literal CLI
   output, and localizing it would break authenticity. */
interface TermLine {
  readonly type: 'cmd' | 'out';
  readonly text: string;
  readonly tone?: 'ok' | 'live' | 'dim' | 'link';
}

function buildScript(): readonly TermLine[] {
  return [
    { type: 'cmd', text: INSTALL_CMD },
    { type: 'out', text: `✓ panguard ${STATS.cliVersion} installed`, tone: 'ok' },
    { type: 'cmd', text: 'pga up' },
    { type: 'out', text: `✓ ${STATS.atrRules.toLocaleString()} ATR rules loaded`, tone: 'ok' },
    { type: 'out', text: '✓ 3 agents detected — Claude Code · Cursor · Gemini CLI', tone: 'ok' },
    { type: 'out', text: '✓ dashboard → http://127.0.0.1:3100', tone: 'link' },
    { type: 'out', text: '● guard active — watching every agent action', tone: 'live' },
  ];
}

const TYPE_MS = 26; // per character
const CMD_PAUSE_MS = 420; // pause after a command before its output
const OUT_MS = 300; // per output line
const START_DELAY_MS = 900;

/* Deterministic terminal playback. Reduced motion renders the finished
   transcript immediately. */
function useTerminalPlayback(script: readonly TermLine[], reduced: boolean) {
  // progress = number of fully-revealed lines; typed = chars of current cmd
  const [lineIdx, setLineIdx] = useState(reduced ? script.length : 0);
  const [typed, setTyped] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduced) return;
    const line = script[lineIdx];
    if (!line) return; // finished

    if (line.type === 'cmd') {
      if (typed < line.text.length) {
        timer.current = setTimeout(() => setTyped((c) => c + 1), TYPE_MS);
      } else {
        timer.current = setTimeout(() => {
          setLineIdx((i) => i + 1);
          setTyped(0);
        }, CMD_PAUSE_MS);
      }
    } else {
      timer.current = setTimeout(() => setLineIdx((i) => i + 1), OUT_MS);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [script, lineIdx, typed, reduced]);

  // initial start delay: hold at lineIdx 0 / typed 0 handled by first timeout
  const [started, setStarted] = useState(reduced);
  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setStarted(true), START_DELAY_MS);
    return () => clearTimeout(t);
  }, [reduced]);

  if (!started) return { lines: [] as TermLine[], current: null as TermLine | null, typed: 0, done: false };
  const lines = script.slice(0, lineIdx);
  const current = script[lineIdx] ?? null;
  const done = lineIdx >= script.length;
  return { lines, current: current && current.type === 'cmd' ? current : null, typed, done };
}

function ToneText({ line }: { readonly line: TermLine }) {
  const cls =
    line.tone === 'ok'
      ? 'text-emerald-400/90'
      : line.tone === 'live'
        ? 'text-panguard-green'
        : line.tone === 'link'
          ? 'text-brand-sage'
          : 'text-text-secondary';
  return <span className={cls}>{line.text}</span>;
}

function Terminal({ reduced, copyLabel, copiedLabel }: { readonly reduced: boolean; readonly copyLabel: string; readonly copiedLabel: string }) {
  const script = useMemo(() => buildScript(), []);
  const { lines, current, typed, done } = useTerminalPlayback(script, reduced);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // out lines that follow the *last shown* cmd still pending → nothing extra to render
  return (
    <div className="relative text-left">
      {/* glow bloom behind the window */}
      <div className="absolute -inset-6 rounded-[28px] bg-brand-sage/[0.07] blur-2xl pointer-events-none" aria-hidden="true" />

      <div className="relative rounded-2xl border border-border bg-[#131010]/95 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur">
        {/* sheen sweep */}
        {!reduced && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
            initial={{ x: '-120%' }}
            animate={{ x: '420%' }}
            transition={{ duration: 5.5, repeat: Infinity, repeatDelay: 7, ease: 'easeInOut' }}
          />
        )}

        {/* title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70 bg-surface-1/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]/80" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]/80" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]/80" />
            <span className="ml-3 font-mono text-[11px] text-text-muted tracking-wide">panguard — zsh</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface-2/60 px-2.5 py-1 font-mono text-[11px] text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors"
            aria-label={copyLabel}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? copiedLabel : copyLabel}
          </button>
        </div>

        {/* transcript */}
        <div className="px-4 sm:px-5 py-4 font-mono text-[12.5px] sm:text-[13.5px] leading-[1.9] min-h-[218px] sm:min-h-[236px]" aria-live="off">
          {lines.map((l, i) =>
            l.type === 'cmd' ? (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className="text-brand-sage select-none">$ </span>
                <span className="text-text-primary">{l.text}</span>
              </div>
            ) : (
              <motion.div
                key={i}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="whitespace-pre-wrap break-all pl-0"
              >
                {l.tone === 'live' ? (
                  <span className="text-panguard-green">
                    <motion.span
                      aria-hidden="true"
                      className="inline-block"
                      animate={reduced ? undefined : { opacity: [1, 0.35, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      ●
                    </motion.span>
                    {l.text.slice(1)}
                  </span>
                ) : (
                  <ToneText line={l} />
                )}
              </motion.div>
            )
          )}

          {/* actively-typing command */}
          {current && (
            <div className="whitespace-pre-wrap break-all">
              <span className="text-brand-sage select-none">$ </span>
              <span className="text-text-primary">{current.text.slice(0, typed)}</span>
              <span className="inline-block w-[7px] h-[15px] translate-y-[2px] bg-brand-sage/80 animate-pulse" aria-hidden="true" />
            </div>
          )}

          {/* resting cursor when finished */}
          {done && (
            <div>
              <span className="text-brand-sage select-none">$ </span>
              <span className="inline-block w-[7px] h-[15px] translate-y-[2px] bg-brand-sage/80 animate-pulse" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── tickers (shared visual language with the previous hero) ─── */
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

/* ─── entrance choreography (same budget as previous hero) ─── */
const EASE_OUT_QUINT: readonly [number, number, number, number] = [0.22, 1, 0.36, 1];

function buildVariants(reduced: boolean): { container: Variants; child: Variants; card: Variants } {
  if (reduced) {
    const fade: Variants = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
    };
    return { container: { hidden: {}, show: {} }, child: fade, card: fade };
  }
  const show = { opacity: 1, y: 0, filter: 'blur(0px)' };
  return {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } },
    child: {
      hidden: { opacity: 0, y: 14, filter: 'blur(5px)' },
      show: { ...show, transition: { duration: 0.55, ease: EASE_OUT_QUINT } },
    },
    card: {
      hidden: { opacity: 0, y: 16, scale: 0.985, filter: 'blur(6px)' },
      show: { ...show, scale: 1, transition: { duration: 0.6, ease: EASE_OUT_QUINT } },
    },
  };
}

export default function InstallHero() {
  const t = useTranslations('home.installHero');
  const prefersReducedMotion = useReducedMotion() ?? false;
  const variants = useMemo(() => buildVariants(prefersReducedMotion), [prefersReducedMotion]);

  const tickerItems = [t('ticker1'), t('ticker2'), t('ticker3'), t('ticker4'), t('ticker5')];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface-hero">
      {/* faint grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      {/* scan-beam grid reveal (pure CSS, defined in globals) */}
      <div className="scan-reveal" aria-hidden="true">
        <div className="scan-reveal-layer" />
      </div>

      {/* aurora drift — two soft blobs, transform-only */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            aria-hidden="true"
            className="absolute w-[720px] h-[720px] rounded-full pointer-events-none"
            style={{
              left: '8%',
              top: '-18%',
              background: 'radial-gradient(circle, rgba(139,154,142,0.10) 0%, transparent 62%)',
            }}
            animate={{ x: [0, 60, -30, 0], y: [0, 40, 10, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute w-[640px] h-[640px] rounded-full pointer-events-none"
            style={{
              right: '2%',
              bottom: '-22%',
              background: 'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 60%)',
            }}
            animate={{ x: [0, -70, 20, 0], y: [0, -30, -60, 0] }}
            transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,200vw)] h-[min(700px,200vw)] rounded-full pointer-events-none hero-orb" />

      <motion.div
        variants={variants.container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center px-4 sm:px-6 pt-28 sm:pt-36 pb-16 max-w-3xl mx-auto"
      >
        {/* logo */}
        <motion.div variants={variants.child} className="mb-8">
          <BrandLogo size={36} className="text-panguard-green mx-auto sm:w-12 sm:h-12" />
        </motion.div>

        {/* headline */}
        <div className="mb-6">
          <motion.h1
            variants={variants.child}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-text-primary [text-wrap:balance]"
          >
            {t('titleLine1')}<span className="text-brand-sage">{t('titleLine2')}</span>
          </motion.h1>
          <motion.p
            variants={variants.child}
            className="mt-5 text-base sm:text-lg text-text-secondary leading-[1.85] max-w-xl mx-auto [text-wrap:balance]"
          >
            {t('subtitle')}
          </motion.p>
        </div>

        {/* threat ticker */}
        <motion.div variants={variants.child} className="mb-8">
          <ThreatTicker items={tickerItems} />
        </motion.div>

        {/* terminal + radar ping */}
        <motion.div variants={variants.card} className="max-w-xl mx-auto relative">
          {!prefersReducedMotion && (
            <motion.div
              aria-hidden="true"
              className="absolute -inset-8 -z-10 rounded-3xl border border-current pointer-events-none"
              style={{ color: 'rgba(139, 154, 142, 0.25)' }}
              animate={{ scale: [0.92, 1.12], opacity: [0.3, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 5, ease: 'easeOut' }}
            />
          )}
          <Terminal reduced={prefersReducedMotion} copyLabel={t('copy')} copiedLabel={t('copied')} />

          {/* install note + secondary paths */}
          <p className="mt-4 font-mono text-[11px] uppercase tracking-micro text-text-muted">
            {t('installNote')}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <a href="/scan" className="text-brand-sage font-semibold hover:underline">
              {t('ctaScan')}
            </a>
            <span className="text-border select-none" aria-hidden="true">
              ·
            </span>
            <a
              href="https://docs.panguard.ai/quickstart"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              {t('ctaDocs')}
            </a>
          </div>
        </motion.div>

        {/* trust badges */}
        <motion.div variants={variants.child} className="mt-9">
          <div className="flex flex-wrap justify-center gap-2">
            {[
              t('badgeRules', { count: STATS.atrRules.toLocaleString() }),
              t('badgeRecall'),
              t('badgeMerged'),
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

        {/* platform ticker */}
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
