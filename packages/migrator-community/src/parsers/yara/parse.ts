/**
 * YARA rule → MigratorIR.
 *
 * Hard-bounded scope (W2):
 *   - Text strings ($name = "value" [nocase]) → IR fieldKind='content', operator='contains'
 *   - Regex strings ($name = /pattern/[i]) → IR fieldKind='content', operator='regex'
 *   - Hex strings → null IR + warning (no text-scan analogue)
 *   - Conditions: see condition-parser.ts (any/all of them, glob, simple AND/OR chains)
 *   - Modules / for-loops / count exprs / external vars → null IR + warning
 *
 * IR mapping rationale: YARA strings have no field name (they scan a whole
 * file body). The IR's `fieldKind: 'content'` was added in D3.5 review for
 * exactly this case. Transformer will route content patterns to a generic
 * scan-target field name in the ATR YAML output.
 */

import { buildIR, buildPattern, buildSelection } from '../../ir/builder.js';
import type { IRCombinator, IRMaturity, IRPattern, IRSelection } from '../../ir/types.js';
import { parseYaraCondition } from './condition-parser.js';
import type { YaraRule, YaraParseResult, YaraString } from './types.js';

function todayIsoSlashed(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
}

function normalizeYaraDate(meta: YaraRule['meta'], warnings: string[]): string {
  const candidates = ['date', 'created', 'created_at', 'modified', 'last_modified'];
  for (const k of candidates) {
    const v = meta[k];
    if (typeof v === 'string' && v.length > 0) {
      // Common YARA conventions: "2024-01-15", "2024.01.15", "01/15/2024"
      const isoMatch = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(v);
      if (isoMatch) {
        const yyyy = isoMatch[1] ?? '0000';
        const mm = (isoMatch[2] ?? '01').padStart(2, '0');
        const dd = (isoMatch[3] ?? '01').padStart(2, '0');
        return `${yyyy}/${mm}/${dd}`;
      }
      return v.replace(/[-.]/g, '/');
    }
  }
  warnings.push('source rule has no date — defaulting to today (UTC)');
  return todayIsoSlashed();
}

const SEVERITY_KEYS = ['threat_level', 'severity', 'level'];

function deriveSeverityFromMeta(
  meta: YaraRule['meta']
): IRMaturity extends never ? never : 'critical' | 'high' | 'medium' | 'low' | 'informational' {
  for (const k of SEVERITY_KEYS) {
    const v = meta[k];
    if (typeof v === 'number') {
      if (v >= 4) return 'critical';
      if (v === 3) return 'high';
      if (v === 2) return 'medium';
      if (v === 1) return 'low';
      return 'informational';
    }
    if (typeof v === 'string') {
      const lower = v.toLowerCase();
      if (
        lower === 'critical' ||
        lower === 'high' ||
        lower === 'medium' ||
        lower === 'low' ||
        lower === 'informational'
      ) {
        return lower;
      }
    }
  }
  return 'medium';
}

function deriveMaturityFromMeta(meta: YaraRule['meta']): IRMaturity {
  const v = meta['maturity'] ?? meta['status'];
  if (typeof v === 'string') {
    const lower = v.toLowerCase();
    if (
      lower === 'stable' ||
      lower === 'experimental' ||
      lower === 'test' ||
      lower === 'deprecated'
    ) {
      return lower;
    }
  }
  return 'experimental';
}

interface PatternBuildResult {
  readonly pattern: IRPattern | null;
  readonly warning: string | null;
}

function yaraStringToPattern(s: YaraString): PatternBuildResult {
  if (s.kind === 'hex') {
    return {
      pattern: null,
      warning: `string '${s.name}' is a hex pattern — no text-scan analogue, rule rejected`,
    };
  }

  if (s.kind === 'text') {
    const ci = s.modifiers.includes('nocase');
    return {
      pattern: buildPattern({
        fieldKind: 'content',
        field: 'content',
        operator: 'contains',
        value: s.value,
        caseInsensitive: ci,
      }),
      warning: null,
    };
  }

  // regex string
  const ci = s.flags.includes('i');
  return {
    pattern: buildPattern({
      fieldKind: 'content',
      field: 'content',
      operator: 'regex',
      value: s.pattern,
      caseInsensitive: ci,
    }),
    warning: null,
  };
}

export function parseYara(rule: YaraRule): YaraParseResult {
  const warnings: string[] = [];

  if (!rule.name || rule.name.length === 0) {
    return { ir: null, warnings: ['YARA rule has no name'] };
  }
  if (rule.strings.length === 0) {
    return { ir: null, warnings: [`YARA rule '${rule.name}' has no strings — nothing to detect`] };
  }
  if (rule.condition === '') {
    return { ir: null, warnings: [`YARA rule '${rule.name}' has no condition`] };
  }

  // Reject if ANY hex string in the rule (would produce non-faithful conversion)
  for (const s of rule.strings) {
    if (s.kind === 'hex') {
      return {
        ir: null,
        warnings: [
          `YARA rule '${rule.name}' contains hex string '${s.name}' — hex patterns require binary scanning, no text analogue`,
        ],
      };
    }
  }

  const stringNamesAvailable = rule.strings.map((s) => s.name);
  const condParse = parseYaraCondition(rule.condition, stringNamesAvailable);
  if (condParse.result === null) {
    return { ir: null, warnings: [condParse.reason ?? 'condition rejected'] };
  }
  const { stringNames, combinator } = condParse.result;

  // Find each YaraString that participates in the condition
  const participatingStrings = rule.strings.filter((s) => stringNames.includes(s.name));
  if (participatingStrings.length === 0) {
    return { ir: null, warnings: [`condition references no defined strings`] };
  }

  // Build IR selections — one selection per participating YARA string,
  // each containing one pattern. Combinator decides how the selections
  // combine.
  const selections: IRSelection[] = [];
  for (const s of participatingStrings) {
    const built = yaraStringToPattern(s);
    if (built.pattern === null) {
      return {
        ir: null,
        warnings: built.warning !== null ? [built.warning] : ['unknown string conversion failure'],
      };
    }
    selections.push(buildSelection(s.name, [built.pattern]));
  }

  const description =
    typeof rule.meta['description'] === 'string' && rule.meta['description'].length > 0
      ? (rule.meta['description'] as string)
      : (warnings.push('YARA rule has no meta.description'), `YARA rule ${rule.name}`);

  const author =
    typeof rule.meta['author'] === 'string' && rule.meta['author'].length > 0
      ? (rule.meta['author'] as string)
      : (warnings.push('YARA rule has no meta.author'), 'YARA-rules contributors');

  const date = normalizeYaraDate(rule.meta, warnings);
  const severity = deriveSeverityFromMeta(rule.meta);
  const maturity = deriveMaturityFromMeta(rule.meta);

  const refRaw = rule.meta['reference'] ?? rule.meta['references'] ?? rule.meta['url'];
  const references: string[] = [];
  if (typeof refRaw === 'string' && refRaw.length > 0) {
    references.push(refRaw);
  }

  const ir = buildIR({
    source: 'yara',
    sourceId: rule.name,
    title: rule.name,
    description,
    author,
    date,
    severity,
    maturity,
    selections,
    combinator: combinator as IRCombinator,
    references,
    tags: rule.tags,
    warnings,
  });

  return { ir, warnings };
}
