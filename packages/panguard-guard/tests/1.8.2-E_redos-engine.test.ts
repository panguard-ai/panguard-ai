/**
 * 1.8.2 audit — finding E (ReDoS compile-gate) regression suite.
 *
 * The cloud-rule ReDoS gate (`GuardATREngine.validatePatterns` -> `isSafeRegex`)
 * previously used the heuristic `/\([^)]*[+*]\)[+*{]/` to spot nested
 * quantifiers. Because `[^)]*` cannot cross a nested `)`, it only saw a
 * quantified group when a quantifier sat immediately after the group's OWN
 * closing paren. Patterns whose exponential blowup comes from an INNER
 * quantified group — `(([a-z])+)+`, `((ab)*)*` — sailed through and could be
 * loaded from Threat Cloud, then hang the live detection path on adversarial
 * input.
 *
 * These tests pin the security property: isSafeRegex MUST reject the whole
 * catastrophic-backtracking class (including inner-group nesting) while still
 * accepting the benign patterns real rules use. A timing check independently
 * proves the rejected shapes are genuinely exponential and the accepted
 * shapes are linear, so the gate can never silently regress into letting a
 * hang-inducing pattern through.
 */

import { describe, it, expect } from 'vitest';
import { isSafeRegex } from '../src/engines/atr-engine.js';

/** Wall-clock ms to run `re` against a worst-case non-matching input. */
function matchMs(source: string, input: string): number {
  const re = new RegExp(source);
  const start = performance.now();
  re.test(input);
  return performance.now() - start;
}

/**
 * Best-of-`runs` wall-clock ms. The catastrophic-backtracking signal lives in the
 * fastest run (pure compute, no preemption); OS scheduling jitter only ever ADDS
 * time. Taking the minimum strips that additive noise so a ratio comparison
 * reflects true exponential growth, not a context switch — the fix for this test
 * flaking under a loaded CI/dev machine where a near-constant per-call overhead
 * compressed the short-vs-long ratio.
 */
function minMatchMs(source: string, input: string, runs = 5): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    best = Math.min(best, matchMs(source, input));
  }
  return best;
}

describe('isSafeRegex — catastrophic nested-quantifier ReDoS gate', () => {
  // The exact patterns the audit finding proved catastrophic + accepted by the
  // old gate. These are the must-not-recur cases.
  const REGRESSION_REJECTS = ['(([a-z])+)+$', '((ab)*)*$'];

  it.each(REGRESSION_REJECTS)('rejects audit regression pattern %s', (src) => {
    expect(isSafeRegex(new RegExp(src))).toBe(false);
  });

  // Broader catastrophic-backtracking corpus, including inner-group nesting at
  // depth, quantified atoms inside a quantified group, and {n,} unbounded.
  const CATASTROPHIC = [
    '(a+)+',
    '(a*)*b',
    '([a-z]+)*',
    '(\\d+)+$',
    '(\\w*)*',
    '((a|b)+)+',
    '(a{1,})+',
    '(([0-9]+))+',
    '(x+x+)+y',
    '((\\d)+)+$',
  ];

  it.each(CATASTROPHIC)('rejects catastrophic pattern %s', (src) => {
    expect(isSafeRegex(new RegExp(src))).toBe(false);
  });

  // Overlapping-alternation and star-of-star classes must stay rejected — the
  // fix replaced only the nested-quantifier heuristic, not these layers.
  it('still rejects overlapping alternation (a|a)+', () => {
    expect(isSafeRegex(/(a|a)+/)).toBe(false);
  });

  it('still rejects star-of-star .*.*.*', () => {
    expect(isSafeRegex(/.*.*.*/)).toBe(false);
  });

  // Benign patterns real ATR rules use — must NOT be rejected, or the gate
  // would silently drop legitimate cloud rules (fail-open on coverage).
  const BENIGN = [
    'foo(bar)+baz',
    '(abc)+',
    'a{1,5}',
    'plain-substring',
    '(a|b|c)',
    '\\(a+\\)+', // escaped parens: literal text, not a group
    '(ab){2,4}', // bounded quantifier on a group is not catastrophic
    '(abc)+def',
    '([a-z])+', // single quantified group, no inner quantifier
    'foo\\+bar',
    '(a)(b)(c)+',
    'a+b+c+', // sequential quantified atoms, not nested
    'ignore\\s+previous\\s+instructions',
  ];

  it.each(BENIGN)('accepts benign pattern %s', (src) => {
    expect(isSafeRegex(new RegExp(src))).toBe(true);
  });
});

describe('isSafeRegex — timing proof the gate targets real blowup', () => {
  // Independent evidence: the rejected inner-group pattern IS exponential, and
  // a structurally similar ACCEPTED pattern is linear. This guards against a
  // future refactor that makes isSafeRegex pass the catastrophic pattern
  // (the test would still catch the hang) or needlessly reject the linear one.
  it('rejected (([a-z])+)+$ is exponential on adversarial input', () => {
    const src = '(([a-z])+)+$';
    expect(isSafeRegex(new RegExp(src))).toBe(false);
    // Small n kept intentionally low so the runner never hangs: even here the
    // blowup is stark. A non-[a-z] terminator forces maximal backtracking.
    // Each +4 filler chars roughly quadruples the time (exponential doubling).
    const tShort = minMatchMs(src, 'a'.repeat(16) + '!');
    const tLong = minMatchMs(src, 'a'.repeat(22) + '!');
    // Assert clear super-linear growth so the pattern is demonstrably worth
    // gating, with a floor on the long run so the ratio is not measuring noise.
    expect(tLong).toBeGreaterThan(1);
    expect(tLong).toBeGreaterThan(tShort * 3);
  }, 10000);

  it('accepted ([a-z])+$ stays linear on the same adversarial input', () => {
    const src = '([a-z])+$';
    expect(isSafeRegex(new RegExp(src))).toBe(true);
    const evil = 'a'.repeat(200) + '!';
    // A safe pattern must complete near-instantly even on long input.
    expect(matchMs(src, evil)).toBeLessThan(50);
  });
});
