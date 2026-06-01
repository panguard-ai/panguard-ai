/**
 * Unit coverage for the pure scan-event -> seeded-finding mapper. No Supabase
 * and no disk: the ATR rule enrichment is injected as a plain lookup, matching
 * the hybrid-seeding contract (carry scan-known fields across, enrich from the
 * rule, leave assessor fields blank).
 */

import { describe, it, expect } from 'vitest';
import {
  seedFindingsFromScans,
  type RuleEnrichment,
  type ScanEventInput,
} from '../../src/lib/report/from-scans';

function ev(over: Partial<ScanEventInput> = {}): ScanEventInput {
  return {
    severity: 'high',
    rule_id: 'ATR-2026-00543',
    target: 'mcp-gateway-01',
    target_hash: 'hash-a',
    payload_summary: 'redacted summary',
    endpoint_hostname: 'host-01',
    ...over,
  };
}

const enrichment: RuleEnrichment = {
  title: 'MCP server argv command injection',
  category: 'tool-poisoning',
  controls: [
    { framework: 'eu-ai-act', identifier: 'Art. 15', context: 'Cybersecurity', strength: 'primary' },
  ],
};

describe('seedFindingsFromScans', () => {
  it('dedups by (rule_id, target_hash), keeping first-seen', () => {
    const out = seedFindingsFromScans(
      [
        ev({ rule_id: 'ATR-1', target_hash: 'h1', payload_summary: 'first' }),
        ev({ rule_id: 'ATR-1', target_hash: 'h1', payload_summary: 'dupe' }),
        ev({ rule_id: 'ATR-2', target_hash: 'h1' }), // different rule, same hash -> distinct
        ev({ rule_id: 'ATR-1', target_hash: 'h2' }), // same rule, different hash -> distinct
      ],
      () => null
    );
    expect(out).toHaveLength(3);
    expect(out[0]?.evidence).toBe('first'); // dropped the dupe, not the original
  });

  it('falls back to target when target_hash is null for dedup', () => {
    const out = seedFindingsFromScans(
      [
        ev({ rule_id: 'ATR-1', target_hash: null, target: 't1' }),
        ev({ rule_id: 'ATR-1', target_hash: null, target: 't1' }), // dupe by target
        ev({ rule_id: 'ATR-1', target_hash: null, target: 't2' }), // distinct
      ],
      () => null
    );
    expect(out).toHaveLength(2);
  });

  it('assigns sequential PG-NNN references', () => {
    const out = seedFindingsFromScans(
      [ev({ target_hash: 'a' }), ev({ target_hash: 'b' }), ev({ target_hash: 'c' })],
      () => null
    );
    expect(out.map((f) => f.finding_ref)).toEqual(['PG-001', 'PG-002', 'PG-003']);
  });

  it('carries scan-known fields across (severity, rule, asset, redacted evidence)', () => {
    const [f] = seedFindingsFromScans([ev({ severity: 'critical' })], () => null);
    expect(f?.severity).toBe('critical');
    expect(f?.atr_rule_id).toBe('ATR-2026-00543');
    expect(f?.affected_asset).toBe('host-01'); // endpoint_hostname preferred
    expect(f?.evidence).toBe('redacted summary');
  });

  it('prefers endpoint_hostname, falls back to target for affected_asset', () => {
    const [withHost] = seedFindingsFromScans([ev({ endpoint_hostname: 'h', target: 't' })], () => null);
    expect(withHost?.affected_asset).toBe('h');
    const [noHost] = seedFindingsFromScans([ev({ endpoint_hostname: null, target: 't' })], () => null);
    expect(noHost?.affected_asset).toBe('t');
  });

  it('applies ATR enrichment (title, category, controls) when the rule is found', () => {
    const [f] = seedFindingsFromScans([ev()], () => enrichment);
    expect(f?.title).toBe('MCP server argv command injection');
    expect(f?.category).toBe('tool-poisoning');
    expect(f?.controls).toEqual(enrichment.controls);
  });

  it('copies controls rather than sharing the lookup reference', () => {
    const [f] = seedFindingsFromScans([ev()], () => enrichment);
    expect(f?.controls).not.toBe(enrichment.controls);
  });

  it('falls back title to rule_id, then a default, when enrichment is missing', () => {
    const [withRule] = seedFindingsFromScans([ev({ rule_id: 'ATR-X' })], () => null);
    expect(withRule?.title).toBe('ATR-X');
    const [noRule] = seedFindingsFromScans([ev({ rule_id: null })], () => null);
    expect(noRule?.title).toBe('Untitled scan finding');
  });

  it('leaves description / remediation / cvss blank for the assessor', () => {
    const [f] = seedFindingsFromScans([ev()], () => enrichment);
    expect(f?.description).toBe('');
    expect(f?.remediation).toBe('');
    expect(f?.cvss).toBeNull();
    expect(f?.cvss_vector).toBeNull();
  });

  it('never calls the lookup for events without a rule_id', () => {
    let calls = 0;
    seedFindingsFromScans([ev({ rule_id: null })], () => {
      calls += 1;
      return null;
    });
    expect(calls).toBe(0);
  });
});
