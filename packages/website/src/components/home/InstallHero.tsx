'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { STATS } from '@/lib/stats';

/* ─────────────────────────────────────────────────────────────────
   InstallHero — split layout: copy on the left, live terminal on
   the right (founder-approved hero-split mockup, 2026-07-11).
   The terminal keeps the original typing-playback mechanism; the
   background gains three aurora blobs, a breathing glow anchored
   behind the terminal, and a sweeping light beam. Platform ticker
   runs full-width at the bottom of the section.
   Pure framer-motion + CSS (no canvas, no new deps, CSP-safe).
   ───────────────────────────────────────────────────────────────── */

const INSTALL_CMD = 'curl -fsSL https://get.panguard.ai | bash';

// The 17 agent runtimes PanGuard auto-detects — keep this list in sync
// with STATS.adoption.platformsSupported (17).
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
  'VS Code Copilot',
  'Zed',
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
    {
      type: 'out',
      text: `✓ ${STATS.adoption.platformsSupported} agent runtimes detected — Claude Code · Cursor · Gemini CLI …`,
      tone: 'ok',
    },
    { type: 'out', text: '✓ dashboard → http://127.0.0.1:3100', tone: 'link' },
    { type: 'out', text: '● guard active — watching every agent action', tone: 'live' },
  ];
}

const TYPE_MS = 26; // per character
const CMD_PAUSE_MS = 420; // pause after a command before its output
const OUT_MS = 300; // per output line
const START_DELAY_MS = 900;
const COPY_RESET_MS = 2000;

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

  if (!started)
    return { lines: [] as TermLine[], current: null as TermLine | null, typed: 0, done: false };
  const lines = script.slice(0, lineIdx);
  const current = script[lineIdx] ?? null;
  const done = lineIdx >= script.length;
  return { lines, current: current && current.type === 'cmd' ? current : null, typed, done };
}

/* Shared copy-to-clipboard state (install pill + terminal title bar). */
function useCopyCommand() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  };
  return { copied, handleCopy };
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

function Terminal({
  reduced,
  copyLabel,
  copiedLabel,
}: {
  readonly reduced: boolean;
  readonly copyLabel: string;
  readonly copiedLabel: string;
}) {
  const script = useMemo(() => buildScript(), []);
  const { lines, current, typed, done } = useTerminalPlayback(script, reduced);
  const { copied, handleCopy } = useCopyCommand();

  // out lines that follow the *last shown* cmd still pending → nothing extra to render
  return (
    <div className="relative text-left">
      {/* glow bloom behind the window */}
      <div
        className="absolute -inset-6 rounded-[28px] bg-brand-sage/[0.07] blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative rounded-2xl border border-border bg-[#131010]/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] overflow-hidden backdrop-blur">
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
            <span className="ml-3 font-mono text-[11px] text-text-muted tracking-wide">
              panguard — install
            </span>
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
        <div
          className="px-4 sm:px-5 py-4 font-mono text-[12.5px] sm:text-[13.5px] leading-[1.9] min-h-[218px] sm:min-h-[236px]"
          aria-live="off"
        >
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
              <span
                className="inline-block w-[7px] h-[15px] translate-y-[2px] bg-brand-sage/80 animate-pulse"
                aria-hidden="true"
              />
            </div>
          )}

          {/* resting cursor when finished */}
          {done && (
            <div>
              <span className="text-brand-sage select-none">$ </span>
              <span
                className="inline-block w-[7px] h-[15px] translate-y-[2px] bg-brand-sage/80 animate-pulse"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── platform ticker (full-width strip at the bottom of the hero) ─── */
function PlatformTicker({
  names,
  reduced,
}: {
  readonly names: readonly string[];
  readonly reduced: boolean;
}) {
  const doubled = [...names, ...names];
  return (
    <div className="relative overflow-hidden w-full py-2">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-surface-hero to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface-hero to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={reduced ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
      >
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="text-xs text-text-secondary/70 font-mono flex items-center gap-1.5"
          >
            <span className="inline-block w-1 h-1 rounded-full bg-panguard-green/50 shrink-0" />
            {name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── background: grid + aurora + beam (mockup .bg) ─── */
const AURORA_BLOBS = [
  {
    size: 820,
    position: { left: '-8%', top: '-30%' },
    background: 'radial-gradient(circle, rgba(139,154,142,0.16), transparent 60%)',
    x: [0, 70, -40, 0],
    y: [0, 50, 20, 0],
    duration: 24,
  },
  {
    size: 860,
    position: { right: '-8%', top: '4%' },
    background: 'radial-gradient(circle, rgba(52,211,153,0.30), transparent 58%)',
    x: [0, -80, 30, 0],
    y: [0, -40, 50, 0],
    duration: 30,
  },
  {
    size: 520,
    position: { left: '20%', bottom: '-30%' },
    background: 'radial-gradient(circle, rgba(52,211,153,0.10), transparent 60%)',
    x: [0, -40, 70, 0],
    y: [0, 20, 50, 0],
    duration: 36,
  },
] as const;

function HeroBackground({ reduced }: { readonly reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* grid with radial mask, brighter than the old hero */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '112px 112px',
          WebkitMaskImage: 'radial-gradient(120% 100% at 70% 45%, #000 30%, transparent 78%)',
          maskImage: 'radial-gradient(120% 100% at 70% 45%, #000 30%, transparent 78%)',
        }}
      />

      {/* sweeping light beam */}
      {!reduced && (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, transparent 40%, rgba(139,154,142,0.06) 50%, transparent 60%)',
          }}
          animate={{ x: ['-8%', '8%', '-8%'], opacity: [0, 1, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* aurora blobs — transform-only drift */}
      {AURORA_BLOBS.map((blob, i) =>
        reduced ? (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: blob.size,
              height: blob.size,
              ...blob.position,
              background: blob.background,
              filter: 'blur(14px)',
            }}
          />
        ) : (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: blob.size,
              height: blob.size,
              ...blob.position,
              background: blob.background,
              filter: 'blur(14px)',
            }}
            animate={{ x: [...blob.x], y: [...blob.y] }}
            transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}
    </div>
  );
}

/* ─── breathing glow anchored behind the terminal (desktop only) ─── */
function TerminalGlow({ reduced }: { readonly reduced: boolean }) {
  const gradient =
    'radial-gradient(closest-side, rgba(52,211,153,0.38), rgba(52,211,153,0.12) 55%, transparent 80%)';
  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[560px] max-w-none hidden lg:block pointer-events-none"
      aria-hidden="true"
    >
      {reduced ? (
        <div
          className="h-full w-full opacity-75"
          style={{ background: gradient, filter: 'blur(4px)' }}
        />
      ) : (
        <motion.div
          className="h-full w-full"
          style={{ background: gradient, filter: 'blur(4px)' }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.06, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
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

/* ─── install command pill (left column) ─── */
function InstallCommandPill({
  copyLabel,
  copiedLabel,
}: {
  readonly copyLabel: string;
  readonly copiedLabel: string;
}) {
  const { copied, handleCopy } = useCopyCommand();
  return (
    <div className="mt-5 inline-flex max-w-full items-center gap-3 overflow-x-auto rounded-[10px] border border-border bg-[#131010]/90 px-3.5 py-2.5 font-mono text-[13px] text-text-secondary shadow-[0_0_20px_rgba(52,211,153,0.06)]">
      <span className="text-panguard-green font-semibold select-none">$</span>
      <span className="whitespace-nowrap text-text-primary/85">{INSTALL_CMD}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-1 flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
        aria-label={copyLabel}
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

export default function InstallHero() {
  const t = useTranslations('home.installHero');
  const prefersReducedMotion = useReducedMotion() ?? false;
  const variants = useMemo(() => buildVariants(prefersReducedMotion), [prefersReducedMotion]);

  const badges = [
    t('badgeRules', { count: STATS.atrRules.toLocaleString() }),
    t('badgeRecall'),
    t('badgeMerged'),
    t('badgeLicense'),
  ];

  return (
    <section className="relative overflow-hidden bg-surface-hero">
      <HeroBackground reduced={prefersReducedMotion} />

      <div className="relative z-10 min-h-[78vh] flex items-center px-5 sm:px-8 lg:px-12 pt-10 sm:pt-12 pb-8">
        <motion.div
          variants={variants.container}
          initial="hidden"
          animate="show"
          className="w-full max-w-[1200px] mx-auto grid items-center gap-10 lg:gap-[clamp(2.5rem,6vw,6rem)] lg:grid-cols-[0.92fr_1.08fr]"
        >
          {/* LEFT — copy */}
          <div className="flex flex-col items-start text-left">
            <motion.span
              variants={variants.child}
              className="mb-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-micro text-brand-sage"
            >
              <motion.span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-panguard-green shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                animate={prefersReducedMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              {t('eyebrow')}
            </motion.span>

            <motion.h1
              variants={variants.child}
              className="font-display text-4xl sm:text-5xl xl:text-[4.4rem] font-bold leading-[1.06] tracking-[-0.035em] text-text-primary [text-wrap:balance]"
            >
              {t('titleLine1')}
              <br />
              <span className="text-brand-sage">{t('titleLine2')}</span>
            </motion.h1>

            <motion.p
              variants={variants.child}
              className="mt-6 max-w-[40ch] text-base sm:text-lg text-text-secondary leading-[1.72] [text-wrap:balance]"
            >
              {t('subtitle')}
            </motion.p>

            <motion.div
              variants={variants.child}
              className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3"
            >
              <a
                href="#install"
                className="inline-flex items-center rounded-full bg-panguard-green px-6 py-3 font-display text-sm sm:text-base font-semibold text-surface-hero shadow-[0_0_30px_rgba(52,211,153,0.28)] hover:bg-panguard-green-light hover:shadow-[0_0_40px_rgba(52,211,153,0.42)] transition-all duration-200 active:scale-[0.98]"
              >
                {t('ctaInstall')}
              </a>
              <a
                href="/scan"
                className="text-sm sm:text-[0.95rem] font-semibold text-brand-sage hover:text-brand-sage-light hover:underline transition-colors"
              >
                {t('ctaScan')}
              </a>
            </motion.div>

            <motion.div variants={variants.child} className="max-w-full">
              <InstallCommandPill copyLabel={t('copy')} copiedLabel={t('copied')} />
            </motion.div>

            <motion.p
              variants={variants.child}
              className="mt-4 font-mono text-[11px] uppercase tracking-micro text-text-muted"
            >
              {t('installNote')}
            </motion.p>

            <motion.div variants={variants.child} className="mt-10 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-border bg-surface-1/50 px-3 py-1 font-mono text-[10px] uppercase tracking-micro text-text-muted"
                >
                  {badge}
                </span>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — terminal */}
          <motion.div
            variants={variants.card}
            id="install"
            className="relative scroll-mt-24"
          >
            <TerminalGlow reduced={prefersReducedMotion} />

            {/* radar ping ring */}
            {!prefersReducedMotion && (
              <motion.div
                aria-hidden="true"
                className="absolute -inset-7 rounded-[26px] border border-current pointer-events-none"
                style={{ color: 'rgba(52, 211, 153, 0.30)' }}
                animate={{ scale: [0.95, 1.05], opacity: [0.55, 0] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeOut' }}
              />
            )}

            <Terminal
              reduced={prefersReducedMotion}
              copyLabel={t('copy')}
              copiedLabel={t('copied')}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* platform ticker — full-width strip at the bottom */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-12 pb-10 animate-[fadeIn_0.5s_0.6s_ease_both]">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-micro text-text-muted">
          {t('platformLabel')}
        </p>
        <PlatformTicker names={PLATFORM_NAMES} reduced={prefersReducedMotion} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-hero to-transparent pointer-events-none" />
    </section>
  );
}
