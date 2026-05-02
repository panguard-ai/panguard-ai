/**
 * MigratorIR — internal intermediate representation.
 *
 * Parsers (Sigma, YARA) produce IR. Transformers consume IR and emit ATR YAML.
 * IR is intentionally smaller than the union of all source formats — we lose
 * fidelity on purpose so the transformer has fewer cases to handle.
 *
 * Invariant: IR is plain data, immutable in spirit (use builder.ts to construct).
 */

export type IRSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type IRSource = 'sigma' | 'yara';

export type IRPatternOperator =
  | 'equals'
  | 'contains'
  | 'startswith'
  | 'endswith'
  | 'regex';

/**
 * 'named':   field-addressed lookup — Sigma's CommandLine|contains, Image|endswith, etc.
 *            Transformer maps to a specific ATR detection.conditions.<field> key.
 * 'content': full body / opaque text scan — YARA strings, regex over raw content.
 *            Transformer maps to a generic content-pattern key.
 *
 * Required so IR consumers don't have to inspect IRSource to disambiguate, which
 * would couple the transformer to source-format details and defeat the IR.
 */
export type IRFieldKind = 'named' | 'content';

export interface IRPattern {
  readonly fieldKind: IRFieldKind;
  /** Field name when fieldKind='named'. Free-form label (often unused) when 'content'. */
  readonly field: string;
  readonly operator: IRPatternOperator;
  /** Single string for direct match, array for OR-of-patterns. */
  readonly value: string | readonly string[];
  readonly caseInsensitive?: boolean;
}

export interface IRSelection {
  readonly name: string;
  readonly patterns: readonly IRPattern[];
  /** Selectors inside a single named selection are AND'd together. */
}

export type IRCombinator = 'all' | 'any';

/** Source-rule maturity, mapped to ATR's `maturity:` field. */
export type IRMaturity = 'experimental' | 'test' | 'stable' | 'deprecated';

export interface MigratorIR {
  readonly source: IRSource;
  readonly sourceId: string;
  readonly title: string;
  readonly description: string;
  readonly author: string;
  /** YYYY/MM/DD format (matches ATR convention). */
  readonly date: string;
  readonly severity: IRSeverity;
  /** Mapped from Sigma `status:`. Drives ATR `maturity:` and `status:`. */
  readonly maturity: IRMaturity;
  readonly selections: readonly IRSelection[];
  /** How named selections combine. W1 supports 'all of selection*' and 'selection' (single). */
  readonly combinator: IRCombinator;
  readonly references: readonly string[];
  readonly tags: readonly string[];
  /** Human-readable warnings produced during parse/transform — surface in output as comments. */
  readonly warnings: readonly string[];
}
