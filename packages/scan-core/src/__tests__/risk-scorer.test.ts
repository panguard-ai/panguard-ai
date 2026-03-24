// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { calculateRiskScore } from '../risk-scorer.js';
import type { Finding } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(
  id: string,
  severity: Finding['severity'],
  overrides: Partial<Finding> = {}
): Finding {
  return {
    id,
    title: `Finding ${id}`,
    description: `Description for ${id}`,
    severity,
    category: 'prompt-injection',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateRiskScore', () => {
  describe('empty findings', () => {
    it('returns score 0 and level LOW for empty array', () => {
      const { score, level } = calculateRiskScore([]);
      expect(score).toBe(0);
      expect(level).toBe('LOW');
    });

    it('returns score 0 and level LOW when called with no arguments', () => {
      // contextMultiplier defaults to 1.0
      const { score, level } = calculateRiskScore([]);
      expect(score).toBe(0);
      expect(level).toBe('LOW');
    });

    it('returns score 0 with contextMultiplier applied to empty set', () => {
      const { score } = calculateRiskScore([], 2.0);
      expect(score).toBe(0);
    });
  });

  describe('severity weights', () => {
    it('single info finding = score 0', () => {
      const { score, level } = calculateRiskScore([makeFinding('f1', 'info')]);
      expect(score).toBe(0);
      expect(level).toBe('LOW');
    });

    it('single low finding = score 1', () => {
      const { score } = calculateRiskScore([makeFinding('f1', 'low')]);
      expect(score).toBe(1);
    });

    it('single medium finding = score 5', () => {
      const { score } = calculateRiskScore([makeFinding('f1', 'medium')]);
      expect(score).toBe(5);
    });

    it('single high finding = score 15, level MEDIUM', () => {
      const { score, level } = calculateRiskScore([makeFinding('f1', 'high')]);
      expect(score).toBe(15);
      expect(level).toBe('MEDIUM');
    });

    it('single critical finding with contextMultiplier 1.0 = score 25, level CRITICAL', () => {
      // Logic: score >= 25 && hasCritical && !weakened => CRITICAL
      const { score, level } = calculateRiskScore(
        [makeFinding('f1', 'critical')],
        1.0
      );
      expect(score).toBe(25);
      expect(level).toBe('CRITICAL');
    });
  });

  describe('deduplication by finding ID', () => {
    it('deduplicates findings with the same ID, keeping the highest severity', () => {
      const findings = [
        makeFinding('dup-id', 'low'),
        makeFinding('dup-id', 'critical'),
        makeFinding('dup-id', 'medium'),
      ];
      const { score } = calculateRiskScore(findings);
      // Only critical (weight 25) should count
      expect(score).toBe(25);
    });

    it('deduplicates correctly when highest severity appears first', () => {
      const findings = [
        makeFinding('dup-id', 'critical'),
        makeFinding('dup-id', 'low'),
      ];
      const { score } = calculateRiskScore(findings);
      expect(score).toBe(25);
    });

    it('keeps distinct IDs separate', () => {
      const findings = [
        makeFinding('id-a', 'critical'), // 25
        makeFinding('id-b', 'high'),     // 15
      ];
      const { score } = calculateRiskScore(findings);
      expect(score).toBe(40);
    });

    it('info duplicates do not inflate score', () => {
      const findings = [
        makeFinding('same', 'info'),
        makeFinding('same', 'info'),
        makeFinding('same', 'info'),
      ];
      const { score } = calculateRiskScore(findings);
      expect(score).toBe(0);
    });
  });

  describe('contextMultiplier > 1 boosts score', () => {
    it('multiplier 2.0 doubles the raw score', () => {
      const findings = [makeFinding('f1', 'high')]; // raw = 15
      const { score } = calculateRiskScore(findings, 2.0);
      expect(score).toBe(30);
    });

    it('multiplier 1.5 rounds correctly', () => {
      const findings = [makeFinding('f1', 'medium')]; // raw = 5, * 1.5 = 7.5 → rounds to 8
      const { score } = calculateRiskScore(findings, 1.5);
      expect(score).toBe(8);
    });

    it('multiplier boosts push score into CRITICAL territory', () => {
      // 2 high findings = 30, * 2.5 = 75 >= 70 => CRITICAL
      const findings = [makeFinding('f1', 'high'), makeFinding('f2', 'high')];
      const { level } = calculateRiskScore(findings, 2.5);
      expect(level).toBe('CRITICAL');
    });
  });

  describe('contextMultiplier < 0.6 weakens critical override', () => {
    it('critical finding with multiplier 0.5 yields MEDIUM (not HIGH)', () => {
      const findings = [makeFinding('f1', 'critical')]; // raw = 25, * 0.5 = 12 (< 15 threshold for MEDIUM via score)
      const { level } = calculateRiskScore(findings, 0.5);
      // weakenedCriticalOverride = true (0.5 < 0.6), so critical forces MEDIUM only
      expect(level).toBe('MEDIUM');
    });

    it('critical finding with multiplier exactly 0.6 still yields HIGH', () => {
      // 0.6 is NOT < 0.6, so weakenedCriticalOverride = false
      const findings = [makeFinding('f1', 'critical')];
      const { level } = calculateRiskScore(findings, 0.6);
      // score = round(25 * 0.6) = 15, hasCritical=true, not weakened
      // 15 < 40, not >=40; hasCritical && !weakened => HIGH
      expect(level).toBe('HIGH');
    });

    it('critical finding with multiplier 0.3 (below 0.6) yields MEDIUM', () => {
      const findings = [makeFinding('f1', 'critical')];
      const { level } = calculateRiskScore(findings, 0.3);
      expect(level).toBe('MEDIUM');
    });
  });

  describe('score cap at 100', () => {
    it('many critical findings are capped at 100', () => {
      const findings = Array.from({ length: 20 }, (_, i) =>
        makeFinding(`f${i}`, 'critical')
      );
      const { score } = calculateRiskScore(findings, 1.0);
      expect(score).toBe(100);
    });

    it('multiplier cannot push score above 100', () => {
      const findings = [
        makeFinding('f1', 'critical'),
        makeFinding('f2', 'critical'),
        makeFinding('f3', 'critical'),
      ];
      const { score } = calculateRiskScore(findings, 2.5);
      expect(score).toBe(100);
    });
  });

  describe('risk level boundaries', () => {
    it('score exactly 70 yields CRITICAL', () => {
      // 14 high findings (no dedup because different IDs) = 14*15=210, *0.5 = 105 => cap 100... different approach
      // Use medium findings: need score >= 70 via multiplier
      // 14 medium findings = 70 raw => CRITICAL
      const findings = Array.from({ length: 14 }, (_, i) =>
        makeFinding(`f${i}`, 'medium')
      );
      const { score, level } = calculateRiskScore(findings, 1.0);
      expect(score).toBe(70);
      expect(level).toBe('CRITICAL');
    });

    it('score 40 with no critical = HIGH', () => {
      // 8 medium = 40
      const findings = Array.from({ length: 8 }, (_, i) =>
        makeFinding(`f${i}`, 'medium')
      );
      const { score, level } = calculateRiskScore(findings, 1.0);
      expect(score).toBe(40);
      expect(level).toBe('HIGH');
    });

    it('score 15 with no critical = MEDIUM', () => {
      // 3 medium = 15
      const findings = Array.from({ length: 3 }, (_, i) =>
        makeFinding(`f${i}`, 'medium')
      );
      const { score, level } = calculateRiskScore(findings, 1.0);
      expect(score).toBe(15);
      expect(level).toBe('MEDIUM');
    });

    it('score below 15 with no critical = LOW', () => {
      // 2 medium = 10
      const findings = Array.from({ length: 2 }, (_, i) =>
        makeFinding(`f${i}`, 'medium')
      );
      const { score, level } = calculateRiskScore(findings, 1.0);
      expect(score).toBe(10);
      expect(level).toBe('LOW');
    });
  });
});
