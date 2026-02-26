/**
 * Terminal menu system for Panguard AI interactive mode.
 * Uses Node.js raw mode stdin for single-key input.
 * Brand-styled with Sage Green theme.
 *
 * @module @openclaw/panguard/cli/menu
 */

import { c, symbols, stripAnsi } from '@openclaw/core';

type Lang = 'en' | 'zh-TW';

export interface MenuItem {
  key: string;
  icon?: string;
  label: Record<Lang, string>;
  description: Record<Lang, string>;
}

// ── Box-drawing characters ─────────────────────────────────────────────

const LINE_H = '\u2500'; // ─
const LINE_V = '\u2502'; // │
const CORNER_TL = '\u256D'; // ╭
const CORNER_TR = '\u256E'; // ╮
const CORNER_BL = '\u2570'; // ╰
const CORNER_BR = '\u256F'; // ╯

function hLine(n: number): string {
  return LINE_H.repeat(n);
}

/**
 * Pad a string (accounting for ANSI + CJK width) to fill `width` visible columns.
 */
function visLen(s: string): number {
  const plain = stripAnsi(s);
  let len = 0;
  for (const ch of plain) {
    const code = ch.codePointAt(0) ?? 0;
    // CJK Unified Ideographs, CJK Symbols, Fullwidth Forms, etc.
    if (
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE4F) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FA1F) ||
      (code >= 0x3000 && code <= 0x303F) ||
      (code >= 0x3040 && code <= 0x30FF)
    ) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

function padRight(s: string, width: number): string {
  const vl = visLen(s);
  const pad = Math.max(0, width - vl);
  return s + ' '.repeat(pad);
}

// ── Menu rendering ─────────────────────────────────────────────────────

const INNER_W = 56;

/**
 * Render a styled menu with rounded box-drawing borders.
 */
export function renderMenu(title: Record<Lang, string>, items: MenuItem[], lang: Lang): void {
  const titleText = lang === 'zh-TW'
    ? `${title['zh-TW']} / ${title.en}`
    : `${title.en} / ${title['zh-TW']}`;

  // Top border with title
  const titleVis = visLen(titleText) + 2; // +2 for spaces around title
  const remaining = Math.max(0, INNER_W - titleVis - 2);
  const left = Math.floor(remaining / 2) + 1;
  const right = remaining - left + 1 + 1;

  console.log(`  ${c.sage(CORNER_TL + hLine(left))} ${c.bold(titleText)} ${c.sage(hLine(right) + CORNER_TR)}`);
  console.log(`  ${c.sage(LINE_V)}${padRight('', INNER_W)}${c.sage(LINE_V)}`);

  for (const item of items) {
    const icon = item.icon ?? symbols.bullet;
    const label = item.label[lang];
    const altLabel = item.label[lang === 'zh-TW' ? 'en' : 'zh-TW'];
    const desc = item.description[lang];

    // Line 1: icon [key]  Label  AltLabel
    const raw1 = `  ${icon} ${c.sage(`[${item.key}]`)}  ${c.bold(label)}  ${c.dim(altLabel)}`;
    console.log(`  ${c.sage(LINE_V)}${padRight(raw1, INNER_W)}${c.sage(LINE_V)}`);

    // Line 2: description
    if (desc) {
      const raw2 = `        ${c.dim(desc)}`;
      console.log(`  ${c.sage(LINE_V)}${padRight(raw2, INNER_W)}${c.sage(LINE_V)}`);
    }

    // Spacer
    console.log(`  ${c.sage(LINE_V)}${padRight('', INNER_W)}${c.sage(LINE_V)}`);
  }

  // Bottom border
  console.log(`  ${c.sage(CORNER_BL + hLine(INNER_W) + CORNER_BR)}`);
  console.log('');
}

/**
 * Render a compact inline submenu.
 */
export function renderCompactMenu(title: Record<Lang, string>, items: MenuItem[], lang: Lang): void {
  const titleText = lang === 'zh-TW'
    ? `${title['zh-TW']} / ${title.en}`
    : `${title.en} / ${title['zh-TW']}`;

  console.log(`  ${c.sage(hLine(3))} ${c.bold(titleText)} ${c.sage(hLine(3))}`);
  console.log('');

  for (const item of items) {
    const label = item.label[lang];
    const altLabel = item.label[lang === 'zh-TW' ? 'en' : 'zh-TW'];
    const desc = item.description[lang];

    console.log(`    ${c.sage(`[${item.key}]`)}  ${c.bold(label)}  ${c.dim(altLabel)}`);
    if (desc) {
      console.log(`          ${c.dim(desc)}`);
    }
  }
  console.log('');
}

// ── Input handling ─────────────────────────────────────────────────────

/**
 * Wait for a single keypress in raw mode.
 */
export function waitForKey(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding('utf-8');

    const onData = (data: string) => {
      stdin.removeListener('data', onData);
      if (stdin.isTTY) {
        stdin.setRawMode(wasRaw ?? false);
      }
      stdin.pause();

      if (data === '\x03') { resolve('ctrl-c'); return; }
      if (data === '\r' || data === '\n') { resolve('enter'); return; }
      if (data === '\x1b' && data.length === 1) { resolve('escape'); return; }

      resolve(data.trim().toLowerCase());
    };

    stdin.on('data', onData);
  });
}

/**
 * Show footer controls and wait for user to select a menu item.
 * Returns the selected MenuItem, or null for quit/back.
 */
export async function waitForChoice(
  items: MenuItem[],
  opts: {
    quitLabel?: Record<Lang, string>;
    backLabel?: Record<Lang, string>;
    lang: Lang;
  },
): Promise<MenuItem | null> {
  const validKeys = new Set(items.map(i => i.key));

  // Footer
  const parts: string[] = [];
  if (opts.backLabel) {
    parts.push(`${c.dim('[b]')} ${opts.backLabel[opts.lang]}`);
  }
  if (opts.quitLabel) {
    parts.push(`${c.dim('[q]')} ${opts.quitLabel[opts.lang]}`);
  }
  parts.push(`${c.dim('[h]')} ${opts.lang === 'zh-TW' ? '\u8AAC\u660E' : 'Help'}`);
  parts.push(`${c.dim('[l]')} ${opts.lang === 'zh-TW' ? '\u4E2D/EN' : 'EN/\u4E2D'}`);

  console.log(`  ${parts.join('   ')}`);
  console.log('');
  process.stdout.write(`  ${c.sage('panguard')} ${c.dim('\u203A')} `);

  while (true) {
    const key = await waitForKey();

    if (key === 'q' || key === 'ctrl-c') {
      console.log('');
      return null;
    }
    if (key === 'b' && opts.backLabel) {
      console.log('');
      return null;
    }
    if (key === 'l') {
      console.log('');
      return { key: '__lang__', label: { en: '', 'zh-TW': '' }, description: { en: '', 'zh-TW': '' } };
    }
    if (key === 'h') {
      console.log('');
      return { key: '__help__', label: { en: '', 'zh-TW': '' }, description: { en: '', 'zh-TW': '' } };
    }

    if (validKeys.has(key)) {
      console.log('');
      const item = items.find(i => i.key === key);
      return item ?? null;
    }
  }
}

/**
 * "Press any key to continue..."
 */
export async function pressAnyKey(lang: Lang): Promise<void> {
  const msg = lang === 'zh-TW' ? '\u6309\u4EFB\u610F\u9375\u7E7C\u7E8C...' : 'Press any key to continue...';
  console.log('');
  process.stdout.write(`  ${c.dim(msg)} `);
  await waitForKey();
  console.log('');
}

/**
 * Help panel with rounded borders.
 */
export function showHelp(lang: Lang): void {
  const W = 44;
  const helpTitle = lang === 'zh-TW' ? '\u5FEB\u6377\u9375 / Keyboard Shortcuts' : 'Keyboard Shortcuts';

  console.log('');
  const tVis = visLen(helpTitle) + 2;
  const tRem = Math.max(0, W - tVis - 2);
  const tL = Math.floor(tRem / 2) + 1;
  const tR = tRem - tL + 1 + 1;

  console.log(`  ${c.sage(CORNER_TL + hLine(tL))} ${c.bold(helpTitle)} ${c.sage(hLine(tR) + CORNER_TR)}`);

  const lines: Array<[string, string]> = lang === 'zh-TW' ? [
    ['1-7', '\u9078\u64C7\u529F\u80FD\u6A21\u7D44'],
    ['b', '\u8FD4\u56DE\u4E0A\u4E00\u5C64'],
    ['q', '\u9000\u51FA\u7A0B\u5F0F'],
    ['l', '\u5207\u63DB\u8A9E\u8A00 (\u4E2D/\u82F1)'],
    ['h', '\u986F\u793A\u6B64\u8AAC\u660E'],
    ['Ctrl+C', '\u5F37\u5236\u9000\u51FA'],
  ] : [
    ['1-7', 'Select a module'],
    ['b', 'Go back'],
    ['q', 'Quit'],
    ['l', 'Toggle language (EN/ZH)'],
    ['h', 'Show this help'],
    ['Ctrl+C', 'Force quit'],
  ];

  for (const [key, desc] of lines) {
    const line = `  ${c.sage(key.padEnd(8))} ${desc}`;
    console.log(`  ${c.sage(LINE_V)}${padRight(line, W)}${c.sage(LINE_V)}`);
  }

  console.log(`  ${c.sage(CORNER_BL + hLine(W) + CORNER_BR)}`);
  console.log('');
}

/**
 * System status dashboard box.
 */
export function renderStatusBox(
  items: Array<{ label: string; value: string; color?: (s: string) => string }>,
  _lang: Lang,
): void {
  const W = 48;
  const title = _lang === 'zh-TW' ? '\u7CFB\u7D71\u72C0\u614B / System Status' : 'System Status';

  const tVis = visLen(title) + 2;
  const tRem = Math.max(0, W - tVis - 2);
  const tL = Math.floor(tRem / 2) + 1;
  const tR = tRem - tL + 1 + 1;

  console.log(`  ${c.sage(CORNER_TL + hLine(tL))} ${c.sage(title)} ${c.sage(hLine(tR) + CORNER_TR)}`);

  for (const item of items) {
    const val = item.color ? item.color(item.value) : item.value;
    const line = `  ${c.dim(item.label + ':')}  ${val}`;
    console.log(`  ${c.sage(LINE_V)}${padRight(line, W)}${c.sage(LINE_V)}`);
  }

  console.log(`  ${c.sage(CORNER_BL + hLine(W) + CORNER_BR)}`);
}

/**
 * Cleanup terminal state on exit.
 */
export function cleanupTerminal(): void {
  if (process.stdin.isTTY && process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  process.stdout.write('\x1b[?25h');
}
