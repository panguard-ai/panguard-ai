import { describe, it, expect, vi, beforeEach } from 'vitest';
import v8 from 'node:v8';

/**
 * Tests for memory monitoring functionality.
 * These test the checkMemoryPressure logic and threshold classification
 * without requiring a full GuardEngine instance.
 *
 * 記憶體監控功能測試。
 */

// Extracted logic mirrors GuardEngine.checkMemoryPressure for unit testing
function checkMemoryPressure(heapUsed: number, heapTotal: number, heapSizeLimit: number) {
  const heapUsedMB = Math.round((heapUsed / 1024 / 1024) * 10) / 10;
  const heapTotalMB = Math.round((heapTotal / 1024 / 1024) * 10) / 10;
  const heapLimitMB = Math.round((heapSizeLimit / 1024 / 1024) * 10) / 10;
  const heapUsagePercent = Math.round((heapUsed / heapSizeLimit) * 1000) / 10;

  let memoryStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (heapUsagePercent >= 80) {
    memoryStatus = 'critical';
  } else if (heapUsagePercent >= 60) {
    memoryStatus = 'warning';
  }

  return { heapUsedMB, heapTotalMB, heapLimitMB, heapUsagePercent, memoryStatus };
}

describe('Memory Monitoring', () => {
  describe('checkMemoryPressure return structure', () => {
    it('should return all required fields', () => {
      const result = checkMemoryPressure(
        100 * 1024 * 1024, // 100MB used
        200 * 1024 * 1024, // 200MB total
        2048 * 1024 * 1024 // 2048MB limit
      );

      expect(result).toHaveProperty('heapUsedMB');
      expect(result).toHaveProperty('heapTotalMB');
      expect(result).toHaveProperty('heapLimitMB');
      expect(result).toHaveProperty('heapUsagePercent');
      expect(result).toHaveProperty('memoryStatus');
      expect(typeof result.heapUsedMB).toBe('number');
      expect(typeof result.heapTotalMB).toBe('number');
      expect(typeof result.heapLimitMB).toBe('number');
      expect(typeof result.heapUsagePercent).toBe('number');
      expect(typeof result.memoryStatus).toBe('string');
    });

    it('should convert bytes to MB with one decimal place', () => {
      const result = checkMemoryPressure(
        157286400, // ~150MB
        314572800, // ~300MB
        2147483648 // 2048MB
      );

      expect(result.heapUsedMB).toBe(150);
      expect(result.heapTotalMB).toBe(300);
      expect(result.heapLimitMB).toBe(2048);
    });
  });

  describe('memory status thresholds', () => {
    it('should return healthy when usage is below 60%', () => {
      const limit = 1000 * 1024 * 1024; // 1000MB limit

      // 10% usage
      const low = checkMemoryPressure(100 * 1024 * 1024, 200 * 1024 * 1024, limit);
      expect(low.memoryStatus).toBe('healthy');
      expect(low.heapUsagePercent).toBe(10);

      // 50% usage
      const mid = checkMemoryPressure(500 * 1024 * 1024, 600 * 1024 * 1024, limit);
      expect(mid.memoryStatus).toBe('healthy');
      expect(mid.heapUsagePercent).toBe(50);

      // 59.9% usage
      const borderline = checkMemoryPressure(599 * 1024 * 1024, 700 * 1024 * 1024, limit);
      expect(borderline.memoryStatus).toBe('healthy');
      expect(borderline.heapUsagePercent).toBe(59.9);
    });

    it('should return warning when usage is between 60% and 80%', () => {
      const limit = 1000 * 1024 * 1024; // 1000MB limit

      // Exactly 60%
      const atThreshold = checkMemoryPressure(600 * 1024 * 1024, 700 * 1024 * 1024, limit);
      expect(atThreshold.memoryStatus).toBe('warning');
      expect(atThreshold.heapUsagePercent).toBe(60);

      // 70% usage
      const mid = checkMemoryPressure(700 * 1024 * 1024, 800 * 1024 * 1024, limit);
      expect(mid.memoryStatus).toBe('warning');
      expect(mid.heapUsagePercent).toBe(70);

      // 79.9% usage
      const high = checkMemoryPressure(799 * 1024 * 1024, 900 * 1024 * 1024, limit);
      expect(high.memoryStatus).toBe('warning');
      expect(high.heapUsagePercent).toBe(79.9);
    });

    it('should return critical when usage is 80% or above', () => {
      const limit = 1000 * 1024 * 1024; // 1000MB limit

      // Exactly 80%
      const atThreshold = checkMemoryPressure(800 * 1024 * 1024, 900 * 1024 * 1024, limit);
      expect(atThreshold.memoryStatus).toBe('critical');
      expect(atThreshold.heapUsagePercent).toBe(80);

      // 95% usage
      const high = checkMemoryPressure(950 * 1024 * 1024, 980 * 1024 * 1024, limit);
      expect(high.memoryStatus).toBe('critical');
      expect(high.heapUsagePercent).toBe(95);
    });
  });

  describe('consecutive critical check counter', () => {
    it('should track consecutive critical checks and reset on recovery', () => {
      let consecutiveCriticalChecks = 0;
      const limit = 1000 * 1024 * 1024;

      // Simulate 3 critical checks
      for (let i = 0; i < 3; i++) {
        const memCheck = checkMemoryPressure(850 * 1024 * 1024, 900 * 1024 * 1024, limit);
        if (memCheck.memoryStatus === 'critical') {
          consecutiveCriticalChecks++;
        } else {
          consecutiveCriticalChecks = 0;
        }
      }
      expect(consecutiveCriticalChecks).toBe(3);

      // Simulate recovery
      const recovered = checkMemoryPressure(300 * 1024 * 1024, 500 * 1024 * 1024, limit);
      if (recovered.memoryStatus !== 'critical') {
        consecutiveCriticalChecks = 0;
      }
      expect(consecutiveCriticalChecks).toBe(0);
    });

    it('should not increment counter during warning state', () => {
      let consecutiveCriticalChecks = 0;
      const limit = 1000 * 1024 * 1024;

      // Warning state should not increment
      const memCheck = checkMemoryPressure(650 * 1024 * 1024, 700 * 1024 * 1024, limit);
      if (memCheck.memoryStatus === 'critical') {
        consecutiveCriticalChecks++;
      } else {
        consecutiveCriticalChecks = 0;
      }
      expect(consecutiveCriticalChecks).toBe(0);
      expect(memCheck.memoryStatus).toBe('warning');
    });

    it('should reach threshold of 3 for triggering graceful restart', () => {
      let consecutiveCriticalChecks = 0;
      let restartTriggered = false;
      const limit = 1000 * 1024 * 1024;

      for (let i = 0; i < 5; i++) {
        const memCheck = checkMemoryPressure(900 * 1024 * 1024, 950 * 1024 * 1024, limit);
        if (memCheck.memoryStatus === 'critical') {
          consecutiveCriticalChecks++;
          if (consecutiveCriticalChecks >= 3) {
            restartTriggered = true;
          }
        } else {
          consecutiveCriticalChecks = 0;
        }
      }
      expect(restartTriggered).toBe(true);
      expect(consecutiveCriticalChecks).toBe(5);
    });
  });

  describe('real process memory check', () => {
    it('should work with actual process memory values', () => {
      const mem = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();
      const result = checkMemoryPressure(mem.heapUsed, mem.heapTotal, heapStats.heap_size_limit);

      expect(result.heapUsedMB).toBeGreaterThan(0);
      expect(result.heapTotalMB).toBeGreaterThan(0);
      expect(result.heapLimitMB).toBeGreaterThan(0);
      expect(result.heapUsagePercent).toBeGreaterThan(0);
      expect(result.heapUsagePercent).toBeLessThan(100);
      expect(['healthy', 'warning', 'critical']).toContain(result.memoryStatus);
    });
  });
});
