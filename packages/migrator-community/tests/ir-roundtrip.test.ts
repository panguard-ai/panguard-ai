/**
 * IR round-trip tests.
 * Verifies that parsing a Sigma or YARA rule twice from the same input
 * produces structurally identical IR, and that IR survives JSON serialization.
 *
 * We exercise IR indirectly through the public convertSigma/convertYara API
 * because MigratorIR is an exported type but buildIR is internal.
 */

import { describe, it, expect } from 'vitest';
import { convertSigma, convertYara } from '../src/index.js';
import type { SigmaRule } from '../src/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SIGMA_RULE: SigmaRule = {
  title: 'Roundtrip Sigma',
  id: 'cccccccc-0000-0000-0000-000000000001',
  status: 'experimental',
  description: 'Used for roundtrip testing',
  author: 'Test Suite',
  date: '2024/06/01',
  level: 'medium',
  tags: ['attack.t1059'],
  logsource: { category: 'process_creation', product: 'windows' },
  detection: {
    selection: { 'CommandLine|contains': ['Invoke-Mimikatz', 'Invoke-Kerberoast'] },
    condition: 'selection',
  },
};

const YARA_RULE = `
rule RoundtripYara {
  meta:
    description = "roundtrip test rule"
    author = "Test Suite"
    severity = "medium"
    date = "2024-06-01"
  strings:
    $a = "malware_payload" nocase
  condition:
    $a
}
`;

// ---------------------------------------------------------------------------
// Helper: extract a canonical subset of AtrRuleObject for structural comparison.
// We skip `id` because the ID allocator may vary across separate calls.
// ---------------------------------------------------------------------------

function canonicalize(atr: NonNullable<Awaited<ReturnType<typeof convertSigma>>['atr']>) {
  return {
    title: atr.title,
    description: atr.description,
    author: atr.author,
    date: atr.date,
    severity: atr.severity,
    maturity: atr.maturity,
    detection: {
      condition: atr.detection.condition,
      // Sort conditions for stable comparison (order may vary by implementation)
      conditions: [...atr.detection.conditions]
        .map((c) => ({ field: c.field, operator: c.operator, value: c.value }))
        .sort((a, b) => `${a.field}:${a.value}`.localeCompare(`${b.field}:${b.value}`)),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ir-roundtrip', () => {
  it('Sigma parsed twice from identical input produces identical canonical ATR shape', async () => {
    // Use a fresh used-set each time so IDs don't collide between calls
    const first = await convertSigma(SIGMA_RULE);
    const second = await convertSigma(SIGMA_RULE);

    expect(first.outcome).toBe('converted');
    expect(second.outcome).toBe('converted');

    expect(canonicalize(first.atr!)).toEqual(canonicalize(second.atr!));
  });

  it('YARA parsed twice from identical input produces identical canonical ATR shape', async () => {
    const first = await convertYara(YARA_RULE);
    const second = await convertYara(YARA_RULE);

    expect(first.outcome).toBe('converted');
    expect(second.outcome).toBe('converted');

    expect(canonicalize(first.atr!)).toEqual(canonicalize(second.atr!));
  });

  it('AtrRuleObject survives JSON.stringify / JSON.parse without data loss', async () => {
    const result = await convertSigma(SIGMA_RULE);
    expect(result.outcome).toBe('converted');
    const original = result.atr!;

    const serialized = JSON.stringify(original);
    const restored = JSON.parse(serialized) as typeof original;

    // All primitive scalar fields must survive the round trip
    expect(restored.title).toBe(original.title);
    expect(restored.description).toBe(original.description);
    expect(restored.author).toBe(original.author);
    expect(restored.date).toBe(original.date);
    expect(restored.severity).toBe(original.severity);
    expect(restored.maturity).toBe(original.maturity);
    expect(restored.status).toBe(original.status);
    expect(restored.schema_version).toBe(original.schema_version);
    expect(restored.id).toBe(original.id);

    // Nested arrays must survive
    expect(restored.detection.condition).toBe(original.detection.condition);
    expect(restored.detection.conditions.length).toBe(original.detection.conditions.length);

    // response.actions must survive
    expect([...restored.response.actions]).toEqual([...original.response.actions]);
  });
});
