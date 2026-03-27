/**
 * Tests for shared scan helpers
 * packages/panguard/src/cli/scan-helpers.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ScanOutputSystem,
  BuildScanOutputOptions,
} from '../src/cli/scan-helpers.js';

// Mock node:fs/promises
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

import { computeGrade, buildScanOutput, saveResults } from '../src/cli/scan-helpers.js';

const stubSystem: ScanOutputSystem = {
  os: 'darwin',
  arch: 'arm64',
  open_ports: 0,
  running_services: 5,
  firewall_enabled: true,
  security_tools_detected: 2,
};

describe('computeGrade', () => {
  it('returns A for safety score >= 90', () => {
    // riskScore 5 => safetyScore 95
    expect(computeGrade(5)).toEqual({ safetyScore: 95, grade: 'A' });
  });

  it('returns B for safety score >= 75 and < 90', () => {
    // riskScore 20 => safetyScore 80
    expect(computeGrade(20)).toEqual({ safetyScore: 80, grade: 'B' });
  });

  it('returns C for safety score >= 60 and < 75', () => {
    // riskScore 35 => safetyScore 65
    expect(computeGrade(35)).toEqual({ safetyScore: 65, grade: 'C' });
  });

  it('returns D for safety score >= 40 and < 60', () => {
    // riskScore 55 => safetyScore 45
    expect(computeGrade(55)).toEqual({ safetyScore: 45, grade: 'D' });
  });

  it('returns F for safety score < 40', () => {
    // riskScore 70 => safetyScore 30
    expect(computeGrade(70)).toEqual({ safetyScore: 30, grade: 'F' });
  });

  // Boundary cases
  it('returns A at boundary safetyScore = 90', () => {
    // riskScore 10 => safetyScore 90
    expect(computeGrade(10).grade).toBe('A');
  });

  it('returns B at boundary safetyScore = 75', () => {
    // riskScore 25 => safetyScore 75
    expect(computeGrade(25).grade).toBe('B');
  });

  it('returns C at boundary safetyScore = 60', () => {
    // riskScore 40 => safetyScore 60
    expect(computeGrade(40).grade).toBe('C');
  });

  it('returns D at boundary safetyScore = 40', () => {
    // riskScore 60 => safetyScore 40
    expect(computeGrade(60).grade).toBe('D');
  });

  it('returns F at boundary safetyScore = 39', () => {
    // riskScore 61 => safetyScore 39
    expect(computeGrade(61).grade).toBe('F');
  });

  it('clamps safetyScore to 0 for riskScore > 100', () => {
    const result = computeGrade(150);
    expect(result.safetyScore).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('handles negative riskScore (safetyScore > 100)', () => {
    // riskScore -10 => 100 - (-10) = 110, but Math.max(0, 110) = 110
    // The code does Math.max(0, 100 - riskScore), so negative risk gives > 100
    const result = computeGrade(-10);
    expect(result.safetyScore).toBe(110);
    expect(result.grade).toBe('A');
  });
});

describe('buildScanOutput', () => {
  const baseOpts: BuildScanOutputOptions = {
    version: '1.0.0',
    timestamp: '2026-03-27T00:00:00Z',
    target: '/test/path',
    riskScore: 20,
    riskLevel: 'LOW',
    scanDuration: 1234,
    findings: [
      {
        severity: 'HIGH',
        title: 'Unsafe eval',
        category: 'code-execution',
        description: 'Uses eval()',
        remediation: 'Remove eval',
        manualFix: ['Step 1', 'Step 2'],
      },
      {
        severity: 'LOW',
        title: 'Missing docs',
        category: 'documentation',
        description: 'No README',
        remediation: 'Add README',
      },
    ],
    system: stubSystem,
  };

  it('builds correct output structure with all fields', () => {
    const out = buildScanOutput(baseOpts);
    expect(out.version).toBe('1.0.0');
    expect(out.timestamp).toBe('2026-03-27T00:00:00Z');
    expect(out.target).toBe('/test/path');
    expect(out.risk_score).toBe(20);
    expect(out.risk_level).toBe('LOW');
    expect(out.grade).toBe('B');
    expect(out.scan_duration_ms).toBe(1234);
    expect(out.findings_count).toBe(2);
    expect(out.system).toEqual(stubSystem);
    expect(out.powered_by).toBe('Panguard AI');
    expect(out.agent_friendly).toBe(true);
  });

  it('numbers findings 1-based', () => {
    const out = buildScanOutput(baseOpts);
    expect(out.findings[0].id).toBe(1);
    expect(out.findings[1].id).toBe(2);
  });

  it('includes manual_fix when includeManualFix is true', () => {
    const out = buildScanOutput({ ...baseOpts, includeManualFix: true });
    expect(out.findings[0].manual_fix).toEqual(['Step 1', 'Step 2']);
    expect(out.findings[1].manual_fix).toBeNull();
  });

  it('omits manual_fix when includeManualFix is false', () => {
    const out = buildScanOutput({ ...baseOpts, includeManualFix: false });
    expect(out.findings[0]).not.toHaveProperty('manual_fix');
    expect(out.findings[1]).not.toHaveProperty('manual_fix');
  });

  it('omits manual_fix when includeManualFix is undefined', () => {
    const out = buildScanOutput(baseOpts);
    expect(out.findings[0]).not.toHaveProperty('manual_fix');
  });

  it('produces findings_count 0 for empty findings', () => {
    const out = buildScanOutput({ ...baseOpts, findings: [] });
    expect(out.findings_count).toBe(0);
    expect(out.findings).toEqual([]);
  });
});

describe('saveResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes JSON to file and creates parent directories', async () => {
    const data = buildScanOutput({
      version: '1.0.0',
      timestamp: '2026-03-27T00:00:00Z',
      target: '/test',
      riskScore: 10,
      riskLevel: 'LOW',
      scanDuration: 100,
      findings: [],
      system: stubSystem,
    });

    await saveResults('/tmp/output/results.json', data);

    expect(mockMkdir).toHaveBeenCalledWith('/tmp/output', { recursive: true });
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/tmp/output/results.json',
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  });
});
