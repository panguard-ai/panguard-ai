import type {
  IRCombinator,
  IRFieldKind,
  IRMaturity,
  IRPattern,
  IRSelection,
  IRSeverity,
  IRSource,
  MigratorIR,
} from './types.js';

/**
 * Construct a MigratorIR object. Pure — does not validate input.
 * Use this in parsers; transformers consume the result as-is.
 */
export function buildIR(input: {
  source: IRSource;
  sourceId: string;
  title: string;
  description: string;
  author: string;
  date: string;
  severity: IRSeverity;
  maturity: IRMaturity;
  selections: readonly IRSelection[];
  combinator: IRCombinator;
  references?: readonly string[];
  tags?: readonly string[];
  warnings?: readonly string[];
}): MigratorIR {
  return Object.freeze({
    source: input.source,
    sourceId: input.sourceId,
    title: input.title,
    description: input.description,
    author: input.author,
    date: input.date,
    severity: input.severity,
    maturity: input.maturity,
    selections: Object.freeze(input.selections),
    combinator: input.combinator,
    references: Object.freeze(input.references ?? []),
    tags: Object.freeze(input.tags ?? []),
    warnings: Object.freeze(input.warnings ?? []),
  });
}

export function buildSelection(name: string, patterns: readonly IRPattern[]): IRSelection {
  return Object.freeze({ name, patterns: Object.freeze([...patterns]) });
}

export function buildPattern(input: {
  fieldKind: IRFieldKind;
  field: string;
  operator: IRPattern['operator'];
  value: string | readonly string[];
  caseInsensitive?: boolean;
}): IRPattern {
  return Object.freeze({
    fieldKind: input.fieldKind,
    field: input.field,
    operator: input.operator,
    value: Array.isArray(input.value) ? Object.freeze([...input.value]) : input.value,
    caseInsensitive: input.caseInsensitive ?? false,
  }) as IRPattern;
}
