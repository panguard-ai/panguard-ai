/**
 * Sigma parser unit tests.
 * Exercises parseSigma() via the public convertSigma() API surface.
 */

import { describe, it, expect } from 'vitest';
import { convertSigma } from '../src/index.js';
import type { SigmaRule } from '../src/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL: SigmaRule = {
  title: 'Minimal Rule',
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  logsource: { category: 'process_creation', product: 'windows' },
  detection: {
    selection: { 'CommandLine|contains': 'evil.exe' },
    condition: 'selection',
  },
};

const WITH_MODIFIER: SigmaRule = {
  title: 'Contains Modifier',
  id: 'aaaaaaaa-0000-0000-0000-000000000002',
  logsource: { category: 'process_creation', product: 'windows' },
  detection: {
    selection: { 'fieldname|contains': ['x', 'y'] },
    condition: 'selection',
  },
};

const MULTI_SELECTION: SigmaRule = {
  title: 'Multi Selection OR',
  id: 'aaaaaaaa-0000-0000-0000-000000000003',
  logsource: { category: 'process_creation', product: 'windows' },
  detection: {
    selection_a: { 'Image|endswith': '\\powershell.exe' },
    selection_b: { 'CommandLine|contains': 'Invoke-Mimikatz' },
    condition: '1 of selection*',
  },
};

const WITH_METADATA: SigmaRule = {
  title: 'Metadata Rule',
  id: 'aaaaaaaa-0000-0000-0000-000000000004',
  status: 'stable',
  description: 'Tests metadata preservation',
  author: 'Test Author',
  date: '2024/01/15',
  references: ['https://example.com/ref1', 'https://example.com/ref2'],
  level: 'high',
  tags: ['attack.t1059', 'attack.execution'],
  logsource: { category: 'process_creation', product: 'windows' },
  detection: {
    selection: { 'CommandLine|contains': 'malware' },
    condition: 'selection',
  },
};

const MALFORMED_NO_DETECTION: SigmaRule = {
  title: 'Missing Detection',
  id: 'aaaaaaaa-0000-0000-0000-000000000005',
  logsource: { category: 'process_creation', product: 'windows' },
  // Cast to force missing detection — tests the error path
  detection: null as unknown as SigmaRule['detection'],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sigma-parser', () => {
  it('valid minimal Sigma rule (title + detection + condition) parses without error', async () => {
    const result = await convertSigma(MINIMAL);
    expect(result.outcome).toBe('converted');
    expect(result.atr).not.toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.atr?.title).toBe('Minimal Rule');
  });

  it('selection with |contains modifier and array values parses correctly', async () => {
    const result = await convertSigma(WITH_MODIFIER);
    // Array values get folded to a regex alternation in the ATR conditions
    expect(result.outcome).toBe('converted');
    expect(result.atr).not.toBeNull();
    const conditions = result.atr?.detection.conditions ?? [];
    expect(conditions.length).toBeGreaterThan(0);
    // Multi-value arrays become a regex alternation
    const firstCond = conditions[0]!;
    expect(firstCond.operator).toBe('regex');
    // The alternation should include both values
    expect(firstCond.value).toContain('x');
    expect(firstCond.value).toContain('y');
  });

  it('multiple selections with OR condition (1 of selection*) produces converted outcome', async () => {
    const result = await convertSigma(MULTI_SELECTION);
    // combinator=any with each selection having exactly 1 pattern is supported
    expect(result.outcome).toBe('converted');
    expect(result.atr).not.toBeNull();
    expect(result.atr?.detection.condition).toBe('any');
  });

  it('tags, references, level metadata are preserved into the ATR output', async () => {
    const result = await convertSigma(WITH_METADATA);
    expect(result.outcome).toBe('converted');
    const atr = result.atr!;
    // severity maps from level: 'high'
    expect(atr.severity).toBe('high');
    // maturity maps from status: 'stable'
    expect(atr.maturity).toBe('stable');
    // references preserved under migrator_provenance (external refs live there)
    // OR under references.external — either path is acceptable
    const externalRefs = atr.references?.external ?? [];
    const provenanceSigmaTags = atr.migrator_provenance?.sigma_tags ?? [];
    // tags: sigma tags forwarded to provenance
    expect(provenanceSigmaTags).toContain('attack.t1059');
    expect(provenanceSigmaTags).toContain('attack.execution');
    // MITRE ATT&CK technique ID extracted from attack.t1059
    const mitre = atr.references?.mitre_attack ?? [];
    expect(mitre).toContain('T1059');
    // external references passed through
    expect([...externalRefs]).toEqual(
      expect.arrayContaining(['https://example.com/ref1', 'https://example.com/ref2'])
    );
  });

  it('malformed Sigma (null detection block) returns skipped outcome with clear reason', async () => {
    const result = await convertSigma(MALFORMED_NO_DETECTION);
    // Parser returns null IR → outcome is 'skipped', not 'failed'
    expect(result.outcome).toBe('skipped');
    expect(result.atr).toBeNull();
    expect(result.skipReason).toBeTruthy();
    // The reason should mention detection
    expect(result.skipReason!.toLowerCase()).toMatch(/detection/);
  });
});
