/**
 * Community migrator smoke tests.
 *
 * The shared parser/IR/transformer code is exhaustively tested in the
 * private enterprise repo. This file proves the public package surface
 * (convertSigma, convertYara, validateAtrOutput) is wired correctly and
 * doesn't regress when the community split is updated.
 */

import { describe, it, expect } from 'vitest';
import { convertSigma, convertYara, validateAtrOutput } from '../src/index.js';
import type { SigmaRule } from '../src/parsers/sigma/types.js';

const SIGMA: SigmaRule = {
  title: 'Test PowerShell Detection',
  id: '00000000-0000-0000-0000-000000000001',
  status: 'experimental',
  description: 'Smoke test rule.',
  level: 'medium',
  logsource: { category: 'process_creation', product: 'windows' },
  detection: {
    selection: { 'CommandLine|contains': ['Invoke-Mimikatz'] },
    condition: 'selection',
  },
  tags: ['attack.execution'],
};

const YARA = `
rule SmokeTest {
  meta:
    description = "smoke test"
    severity = "medium"
  strings:
    $a = "Invoke-Mimikatz" nocase
  condition:
    any of them
}
`;

describe('community migrator — public API smoke', () => {
  it('convertSigma converts a basic Sigma rule successfully', async () => {
    const result = await convertSigma(SIGMA);
    expect(result.outcome).toBe('converted');
    expect(result.atr).not.toBeNull();
    expect(result.atr?.id).toMatch(/^ATR-\d{4}-\d{5}$/);
  });

  it('convertSigma outputs validate against agent-threat-rules schema', async () => {
    const result = await convertSigma(SIGMA);
    expect(result.outcome).toBe('converted');
    if (result.atr === null) throw new Error('expected atr non-null');
    const validation = await validateAtrOutput(result.atr);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('convertYara converts a basic YARA rule successfully', async () => {
    const result = await convertYara(YARA);
    expect(result.outcome).toBe('converted');
    expect(result.atr?.id).toMatch(/^ATR-\d{4}-\d{5}$/);
  });

  it('convertSigma without enrichment produces no compliance fields', async () => {
    const result = await convertSigma(SIGMA);
    if (result.atr === null) throw new Error('expected atr non-null');
    expect(result.atr.compliance).toBeUndefined();
    expect(result.atr.test_cases).toBeUndefined();
  });

  it('convertSigma WITH supplied Enrichment integrates compliance fields', async () => {
    const result = await convertSigma(SIGMA, {
      enrichment: {
        has_agent_analogue: true,
        agent_source_type: 'tool_call',
        category: 'tool-poisoning',
        compliance: {
          eu_ai_act: [{ article: '15', context: 'Robustness', strength: 'primary' }],
        },
      },
    });
    if (result.atr === null) throw new Error('expected atr non-null');
    expect(result.atr.compliance?.eu_ai_act?.[0]?.article).toBe('15');
  });

  it('convertSigma allocates unique IDs across batch runs (used set)', async () => {
    const used = new Set<string>();
    const a = await convertSigma(SIGMA, { used });
    const b = await convertSigma(
      { ...SIGMA, id: '00000000-0000-0000-0000-000000000002' },
      { used }
    );
    expect(a.atr?.id).not.toBe(b.atr?.id);
  });
});
