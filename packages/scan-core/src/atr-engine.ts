/**
 * ATR (Agent Threat Rules) engine wrapper for scan-core.
 *
 * Compiles ATR rules into RegExp matchers and provides two-pass scanning
 * (raw + stripped content). Pure functions, no I/O.
 */

import type { ATRRuleCompiled, CompiledRule, Finding, CheckResult, Severity } from './types.js';
import { stripMarkdownNoise } from './markdown-utils.js';
import { SAFE_INSTALL_URLS } from './instruction-patterns.js';

// ---------------------------------------------------------------------------
// Rule compilation
// ---------------------------------------------------------------------------

/**
 * Simplified ReDoS safety check (replaces safe-regex CJS dependency).
 * Detects catastrophic backtracking patterns: nested quantifiers like (a+)+,
 * (a*)*b, ([a-z]+)*, etc. These cause exponential time on non-matching input.
 */
function isSafeRegex(re: RegExp): boolean {
  const src = re.source;
  // Reject nested quantifiers: (pattern+)+ or (pattern*)+  or (pattern+)* etc.
  if (/\([^)]*[+*]\)[+*{]/.test(src)) return false;
  // Reject overlapping alternations with quantifiers: (a|a)+
  if (/\(([^|)]+)\|\1\)[+*]/.test(src)) return false;
  // Reject star-of-star: .*.*.*  (3+ consecutive greedy wildcards)
  if (/(\.\*){3,}/.test(src)) return false;
  return true;
}

/**
 * Compile ATR rules: convert pattern strings to RegExp with ReDoS protection.
 */
export function compileRules(rules: readonly ATRRuleCompiled[]): CompiledRule[] {
  return rules.map((rule) => ({
    ...rule,
    compiled: rule.patterns
      .map((p) => {
        try {
          // Strip (?i) inline flag (unsupported in JS) and use 'i' flag instead
          const hasInlineIgnoreCase = /\(\?i\)/.test(p.pattern);
          const cleaned = hasInlineIgnoreCase ? p.pattern.replace(/\(\?i\)/g, '') : p.pattern;
          const flags = hasInlineIgnoreCase ? 'i' : '';
          const regex = new RegExp(cleaned, flags);
          // Reject ReDoS-vulnerable patterns
          if (!isSafeRegex(regex)) return null;
          return { regex, desc: p.desc };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ regex: RegExp; desc: string }>,
  }));
}

// ---------------------------------------------------------------------------
// Safe install detection
// ---------------------------------------------------------------------------

function allCurlBashAreSafe(content: string): boolean {
  const curlBashRe = /\b(curl|wget)\s+[^\n|]*\|\s*(sudo\s+)?(bash|sh|zsh|python|node|perl)/gi;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = curlBashRe.exec(content)) !== null) {
    found = true;
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index + match[0].length);
    const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd).toLowerCase();
    const isSafe = SAFE_INSTALL_URLS.some((url) => line.includes(url.toLowerCase()));
    if (!isSafe) return false;
  }
  return found;
}

function isRuleSafeInstall(ruleDesc: string, originalContent: string): boolean {
  const curlBashRuleKeywords = ['curl', 'wget', 'download', 'pipe', 'bash', 'remote code'];
  const descLower = ruleDesc.toLowerCase();
  if (!curlBashRuleKeywords.some((kw) => descLower.includes(kw))) return false;
  return allCurlBashAreSafe(originalContent);
}

function downgradeSeverity(severity: string): Severity {
  const map: Record<string, Severity> = {
    critical: 'medium',
    high: 'low',
    medium: 'low',
    low: 'info',
    info: 'info',
  };
  return map[severity] ?? 'info';
}

// ---------------------------------------------------------------------------
// Two-pass ATR scanning
// ---------------------------------------------------------------------------

export interface ATRScanOptions {
  /** True if source is README (documentation context = downgrade severity) */
  readonly isReadme?: boolean;
  /** True if strong reducer signals present (multiplier < 0.7) */
  readonly hasStrongReducers?: boolean;
  /** True if ALL context signals are reducers (no boosters at all) */
  readonly allReducers?: boolean;
}

/**
 * Scan content against compiled ATR rules.
 * Two-pass: raw content (catches hidden attacks) + stripped content (catches prose attacks).
 *
 * @returns findings, check result, and count of matched rules.
 */
export function scanWithATR(
  content: string,
  rules: readonly CompiledRule[],
  options: ATRScanOptions = {}
): {
  findings: Finding[];
  check: CheckResult;
  matchedCount: number;
} {
  const { isReadme = false, hasStrongReducers = false, allReducers = false } = options;
  const findings: Finding[] = [];
  const matchedRuleIds = new Set<string>();
  const strippedContent = stripMarkdownNoise(content);

  for (const rule of rules) {
    if (matchedRuleIds.has(rule.id)) continue;

    for (const compiled of rule.compiled) {
      try {
        const matchesRaw = compiled.regex.test(content);
        compiled.regex.lastIndex = 0;
        const matchesStripped = compiled.regex.test(strippedContent);
        compiled.regex.lastIndex = 0;

        if (matchesRaw) {
          matchedRuleIds.add(rule.id);
          const baseSeverity = (
            ['critical', 'high', 'medium', 'low', 'info'].includes(rule.severity)
              ? rule.severity
              : 'medium'
          ) as Severity;

          let severity = baseSeverity;
          const desc = compiled.desc || '';

          // Matched in stripped too = visible text = apply context downgrades
          if (matchesStripped) {
            if (isReadme) severity = downgradeSeverity(severity);
            if (isRuleSafeInstall(`${rule.title} ${desc}`, content)) {
              severity = 'low';
            }
            if (hasStrongReducers) {
              severity = downgradeSeverity(severity);
            }
            // Extra downgrade: all signals are reducers on a non-README skill file
            // (e.g. a legitimate SKILL.md with capability declarations)
            if (allReducers && !isReadme) {
              severity = downgradeSeverity(severity);
            }
          }
          // Only raw matched: hidden in markup
          if (!matchesStripped && matchesRaw && hasStrongReducers && allReducers) {
            severity = downgradeSeverity(severity);
          }

          const safeInstall = isRuleSafeInstall(`${rule.title} ${desc}`, content);

          findings.push({
            id: `atr-${rule.id}`,
            title: safeInstall
              ? `${rule.title} (known-safe install script)`
              : !matchesStripped && matchesRaw
                ? `${rule.title} (hidden in markup)`
                : rule.title,
            description: compiled.desc || `Matched ATR rule ${rule.id}`,
            severity,
            category: rule.category || 'atr',
            location: `ATR Rule: ${rule.id}`,
          });
          break;
        }
      } catch {
        // Skip invalid regex
      }
    }
  }

  return {
    findings,
    check: {
      status: matchedRuleIds.size > 0 ? 'fail' : 'pass',
      label:
        matchedRuleIds.size > 0
          ? `ATR Detection: ${matchedRuleIds.size} rule(s) triggered (${rules.length} evaluated)`
          : `ATR Detection: clean (${rules.length} rules evaluated)`,
    },
    matchedCount: matchedRuleIds.size,
  };
}
