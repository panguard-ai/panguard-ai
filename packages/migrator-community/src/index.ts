/**
 * @panguard-ai/migrator-community — public API.
 *
 * Sigma / YARA → ATR YAML converter, MIT licensed.
 *
 * The community edition produces schema-valid ATR YAML output without
 * LLM enrichment. For LLM-enriched output (5-framework compliance,
 * test cases, reauthored agent-context conditions, EU AI Act audit
 * pack), see the enterprise edition: panguard.ai/migrator
 */

import { parseSigma } from './parsers/sigma/parse.js';
import { parseYara } from './parsers/yara/parse.js';
import { parseFirstYaraRule } from './parsers/yara/lex.js';
import { transformToAtr } from './transformers/ir-to-atr.js';
import { validateAtrOutput } from './validators/atr-output-validator.js';
import type { SigmaRule } from './parsers/sigma/types.js';
import type { AtrRuleObject } from './transformers/ir-to-atr.js';
import type { Enrichment } from './enrichment/types.js';

export type ConvertOutcome = 'converted' | 'skipped' | 'failed';

export interface ConvertResult {
  readonly outcome: ConvertOutcome;
  readonly atr: AtrRuleObject | null;
  readonly skipReason: string | null;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface ConvertOptions {
  readonly used?: Set<string>;
  /**
   * Optional pre-built enrichment to apply during transformation.
   * Community users can craft this manually or via their own pipeline.
   * If omitted, the rule is converted without compliance metadata or
   * agent-context detection rewriting.
   */
  readonly enrichment?: Enrichment;
}

export async function convertSigma(
  rule: SigmaRule,
  opts: ConvertOptions = {}
): Promise<ConvertResult> {
  const parsed = parseSigma(rule);
  if (parsed.ir === null) {
    return {
      outcome: 'skipped',
      atr: null,
      skipReason: parsed.warnings.join('; ') || 'parser returned null IR',
      errors: [],
      warnings: parsed.warnings,
    };
  }

  const transformed = transformToAtr(parsed.ir, {
    ...(opts.used !== undefined ? { used: opts.used } : {}),
    ...(opts.enrichment !== undefined ? { enrichment: opts.enrichment } : {}),
  });
  if (transformed.atr === null) {
    return {
      outcome: 'skipped',
      atr: null,
      skipReason: transformed.warnings.join('; ') || 'transformer returned null ATR',
      errors: [],
      warnings: [...parsed.warnings, ...transformed.warnings],
    };
  }

  const validation = await validateAtrOutput(transformed.atr);
  return {
    outcome: validation.valid ? 'converted' : 'failed',
    atr: transformed.atr,
    skipReason: null,
    errors: validation.errors,
    warnings: [...parsed.warnings, ...transformed.warnings],
  };
}

export async function convertYara(
  yaraText: string,
  opts: ConvertOptions = {}
): Promise<ConvertResult> {
  const lexed = parseFirstYaraRule(yaraText);
  if (!lexed) {
    return {
      outcome: 'skipped',
      atr: null,
      skipReason: 'YARA lexer found no rule in input text',
      errors: [],
      warnings: [],
    };
  }
  const parsed = parseYara(lexed);
  if (parsed.ir === null) {
    return {
      outcome: 'skipped',
      atr: null,
      skipReason: parsed.warnings.join('; ') || 'parser returned null IR',
      errors: [],
      warnings: parsed.warnings,
    };
  }

  const transformed = transformToAtr(parsed.ir, {
    ...(opts.used !== undefined ? { used: opts.used } : {}),
    ...(opts.enrichment !== undefined ? { enrichment: opts.enrichment } : {}),
  });
  if (transformed.atr === null) {
    return {
      outcome: 'skipped',
      atr: null,
      skipReason: transformed.warnings.join('; ') || 'transformer returned null ATR',
      errors: [],
      warnings: [...parsed.warnings, ...transformed.warnings],
    };
  }

  const validation = await validateAtrOutput(transformed.atr);
  return {
    outcome: validation.valid ? 'converted' : 'failed',
    atr: transformed.atr,
    skipReason: null,
    errors: validation.errors,
    warnings: [...parsed.warnings, ...transformed.warnings],
  };
}

export { validateAtrOutput } from './validators/atr-output-validator.js';
export type { SigmaRule } from './parsers/sigma/types.js';
export type { MigratorIR, IRPattern, IRSelection, IRSeverity } from './ir/types.js';
export type { AtrRuleObject } from './transformers/ir-to-atr.js';
export type {
  Enrichment,
  ComplianceMapping,
  TestCases,
  ReauthoredCondition,
} from './enrichment/types.js';
