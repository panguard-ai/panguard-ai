/**
 * Sigma YAML → MigratorIR.
 *
 * Scope (W1):
 *   - Selection-block detections (recovered keys = condition-parser's accepted set)
 *   - Pipe modifiers: |contains, |startswith, |endswith, |i (case-insensitive). No modifier = equals.
 *   - Values: string, number (coerced to string), array of string|number. NOT boolean, object, null.
 *   - Reserved detection keys (per spec 2.3.1 + W1 condition-parser): condition, timeframe, fields, keywords
 *
 * Out of scope (returns null IR + warning):
 *   - Pipe modifiers: |all, |cidr, |re, |expand, |base64, |base64offset, |utf16*, |wide
 *   - Boolean / null / nested-object values inside selection blocks
 *   - Compound conditions beyond the 3 condition-parser shapes
 *
 * Defaulting policy:
 *   - Missing description → "Migrated from SigmaHQ rule {sigma_id}" + warning
 *   - Missing author      → "SigmaHQ contributors" + warning
 *   - Missing date        → today's UTC date in YYYY/MM/DD + warning
 *   - Missing level       → 'medium' (Sigma's documented default)
 *   - Sigma `references` are forwarded; SigmaHQ tarball URL is NOT auto-injected here
 *     (transformer is the right place to add migrator provenance).
 */

import { buildIR, buildPattern, buildSelection } from '../../ir/builder.js';
import type {
  IRCombinator,
  IRMaturity,
  IRPattern,
  IRPatternOperator,
  IRSelection,
} from '../../ir/types.js';
import { mapSigmaLevel } from '../../transformers/severity-map.js';
import { parseCondition } from './condition-parser.js';
import type { SigmaRule, SigmaParseResult, SigmaSelectionBlock } from './types.js';

const SUPPORTED_OPERATOR_MODIFIERS: Record<string, IRPatternOperator> = {
  contains: 'contains',
  startswith: 'startswith',
  endswith: 'endswith',
};

const UNSUPPORTED_MODIFIERS = new Set([
  'all',
  'cidr',
  're',
  'expand',
  'base64',
  'base64offset',
  'utf16',
  'utf16le',
  'utf16be',
  'wide',
]);

const RESERVED_DETECTION_KEYS = new Set(['condition', 'timeframe', 'fields', 'keywords']);

// ------------------------------------------------------------------------ //

interface SelectionKeyParse {
  readonly field: string;
  readonly operator: IRPatternOperator;
  readonly caseInsensitive: boolean;
  readonly unsupportedModifier: string | null;
}

function parseSelectionKey(key: string): SelectionKeyParse {
  const parts = key.split('|');
  const field = parts[0] ?? '';
  let operator: IRPatternOperator = 'equals';
  let caseInsensitive = false;

  for (let i = 1; i < parts.length; i++) {
    const mod = parts[i] ?? '';
    if (UNSUPPORTED_MODIFIERS.has(mod)) {
      return { field, operator, caseInsensitive, unsupportedModifier: mod };
    }
    if (mod === 'i') {
      caseInsensitive = true;
      continue;
    }
    const mapped = SUPPORTED_OPERATOR_MODIFIERS[mod];
    if (mapped !== undefined) {
      operator = mapped;
      continue;
    }
    return { field, operator, caseInsensitive, unsupportedModifier: mod };
  }

  return { field, operator, caseInsensitive, unsupportedModifier: null };
}

// ------------------------------------------------------------------------ //

function coerceValue(v: unknown): string | string[] | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    const acc: string[] = [];
    for (const item of v) {
      if (typeof item === 'string') {
        acc.push(item);
      } else if (typeof item === 'number') {
        acc.push(String(item));
      } else {
        return null;
      }
    }
    return acc;
  }
  // boolean / null / object / undefined — not supported in W1 selection values
  return null;
}

interface BlockBuildResult {
  readonly patterns: readonly IRPattern[];
  readonly warnings: readonly string[];
  readonly fatal: boolean;
}

function buildPatternsFromBlock(
  selectionName: string,
  block: SigmaSelectionBlock | unknown
): BlockBuildResult {
  if (typeof block !== 'object' || block === null || Array.isArray(block)) {
    return {
      patterns: [],
      warnings: [`selection '${selectionName}' is not a key/value object`],
      fatal: true,
    };
  }
  const entries = Object.entries(block as Record<string, unknown>);
  if (entries.length === 0) {
    return {
      patterns: [],
      warnings: [`selection '${selectionName}' is empty`],
      fatal: true,
    };
  }
  const patterns: IRPattern[] = [];
  const warnings: string[] = [];
  for (const [key, val] of entries) {
    const parsed = parseSelectionKey(key);
    if (parsed.unsupportedModifier !== null) {
      return {
        patterns: [],
        warnings: [
          `selection '${selectionName}' uses unsupported pipe modifier ` +
            `'|${parsed.unsupportedModifier}' on field '${parsed.field}'`,
        ],
        fatal: true,
      };
    }
    const value = coerceValue(val);
    if (value === null) {
      return {
        patterns: [],
        warnings: [
          `selection '${selectionName}' field '${parsed.field}' has unsupported value type ` +
            `(${typeof val}); W1 accepts string, number, or array of those`,
        ],
        fatal: true,
      };
    }
    patterns.push(
      buildPattern({
        fieldKind: 'named',
        field: parsed.field,
        operator: parsed.operator,
        value,
        caseInsensitive: parsed.caseInsensitive,
      })
    );
  }
  return { patterns, warnings, fatal: false };
}

// ------------------------------------------------------------------------ //

function todayIsoSlashed(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
}

function normalizeDate(raw: unknown, warnings: string[]): string {
  if (typeof raw === 'string' && raw.length > 0) {
    // Sigma uses both YYYY/MM/DD and YYYY-MM-DD; normalize to slashed.
    return raw.replace(/-/g, '/');
  }
  warnings.push('source rule has no date — defaulting to today (UTC)');
  return todayIsoSlashed();
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

/**
 * Sigma status → ATR maturity. Sigma's 'unsupported' has no clean ATR analogue;
 * map it to 'deprecated' with the understanding that an upstream-deprecated
 * detection should not be promoted to stable on conversion.
 */
function mapSigmaStatusToMaturity(status: unknown): IRMaturity {
  switch (status) {
    case 'stable':
      return 'stable';
    case 'test':
      return 'test';
    case 'deprecated':
    case 'unsupported':
      return 'deprecated';
    case 'experimental':
    default:
      return 'experimental';
  }
}

// ------------------------------------------------------------------------ //

export function parseSigma(sigma: SigmaRule): SigmaParseResult {
  const warnings: string[] = [];

  // Required-field checks (parse.ts is defensive — pick-sigma-50.ts already filters,
  // but parser can be called on arbitrary input).
  if (typeof sigma.title !== 'string' || sigma.title.length === 0) {
    return { ir: null, warnings: ['missing required field: title'] };
  }
  if (typeof sigma.id !== 'string' || sigma.id.length === 0) {
    return { ir: null, warnings: ['missing required field: id'] };
  }
  if (
    typeof sigma.detection !== 'object' ||
    sigma.detection === null
  ) {
    return { ir: null, warnings: ['missing or invalid detection block'] };
  }

  // Condition
  const detection = sigma.detection as Record<string, unknown>;
  const conditionRaw = detection['condition'];
  if (typeof conditionRaw !== 'string') {
    return {
      ir: null,
      warnings: ['detection.condition is missing or not a string'],
    };
  }
  const detectionKeys = Object.keys(detection).filter(
    (k) => !RESERVED_DETECTION_KEYS.has(k)
  );
  const conditionParsed = parseCondition(conditionRaw, detectionKeys);
  if (conditionParsed.result === null) {
    return {
      ir: null,
      warnings: [conditionParsed.reason ?? 'condition rejected (unknown reason)'],
    };
  }
  const { selectionKeys, combinator } = conditionParsed.result;

  // Build selections
  const selections: IRSelection[] = [];
  for (const name of selectionKeys) {
    const block = detection[name];
    const built = buildPatternsFromBlock(name, block);
    if (built.fatal) {
      return { ir: null, warnings: [...built.warnings] };
    }
    warnings.push(...built.warnings);
    selections.push(buildSelection(name, built.patterns));
  }
  if (selections.length === 0) {
    return { ir: null, warnings: ['no selections produced from detection block'] };
  }

  // Optional-field defaults with warnings
  const description =
    typeof sigma.description === 'string' && sigma.description.length > 0
      ? sigma.description
      : (warnings.push('source rule has no description'),
        `Migrated from SigmaHQ rule ${sigma.id}`);
  const author =
    typeof sigma.author === 'string' && sigma.author.length > 0
      ? sigma.author
      : (warnings.push('source rule has no author'), 'SigmaHQ contributors');
  const date = normalizeDate(sigma.date, warnings);

  const severity = mapSigmaLevel(sigma.level);
  if (sigma.level === undefined) {
    warnings.push('source rule has no level — defaulting to medium');
  }

  const maturity = mapSigmaStatusToMaturity(sigma.status);

  const references = asStringArray(sigma.references);
  const tags = asStringArray(sigma.tags);

  const ir = buildIR({
    source: 'sigma',
    sourceId: sigma.id,
    title: sigma.title,
    description,
    author,
    date,
    severity,
    maturity,
    selections,
    combinator: combinator as IRCombinator,
    references,
    tags,
    warnings,
  });

  return { ir, warnings };
}
