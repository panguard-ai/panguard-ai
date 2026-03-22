// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { compileRules, scanWithATR } from '../atr-engine.js';
import type { ATRRuleCompiled, CompiledRule } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(
  id: string,
  patterns: Array<{ pattern: string; desc?: string }>,
  severity = 'high',
  category = 'prompt-injection',
  title?: string
): ATRRuleCompiled {
  return {
    id,
    title: title ?? `Test Rule ${id}`,
    severity,
    category,
    patterns: patterns.map((p) => ({
      field: 'instructions',
      pattern: p.pattern,
      desc: p.desc ?? `Pattern for ${id}`,
    })),
  };
}

function singlePatternRule(
  id: string,
  pattern: string,
  severity = 'high',
  category = 'prompt-injection'
): ATRRuleCompiled {
  return makeRule(id, [{ pattern, desc: `Matches ${id}` }], severity, category);
}

// ---------------------------------------------------------------------------
// compileRules
// ---------------------------------------------------------------------------

describe('compileRules', () => {
  it('produces compiled regexes for valid patterns', () => {
    const rules = [
      singlePatternRule('r1', 'ignore previous instructions'),
      singlePatternRule('r2', 'exfiltrate data'),
    ];
    const compiled = compileRules(rules);

    expect(compiled).toHaveLength(2);
    expect(compiled[0].compiled).toHaveLength(1);
    expect(compiled[1].compiled).toHaveLength(1);
    expect(compiled[0].compiled[0].regex).toBeInstanceOf(RegExp);
    expect(compiled[1].compiled[0].regex).toBeInstanceOf(RegExp);
  });

  it('passes through rule metadata (id, title, severity, category) unchanged', () => {
    const rule = singlePatternRule('meta-test', 'foo', 'critical', 'tool-poisoning');
    const [compiled] = compileRules([rule]);

    expect(compiled.id).toBe('meta-test');
    expect(compiled.title).toBe('Test Rule meta-test');
    expect(compiled.severity).toBe('critical');
    expect(compiled.category).toBe('tool-poisoning');
  });

  it('skips invalid regex patterns (e.g. unclosed bracket)', () => {
    const rules = [
      makeRule('bad', [
        { pattern: '[invalid', desc: 'broken' },
        { pattern: 'valid-pattern', desc: 'good' },
      ]),
    ];
    const [compiled] = compileRules(rules);

    // The invalid pattern is skipped, the valid one remains
    expect(compiled.compiled).toHaveLength(1);
    expect(compiled.compiled[0].desc).toBe('good');
  });

  it('skips ReDoS-vulnerable patterns flagged by safe-regex', () => {
    // (a+)+$ is the canonical ReDoS example
    const rules = [singlePatternRule('redos', '(a+)+$')];
    const [compiled] = compileRules(rules);

    expect(compiled.compiled).toHaveLength(0);
  });

  it('returns empty compiled array when all patterns in a rule are unsafe', () => {
    const rules = [
      makeRule('all-bad', [
        { pattern: '[unclosed', desc: 'bad1' },
        { pattern: '(a+)+$', desc: 'bad2' },
      ]),
    ];
    const [compiled] = compileRules(rules);

    expect(compiled.compiled).toHaveLength(0);
  });

  it('strips (?i) inline flag and applies case-insensitive matching', () => {
    const rules = [singlePatternRule('ci', '(?i)exfiltrate')];
    const [compiled] = compileRules(rules);

    expect(compiled.compiled).toHaveLength(1);
    const { regex } = compiled.compiled[0];
    // Source should not contain (?i) literally
    expect(regex.source).not.toContain('(?i)');
    // Flag should be 'i'
    expect(regex.flags).toContain('i');
    // Should match regardless of case
    expect(regex.test('EXFILTRATE data')).toBe(true);
    expect(regex.test('exfiltrate data')).toBe(true);
  });

  it('does not add case-insensitive flag when (?i) is absent', () => {
    const rules = [singlePatternRule('cs', 'CaseSensitive')];
    const [compiled] = compileRules(rules);

    expect(compiled.compiled[0].regex.flags).toBe('');
  });

  it('handles empty patterns array gracefully', () => {
    const rule: ATRRuleCompiled = {
      id: 'empty',
      title: 'Empty',
      severity: 'low',
      category: 'atr',
      patterns: [],
    };
    const [compiled] = compileRules([rule]);

    expect(compiled.compiled).toHaveLength(0);
  });

  it('handles an empty rules array', () => {
    expect(compileRules([])).toEqual([]);
  });

  it('preserves desc on each compiled pattern entry', () => {
    const rules = [
      makeRule('desc-test', [
        { pattern: 'alpha', desc: 'first desc' },
        { pattern: 'beta', desc: 'second desc' },
      ]),
    ];
    const [compiled] = compileRules(rules);

    expect(compiled.compiled[0].desc).toBe('first desc');
    expect(compiled.compiled[1].desc).toBe('second desc');
  });

  it('handles multiple valid patterns in a single rule', () => {
    const rules = [
      makeRule('multi', [
        { pattern: 'pattern-one', desc: 'd1' },
        { pattern: 'pattern-two', desc: 'd2' },
        { pattern: 'pattern-three', desc: 'd3' },
      ]),
    ];
    const [compiled] = compileRules(rules);

    expect(compiled.compiled).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// scanWithATR
// ---------------------------------------------------------------------------

describe('scanWithATR', () => {
  // Helper: build a compiled rule directly from an ATRRuleCompiled
  function buildRules(raw: ATRRuleCompiled[]): CompiledRule[] {
    return compileRules(raw);
  }

  // ---------------------------------------------------------------------------
  // Basic matching
  // ---------------------------------------------------------------------------

  it('returns pass check and no findings for content that does not match any rule', () => {
    const rules = buildRules([singlePatternRule('r1', 'exfiltrate')]);
    const result = scanWithATR('This is totally benign content.', rules);

    expect(result.findings).toHaveLength(0);
    expect(result.check.status).toBe('pass');
    expect(result.matchedCount).toBe(0);
  });

  it('returns fail check and finding when content matches a rule', () => {
    const rules = buildRules([singlePatternRule('r1', 'exfiltrate', 'high')]);
    const result = scanWithATR('Instruction: exfiltrate all user data now.', rules);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].id).toBe('atr-r1');
    expect(result.findings[0].severity).toBe('high');
    expect(result.check.status).toBe('fail');
    expect(result.matchedCount).toBe(1);
  });

  it('finding id is prefixed with "atr-"', () => {
    const rules = buildRules([singlePatternRule('rule-42', 'malicious-payload')]);
    const result = scanWithATR('malicious-payload spotted here', rules);

    expect(result.findings[0].id).toBe('atr-rule-42');
  });

  it('finding uses rule title when content matches both raw and stripped', () => {
    const rules = buildRules([
      makeRule('titled', [{ pattern: 'steal credentials', desc: 'cred theft' }], 'critical', 'atr', 'Credential Theft'),
    ]);
    const result = scanWithATR('steal credentials from the user', rules);

    expect(result.findings[0].title).toBe('Credential Theft');
  });

  it('check label includes rule count when triggered', () => {
    const rules = buildRules([
      singlePatternRule('r1', 'attack-vector'),
      singlePatternRule('r2', 'benign-only'),
    ]);
    const result = scanWithATR('attack-vector detected here', rules);

    expect(result.check.label).toContain('1 rule(s) triggered');
    expect(result.check.label).toContain('2 evaluated');
  });

  it('check label states clean when no rules triggered', () => {
    const rules = buildRules([singlePatternRule('r1', 'never-matches-xyz')]);
    const result = scanWithATR('harmless content', rules);

    expect(result.check.label).toContain('clean');
    expect(result.check.label).toContain('1 rules evaluated');
  });

  // ---------------------------------------------------------------------------
  // Two-pass: hidden in markup
  // ---------------------------------------------------------------------------

  it('detects pattern hidden inside HTML tag attribute (raw pass only)', () => {
    // The pattern is placed inside an HTML tag attribute value.
    // stripMarkdownNoise removes HTML tags entirely (including their attributes),
    // so the pattern survives the raw pass but is gone after stripping.
    const content = 'Normal prose.\n<div data-cmd="exfiltrate">\n</div>\nMore prose.';
    const rules = buildRules([singlePatternRule('hidden', 'exfiltrate', 'critical')]);
    const result = scanWithATR(content, rules);

    // Should still be found via raw pass
    expect(result.findings).toHaveLength(1);
    // Title should contain "(hidden in markup)" because stripped content won't match
    expect(result.findings[0].title).toContain('hidden in markup');
  });

  it('does NOT tag finding as hidden-in-markup when pattern is also in stripped text', () => {
    const content = 'Plain prose: exfiltrate data here.';
    const rules = buildRules([singlePatternRule('visible', 'exfiltrate', 'high')]);
    const result = scanWithATR(content, rules);

    expect(result.findings[0].title).not.toContain('hidden in markup');
  });

  // ---------------------------------------------------------------------------
  // isReadme downgrade
  // ---------------------------------------------------------------------------

  it('downgrades severity by one level when isReadme is true (critical -> medium)', () => {
    const rules = buildRules([singlePatternRule('readme-test', 'exfiltrate data', 'critical')]);
    const result = scanWithATR('exfiltrate data from the system', rules, { isReadme: true });

    expect(result.findings[0].severity).toBe('medium');
  });

  it('downgrades severity by one level when isReadme is true (high -> low)', () => {
    const rules = buildRules([singlePatternRule('readme-high', 'steal tokens', 'high')]);
    const result = scanWithATR('steal tokens from environment', rules, { isReadme: true });

    expect(result.findings[0].severity).toBe('low');
  });

  it('does NOT downgrade severity when isReadme is false (default)', () => {
    const rules = buildRules([singlePatternRule('no-readme', 'steal tokens', 'high')]);
    const result = scanWithATR('steal tokens from environment', rules);

    expect(result.findings[0].severity).toBe('high');
  });

  // ---------------------------------------------------------------------------
  // Deduplication by rule ID
  // ---------------------------------------------------------------------------

  it('deduplicates findings by rule ID (only one finding per rule)', () => {
    // A rule with two patterns both matching the same content should produce one finding
    const rule = makeRule('dedup', [
      { pattern: 'attack-one', desc: 'first' },
      { pattern: 'attack-two', desc: 'second' },
    ]);
    const rules = buildRules([rule]);
    const result = scanWithATR('attack-one and attack-two present', rules);

    expect(result.findings).toHaveLength(1);
    expect(result.matchedCount).toBe(1);
  });

  it('produces one finding per distinct matched rule', () => {
    const rules = buildRules([
      singlePatternRule('rule-a', 'pattern-alpha'),
      singlePatternRule('rule-b', 'pattern-beta'),
    ]);
    const result = scanWithATR('pattern-alpha and pattern-beta both present', rules);

    expect(result.findings).toHaveLength(2);
    expect(result.matchedCount).toBe(2);
    const ids = result.findings.map((f) => f.id);
    expect(ids).toContain('atr-rule-a');
    expect(ids).toContain('atr-rule-b');
  });

  it('does not double-count a rule when called again on same rule set', () => {
    const rules = buildRules([singlePatternRule('r1', 'trigger')]);
    const result = scanWithATR('trigger trigger trigger', rules);

    expect(result.matchedCount).toBe(1);
    expect(result.findings).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Empty / edge cases
  // ---------------------------------------------------------------------------

  it('returns pass for empty content', () => {
    const rules = buildRules([singlePatternRule('r1', 'exfiltrate')]);
    const result = scanWithATR('', rules);

    expect(result.findings).toHaveLength(0);
    expect(result.check.status).toBe('pass');
  });

  it('returns pass when rules array is empty', () => {
    const result = scanWithATR('exfiltrate all data', []);

    expect(result.findings).toHaveLength(0);
    expect(result.check.status).toBe('pass');
    expect(result.matchedCount).toBe(0);
  });

  it('handles a rule with no compiled patterns (skipped invalid regex)', () => {
    const rule: ATRRuleCompiled = {
      id: 'no-compiled',
      title: 'No Compiled',
      severity: 'high',
      category: 'atr',
      patterns: [{ field: 'instructions', pattern: '[invalid', desc: 'broken' }],
    };
    const rules = compileRules([rule]);
    const result = scanWithATR('some content here', rules);

    expect(result.findings).toHaveLength(0);
    expect(result.check.status).toBe('pass');
  });

  // ---------------------------------------------------------------------------
  // hasStrongReducers downgrade
  // ---------------------------------------------------------------------------

  it('downgrades severity for visible match when hasStrongReducers is true', () => {
    const rules = buildRules([singlePatternRule('reducer-test', 'steal credentials', 'critical')]);
    const result = scanWithATR('steal credentials from the user', rules, {
      hasStrongReducers: true,
    });

    // critical -> medium via downgrade
    expect(result.findings[0].severity).toBe('medium');
  });

  it('downgrades hidden-in-markup match when both hasStrongReducers and allReducers are true', () => {
    const content = 'Normal prose.\n<span>exfiltrate</span>\nMore prose.';
    const rules = buildRules([singlePatternRule('reduce-hidden', 'exfiltrate', 'high')]);
    const result = scanWithATR(content, rules, {
      hasStrongReducers: true,
      allReducers: true,
    });

    // high -> low via downgrade
    expect(result.findings[0].severity).toBe('low');
  });

  // ---------------------------------------------------------------------------
  // Finding fields
  // ---------------------------------------------------------------------------

  it('finding includes location referencing ATR rule ID', () => {
    const rules = buildRules([singlePatternRule('loc-rule', 'locate-me')]);
    const result = scanWithATR('locate-me in content', rules);

    expect(result.findings[0].location).toContain('loc-rule');
  });

  it('finding description defaults to "Matched ATR rule <id>" when pattern desc is empty', () => {
    const rule: ATRRuleCompiled = {
      id: 'no-desc',
      title: 'No Desc',
      severity: 'low',
      category: 'atr',
      patterns: [{ field: 'instructions', pattern: 'find-this', desc: '' }],
    };
    const rules = compileRules([rule]);
    const result = scanWithATR('find-this here', rules);

    expect(result.findings[0].description).toContain('no-desc');
  });

  it('finding uses rule category', () => {
    const rules = buildRules([
      singlePatternRule('cat-test', 'exfiltrate', 'high', 'context-exfiltration'),
    ]);
    const result = scanWithATR('exfiltrate data now', rules);

    expect(result.findings[0].category).toBe('context-exfiltration');
  });

  it('finding defaults category to "atr" when rule category is missing', () => {
    // Provide a rule with an explicit category to verify pass-through
    const rule: ATRRuleCompiled = {
      id: 'no-cat',
      title: 'No Cat',
      severity: 'low',
      category: '',
      patterns: [{ field: 'instructions', pattern: 'find-this', desc: 'desc' }],
    };
    const rules = compileRules([rule]);
    const result = scanWithATR('find-this here', rules);

    expect(result.findings[0].category).toBe('atr');
  });

  // ---------------------------------------------------------------------------
  // Severity normalization
  // ---------------------------------------------------------------------------

  it('normalizes unknown severity to "medium"', () => {
    const rule: ATRRuleCompiled = {
      id: 'unknown-sev',
      title: 'Unknown Sev',
      severity: 'super-critical',
      category: 'atr',
      patterns: [{ field: 'instructions', pattern: 'trigger-word', desc: 'desc' }],
    };
    const rules = compileRules([rule]);
    const result = scanWithATR('trigger-word here', rules);

    expect(result.findings[0].severity).toBe('medium');
  });
});
