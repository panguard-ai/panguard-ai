import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATS } from '../../src/lib/stats';
import { CORRECTIONS, correctionsFor } from '../../src/lib/withdrawn-figures';

/**
 * Guards the wild-scan caliber (ATR benchmark-reconcile, FROZEN): the only
 * citable figures are 101,280 scanned / 1,434 flagged with scan engine v2.0.0,
 * and no confirmed-malicious count is cited anywhere. Published blog posts keep
 * their original text and carry a dated correction instead, so they are exempt.
 */
const WEBSITE = join(__dirname, '..', '..');
const BANNED = [
  /96,096 (?:AI agent |real |MCP )?skills?\b/i,
  /\b(?:751|552|703) (?:confirmed|malicious|malware|個確認|確認)/i,
  /confirmed[ -]malicious (?:skills?|packages?)\b/i,
  /\b\d[\d,]* confirmed[ -]malic/i,
  /\bconfirmed malware\b/i,
  /確認惡意/,
  /1,302 (?:flagged|came back)/i,
  /\b(?:67,799|11,324)\b/,
  /\b747 (?:ATR |條 ?)?(?:detection )?(?:rules|規則)/i,
];

/** In the generated llms files the withdrawn counts may not appear at all, not even as a negation. */
const RESTATED = /\b(?:751|552|703|1,302)\b/;

function messageStrings(locale: string): Array<[string, string]> {
  const data = JSON.parse(readFileSync(join(WEBSITE, 'messages', `${locale}.json`), 'utf8'));
  const out: Array<[string, string]> = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string') out.push([path, node]);
    else if (Array.isArray(node)) node.forEach((item, i) => walk(item, `${path}.${i}`));
    else if (node && typeof node === 'object')
      for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
  };
  walk(data, '');
  return out;
}

describe('wild-scan caliber', () => {
  it('stats.ts carries only the citable wild-scan pair, with its scan engine', () => {
    expect(STATS.wildScan).toMatchObject({
      skillsScanned: 101_280,
      flagged: 1_434,
      engineVersion: 'v2.0.0',
      engineRules: 113,
    });
    expect(Object.keys(STATS.wildScan)).not.toContain('confirmedMalware');
    expect(Object.keys(STATS.ecosystem)).not.toContain('maliciousFound');
    expect(Object.keys(STATS.ecosystem)).not.toContain('blacklistedSkills');
  });

  it.each(['en', 'zh-TW'])(
    'messages/%s.json quotes no withdrawn figure outside blog posts',
    (locale) => {
      const patterns = [...BANNED, ...CORRECTIONS.map((correction) => correction.pattern)];
      const offending = messageStrings(locale)
        .filter(([path]) => !path.startsWith('blog.'))
        .filter(([, text]) => patterns.some((pattern) => pattern.test(text)))
        .map(([path, text]) => `${path}: ${text.slice(0, 100)}`);
      expect(offending).toEqual([]);
    }
  );

  it('llms.txt quotes no withdrawn figure', () => {
    const text = readFileSync(join(WEBSITE, 'public', 'llms.txt'), 'utf8');
    const patterns = [...BANNED, RESTATED];
    expect(patterns.filter((pattern) => pattern.test(text)).map(String)).toEqual([]);
  });

  it('llms-full.txt quotes no withdrawn figure before the blog section', () => {
    const text = readFileSync(join(WEBSITE, 'public', 'llms-full.txt'), 'utf8');
    const blogStart = text.indexOf('## Section 7');
    expect(blogStart).toBeGreaterThan(0);
    const head = text.slice(0, blogStart);
    const patterns = [...BANNED, RESTATED];
    expect(patterns.filter((pattern) => pattern.test(head)).map(String)).toEqual([]);
  });
});

describe('correctionsFor', () => {
  it('flags a post that quotes the old wild-scan figures', () => {
    const ids = correctionsFor(['We scanned 96,096 AI agent skills. 751 were malicious.']).map(
      (c) => c.id
    );
    expect(ids).toEqual(['wild-scan']);
  });

  it('flags withdrawn benchmark figures separately', () => {
    expect(correctionsFor(['97% precision, 0.2% FP']).map((c) => c.id)).toEqual(['benchmarks']);
  });

  it('returns nothing for a post without withdrawn figures', () => {
    expect(correctionsFor(['ATR is an open standard.'])).toEqual([]);
  });

  it('states the citable wild-scan pair in its correction', () => {
    const wild = CORRECTIONS.find((c) => c.id === 'wild-scan');
    expect(wild?.en).toContain('101,280');
    expect(wild?.en).toContain('1,434');
    expect(wild?.zh).toContain('v2.0.0');
  });
});
