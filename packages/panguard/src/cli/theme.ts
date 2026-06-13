/**
 * Panguard CLI Theme — Minimalist brand styling system
 *
 * Wraps @panguard-ai/core color system with semantic theme API.
 * Brand color: Sage Green #8B9878
 *
 * @module @panguard-ai/panguard/cli/theme
 */

import { c, stripAnsi, visLen, TIER_LEVEL } from '@panguard-ai/core';
import type { Tier } from '@panguard-ai/core';

// ── Brand ASCII Block Letter Logo ─────────────────────────────────────
// Half-block character style for modern terminal rendering.

export const BRAND_LOGO = [
  ' \u2588\u2588\u2580\u2580\u2588\u2588 \u2584\u2588\u2580\u2580\u2588\u2584 \u2588\u2588\u2584 \u2588\u2588 \u2588\u2588\u2580\u2580\u2580\u2580 \u2588\u2588  \u2588\u2588 \u2584\u2588\u2580\u2580\u2588\u2584 \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588\u2580\u2580\u2588\u2584   \u2584\u2588\u2580\u2580\u2588\u2584 \u2588\u2588',
  ' \u2588\u2588\u2580\u2580\u2580\u2580 \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588\u2580\u2584\u2588\u2588 \u2588\u2588 \u2580\u2588\u2588 \u2588\u2588  \u2588\u2588 \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588\u2588\u2580\u2580  \u2588\u2588  \u2588\u2588   \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588',
  ' \u2588\u2588     \u2588\u2588  \u2588\u2588 \u2588\u2588  \u2588\u2588 \u2588\u2588\u2584\u2584\u2588\u2588 \u2588\u2588\u2584\u2584\u2588\u2588 \u2588\u2588  \u2588\u2588 \u2588\u2588 \u2580\u2588\u2584 \u2588\u2588\u2584\u2584\u2588\u2580   \u2588\u2588  \u2588\u2588 \u2588\u2588',
];

// \u2500\u2500 Brand Tagline \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Collective-defense positioning: the logo is three overlapping shields.
// Each install makes everyone safer. Keep this short \u2014 it's a banner line.

/** One-line collective-defense tagline for banners (en / zh). */
export function brandTagline(lang: 'en' | 'zh-TW' = 'en'): string {
  return lang === 'zh-TW'
    ? 'AI \u4ee3\u7406\u5b89\u5168 \u00b7 \u958b\u653e\u6a19\u6e96 \u00b7 \u96c6\u9ad4\u9632\u79a6'
    : 'AI agent security \u00b7 open \u00b7 collective defense';
}

// \u2500\u2500 Clear Status Marks \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Human-readable marks instead of decoded jargon ([~] [#] [!]).
// \u2713 = good/safe (sage\u00b7green), \u26a0 = needs attention (caution), \u2192 = next step.
// These wrap a single glyph in brand color; callers add their own spacing.

/** \u2713 \u2014 safe / done / protected (sage-green). */
export const ok = (s = '\u2713'): string => c.safe(s);
/** \u26a0 \u2014 needs attention / suspicious (caution amber). */
export const warn = (s = '\u26a0'): string => c.caution(s);
/** \u2192 \u2014 next step / pointer (sage). */
export const arrow = (s = '\u2192'): string => c.sage(s);
/** \u2717 \u2014 critical / failed (critical red). */
export const fail = (s = '\u2717'): string => c.critical(s);
/** \u25a3 \u2014 the shield: PanGuard is watching (sage). Used for "protecting" lines. */
export const shield = (s = '\u25a3'): string => c.sage(s);

/**
 * Brand status marks as a stable map, for callers that prefer lookup style.
 * Mirrors the standalone helpers above \u2014 same glyphs, same colors.
 */
export const marks = {
  ok: ok(),
  warn: warn(),
  arrow: arrow(),
  fail: fail(),
  shield: shield(),
} as const;

// ── Theme Colors ──────────────────────────────────────────────────────

export const theme = {
  // Brand
  brand: c.sage,
  brandBold: (s: string) => c.bold(c.sage(s)),

  // Text hierarchy
  title: (s: string) => c.bold(s),
  subtitle: c.dim,
  dim: c.dim,
  link: (s: string) => c.underline(c.sage(s)),

  // Status
  success: c.safe,
  warning: c.caution,
  error: c.critical,

  // Severity
  critical: (s: string) => c.bold(c.critical(s)),
  high: c.critical,
  medium: c.caution,
  low: c.dim,
};

// ── Tier Badges ───────────────────────────────────────────────────────

const TIER_COLORS: Record<string, (s: string) => string> = {
  free: c.safe,
  community: c.safe,
  solo: c.caution,
  starter: c.caution, // legacy
  pro: c.alert,
  team: c.alert, // legacy
  business: c.critical,
  enterprise: c.critical, // legacy
};

/** Tier badge for menu display. Shows lock only when user tier is insufficient. */
export function tierLabel(requiredTier: Tier | string, userTier?: Tier | string): string {
  const colorFn = TIER_COLORS[requiredTier] ?? c.dim;
  const names: Record<string, string> = {
    free: 'Community',
    community: 'Community',
    solo: 'Solo',
    starter: 'Solo', // legacy
    pro: 'Pro',
    team: 'Pro', // legacy
    business: 'Business',
    enterprise: 'Business', // legacy
  };
  const name = names[requiredTier] ?? requiredTier;
  if (requiredTier === 'free') return colorFn(name);
  const userLevel = TIER_LEVEL[userTier as Tier] ?? 0;
  const requiredLevel = TIER_LEVEL[requiredTier as Tier] ?? 0;
  if (userLevel >= requiredLevel) return colorFn(name);
  return colorFn(name) + ' ' + c.dim('[locked]');
}

/** Render the brand logo in sage green */
export function renderLogo(): void {
  for (const line of BRAND_LOGO) {
    console.log(c.sage(line));
  }
}

// ── "You're protected" Hero ───────────────────────────────────────────
// The payoff line of `pga up`. Calm, concrete, reassuring — the moment the
// developer goes from "is this doing anything?" to "I'm covered."
// Rule and tool counts are always passed in live — never hard-coded.

export interface ProtectedHeroOpts {
  /** Number of AI tools / platforms being watched. 0 = none detected. */
  toolCount: number;
  /** Live rule count loaded by Guard (read from cache, never hard-coded). */
  ruleCount: number;
  /** Dashboard URL, or null to omit the line. */
  dashboardUrl?: string | null;
  lang?: 'en' | 'zh-TW';
}

/**
 * Build the "✓ You're protected" hero block as ready-to-print lines.
 * Pure: returns strings, caller does the console.log. Keeps copy + the two
 * trust guarantees (detection-only, nothing-leaves-your-machine) in one place.
 */
export function protectedHero(opts: ProtectedHeroOpts): string[] {
  const lang = opts.lang ?? 'en';
  const zh = lang === 'zh-TW';
  const rule = c.bold(c.sage(String(opts.ruleCount)));
  const tool = c.bold(c.sage(String(opts.toolCount)));
  const rule50 = c.dim('─'.repeat(50));
  const lines: string[] = [];

  lines.push(`  ${rule50}`);
  if (zh) {
    lines.push(`   ${ok()}  ${c.bold('你已受到保護')}`);
    lines.push(`      PanGuard 正在守護 ${tool} 個工具,防範提示注入、工具濫用、`);
    lines.push(`      資料外洩與惡意技能 — 使用 ${rule} 條開放規則。`);
    lines.push(`      ${c.dim('僅偵測,不阻擋 — 除非你親自開啟。')}`);
    lines.push(`      ${c.dim('任何資料都不會離開這台機器 — 除非你允許。')}`);
  } else {
    lines.push(`   ${ok()}  ${c.bold("You're protected")}`);
    lines.push(`      PanGuard is watching ${tool} tools for prompt injection, tool abuse,`);
    lines.push(`      data exfiltration, and malicious skills — using ${rule} open rules.`);
    lines.push(`      ${c.dim('Detection only. Nothing is blocked unless you turn it on.')}`);
    lines.push(`      ${c.dim('Nothing leaves your machine unless you allow it.')}`);
  }
  lines.push('');
  if (opts.dashboardUrl) {
    const dash = zh ? '儀表板' : 'Dashboard';
    const stat = zh ? '狀態' : 'Status';
    lines.push(
      `   ${dash} ${arrow()} ${c.sage(opts.dashboardUrl)}      ${stat} ${arrow()} ${c.dim('pga status')}`
    );
  } else {
    const stat = zh ? '狀態' : 'Status';
    lines.push(`   ${stat} ${arrow()} ${c.dim('pga status')}`);
  }
  lines.push(`  ${rule50}`);
  return lines;
}

// Re-export for convenience
export { c, stripAnsi, visLen };
