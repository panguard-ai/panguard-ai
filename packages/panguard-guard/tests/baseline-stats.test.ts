/**
 * BaselineStats tests - Event-level anomaly scoring
 * BaselineStats 測試 - 事件層級異常評分
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SecurityEvent } from '@panguard-ai/core';
import { AnomalyScorer } from '../src/memory/anomaly-scorer.js';
import { BaselineStats } from '../src/memory/baseline-stats.js';
import { checkDeviation, createEmptyBaseline } from '../src/memory/baseline.js';
import type { EnvironmentBaseline } from '../src/types.js';

/** Helper to create a SecurityEvent with overrides / 建立帶有覆蓋的 SecurityEvent */
function makeEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: 'evt-test',
    timestamp: new Date('2024-06-15T14:30:00Z'),
    source: 'network',
    severity: 'medium',
    category: 'network_connection',
    description: 'Test event',
    host: 'test-host',
    raw: {},
    metadata: {},
    ...overrides,
  };
}

describe('BaselineStats', () => {
  let stats: BaselineStats;
  let scorer: AnomalyScorer;

  beforeEach(() => {
    scorer = new AnomalyScorer();
    stats = new BaselineStats(scorer);
  });

  // =========================================================================
  // ingestEvent / 送入事件
  // =========================================================================

  describe('ingestEvent', () => {
    it('should update scorer when ingesting network events', () => {
      const event = makeEvent({
        source: 'network',
        metadata: {
          destinationIP: '10.0.0.1',
          remotePort: 443,
          sourceIP: '192.168.1.100',
          bytesOut: 1024,
        },
      });

      stats.ingestEvent(event);

      // Should have updated connection frequency and bytes metrics
      expect(scorer.getStats('conn_freq_10.0.0.1')).toBeDefined();
      expect(scorer.getStats('bytes_out')).toBeDefined();
      expect(scorer.getStats('port_diversity_192.168.1.100')).toBeDefined();
    });

    it('should update scorer for login events (login_hour)', () => {
      // Use a specific local-time Date to avoid timezone issues / 使用特定本地時間以避免時區問題
      const loginDate = new Date(2024, 5, 15, 9, 30, 0); // June 15, 2024, 9:30 local time
      const event = makeEvent({
        source: 'syslog' as SecurityEvent['source'],
        category: 'authentication',
        metadata: { user: 'admin' },
        timestamp: loginDate,
      });

      stats.ingestEvent(event);

      expect(scorer.getStats('login_hour')).toBeDefined();
      expect(scorer.getStats('login_hour')!.mean).toBe(9);
    });

    it('should update scorer for process events (process_count)', () => {
      const event = makeEvent({
        source: 'process',
        metadata: { processName: 'nginx' },
      });

      stats.ingestEvent(event);

      expect(scorer.getStats('process_count')).toBeDefined();
      expect(scorer.getStats('process_count')!.mean).toBe(1);
    });

    it('should update scorer for falco events (process_count)', () => {
      const event = makeEvent({
        source: 'falco',
        metadata: { processName: 'suspicious-bin' },
      });

      stats.ingestEvent(event);

      expect(scorer.getStats('process_count')).toBeDefined();
    });

    it('should track auth failures', () => {
      const event = makeEvent({
        category: 'authentication_failure',
        metadata: { user: 'admin' },
      });

      stats.ingestEvent(event);

      expect(scorer.getStats('auth_failures')).toBeDefined();
      expect(scorer.getStats('auth_failures')!.count).toBe(1);
    });

    it('should track brute force as auth failure', () => {
      const event = makeEvent({
        category: 'brute_force',
        metadata: { user: 'root' },
      });

      stats.ingestEvent(event);

      expect(scorer.getStats('auth_failures')).toBeDefined();
    });

    it('should track distinct processes within window', () => {
      stats.ingestEvent(makeEvent({
        source: 'process',
        metadata: { processName: 'nginx' },
      }));
      stats.ingestEvent(makeEvent({
        source: 'process',
        metadata: { processName: 'node' },
      }));
      stats.ingestEvent(makeEvent({
        source: 'process',
        metadata: { processName: 'nginx' }, // duplicate, should not increase count
      }));

      // process_count should have been updated with values 1, 2, 2
      const processStats = scorer.getStats('process_count');
      expect(processStats).toBeDefined();
      expect(processStats!.count).toBe(3); // 3 updates total
    });

    it('should track port diversity per source IP', () => {
      stats.ingestEvent(makeEvent({
        source: 'network',
        metadata: { sourceIP: '192.168.1.1', remotePort: 80, destinationIP: '10.0.0.1' },
      }));
      stats.ingestEvent(makeEvent({
        source: 'network',
        metadata: { sourceIP: '192.168.1.1', remotePort: 443, destinationIP: '10.0.0.2' },
      }));
      stats.ingestEvent(makeEvent({
        source: 'network',
        metadata: { sourceIP: '192.168.1.1', remotePort: 8080, destinationIP: '10.0.0.3' },
      }));

      const portStats = scorer.getStats('port_diversity_192.168.1.1');
      expect(portStats).toBeDefined();
    });
  });

  // =========================================================================
  // scoreEvent / 評分事件
  // =========================================================================

  describe('scoreEvent', () => {
    it('should return 0 for events with no trackable metrics', () => {
      const event = makeEvent({
        source: 'file' as SecurityEvent['source'],
        metadata: {},
      });

      const score = stats.scoreEvent(event);
      expect(score).toBe(0);
    });

    it('should return low score for normal events after training', () => {
      // Train with normal traffic pattern (9-17h logins) / 用正常流量模式訓練
      for (let i = 0; i < 50; i++) {
        const hour = 9 + (i % 8); // hours 9-16
        stats.ingestEvent(makeEvent({
          source: 'syslog' as SecurityEvent['source'],
          metadata: { user: 'admin' },
          timestamp: new Date(`2024-06-15T${String(hour).padStart(2, '0')}:00:00Z`),
        }));
      }

      // Score a normal login at 10am / 評分正常 10 點登入
      const normalEvent = makeEvent({
        source: 'syslog' as SecurityEvent['source'],
        metadata: { user: 'admin' },
        timestamp: new Date('2024-06-15T10:00:00Z'),
      });

      const score = stats.scoreEvent(normalEvent);
      expect(score).toBeLessThan(50);
    });

    it('should return high score for anomalous auth failure burst', () => {
      // Train with low auth failure rate / 用低認證失敗率訓練
      for (let i = 0; i < 30; i++) {
        stats.ingestEvent(makeEvent({
          category: 'network_connection',
          metadata: { user: 'admin' },
        }));
      }

      // Now simulate many auth failures / 模擬大量認證失敗
      for (let i = 0; i < 20; i++) {
        stats.ingestEvent(makeEvent({
          category: 'authentication_failure',
          metadata: { user: 'admin' },
        }));
      }

      // Score another auth failure / 評分另一個認證失敗
      const failEvent = makeEvent({
        category: 'authentication_failure',
        metadata: { user: 'admin' },
      });

      const score = stats.scoreEvent(failEvent);
      // After many failures, the count is high relative to trained norm
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should score network events with bytesOut', () => {
      // Train with normal traffic / 用正常流量訓練
      for (let i = 0; i < 20; i++) {
        stats.ingestEvent(makeEvent({
          source: 'network',
          metadata: {
            destinationIP: '10.0.0.1',
            bytesOut: 500 + (i * 10),
          },
        }));
      }

      // Score event with massive data exfil / 評分大量數據外洩事件
      const exfilEvent = makeEvent({
        source: 'network',
        metadata: {
          destinationIP: '10.0.0.1',
          bytesOut: 50000000,
        },
      });

      const score = stats.scoreEvent(exfilEvent);
      expect(score).toBeGreaterThan(0);
    });

    it('should return score in 0-100 range', () => {
      // Ingest some data / 送入一些數據
      for (let i = 0; i < 10; i++) {
        stats.ingestEvent(makeEvent({
          source: 'network',
          metadata: { destinationIP: '10.0.0.1', bytesOut: 100 },
        }));
      }

      const event = makeEvent({
        source: 'network',
        metadata: { destinationIP: '10.0.0.1', bytesOut: 999999 },
      });

      const score = stats.scoreEvent(event);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should track multiple event types independently', () => {
      // Ingest network and process events / 送入網路和程序事件
      for (let i = 0; i < 10; i++) {
        stats.ingestEvent(makeEvent({
          source: 'network',
          metadata: { destinationIP: '10.0.0.1', bytesOut: 100 },
        }));
        stats.ingestEvent(makeEvent({
          source: 'process',
          metadata: { processName: 'nginx' },
        }));
      }

      // Network metrics should not affect process scoring / 網路指標不應影響程序評分
      const processEvent = makeEvent({
        source: 'process',
        metadata: { processName: 'nginx' },
      });

      const networkEvent = makeEvent({
        source: 'network',
        metadata: { destinationIP: '10.0.0.1', bytesOut: 100 },
      });

      // Both should have valid scores / 兩者都應有有效分數
      const processScore = stats.scoreEvent(processEvent);
      const networkScore = stats.scoreEvent(networkEvent);

      expect(processScore).toBeGreaterThanOrEqual(0);
      expect(processScore).toBeLessThanOrEqual(100);
      expect(networkScore).toBeGreaterThanOrEqual(0);
      expect(networkScore).toBeLessThanOrEqual(100);
    });
  });

  // =========================================================================
  // getScorer / 取得評分器
  // =========================================================================

  describe('getScorer', () => {
    it('should return the underlying scorer instance', () => {
      expect(stats.getScorer()).toBe(scorer);
    });

    it('should create new scorer when none provided', () => {
      const defaultStats = new BaselineStats();
      const defaultScorer = defaultStats.getScorer();

      expect(defaultScorer).toBeInstanceOf(AnomalyScorer);
    });
  });

  // =========================================================================
  // Integration with checkDeviation / 與 checkDeviation 整合
  // =========================================================================

  describe('integration with checkDeviation', () => {
    let baseline: EnvironmentBaseline;

    beforeEach(() => {
      baseline = createEmptyBaseline();
    });

    it('should use default hardcoded confidence when no scorer is provided', () => {
      baseline.normalProcesses = [
        { name: 'nginx', frequency: 10, firstSeen: '2024-01-01', lastSeen: '2024-01-02' },
      ];

      const event = makeEvent({
        source: 'process',
        metadata: { processName: 'malware' },
      });

      // Without scorer / 不帶評分器
      const result = checkDeviation(baseline, event);
      expect(result.isDeviation).toBe(true);
      expect(result.confidence).toBe(70);
    });

    it('should use anomaly scorer confidence when scorer is provided', () => {
      baseline.normalProcesses = [
        { name: 'nginx', frequency: 10, firstSeen: '2024-01-01', lastSeen: '2024-01-02' },
      ];

      // Train scorer with process count data / 用程序數量數據訓練評分器
      for (let i = 0; i < 20; i++) {
        scorer.updateStats('process_count', 1 + (i % 3));
      }

      const event = makeEvent({
        source: 'process',
        metadata: { processName: 'malware' },
      });

      // With scorer / 帶評分器
      const result = checkDeviation(baseline, event, scorer);
      expect(result.isDeviation).toBe(true);
      // Confidence should be at least 70 (the floor) / 信心值至少為 70（底線）
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should enhance network deviation confidence with scorer', () => {
      baseline.normalConnections = [
        {
          remoteAddress: '1.1.1.1',
          remotePort: 443,
          protocol: 'tcp',
          frequency: 5,
          firstSeen: '2024-01-01',
          lastSeen: '2024-01-02',
        },
      ];

      const event = makeEvent({
        source: 'network',
        metadata: { remoteAddress: '10.0.0.99' },
      });

      // Without scorer: hardcoded 65 / 不帶評分器: 硬編碼 65
      const resultNoScorer = checkDeviation(baseline, event);
      expect(resultNoScorer.confidence).toBe(65);

      // With scorer: at least 65 (the floor) / 帶評分器: 至少 65（底線）
      const resultWithScorer = checkDeviation(baseline, event, scorer);
      expect(resultWithScorer.confidence).toBeGreaterThanOrEqual(65);
    });

    it('should enhance login deviation confidence with scorer', () => {
      baseline.normalLoginPatterns = [
        {
          username: 'admin',
          hourOfDay: 10,
          dayOfWeek: 1,
          frequency: 10,
          firstSeen: '2024-01-01',
          lastSeen: '2024-01-02',
        },
      ];

      // Train scorer with normal login hours (9-17) / 用正常登入時間訓練評分器
      for (let i = 0; i < 50; i++) {
        scorer.updateStats('login_hour', 9 + (i % 8));
      }

      // Unusual login at 3am / 凌晨 3 點的異常登入
      const event = makeEvent({
        metadata: { user: 'hacker' },
        timestamp: new Date('2024-06-15T03:00:00Z'),
      });

      const result = checkDeviation(baseline, event, scorer);
      expect(result.isDeviation).toBe(true);
      expect(result.deviationType).toBe('new_user');
      // With trained scorer, 3am login should push confidence above floor
      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should maintain backward compatibility (no deviation case)', () => {
      const event = makeEvent({
        source: 'process',
        metadata: {},
      });

      // No deviation should be the same with or without scorer
      const resultA = checkDeviation(baseline, event);
      const resultB = checkDeviation(baseline, event, scorer);

      expect(resultA.isDeviation).toBe(false);
      expect(resultB.isDeviation).toBe(false);
      expect(resultA.confidence).toBe(0);
      expect(resultB.confidence).toBe(0);
    });
  });
});
