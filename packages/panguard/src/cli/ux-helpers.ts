/**
 * Shared UX utilities for Panguard CLI interactive mode.
 *
 * Provides breadcrumbs, next-step suggestions, destructive confirmations,
 * and dynamic module count display.
 *
 * @module @panguard-ai/panguard/cli/ux-helpers
 */

import { c, box } from '@panguard-ai/core';
import { waitForKey } from './menu.js';
import type { Lang } from './menu.js';
import { getLicense, checkFeatureAccess } from './auth-guard.js';

/** All features that count towards the module total */
const ALL_MODULES = ['scan', 'guard', 'threat-cloud', 'notify', 'trap', 'report'] as const;

/**
 * Render a breadcrumb trail: `Panguard > Security Scan > Quick Scan`
 */
export function breadcrumb(segments: string[]): void {
  const trail = segments.map((s, i) => (i === 0 ? c.sage(s) : c.dim(s))).join(c.dim(' > '));
  console.log(`  ${trail}`);
  console.log('');
}

/**
 * Render a "Next steps" suggestion block after completing an action.
 */
export function nextSteps(steps: { cmd: string; desc: string }[], lang: Lang): void {
  const title = lang === 'zh-TW' ? '\u4E0B\u4E00\u6B65' : 'Next steps';
  const lines = steps.map((s) => `${c.sage('\u2192')} ${c.sage(s.cmd)}  ${c.dim(s.desc)}`);
  console.log('');
  console.log(box([c.dim(title), ...lines].join('\n'), { borderColor: c.sage }));
}

/**
 * Prompt user to confirm a destructive action (e.g. stopping Guard).
 * Returns true if user confirms, false otherwise.
 */
export async function confirmDestructive(message: string, lang: Lang): Promise<boolean> {
  const hint = lang === 'zh-TW' ? '(y/N)' : '(y/N)';
  process.stdout.write(`  ${c.caution(message)} ${c.dim(hint)} `);
  const key = await waitForKey();
  console.log('');
  return key === 'y';
}

/**
 * Display unlocked module count: `3/6 unlocked`
 */
export function moduleCountDisplay(lang: Lang): string {
  const { tier } = getLicense();
  // Count how many of the 6 modules are accessible at the current tier
  let unlocked = 0;
  for (const mod of ALL_MODULES) {
    if (checkFeatureAccess(mod)) unlocked++;
  }
  const total = ALL_MODULES.length;

  if (tier === 'free' || tier === 'community') {
    return lang === 'zh-TW'
      ? `${unlocked}/${total} \u5DF2\u89E3\u9396`
      : `${unlocked}/${total} unlocked`;
  }
  return lang === 'zh-TW'
    ? `${unlocked}/${total} \u5DF2\u89E3\u9396`
    : `${unlocked}/${total} unlocked`;
}
