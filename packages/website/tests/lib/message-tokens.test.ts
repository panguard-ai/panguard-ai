import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fillMessageTokens, MESSAGE_TOKENS } from '../../src/lib/message-tokens';
import { STATS } from '../../src/lib/stats';

const MESSAGES_DIR = join(__dirname, '..', '..', 'messages');

describe('fillMessageTokens', () => {
  it('fills known tokens from stats.ts', () => {
    expect(fillMessageTokens('%ATR_RULES% ATR rules')).toBe(`${STATS.totalRulesDisplay} ATR rules`);
    expect(fillMessageTokens('%ATR_PATTERNS% patterns')).toBe(
      `${STATS.atrPatterns.toLocaleString('en-US')} patterns`
    );
  });

  it('leaves unknown tokens, ICU arguments and percent signs alone', () => {
    expect(fillMessageTokens('%NOT_A_TOKEN% {count} at 92.3% recall')).toBe(
      '%NOT_A_TOKEN% {count} at 92.3% recall'
    );
  });

  it('walks nested objects and arrays without mutating the input', () => {
    const input = { a: ['%ATR_RULES%', { b: 'x %ATR_RULES% y' }], c: 3 };
    const snapshot = JSON.stringify(input);
    const output = fillMessageTokens(input);
    expect(output).toEqual({
      a: [STATS.totalRulesDisplay, { b: `x ${STATS.totalRulesDisplay} y` }],
      c: 3,
    });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it.each(['en', 'zh-TW'])('every token used in messages/%s.json is a known token', (locale) => {
    const raw = readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf8');
    const used = new Set(raw.match(/%[A-Z][A-Z_]*%/g) ?? []);
    expect(used.size).toBeGreaterThan(0);
    for (const token of used) {
      expect(Object.keys(MESSAGE_TOKENS)).toContain(token);
    }
  });
});
