/**
 * AnomalyScorer tests - Statistical anomaly detection
 * AnomalyScorer 測試 - 統計異常偵測
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnomalyScorer } from '../src/memory/anomaly-scorer.js';
import type { MetricStats } from '../src/memory/anomaly-scorer.js';

describe('AnomalyScorer', () => {
  let scorer: AnomalyScorer;

  beforeEach(() => {
    scorer = new AnomalyScorer();
  });

  // =========================================================================
  // Welford's algorithm: updateStats / 更新統計
  // =========================================================================

  describe('updateStats / Welford algorithm', () => {
    it('should initialize stats on first observation', () => {
      scorer.updateStats('test', 42);
      const stats = scorer.getStats('test');

      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.mean).toBe(42);
      expect(stats!.m2).toBe(0);
      expect(stats!.min).toBe(42);
      expect(stats!.max).toBe(42);
      expect(stats!.sorted).toEqual([42]);
    });

    it('should correctly accumulate mean over multiple values', () => {
      const values = [10, 20, 30, 40, 50];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const stats = scorer.getStats('test');
      expect(stats!.count).toBe(5);
      expect(stats!.mean).toBeCloseTo(30, 10);
    });

    it('should correctly compute variance matching expected value', () => {
      // Values: 2, 4, 4, 4, 5, 5, 7, 9
      // Mean = 5, Sample variance = 4.571...
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const variance = scorer.variance('test');
      expect(variance).toBeCloseTo(4.571428571, 5);
    });

    it('should track min and max correctly', () => {
      const values = [5, 3, 8, 1, 9, 2];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const stats = scorer.getStats('test');
      expect(stats!.min).toBe(1);
      expect(stats!.max).toBe(9);
    });

    it('should maintain sorted array for small sample counts', () => {
      const values = [30, 10, 50, 20, 40];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const stats = scorer.getStats('test');
      expect(stats!.sorted).toEqual([10, 20, 30, 40, 50]);
    });

    it('should track independent metrics separately', () => {
      scorer.updateStats('metricA', 100);
      scorer.updateStats('metricB', 200);

      expect(scorer.getStats('metricA')!.mean).toBe(100);
      expect(scorer.getStats('metricB')!.mean).toBe(200);
    });

    it('should return undefined for unknown metric', () => {
      expect(scorer.getStats('nonexistent')).toBeUndefined();
    });
  });

  // =========================================================================
  // variance / stddev
  // =========================================================================

  describe('variance and stddev', () => {
    it('should return 0 variance for single value', () => {
      scorer.updateStats('test', 42);
      expect(scorer.variance('test')).toBe(0);
    });

    it('should return 0 variance for unknown metric', () => {
      expect(scorer.variance('nonexistent')).toBe(0);
    });

    it('should return 0 stddev for single value', () => {
      scorer.updateStats('test', 42);
      expect(scorer.stddev('test')).toBe(0);
    });

    it('should compute correct stddev for known dataset', () => {
      // Values: 2, 4, 4, 4, 5, 5, 7, 9
      // Sample stddev = sqrt(4.571...) = 2.138...
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      expect(scorer.stddev('test')).toBeCloseTo(2.13809, 4);
    });

    it('should return 0 for all identical values', () => {
      for (let i = 0; i < 10; i++) {
        scorer.updateStats('test', 5);
      }
      expect(scorer.variance('test')).toBeCloseTo(0, 10);
      expect(scorer.stddev('test')).toBeCloseTo(0, 10);
    });
  });

  // =========================================================================
  // z-score
  // =========================================================================

  describe('zScore', () => {
    it('should return 0 for unknown metric', () => {
      expect(scorer.zScore('nonexistent', 42)).toBe(0);
    });

    it('should return 0 for single value (count < 2)', () => {
      scorer.updateStats('test', 10);
      expect(scorer.zScore('test', 15)).toBe(0);
    });

    it('should return 0 when all values are identical (stddev = 0)', () => {
      for (let i = 0; i < 10; i++) {
        scorer.updateStats('test', 5);
      }
      expect(scorer.zScore('test', 5)).toBe(0);
    });

    it('should return low z-score for values near mean', () => {
      // Create a normal-ish distribution / 建立近似正態分布
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const z = scorer.zScore('test', 10);
      expect(Math.abs(z)).toBeLessThan(1);
    });

    it('should return high z-score for outliers', () => {
      // Normal values around 10 / 正常值約在 10
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      // 50 is far from mean of 10 / 50 遠離平均值 10
      const z = scorer.zScore('test', 50);
      expect(Math.abs(z)).toBeGreaterThan(3);
    });

    it('should handle negative z-score for values below mean', () => {
      const values = [100, 101, 99, 100, 102, 98];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const z = scorer.zScore('test', 80);
      expect(z).toBeLessThan(-3);
    });
  });

  // =========================================================================
  // IQR score
  // =========================================================================

  describe('iqrScore', () => {
    it('should return 0 for unknown metric', () => {
      expect(scorer.iqrScore('nonexistent', 42)).toBe(0);
    });

    it('should return 0 for insufficient data (< 4 samples)', () => {
      scorer.updateStats('test', 1);
      scorer.updateStats('test', 2);
      scorer.updateStats('test', 3);
      expect(scorer.iqrScore('test', 100)).toBe(0);
    });

    it('should return 0 for values within IQR fences', () => {
      // Sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      // Q1 ≈ 3.25, Q3 ≈ 7.75, IQR = 4.5
      // Lower fence: 3.25 - 6.75 = -3.5
      // Upper fence: 7.75 + 6.75 = 14.5
      for (let i = 1; i <= 10; i++) {
        scorer.updateStats('test', i);
      }

      expect(scorer.iqrScore('test', 5)).toBe(0);
      expect(scorer.iqrScore('test', 1)).toBe(0);
      expect(scorer.iqrScore('test', 10)).toBe(0);
    });

    it('should return moderate score for mild outliers', () => {
      for (let i = 1; i <= 10; i++) {
        scorer.updateStats('test', i);
      }

      // Value 20 is beyond upper fence (14.5)
      const score = scorer.iqrScore('test', 20);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should return high score for extreme outliers', () => {
      for (let i = 1; i <= 10; i++) {
        scorer.updateStats('test', i);
      }

      // Value 100 is far beyond upper fence
      const score = scorer.iqrScore('test', 100);
      expect(score).toBeGreaterThan(50);
    });

    it('should handle negative outliers below lower fence', () => {
      for (let i = 1; i <= 10; i++) {
        scorer.updateStats('test', i);
      }

      // Value -20 is below lower fence (-3.5)
      const score = scorer.iqrScore('test', -20);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle IQR of 0 (all identical middle values)', () => {
      // All same values means Q1 = Q3 = value, IQR = 0
      for (let i = 0; i < 10; i++) {
        scorer.updateStats('test', 5);
      }

      // Same value should score 0
      expect(scorer.iqrScore('test', 5)).toBe(0);
      // Different value should score > 0
      expect(scorer.iqrScore('test', 10)).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Combined anomalyScore
  // =========================================================================

  describe('anomalyScore', () => {
    it('should return 0 for unknown metric', () => {
      expect(scorer.anomalyScore('nonexistent', 42)).toBe(0);
    });

    it('should return low score for normal values', () => {
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const score = scorer.anomalyScore('test', 10);
      expect(score).toBeLessThan(20);
    });

    it('should return high score for outliers', () => {
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const score = scorer.anomalyScore('test', 100);
      expect(score).toBeGreaterThan(50);
    });

    it('should be clamped to 0-100', () => {
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      // Extreme outlier / 極端離群值
      const score = scorer.anomalyScore('test', 10000);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should map z-score of ~3 to approximately 45', () => {
      // Create dataset where stddev is known / 建立已知標準差的數據集
      // Use many values of 0 and 1 to get mean=0.5, stddev~0.5
      for (let i = 0; i < 50; i++) {
        scorer.updateStats('test', 0);
        scorer.updateStats('test', 1);
      }

      const sd = scorer.stddev('test');
      const valueAt3Sigma = scorer.getStats('test')!.mean + 3 * sd;
      const score = scorer.anomalyScore('test', valueAt3Sigma);

      // z=3 * 15 = 45 (the z-score component)
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThanOrEqual(55);
    });

    it('should never return negative score', () => {
      scorer.updateStats('test', 100);
      scorer.updateStats('test', 200);

      const score = scorer.anomalyScore('test', 150);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // isAnomaly
  // =========================================================================

  describe('isAnomaly', () => {
    it('should return false for unknown metric', () => {
      expect(scorer.isAnomaly('nonexistent', 42)).toBe(false);
    });

    it('should return false for normal values with default threshold', () => {
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      expect(scorer.isAnomaly('test', 10)).toBe(false);
    });

    it('should return true for outliers with default threshold', () => {
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      expect(scorer.isAnomaly('test', 100)).toBe(true);
    });

    it('should respect custom threshold', () => {
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      // Low threshold should trigger more easily / 低閾值更容易觸發
      const mildOutlier = 18;
      const scoreMild = scorer.anomalyScore('test', mildOutlier);

      if (scoreMild > 10) {
        expect(scorer.isAnomaly('test', mildOutlier, 10)).toBe(true);
      }

      // Very high threshold should not trigger / 很高的閾值不應觸發
      expect(scorer.isAnomaly('test', 12, 99)).toBe(false);
    });
  });

  // =========================================================================
  // Serialization / 序列化
  // =========================================================================

  describe('toJSON / fromJSON', () => {
    it('should serialize all metrics to JSON', () => {
      scorer.updateStats('metricA', 10);
      scorer.updateStats('metricA', 20);
      scorer.updateStats('metricB', 5);

      const json = scorer.toJSON();

      expect(json['metricA']).toBeDefined();
      expect(json['metricA']!.count).toBe(2);
      expect(json['metricA']!.mean).toBe(15);
      expect(json['metricB']).toBeDefined();
      expect(json['metricB']!.count).toBe(1);
    });

    it('should roundtrip preserve all stats', () => {
      const values = [10, 20, 30, 40, 50];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const json = scorer.toJSON();
      const restored = AnomalyScorer.fromJSON(json);

      const originalStats = scorer.getStats('test')!;
      const restoredStats = restored.getStats('test')!;

      expect(restoredStats.count).toBe(originalStats.count);
      expect(restoredStats.mean).toBeCloseTo(originalStats.mean, 10);
      expect(restoredStats.m2).toBeCloseTo(originalStats.m2, 10);
      expect(restoredStats.min).toBe(originalStats.min);
      expect(restoredStats.max).toBe(originalStats.max);
      expect(restoredStats.sorted).toEqual(originalStats.sorted);
    });

    it('should preserve anomaly scores after roundtrip', () => {
      const values = [10, 11, 9, 10, 12, 8, 10, 11, 9, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      const json = scorer.toJSON();
      const restored = AnomalyScorer.fromJSON(json);

      expect(restored.anomalyScore('test', 50)).toBe(scorer.anomalyScore('test', 50));
      expect(restored.zScore('test', 50)).toBeCloseTo(scorer.zScore('test', 50), 10);
    });

    it('should handle empty scorer serialization', () => {
      const json = scorer.toJSON();
      expect(Object.keys(json)).toHaveLength(0);

      const restored = AnomalyScorer.fromJSON(json);
      expect(restored.getStats('anything')).toBeUndefined();
    });

    it('should handle stats without sorted array', () => {
      const data: Record<string, MetricStats> = {
        test: {
          count: 5,
          mean: 30,
          m2: 1000,
          min: 10,
          max: 50,
          // No sorted array (e.g., large dataset or legacy data)
        },
      };

      const restored = AnomalyScorer.fromJSON(data);
      const stats = restored.getStats('test');

      expect(stats).toBeDefined();
      expect(stats!.count).toBe(5);
      expect(stats!.mean).toBe(30);
      expect(stats!.sorted).toBeUndefined();
    });
  });

  // =========================================================================
  // Edge cases / 邊界情況
  // =========================================================================

  describe('edge cases', () => {
    it('should handle negative values correctly', () => {
      const values = [-10, -5, 0, 5, 10];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      expect(scorer.getStats('test')!.mean).toBeCloseTo(0, 10);
      expect(scorer.getStats('test')!.min).toBe(-10);
      expect(scorer.getStats('test')!.max).toBe(10);

      // Negative outlier
      const score = scorer.anomalyScore('test', -100);
      expect(score).toBeGreaterThan(50);
    });

    it('should handle very large numbers', () => {
      scorer.updateStats('test', 1e10);
      scorer.updateStats('test', 1e10 + 1);
      scorer.updateStats('test', 1e10 + 2);

      expect(scorer.getStats('test')!.mean).toBeCloseTo(1e10 + 1, 0);
    });

    it('should handle zero values', () => {
      for (let i = 0; i < 5; i++) {
        scorer.updateStats('test', 0);
      }

      expect(scorer.getStats('test')!.mean).toBe(0);
      expect(scorer.variance('test')).toBeCloseTo(0, 10);
    });

    it('should handle decimal/floating point values', () => {
      const values = [0.1, 0.2, 0.3, 0.15, 0.25];
      for (const v of values) {
        scorer.updateStats('test', v);
      }

      expect(scorer.getStats('test')!.mean).toBeCloseTo(0.2, 5);
    });

    it('should produce consistent results regardless of insertion order', () => {
      const valuesA = [1, 2, 3, 4, 5];
      const valuesB = [5, 3, 1, 4, 2];

      const scorerA = new AnomalyScorer();
      const scorerB = new AnomalyScorer();

      for (const v of valuesA) scorerA.updateStats('test', v);
      for (const v of valuesB) scorerB.updateStats('test', v);

      expect(scorerA.getStats('test')!.mean).toBeCloseTo(scorerB.getStats('test')!.mean, 10);
      expect(scorerA.variance('test')).toBeCloseTo(scorerB.variance('test'), 8);
    });

    it('should return immutable stats copies', () => {
      scorer.updateStats('test', 10);
      const stats1 = scorer.getStats('test')!;
      scorer.updateStats('test', 20);
      const stats2 = scorer.getStats('test')!;

      // stats1 should not be affected by subsequent updates / stats1 不應受後續更新影響
      expect(stats1.count).toBe(1);
      expect(stats2.count).toBe(2);
    });

    it('should handle rapid repeated updates to same metric', () => {
      for (let i = 0; i < 100; i++) {
        scorer.updateStats('test', Math.sin(i) * 10);
      }

      const stats = scorer.getStats('test');
      expect(stats!.count).toBe(100);
      expect(stats!.mean).toBeDefined();
      expect(Number.isFinite(stats!.mean)).toBe(true);
      expect(Number.isFinite(scorer.variance('test'))).toBe(true);
    });
  });
});
