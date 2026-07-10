/**
 * validate-rules.ts — dry-run validator for ATR rule directories.
 *
 * Use from CLI:
 *   panguard-guard validate <rules-dir>
 *
 * Or programmatically:
 *   const result = await validateRulesDir('/path/to/rules');
 *   if (result.failures.length > 0) process.exit(1);
 *
 * Validation gates (any failure marks the rule failed):
 *   1. YAML parses to an object (not a list, not a primitive).
 *   2. Required fields present: id, title, severity, detection, agent_source.type.
 *   3. detection.conditions exists and is non-empty.
 *   4. Every regex pattern in detection.conditions compiles cleanly + is under
 *      MAX_PATTERN_LEN (2000 chars; reject obvious ReDoS surface).
 *   5. If test_cases.true_positives is non-empty, the rule's patterns MUST
 *      match every TP. A rule that misses its own declared TPs is broken.
 *   6. If test_cases.true_negatives is non-empty, the rule's patterns MUST
 *      NOT match any TN. Self-FP is a regression.
 *
 * Exit semantics:
 *   - 0 = every rule passed
 *   - 1 = any rule failed
 *
 * Designed for the `pga migrate ... --deploy-to-guard` workflow so customers
 * can verify a candidate rules dir before pushing it into a running Guard.
 *
 * @module @panguard-ai/panguard-guard/cli/validate-rules
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load as yamlLoad } from 'js-yaml';

/** Per-rule validation outcome. / 單條規則的驗證結果 */
export interface RuleValidation {
  readonly file: string;
  readonly ruleId: string | null;
  readonly passed: boolean;
  readonly failures: ReadonlyArray<string>;
  readonly testCaseCounts: {
    readonly truePositives: number;
    readonly trueNegatives: number;
  };
}

/** Aggregate validation report for a directory. / 目錄級彙總報告 */
export interface ValidationReport {
  readonly directory: string;
  readonly totalRules: number;
  readonly passed: number;
  readonly failed: number;
  readonly results: ReadonlyArray<RuleValidation>;
  /** Files that failed validation (for quick CLI listing). / 失敗檔案清單 */
  readonly failures: ReadonlyArray<RuleValidation>;
}

/** Maximum regex pattern length we accept — anything bigger smells like ReDoS. */
const MAX_PATTERN_LEN = 2000;

/**
 * Strip PCRE-style inline flag prefix that ATR rules use (e.g. `(?i)foo` → `foo`)
 * and return the cleaned pattern + the equivalent JS RegExp flag set. Mirrors
 * normalizeRegex() in agent-threat-rules/src/engine.ts so this validator
 * accepts the exact same syntax the production ATR engine accepts.
 */
function normalizeAtrPattern(p: string): { source: string; flags: string } {
  const m = /^\(\?([imsx]+)\)/.exec(p);
  const source = m ? p.slice(m[0].length) : p;
  let flags = '';
  if (m) {
    const inline = m[1] ?? '';
    // Map PCRE flag chars to JS equivalents. `s` (dotAll) and `i` are valid JS;
    // `m` is multiline; `x` (extended) has no JS analogue — drop it silently.
    if (inline.includes('i')) flags += 'i';
    if (inline.includes('m')) flags += 'm';
    if (inline.includes('s')) flags += 's';
  }
  if (!flags.includes('i')) flags += 'i'; // ATR engine default
  // Unicode property syntax (\u{...} or \p{...}) requires the 'u' flag.
  // Mirror ATR engine.ts behavior so this validator does not falsely reject
  // patterns that compile fine in production.
  if (source.includes('\\u{') || source.includes('\\p{')) flags += 'u';
  return { source, flags };
}

interface RawRule {
  readonly id?: string;
  readonly title?: string;
  readonly severity?: string;
  readonly description?: string;
  readonly agent_source?: { readonly type?: string };
  readonly detection?: {
    readonly conditions?: unknown;
    readonly condition?: string;
  };
  readonly test_cases?: {
    readonly true_positives?: ReadonlyArray<string | { readonly content?: string }>;
    readonly true_negatives?: ReadonlyArray<string | { readonly content?: string }>;
  };
}

/** Walk a directory for .yaml/.yml files recursively. */
function collectYamlFiles(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      out.push(...collectYamlFiles(full));
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      out.push(full);
    }
  }
  return out.sort();
}

/** Pull a string out of a TP/TN entry which may be a bare string or {content}. */
function extractText(entry: string | { readonly content?: string } | undefined): string | null {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && typeof entry.content === 'string') {
    return entry.content;
  }
  return null;
}

/** Pull every regex/contains/equals pattern out of detection.conditions. */
function collectPatterns(conditions: unknown): string[] {
  const out: string[] = [];
  if (!Array.isArray(conditions)) return out;
  for (const cond of conditions) {
    if (!cond || typeof cond !== 'object') continue;
    const c = cond as {
      patterns?: ReadonlyArray<string>;
      pattern?: string;
      value?: string;
      values?: ReadonlyArray<string>;
    };
    if (Array.isArray(c.patterns)) {
      for (const p of c.patterns) if (typeof p === 'string') out.push(p);
    }
    if (typeof c.pattern === 'string') out.push(c.pattern);
    if (typeof c.value === 'string') out.push(c.value);
    if (Array.isArray(c.values)) {
      for (const v of c.values) if (typeof v === 'string') out.push(v);
    }
  }
  return out;
}

/** Validate a single parsed rule object. Returns failure reasons (empty = passed). */
function validateRuleObject(rule: RawRule): { failures: string[]; patterns: string[] } {
  const failures: string[] = [];

  // 1. Required fields.
  if (!rule.id) failures.push('missing required field: id');
  if (!rule.title) failures.push('missing required field: title');
  if (!rule.severity) failures.push('missing required field: severity');
  if (!rule.agent_source?.type) {
    failures.push('missing required field: agent_source.type');
  }

  // 2. detection.conditions exists + non-empty.
  if (!rule.detection) {
    failures.push('missing required field: detection');
    return { failures, patterns: [] };
  }
  const conds = rule.detection.conditions;
  if (!Array.isArray(conds) || conds.length === 0) {
    failures.push('detection.conditions must be a non-empty array');
    return { failures, patterns: [] };
  }

  // 3. Regex compile + length check. Normalize PCRE inline flags (?i) the
  // same way the production ATR engine does so this gate accepts the
  // exact same syntax.
  const patterns = collectPatterns(conds);
  for (const p of patterns) {
    if (p.length > MAX_PATTERN_LEN) {
      failures.push(`pattern exceeds ${MAX_PATTERN_LEN} chars (ReDoS risk): ${p.slice(0, 60)}...`);
      continue;
    }
    const { source, flags } = normalizeAtrPattern(p);
    try {
      // eslint-disable-next-line no-new
      new RegExp(source, flags);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`pattern failed to compile (${msg}): ${p.slice(0, 80)}`);
    }
  }

  return { failures, patterns };
}

/** Quick "do any of these patterns match this text" check. */
function anyMatch(patterns: ReadonlyArray<string>, text: string): boolean {
  for (const p of patterns) {
    try {
      const { source, flags } = normalizeAtrPattern(p);
      if (new RegExp(source, flags).test(text)) return true;
    } catch {
      /* invalid pattern already flagged in validateRuleObject */
    }
  }
  return false;
}

/**
 * Validate every .yaml/.yml file under `directory`. Returns aggregate report.
 * Caller decides exit code from `report.failed > 0`.
 */
export function validateRulesDir(directory: string): ValidationReport {
  if (!existsSync(directory)) {
    throw new Error(`rules directory not found: ${directory}`);
  }
  const files = collectYamlFiles(directory);
  const results: RuleValidation[] = [];

  for (const file of files) {
    let raw: unknown;
    try {
      raw = yamlLoad(readFileSync(file, 'utf-8'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        file,
        ruleId: null,
        passed: false,
        failures: [`YAML parse failed: ${msg}`],
        testCaseCounts: { truePositives: 0, trueNegatives: 0 },
      });
      continue;
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      results.push({
        file,
        ruleId: null,
        passed: false,
        failures: ['YAML root must be an object'],
        testCaseCounts: { truePositives: 0, trueNegatives: 0 },
      });
      continue;
    }
    const rule = raw as RawRule;
    const { failures, patterns } = validateRuleObject(rule);

    // Own-TP coverage check (gate 5).
    const tps = (rule.test_cases?.true_positives ?? [])
      .map(extractText)
      .filter((s): s is string => s !== null);
    if (tps.length > 0 && patterns.length > 0) {
      for (let i = 0; i < tps.length; i++) {
        const tp = tps[i];
        if (tp !== undefined && !anyMatch(patterns, tp)) {
          failures.push(
            `true_positive[${i}] does not match any pattern: ${tp.slice(0, 80).replace(/\s+/g, ' ')}`
          );
        }
      }
    }

    // Own-TN no-match check (gate 6).
    const tns = (rule.test_cases?.true_negatives ?? [])
      .map(extractText)
      .filter((s): s is string => s !== null);
    if (tns.length > 0 && patterns.length > 0) {
      for (let i = 0; i < tns.length; i++) {
        const tn = tns[i];
        if (tn !== undefined && anyMatch(patterns, tn)) {
          failures.push(
            `true_negative[${i}] unexpectedly matched a pattern (self-FP): ${tn.slice(0, 80).replace(/\s+/g, ' ')}`
          );
        }
      }
    }

    results.push({
      file,
      ruleId: rule.id ?? null,
      passed: failures.length === 0,
      failures,
      testCaseCounts: {
        truePositives: tps.length,
        trueNegatives: tns.length,
      },
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failedResults = results.filter((r) => !r.passed);
  return {
    directory,
    totalRules: results.length,
    passed,
    failed: failedResults.length,
    results,
    failures: failedResults,
  };
}

/** A failure message shared by enough rules to be worth aggregating. */
export interface CommonFailureCause {
  readonly message: string;
  readonly count: number;
  /** Rule id (or file path, when the rule has no id) of every affected rule. */
  readonly ruleIds: ReadonlyArray<string>;
  readonly fixHint: string;
}

/**
 * A literal failure message must recur across at least this many DIFFERENT
 * rules before it is worth calling out as a common cause rather than just
 * reading naturally in each rule's own per-rule block.
 */
export const COMMON_CAUSE_THRESHOLD = 3;

/**
 * Suggest a fix for a validator failure message, matched by its fixed
 * (non-interpolated) prefix. Falls back to a generic pointer when the
 * message doesn't match a known shape — never invents specifics.
 */
export function failureFixHint(message: string): string {
  if (message.startsWith('missing required field:')) {
    return 'add the missing field to the rule YAML.';
  }
  if (message.startsWith('detection.conditions must be')) {
    return 'add at least one condition under detection.conditions.';
  }
  if (message.startsWith('pattern exceeds')) {
    return 'shorten the regex, or split it into simpler patterns.';
  }
  if (message.startsWith('pattern failed to compile')) {
    return 'fix the regex syntax — test it in isolation before committing.';
  }
  if (message.startsWith('true_positive[') && message.includes('does not match')) {
    return "update the rule's patterns, or remove the stale test case.";
  }
  if (message.startsWith('true_negative[') && message.includes('unexpectedly matched')) {
    return 'tighten the pattern, or move the case out of true_negatives.';
  }
  if (message.startsWith('YAML parse failed:')) {
    return 'check YAML indentation and syntax.';
  }
  if (message === 'YAML root must be an object') {
    return 'ensure the file defines a single rule object, not a list.';
  }
  return 'see the rule file for detail.';
}

/**
 * Group failure results by EXACT failure-message text and surface the ones
 * shared by >= COMMON_CAUSE_THRESHOLD different rules. Grouping on the exact
 * literal string (not a normalized/stripped key) is deliberate: messages like
 * "missing required field: agent_source.type" are already a fixed, finite
 * set (no per-rule interpolation), so exact-match grouping catches the
 * systemic-mistake case (e.g. one templating error affecting N rules)
 * without conflating unrelated failures (e.g. missing `id` vs missing
 * `title`) into the same bucket.
 */
export function summarizeCommonFailureCauses(
  failures: ReadonlyArray<RuleValidation>
): CommonFailureCause[] {
  const byMessage = new Map<string, string[]>();
  for (const r of failures) {
    const label = r.ruleId ?? r.file;
    for (const message of r.failures) {
      const ids = byMessage.get(message);
      if (ids) {
        ids.push(label);
      } else {
        byMessage.set(message, [label]);
      }
    }
  }

  const common: CommonFailureCause[] = [];
  for (const [message, ruleIds] of byMessage) {
    if (ruleIds.length >= COMMON_CAUSE_THRESHOLD) {
      common.push({ message, count: ruleIds.length, ruleIds, fixHint: failureFixHint(message) });
    }
  }
  // Most-affected cause first — that's the highest-leverage fix.
  return common.sort((a, b) => b.count - a.count);
}
