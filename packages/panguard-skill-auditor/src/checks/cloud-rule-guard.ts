/**
 * cloud-rule-guard.ts - Trust gate for community ("cloud") ATR rules before they
 * are injected into the audit engine.
 *
 * Cloud rules are network-delivered, community-authored detection logic. The
 * engine compiles their `detection` regex and runs it against the skill under
 * audit, so an unbounded or ReDoS-crafted rule is executable trust — a malicious
 * or malformed rule can hang the auditor or exhaust its resources. This module
 * mirrors the guard-daemon's GuardATREngine.validatePatterns() ReDoS gate and its
 * MAX_CLOUD_RULES capacity cap so the skill-auditor path shares the SAME trust
 * boundary as the daemon (see rule-loader.ts / atr-engine.ts in panguard-guard).
 *
 * Signature verification (Ed25519, fail-closed) is enforced upstream in the CLI
 * fetch loop before rules reach this module; this is the defense-in-depth layer
 * that protects any programmatic caller of checkWithATR() regardless of source.
 *
 * @module @panguard-ai/panguard-skill-auditor/checks/cloud-rule-guard
 */

/** Cap on how many cloud rules may be injected (mirrors daemon MAX_CLOUD_RULES). */
export const MAX_CLOUD_RULES = 500;

/** Longest single regex pattern we will compile (resource bound). */
const MAX_PATTERN_LEN = 2000;

/** Minimal shape of an injectable cloud rule (detection carries the patterns). */
export interface CloudRuleShape {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly detection?: unknown;
  readonly [key: string]: unknown;
}

/**
 * True when the token that begins at `src[i]` is followed by an UNBOUNDED
 * quantifier (`+`, `*`, or `{n,}` with no upper bound). Bounded quantifiers like
 * `{2,4}` cannot drive exponential backtracking, so they are treated as safe.
 */
function hasUnboundedQuantifierAt(src: string, i: number): boolean {
  const next = src[i];
  if (next === '+' || next === '*') return true;
  if (next === '{') return /^\{\d*,\}/.test(src.slice(i));
  return false;
}

/**
 * Scan the interior of a group for a quantified atom or a quantified inner
 * group — the ingredient that, when the whole group is itself quantified,
 * produces catastrophic backtracking (e.g. the inner `+` of `(([a-z])+)+`).
 * Character classes and escapes are skipped so their contents are not mistaken
 * for quantifiable structure.
 */
function interiorHasQuantifiedAtom(interior: string): boolean {
  for (let i = 0; i < interior.length; i++) {
    const c = interior[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '[') {
      i++;
      while (i < interior.length && interior[i] !== ']') {
        if (interior[i] === '\\') i++;
        i++;
      }
      if (hasUnboundedQuantifierAt(interior, i + 1)) return true;
      continue;
    }
    if (c === ')') {
      if (hasUnboundedQuantifierAt(interior, i + 1)) return true;
      continue;
    }
    if (c === '+' || c === '*') return true;
    if (c === '{' && /^\{\d*,\}/.test(interior.slice(i))) return true;
  }
  return false;
}

/**
 * Structurally detect catastrophic nested-quantifier regexes: any group `(...)`
 * that is itself quantified by an unbounded quantifier AND whose interior
 * contains a quantified atom or quantified subgroup. This is the `(a+)+` /
 * `(([a-z])+)+` / `((ab)*)*` / `(a*)*b` class. A flat `/\([^)]*[+*]\)[+*{]/`
 * heuristic cannot see an INNER quantified group (its `[^)]*` cannot cross a
 * nested `)`), so it accepted `(([a-z])+)+` despite clean exponential blowup.
 * Walks the source via a paren stack (honoring escapes + char classes) and
 * checks each quantified group's interior at any nesting depth. Mirrors the
 * guard daemon's GuardATREngine gate so both paths share the same trust bound.
 */
function hasNestedQuantifier(src: string): boolean {
  const openStack: number[] = [];
  const groups: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '[') {
      i++;
      while (i < src.length && src[i] !== ']') {
        if (src[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(') openStack.push(i);
    else if (c === ')') {
      const start = openStack.pop();
      if (start !== undefined) groups.push({ start, end: i });
    }
  }
  for (const g of groups) {
    if (!hasUnboundedQuantifierAt(src, g.end + 1)) continue;
    if (interiorHasQuantifiedAtom(src.slice(g.start + 1, g.end))) return true;
  }
  return false;
}

/**
 * ReDoS safety check for the cloud-rule compile gate. Detects
 * catastrophic-backtracking structures that compile fine but hang on
 * non-matching input: nested quantifiers at ANY depth (structural walk),
 * overlapping alternations like (a|a)+, and star-of-star like .*.*.*.
 * Kept in lockstep with panguard-guard's GuardATREngine.isSafeRegex.
 */
function isSafeRegex(re: RegExp): boolean {
  const src = re.source;
  if (hasNestedQuantifier(src)) return false;
  if (/\(([^|)]+)\|\1\)[+*]/.test(src)) return false;
  if (/(\.\*){3,}/.test(src)) return false;
  return true;
}

/** A single pattern is safe iff it is a bounded string, compiles, and is ReDoS-safe. */
function isPatternSafe(pattern: unknown): boolean {
  if (typeof pattern !== 'string') return false;
  if (pattern.length > MAX_PATTERN_LEN) return false;
  try {
    // Strip the (?i) inline flag (unsupported in JS) exactly like the compiler does.
    const hasInlineIgnoreCase = /\(\?i\)/.test(pattern);
    const cleaned = hasInlineIgnoreCase ? pattern.replace(/\(\?i\)/g, '') : pattern;
    const flags = hasInlineIgnoreCase ? 'i' : '';
    const re = new RegExp(cleaned, flags);
    return isSafeRegex(re);
  } catch {
    return false;
  }
}

/**
 * Validate every regex pattern in a cloud rule's detection block. Returns false
 * (reject the whole rule) on the first unsafe pattern. Covers both condition
 * shapes used by ATR rules:
 *   - array-format: detection.conditions[].value (operator regex)
 *   - named/grouped: detection.conditions[].patterns[] (string list)
 * A rule with no regex patterns is accepted (nothing unsafe to execute).
 */
export function isCloudRuleSafe(rule: CloudRuleShape): boolean {
  const detection = rule.detection;
  if (!detection || typeof detection !== 'object') return true;
  const conditions = (detection as { conditions?: unknown }).conditions;
  if (!Array.isArray(conditions)) return true;

  for (const cond of conditions) {
    if (!cond || typeof cond !== 'object') continue;

    const patterns = (cond as { patterns?: unknown }).patterns;
    if (Array.isArray(patterns)) {
      for (const p of patterns) {
        if (!isPatternSafe(p)) return false;
      }
    }

    const operator = (cond as { operator?: unknown }).operator;
    if (operator === 'regex') {
      const value = (cond as { value?: unknown }).value;
      if (!isPatternSafe(value)) return false;
    }
  }
  return true;
}

/**
 * Filter an incoming list of cloud rules down to those that are safe to inject:
 * enforce the capacity cap FIRST (truncate to MAX_CLOUD_RULES) and drop any rule
 * whose detection carries an unsafe/ReDoS/oversized pattern. Pure function —
 * returns a NEW array, never mutates the input.
 */
export function filterInjectableCloudRules<T extends CloudRuleShape>(rules: readonly T[]): T[] {
  return rules.slice(0, MAX_CLOUD_RULES).filter((r) => isCloudRuleSafe(r));
}
