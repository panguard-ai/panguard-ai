/**
 * Sigma rule shape — the subset W1 supports.
 * Reference: https://github.com/SigmaHQ/sigma-specification
 *
 * NOTE: the full Sigma spec is far richer (correlation rules, taxonomy modifiers,
 * wildcards, regex, etc). W1 supports the simple-selection 60% of public rules.
 * Anything we don't handle should produce a warning + skip — never silently miscompile.
 */

export type SigmaLevel = 'low' | 'medium' | 'high' | 'critical' | 'informational';

export type SigmaStatus = 'stable' | 'test' | 'experimental' | 'deprecated' | 'unsupported';

export interface SigmaLogsource {
  category?: string;
  product?: string;
  service?: string;
  definition?: string;
}

/**
 * A single selection block — `{key|modifier: value | [values]}`.
 * Keys can carry pipe modifiers e.g. `CommandLine|contains`, `Image|endswith|all`.
 * W1 supports: `contains`, `startswith`, `endswith`, `re` (regex), no modifier (=equals).
 * Values can be a string or list of strings (interpreted as OR).
 */
export type SigmaSelectionBlock = Record<string, string | number | boolean | (string | number)[]>;

export interface SigmaDetection {
  /** Named selection blocks. Keys other than `condition`/`timeframe`/`fields`. */
  [key: string]: SigmaSelectionBlock | string | undefined;
  /** Boolean expression over selection names. e.g. `selection`, `1 of selection*`, `all of selection*`. */
  condition?: string;
  timeframe?: string;
}

export interface SigmaRule {
  title: string;
  id?: string;
  status?: SigmaStatus;
  description?: string;
  references?: string[];
  author?: string;
  date?: string;
  modified?: string;
  logsource: SigmaLogsource;
  detection: SigmaDetection;
  fields?: string[];
  falsepositives?: string[] | string;
  level?: SigmaLevel;
  tags?: string[];
}

export interface SigmaParseResult {
  /** null if the rule was skipped (unsupported feature); reason in `warnings`. */
  readonly ir: import('../../ir/types.js').MigratorIR | null;
  readonly warnings: readonly string[];
}
