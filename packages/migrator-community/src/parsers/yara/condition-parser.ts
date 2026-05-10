/**
 * Parse YARA condition expression to MigratorIR combinator + selection set.
 *
 * Supported shapes (W2):
 *   - `any of them`              → all $strings, combinator='any'
 *   - `all of them`              → all $strings, combinator='all'
 *   - `any of ($prefix*)`        → globbed $strings, combinator='any'
 *   - `all of ($prefix*)`        → globbed $strings, combinator='all'
 *   - `$name`                    → single string, combinator='all'
 *   - `$a and $b [and $c ...]`   → multiple strings, combinator='all'
 *   - `$a or $b [or $c ...]`     → multiple strings, combinator='any'
 *
 * Anything else returns null + reason. No mixed and/or, no parentheses
 * (besides the `any/all of (...)` glob form), no `not`, no count expressions,
 * no offset comparisons. Rules with these are skipped during pick-yara.
 */

import type { IRCombinator } from '../../ir/types.js';

export interface ParsedYaraCondition {
  readonly stringNames: readonly string[]; // matched string identifiers (e.g. ['$a', '$b'])
  readonly combinator: IRCombinator;
}

const RE_ANY_OF_THEM = /^any\s+of\s+them$/;
const RE_ALL_OF_THEM = /^all\s+of\s+them$/;
const RE_ANY_OF_GLOB = /^any\s+of\s+\(\s*\$([A-Za-z_][A-Za-z0-9_]*)\*\s*\)$/;
const RE_ALL_OF_GLOB = /^all\s+of\s+\(\s*\$([A-Za-z_][A-Za-z0-9_]*)\*\s*\)$/;
const RE_ANY_OF_LIST =
  /^any\s+of\s+\(\s*((?:\$[A-Za-z_][A-Za-z0-9_]*\s*,\s*)*\$[A-Za-z_][A-Za-z0-9_]*)\s*\)$/;
const RE_ALL_OF_LIST =
  /^all\s+of\s+\(\s*((?:\$[A-Za-z_][A-Za-z0-9_]*\s*,\s*)*\$[A-Za-z_][A-Za-z0-9_]*)\s*\)$/;
const RE_N_OF_THEM = /^(\d+)\s+of\s+them$/;
const RE_SINGLE_REF = /^\$([A-Za-z_][A-Za-z0-9_]*)$/;
const RE_AND_CHAIN = /^(\$[A-Za-z_][A-Za-z0-9_]*\s+and\s+)+\$[A-Za-z_][A-Za-z0-9_]*$/;
const RE_OR_CHAIN = /^(\$[A-Za-z_][A-Za-z0-9_]*\s+or\s+)+\$[A-Za-z_][A-Za-z0-9_]*$/;

export function parseYaraCondition(
  condition: string,
  availableStringNames: readonly string[]
): { result: ParsedYaraCondition | null; reason: string | null } {
  const trimmed = condition.trim();
  if (trimmed === '') {
    return { result: null, reason: 'empty condition' };
  }

  if (RE_ANY_OF_THEM.test(trimmed)) {
    if (availableStringNames.length === 0) {
      return { result: null, reason: '"any of them" with no strings defined' };
    }
    return {
      result: { stringNames: availableStringNames, combinator: 'any' },
      reason: null,
    };
  }

  if (RE_ALL_OF_THEM.test(trimmed)) {
    if (availableStringNames.length === 0) {
      return { result: null, reason: '"all of them" with no strings defined' };
    }
    return {
      result: { stringNames: availableStringNames, combinator: 'all' },
      reason: null,
    };
  }

  // N of them — common in YARA. Semantic precision loss when N != 1 and
  // N != all: ATR's flat conditions[] can't express "exactly N must match".
  // We map to 'any' (over-permissive — fires on 1 match) and the conversion
  // notes this in the warnings/audit trail. Acceptable for migration since
  // the W2 product target is recall preservation; rule tuning in W2+
  // post-deployment.
  const nOfThem = RE_N_OF_THEM.exec(trimmed);
  if (nOfThem) {
    const n = parseInt(nOfThem[1] ?? '0', 10);
    if (availableStringNames.length === 0) {
      return { result: null, reason: '"N of them" with no strings defined' };
    }
    if (n <= 0 || n > availableStringNames.length) {
      return {
        result: null,
        reason: `"${n} of them" exceeds the ${availableStringNames.length} defined strings`,
      };
    }
    if (n === availableStringNames.length) {
      return { result: { stringNames: availableStringNames, combinator: 'all' }, reason: null };
    }
    if (n === 1) {
      return { result: { stringNames: availableStringNames, combinator: 'any' }, reason: null };
    }
    // 1 < N < count: semantic-loss case. Map to 'any' over-permissively.
    return {
      result: { stringNames: availableStringNames, combinator: 'any' },
      reason: null,
    };
  }

  const anyList = RE_ANY_OF_LIST.exec(trimmed);
  if (anyList) {
    const names = (anyList[1] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const n of names) {
      if (!availableStringNames.includes(n)) {
        return { result: null, reason: `condition references unknown string '${n}'` };
      }
    }
    return { result: { stringNames: names, combinator: 'any' }, reason: null };
  }

  const allList = RE_ALL_OF_LIST.exec(trimmed);
  if (allList) {
    const names = (allList[1] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const n of names) {
      if (!availableStringNames.includes(n)) {
        return { result: null, reason: `condition references unknown string '${n}'` };
      }
    }
    return { result: { stringNames: names, combinator: 'all' }, reason: null };
  }

  const anyGlob = RE_ANY_OF_GLOB.exec(trimmed);
  if (anyGlob) {
    const prefix = `$${anyGlob[1]}`;
    const matched = availableStringNames.filter((n) => n.startsWith(prefix));
    if (matched.length === 0) {
      return { result: null, reason: `condition '${trimmed}' matches no strings` };
    }
    return { result: { stringNames: matched, combinator: 'any' }, reason: null };
  }

  const allGlob = RE_ALL_OF_GLOB.exec(trimmed);
  if (allGlob) {
    const prefix = `$${allGlob[1]}`;
    const matched = availableStringNames.filter((n) => n.startsWith(prefix));
    if (matched.length === 0) {
      return { result: null, reason: `condition '${trimmed}' matches no strings` };
    }
    return { result: { stringNames: matched, combinator: 'all' }, reason: null };
  }

  if (RE_SINGLE_REF.test(trimmed)) {
    if (!availableStringNames.includes(trimmed)) {
      return { result: null, reason: `condition references unknown string '${trimmed}'` };
    }
    return { result: { stringNames: [trimmed], combinator: 'all' }, reason: null };
  }

  if (RE_AND_CHAIN.test(trimmed)) {
    const parts = trimmed.split(/\s+and\s+/).map((s) => s.trim());
    for (const p of parts) {
      if (!availableStringNames.includes(p)) {
        return { result: null, reason: `condition references unknown string '${p}'` };
      }
    }
    return { result: { stringNames: parts, combinator: 'all' }, reason: null };
  }

  if (RE_OR_CHAIN.test(trimmed)) {
    const parts = trimmed.split(/\s+or\s+/).map((s) => s.trim());
    for (const p of parts) {
      if (!availableStringNames.includes(p)) {
        return { result: null, reason: `condition references unknown string '${p}'` };
      }
    }
    return { result: { stringNames: parts, combinator: 'any' }, reason: null };
  }

  return {
    result: null,
    reason:
      `unsupported condition shape: '${trimmed}'. W2 supports: 'any of them', ` +
      "'all of them', 'any/all of (\\$prefix*)', '\\$name', '\\$a and \\$b', '\\$a or \\$b'",
  };
}
