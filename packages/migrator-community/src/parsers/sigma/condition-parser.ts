/**
 * Parse a Sigma `condition:` expression into a kernel form.
 *
 * W1 supports exactly 3 shapes:
 *   1. `selection`              → single named selection, AND-implied (combinator='all')
 *   2. `all of selection*`      → AND across all selection-prefixed names (combinator='all')
 *   3. `1 of selection*`        → OR across all selection-prefixed names (combinator='any')
 *
 * Anything else → returns null + reason. Caller skips the rule with a warning.
 *
 * Why so narrow: ~60% of public SigmaHQ rules use exactly these 3 shapes.
 * Wider DSL (negation, parentheses, named groups, count(), pipe) is W2.
 */

import type { IRCombinator } from '../../ir/types.js';

export interface ParsedCondition {
  /** The set of selection keys (in detection block) that participate in matching. */
  readonly selectionKeys: readonly string[];
  readonly combinator: IRCombinator;
}

/**
 * Sigma `detection:` keys that are NOT selection blocks.
 * - `condition`: the boolean expression (always reserved)
 * - `timeframe`: temporal correlation window
 * - `fields`: list of fields to display in alert (presentation hint, not a selector)
 * - `keywords`: full-text search block (Sigma spec 2.3.1) — not a selection-shaped object
 */
const KEYWORDS_RESERVED = new Set(['condition', 'timeframe', 'fields', 'keywords']);

const RE_ALL_OF_GLOB = /^all\s+of\s+([a-zA-Z_][a-zA-Z0-9_]*)\*$/;
const RE_ONE_OF_GLOB = /^1\s+of\s+([a-zA-Z_][a-zA-Z0-9_]*)\*$/;
const RE_SINGLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function parseCondition(
  condition: string,
  detectionKeys: readonly string[]
): { result: ParsedCondition | null; reason: string | null } {
  const trimmed = condition.trim();

  if (RE_SINGLE_NAME.test(trimmed) && !KEYWORDS_RESERVED.has(trimmed)) {
    if (!detectionKeys.includes(trimmed)) {
      return { result: null, reason: `condition '${trimmed}' references unknown selection` };
    }
    return {
      result: { selectionKeys: [trimmed], combinator: 'all' },
      reason: null,
    };
  }

  const allMatch = RE_ALL_OF_GLOB.exec(trimmed);
  if (allMatch) {
    const prefix = allMatch[1];
    if (prefix === undefined) {
      return { result: null, reason: 'malformed all-of glob' };
    }
    const matches = detectionKeys.filter(
      (k) => k.startsWith(prefix) && !KEYWORDS_RESERVED.has(k)
    );
    if (matches.length === 0) {
      return {
        result: null,
        reason: `condition 'all of ${prefix}*' matches no selections`,
      };
    }
    return { result: { selectionKeys: matches, combinator: 'all' }, reason: null };
  }

  const oneMatch = RE_ONE_OF_GLOB.exec(trimmed);
  if (oneMatch) {
    const prefix = oneMatch[1];
    if (prefix === undefined) {
      return { result: null, reason: 'malformed 1-of glob' };
    }
    const matches = detectionKeys.filter(
      (k) => k.startsWith(prefix) && !KEYWORDS_RESERVED.has(k)
    );
    if (matches.length === 0) {
      return {
        result: null,
        reason: `condition '1 of ${prefix}*' matches no selections`,
      };
    }
    return { result: { selectionKeys: matches, combinator: 'any' }, reason: null };
  }

  return {
    result: null,
    reason: `unsupported condition shape: '${trimmed}' (W1 supports: 'selection', 'all of X*', '1 of X*')`,
  };
}
