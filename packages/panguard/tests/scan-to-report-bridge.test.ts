/**
 * Tests for scan-to-report bridge
 * 掃描到報告橋接的測試
 */

import { describe, it, expect } from 'vitest';
import { scanFindingsToComplianceFindings } from '../src/bridges/scan-to-report.js';

describe('scanFindingsToComplianceFindings', () => {
  it('should convert scan findings to compliance findings', () => {
    const findings = [
      {
        id: 'FIND-001',
        title: 'Test Finding',
        description: 'Test description',
        severity: 'high',
        category: 'network',
      },
    ];
    const result = scanFindingsToComplianceFindings(findings);

    expect(result).toHaveLength(1);
    expect(result[0].findingId).toBe('FIND-001');
    expect(result[0].source).toBe('panguard-scan');
    expect(result[0].timestamp).toBeInstanceOf(Date);
  });

  it('should handle empty array', () => {
    expect(scanFindingsToComplianceFindings([])).toEqual([]);
  });

  it('should preserve all fields correctly', () => {
    const findings = [
      {
        id: 'X-999',
        title: 'Critical Issue',
        description: 'Detailed problem description',
        severity: 'critical',
        category: 'system',
        remediation: 'Apply patch immediately',
      },
    ];
    const [result] = scanFindingsToComplianceFindings(findings);

    expect(result.findingId).toBe('X-999');
    expect(result.severity).toBe('critical');
    expect(result.category).toBe('system');
    expect(result.title).toBe('Critical Issue');
    expect(result.description).toBe('Detailed problem description');
    expect(result.source).toBe('panguard-scan');
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should convert multiple findings', () => {
    const findings = [
      { id: 'A', title: 'First', description: 'D1', severity: 'high', category: 'network' },
      { id: 'B', title: 'Second', description: 'D2', severity: 'medium', category: 'system' },
      { id: 'C', title: 'Third', description: 'D3', severity: 'low', category: 'access_control' },
    ];
    const result = scanFindingsToComplianceFindings(findings);

    expect(result).toHaveLength(3);
    expect(result[0].findingId).toBe('A');
    expect(result[1].findingId).toBe('B');
    expect(result[2].findingId).toBe('C');
    expect(result[0].severity).toBe('high');
    expect(result[1].severity).toBe('medium');
    expect(result[2].severity).toBe('low');
  });

  it('should set source to panguard-scan for all findings', () => {
    const findings = [
      { id: '1', title: 'T', description: 'D', severity: 'info', category: 'misc' },
      { id: '2', title: 'T', description: 'D', severity: 'info', category: 'misc' },
    ];
    const result = scanFindingsToComplianceFindings(findings);

    for (const r of result) {
      expect(r.source).toBe('panguard-scan');
    }
  });

  it('should generate a Date timestamp for each finding', () => {
    const before = new Date();
    const findings = [{ id: '1', title: 'T', description: 'D', severity: 'high', category: 'c' }];
    const result = scanFindingsToComplianceFindings(findings);
    const after = new Date();

    expect(result[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should not mutate the input array', () => {
    const findings = [
      { id: 'ORIG', title: 'T', description: 'D', severity: 'high', category: 'c' },
    ];
    const frozen = Object.freeze(findings.map((f) => Object.freeze(f)));

    const result = scanFindingsToComplianceFindings(frozen);
    expect(result).toHaveLength(1);
    expect(result[0].findingId).toBe('ORIG');
  });
});
