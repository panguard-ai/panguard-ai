/**
 * YARA parser unit tests.
 * Exercises parseFirstYaraRule() + parseYara() via convertYara() public API.
 */

import { describe, it, expect } from 'vitest';
import { convertYara } from '../src/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_YARA = `
rule MinimalRule {
  strings:
    $a = "evil_pattern"
  condition:
    any of them
}
`;

const HEX_STRING_YARA = `
rule HexStringRule {
  strings:
    $mz = { 4D 5A 90 00 }
  condition:
    $mz
}
`;

const REGEX_STRING_YARA = `
rule RegexRule {
  strings:
    $re = /foo.*bar/
  condition:
    $re
}
`;

const META_BLOCK_YARA = `
rule MetaRule {
  meta:
    description = "detects malware dropper"
    author = "Jane Doe"
    severity = "high"
    date = "2024-03-20"
    reference = "https://example.com/report"
  strings:
    $a = "dropper_payload"
  condition:
    $a
}
`;

const UNBALANCED_BRACES_YARA = `
rule BrokenRule {
  strings:
    $a = "test"
  condition:
    $a
`;
// Note: missing closing brace — unbalanced

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('yara-parser', () => {
  it('valid minimal YARA rule (name + strings + condition) parses without error', async () => {
    const result = await convertYara(MINIMAL_YARA);
    expect(result.outcome).toBe('converted');
    expect(result.atr).not.toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.atr?.title).toBe('MinimalRule');
  });

  it('YARA with hex strings is rejected with clear skip reason (no text-scan analogue)', async () => {
    const result = await convertYara(HEX_STRING_YARA);
    // Hex strings have no text-scan analogue — parser must skip, not crash
    expect(result.outcome).toBe('skipped');
    expect(result.atr).toBeNull();
    expect(result.skipReason).toBeTruthy();
    // Reason should mention hex
    expect(result.skipReason!.toLowerCase()).toMatch(/hex/);
  });

  it('YARA with regex strings parses into IR with operator=regex', async () => {
    const result = await convertYara(REGEX_STRING_YARA);
    expect(result.outcome).toBe('converted');
    expect(result.atr).not.toBeNull();
    const conditions = result.atr?.detection.conditions ?? [];
    expect(conditions.length).toBeGreaterThan(0);
    const regexCond = conditions.find((c) => c.operator === 'regex');
    expect(regexCond).toBeDefined();
    expect(regexCond!.value).toContain('foo');
    expect(regexCond!.value).toContain('bar');
  });

  it('YARA meta block (author, severity, date, reference) is preserved into ATR output', async () => {
    const result = await convertYara(META_BLOCK_YARA);
    expect(result.outcome).toBe('converted');
    const atr = result.atr!;
    // description from meta.description
    expect(atr.description).toBe('detects malware dropper');
    // author from meta.author
    expect(atr.author).toBe('Jane Doe');
    // severity from meta.severity = "high"
    expect(atr.severity).toBe('high');
    // date from meta.date = "2024-03-20" normalized to 2024/03/20
    expect(atr.date).toBe('2024/03/20');
    // reference forwarded
    const externalRefs = atr.references?.external ?? [];
    expect([...externalRefs]).toContain('https://example.com/report');
  });

  it('malformed YARA with unbalanced braces returns skipped outcome (lexer finds no rule)', async () => {
    const result = await convertYara(UNBALANCED_BRACES_YARA);
    // The lexer cannot find a balanced rule block — should return skipped, not throw
    expect(result.outcome).toBe('skipped');
    expect(result.atr).toBeNull();
    expect(result.skipReason).toBeTruthy();
  });
});
