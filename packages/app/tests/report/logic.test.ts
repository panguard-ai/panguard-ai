/**
 * Unit tests for the deliverable report's pure logic. These pin the
 * invariants the PDF generator and downstream verifiers rely on:
 *   - severity ordering / counting / overall rating
 *   - CVSS qualitative banding (CVSS v3.1 thresholds)
 *   - traceability flattening + stable sort
 *   - region -> framework mapping
 *   - deterministic, order-independent integrity hashing
 *   - boundary validation
 */

import { describe, it, expect } from 'vitest';
import {
  SEVERITY_ORDER,
  buildTraceabilityRows,
  complianceFrameworksForRegion,
  computeIntegrityHash,
  countBySeverity,
  cvssRatingLabel,
  defaultMethodology,
  frameworkDisplayName,
  overallRiskRating,
  signIntegrity,
  sortFindingsBySeverity,
  validateReportInput,
} from '../../src/lib/report/logic';
import type { DeliverableFinding, DeliverableReportInput } from '../../src/lib/report/types';

function finding(over: Partial<DeliverableFinding> = {}): DeliverableFinding {
  return {
    id: over.id ?? 'PG-001',
    title: over.title ?? 'Test finding',
    severity: over.severity ?? 'high',
    description: over.description ?? 'A description.',
    remediation: over.remediation ?? 'Fix it.',
    ...over,
  };
}

function validInput(over: Partial<DeliverableReportInput> = {}): DeliverableReportInput {
  return {
    client: { name: 'Example Bank' },
    assessor: { name: 'Partner JV' },
    region: 'eu',
    classification: 'confidential',
    primaryFramework: 'eu-ai-act',
    findings: [finding()],
    scope: ['One system'],
    language: 'en',
    reportId: 'PG-RPT-2026-0001',
    version: '1.0',
    reportDate: '2026-05-30',
    preparedBy: 'Jordan Reyes',
    ...over,
  };
}

describe('SEVERITY_ORDER', () => {
  it('orders most-severe first', () => {
    expect(SEVERITY_ORDER.critical).toBeLessThan(SEVERITY_ORDER.high);
    expect(SEVERITY_ORDER.high).toBeLessThan(SEVERITY_ORDER.medium);
    expect(SEVERITY_ORDER.medium).toBeLessThan(SEVERITY_ORDER.low);
    expect(SEVERITY_ORDER.low).toBeLessThan(SEVERITY_ORDER.info);
  });
});

describe('sortFindingsBySeverity', () => {
  it('sorts most-severe first, ties broken by id, without mutating input', () => {
    const input = [
      finding({ id: 'PG-003', severity: 'low' }),
      finding({ id: 'PG-002', severity: 'critical' }),
      finding({ id: 'PG-001', severity: 'critical' }),
      finding({ id: 'PG-004', severity: 'info' }),
    ];
    const snapshot = input.map((f) => f.id);
    const sorted = sortFindingsBySeverity(input);
    expect(sorted.map((f) => f.id)).toEqual(['PG-001', 'PG-002', 'PG-003', 'PG-004']);
    // immutability: original array untouched
    expect(input.map((f) => f.id)).toEqual(snapshot);
  });

  it('returns empty for empty input', () => {
    expect(sortFindingsBySeverity([])).toEqual([]);
  });
});

describe('countBySeverity', () => {
  it('tallies all bands with zeroes present', () => {
    const counts = countBySeverity([
      finding({ id: 'a', severity: 'critical' }),
      finding({ id: 'b', severity: 'critical' }),
      finding({ id: 'c', severity: 'low' }),
    ]);
    expect(counts).toEqual({ critical: 2, high: 0, medium: 0, low: 1, info: 0 });
  });

  it('returns all zeroes for empty input', () => {
    expect(countBySeverity([])).toEqual({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
  });
});

describe('overallRiskRating', () => {
  it('returns the worst severity present', () => {
    expect(overallRiskRating({ critical: 1, high: 5, medium: 0, low: 0, info: 0 })).toBe('critical');
    expect(overallRiskRating({ critical: 0, high: 1, medium: 9, low: 0, info: 0 })).toBe('high');
    expect(overallRiskRating({ critical: 0, high: 0, medium: 2, low: 0, info: 0 })).toBe('medium');
    expect(overallRiskRating({ critical: 0, high: 0, medium: 0, low: 3, info: 0 })).toBe('low');
    expect(overallRiskRating({ critical: 0, high: 0, medium: 0, low: 0, info: 4 })).toBe('info');
  });

  it('returns none when there are no findings', () => {
    expect(overallRiskRating({ critical: 0, high: 0, medium: 0, low: 0, info: 0 })).toBe('none');
  });
});

describe('cvssRatingLabel', () => {
  it('maps CVSS v3.1 qualitative bands at the boundaries', () => {
    expect(cvssRatingLabel(0)).toBe('none');
    expect(cvssRatingLabel(0.1)).toBe('low');
    expect(cvssRatingLabel(3.9)).toBe('low');
    expect(cvssRatingLabel(4.0)).toBe('medium');
    expect(cvssRatingLabel(6.9)).toBe('medium');
    expect(cvssRatingLabel(7.0)).toBe('high');
    expect(cvssRatingLabel(8.9)).toBe('high');
    expect(cvssRatingLabel(9.0)).toBe('critical');
    expect(cvssRatingLabel(10)).toBe('critical');
  });

  it('returns null for out-of-range or non-finite scores', () => {
    expect(cvssRatingLabel(-1)).toBeNull();
    expect(cvssRatingLabel(10.1)).toBeNull();
    expect(cvssRatingLabel(Number.NaN)).toBeNull();
  });
});

describe('buildTraceabilityRows', () => {
  it('flattens one row per control, skips findings with none, and sorts', () => {
    const rows = buildTraceabilityRows([
      finding({ id: 'PG-002', severity: 'high', atrRuleId: 'ATR-2026-00540', controls: [
        { framework: 'eu-ai-act', identifier: 'Art. 15', context: 'Robustness' },
        { framework: 'iso-42001', identifier: '8.2', context: 'Risk treatment' },
      ] }),
      finding({ id: 'PG-001', severity: 'critical', controls: [
        { framework: 'eu-ai-act', identifier: 'Art. 9' },
      ] }),
      finding({ id: 'PG-003', severity: 'low' }), // no controls -> skipped
    ]);
    expect(rows).toHaveLength(3);
    // critical first
    expect(rows[0]).toMatchObject({ findingId: 'PG-001', controlIdentifier: 'Art. 9' });
    // then PG-002's two controls, sorted by identifier
    expect(rows[1]!.findingId).toBe('PG-002');
    expect(rows[2]!.findingId).toBe('PG-002');
    expect(rows[1]!.atrRuleId).toBe('ATR-2026-00540');
  });

  it('returns empty when no finding has controls', () => {
    expect(buildTraceabilityRows([finding()])).toEqual([]);
  });
});

describe('complianceFrameworksForRegion', () => {
  it('maps each region to in-enum frameworks', () => {
    expect(complianceFrameworksForRegion('eu')).toContain('eu-ai-act');
    expect(complianceFrameworksForRegion('us')).toContain('nist-ai-rmf');
    expect(complianceFrameworksForRegion('apac')).toContain('iso-42001');
    expect(complianceFrameworksForRegion('global')).toContain('owasp-agentic');
  });
});

describe('defaultMethodology / frameworkDisplayName', () => {
  it('returns localized methodology bullets', () => {
    expect(defaultMethodology('en').length).toBeGreaterThan(0);
    expect(defaultMethodology('zh-Hant').length).toBeGreaterThan(0);
    expect(defaultMethodology('en')).not.toEqual(defaultMethodology('zh-Hant'));
  });

  it('returns stable framework display names', () => {
    expect(frameworkDisplayName('eu-ai-act')).toBe('EU AI Act');
    expect(frameworkDisplayName('iso-42001')).toBe('ISO/IEC 42001');
  });
});

describe('computeIntegrityHash / signIntegrity', () => {
  it('is a 64-char hex sha256', () => {
    const hash = computeIntegrityHash(validInput());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic and independent of findings/control array order', () => {
    const a = validInput({
      findings: [
        finding({ id: 'PG-001', controls: [
          { framework: 'eu-ai-act', identifier: 'Art. 9' },
          { framework: 'iso-42001', identifier: '8.2' },
        ] }),
        finding({ id: 'PG-002', severity: 'low' }),
      ],
    });
    const b = validInput({
      findings: [
        finding({ id: 'PG-002', severity: 'low' }),
        finding({ id: 'PG-001', controls: [
          { framework: 'iso-42001', identifier: '8.2' },
          { framework: 'eu-ai-act', identifier: 'Art. 9' },
        ] }),
      ],
    });
    expect(computeIntegrityHash(a)).toBe(computeIntegrityHash(b));
  });

  it('changes when substantive content changes', () => {
    const base = validInput();
    const changed = validInput({ findings: [finding({ description: 'Different.' })] });
    expect(computeIntegrityHash(base)).not.toBe(computeIntegrityHash(changed));
  });

  it('produces a stable HMAC over the hash', () => {
    const hash = computeIntegrityHash(validInput());
    const sig1 = signIntegrity(hash, 'secret-key');
    const sig2 = signIntegrity(hash, 'secret-key');
    expect(sig1).toMatch(/^[0-9a-f]{64}$/);
    expect(sig1).toBe(sig2);
    expect(signIntegrity(hash, 'other-key')).not.toBe(sig1);
  });
});

describe('validateReportInput', () => {
  it('accepts a complete input', () => {
    expect(validateReportInput(validInput())).toEqual([]);
  });

  it('flags missing required fields', () => {
    const errors = validateReportInput(validInput({ reportId: '', preparedBy: '' }));
    expect(errors.some((e) => e.includes('reportId'))).toBe(true);
    expect(errors.some((e) => e.includes('preparedBy'))).toBe(true);
  });

  it('flags a malformed date', () => {
    const errors = validateReportInput(validInput({ reportDate: '30/05/2026' }));
    expect(errors.some((e) => e.includes('reportDate'))).toBe(true);
  });

  it('flags an out-of-range CVSS on a finding', () => {
    const errors = validateReportInput(validInput({ findings: [finding({ cvss: 42 })] }));
    expect(errors.some((e) => e.includes('cvss'))).toBe(true);
  });

  it('flags findings missing required sub-fields', () => {
    const errors = validateReportInput(
      validInput({ findings: [finding({ id: '', title: '', description: '', remediation: '' })] })
    );
    expect(errors.some((e) => e.includes('findings[0].id'))).toBe(true);
    expect(errors.some((e) => e.includes('findings[0].title'))).toBe(true);
  });
});
