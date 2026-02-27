/**
 * Panguard CLI Theme — Minimalist brand styling system
 *
 * Wraps @panguard-ai/core color system with semantic theme API.
 * Brand color: Sage Green #8B9878
 *
 * @module @panguard-ai/panguard/cli/theme
 */

import { c, stripAnsi, visLen } from '@panguard-ai/core';
import type { Tier } from './credentials.js';
import { TIER_LEVEL } from './credentials.js';

// ── Brand ASCII Block Letter Logo ─────────────────────────────────────
// Half-block character style for modern terminal rendering.

export const BRAND_LOGO = [
  ' \u2588\u2588\u2580\u2580\u2588\u2588 \u2584\u2588\u2580\u2580\u2588\u2584 \u2588\u2588\u2584 \u2588\u2588 \u2588\u2588\u2580\u2580\u2580\u2580 \u2588\u2588  \u2588\u2588 \u2584\u2588\u2580\u2580\u2588\u2584 \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588\u2580\u2580\u2588\u2584   \u2584\u2588\u2580\u2580\u2588\u2584 \u2588\u2588',
  ' \u2588\u2588\u2580\u2580\u2580\u2580 \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588\u2580\u2584\u2588\u2588 \u2588\u2588 \u2580\u2588\u2588 \u2588\u2588  \u2588\u2588 \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588\u2588\u2580\u2580  \u2588\u2588  \u2588\u2588   \u2588\u2588\u2580\u2580\u2588\u2588 \u2588\u2588',
  ' \u2588\u2588     \u2588\u2588  \u2588\u2588 \u2588\u2588  \u2588\u2588 \u2588\u2588\u2584\u2584\u2588\u2588 \u2588\u2588\u2584\u2584\u2588\u2588 \u2588\u2588  \u2588\u2588 \u2588\u2588 \u2580\u2588\u2584 \u2588\u2588\u2584\u2584\u2588\u2580   \u2588\u2588  \u2588\u2588 \u2588\u2588',
];

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
  solo: c.caution,
  starter: c.caution,
  pro: c.alert,
  team: c.alert,
  business: c.alert,
  enterprise: c.critical,
};

/** Tier badge for menu display. Shows lock only when user tier is insufficient. */
export function tierLabel(requiredTier: Tier | string, userTier?: Tier | string): string {
  const colorFn = TIER_COLORS[requiredTier] ?? c.dim;
  const names: Record<string, string> = {
    free: 'Free',
    solo: 'Solo',
    starter: 'Solo',
    pro: 'Pro',
    team: 'Pro',
    business: 'Pro',
    enterprise: 'Ent',
  };
  const name = names[requiredTier] ?? requiredTier;
  if (requiredTier === 'free') return colorFn(name);
  const userLevel = TIER_LEVEL[userTier as Tier] ?? 0;
  const requiredLevel = TIER_LEVEL[requiredTier as Tier] ?? 0;
  if (userLevel >= requiredLevel) return colorFn(name);
  return colorFn(name) + ' ' + c.dim('\uD83D\uDD12');
}

/** Render the brand logo in sage green */
export function renderLogo(): void {
  for (const line of BRAND_LOGO) {
    console.log(c.sage(line));
  }
}

// Re-export for convenience
export { c, stripAnsi, visLen };
