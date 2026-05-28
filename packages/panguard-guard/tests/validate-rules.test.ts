/**
 * validateRulesDir() unit tests — pin the dry-run validator contract that
 * the `panguard-guard validate <rules-dir>` CLI exposes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateRulesDir } from '../src/cli/validate-rules.js';

let dir: string;

const VALID_RULE = `
schema_version: '0.1'
id: ATR-2026-90001
title: Sample valid rule
severity: medium
description: Test fixture.
author: Validate Test Suite
date: 2026-05-27
rule_version: 1
status: experimental
detection_tier: pattern
maturity: experimental
tags:
  category: tool-poisoning
  scan_target: agent_action
  confidence: high
agent_source:
  type: tool_call
  framework: [claude-code]
  provider: [anthropic]
detection:
  condition: any
  conditions:
    - field: tool_call.arguments
      operator: regex
      patterns:
        - 'trigger-payload-90001'
response:
  actions: [block]
test_cases:
  true_positives:
    - 'A line containing trigger-payload-90001 inside'
  true_negatives:
    - 'A perfectly safe line that should not match'
`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'validate-rules-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('validateRulesDir', () => {
  it('returns empty report for empty dir', () => {
    const r = validateRulesDir(dir);
    expect(r.totalRules).toBe(0);
    expect(r.passed).toBe(0);
    expect(r.failed).toBe(0);
  });

  it('passes a well-formed rule with TP + TN', () => {
    writeFileSync(join(dir, 'valid.yaml'), VALID_RULE);
    const r = validateRulesDir(dir);
    expect(r.totalRules).toBe(1);
    expect(r.passed).toBe(1);
    expect(r.failed).toBe(0);
    expect(r.results[0]?.ruleId).toBe('ATR-2026-90001');
    expect(r.results[0]?.testCaseCounts.truePositives).toBe(1);
    expect(r.results[0]?.testCaseCounts.trueNegatives).toBe(1);
  });

  it('fails YAML that does not parse', () => {
    writeFileSync(join(dir, 'broken.yaml'), 'not: valid: yaml: :::');
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    expect(r.results[0]?.failures[0]).toMatch(/YAML parse failed/);
  });

  it('fails YAML root that is a list', () => {
    writeFileSync(join(dir, 'list.yaml'), '- foo\n- bar\n');
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    expect(r.results[0]?.failures).toContain('YAML root must be an object');
  });

  it('fails a rule missing required fields', () => {
    writeFileSync(join(dir, 'minimal.yaml'), `id: ATR-test\ndetection: {}\n`);
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    const failures = r.results[0]?.failures ?? [];
    expect(failures.some((f) => f.includes('missing required field: title'))).toBe(true);
    expect(failures.some((f) => f.includes('missing required field: severity'))).toBe(true);
    expect(failures.some((f) => f.includes('agent_source.type'))).toBe(true);
  });

  it('fails when detection.conditions is empty', () => {
    writeFileSync(
      join(dir, 'empty-conditions.yaml'),
      `id: ATR-x
title: t
severity: low
agent_source:
  type: tool_call
detection:
  conditions: []
`
    );
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    expect(r.results[0]?.failures.some((f) => /non-empty/.test(f))).toBe(true);
  });

  it('fails on regex that does not compile', () => {
    writeFileSync(
      join(dir, 'bad-regex.yaml'),
      `id: ATR-bad-re
title: t
severity: low
agent_source:
  type: tool_call
detection:
  conditions:
    - field: x
      operator: regex
      patterns:
        - '['
`
    );
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    expect(r.results[0]?.failures.some((f) => /failed to compile/.test(f))).toBe(true);
  });

  it('fails on regex larger than 2000 chars (ReDoS guard)', () => {
    const huge = 'a'.repeat(2500);
    writeFileSync(
      join(dir, 'huge.yaml'),
      `id: ATR-huge
title: t
severity: low
agent_source:
  type: tool_call
detection:
  conditions:
    - field: x
      operator: regex
      patterns:
        - '${huge}'
`
    );
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    expect(r.results[0]?.failures.some((f) => /exceeds 2000 chars/.test(f))).toBe(true);
  });

  it('fails when a declared true_positive does not match the rule', () => {
    const rule = VALID_RULE.replace(
      `  true_positives:\n    - 'A line containing trigger-payload-90001 inside'`,
      `  true_positives:\n    - 'A line that does not contain the magic substring'`
    );
    writeFileSync(join(dir, 'tp-miss.yaml'), rule);
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    expect(r.results[0]?.failures.some((f) => /true_positive\[0\] does not match/.test(f))).toBe(
      true
    );
  });

  it('fails when a declared true_negative does match (self-FP)', () => {
    const rule = VALID_RULE.replace(
      `  true_negatives:\n    - 'A perfectly safe line that should not match'`,
      `  true_negatives:\n    - 'A line containing trigger-payload-90001 inside'`
    );
    writeFileSync(join(dir, 'tn-match.yaml'), rule);
    const r = validateRulesDir(dir);
    expect(r.failed).toBe(1);
    expect(
      r.results[0]?.failures.some((f) => /true_negative\[0\] unexpectedly matched/.test(f))
    ).toBe(true);
  });

  it('walks subdirectories', () => {
    const sub = join(dir, 'category', 'nested');
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(sub, 'deep.yaml'), VALID_RULE);
    const r = validateRulesDir(dir);
    expect(r.totalRules).toBe(1);
    expect(r.passed).toBe(1);
  });

  it('aggregates pass + fail across multiple files', () => {
    writeFileSync(join(dir, 'good.yaml'), VALID_RULE);
    writeFileSync(join(dir, 'bad.yaml'), 'not yaml');
    writeFileSync(join(dir, 'incomplete.yaml'), 'id: x\n');
    const r = validateRulesDir(dir);
    expect(r.totalRules).toBe(3);
    expect(r.passed).toBe(1);
    expect(r.failed).toBe(2);
    expect(r.failures).toHaveLength(2);
  });

  it('throws when directory does not exist', () => {
    expect(() => validateRulesDir('/definitely/not/a/real/path')).toThrow(
      /rules directory not found/
    );
  });
});
