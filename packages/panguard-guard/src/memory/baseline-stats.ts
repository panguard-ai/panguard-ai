/**
 * Baseline Statistics - Extract statistical features from baseline for anomaly detection
 * 基線統計 - 從基線提取統計特徵用於異常偵測
 *
 * Bridges SecurityEvents to the AnomalyScorer by extracting numerical metrics
 * from events and feeding them into statistical tracking. Provides a single
 * `scoreEvent()` method that returns a 0-100 anomaly score.
 * 將 SecurityEvent 連接到 AnomalyScorer，從事件提取數值指標並送入統計追蹤。
 * 提供單一 `scoreEvent()` 方法返回 0-100 的異常分數。
 *
 * Metrics tracked / 追蹤的指標:
 * - conn_freq_{destIP}  : connection frequency to each destination / 到各目的地的連線頻率
 * - login_hour          : hour of day for login events (0-23) / 登入事件的小時 (0-23)
 * - bytes_out           : outbound data volume per connection / 每次連線的出站數據量
 * - process_count       : distinct processes per time window / 每時間窗口的不同程序數
 * - auth_failures       : authentication failure count per window / 每窗口的認證失敗次數
 * - port_diversity      : distinct ports contacted per source IP / 每來源 IP 的不同埠數
 *
 * @module @panguard-ai/panguard-guard/memory/baseline-stats
 */

import type { SecurityEvent } from '@panguard-ai/core';
import { AnomalyScorer } from './anomaly-scorer.js';

/**
 * Extract statistical features from baseline for anomaly detection
 * 從基線提取統計特徵用於異常偵測
 */
export class BaselineStats {
  private readonly scorer: AnomalyScorer;

  /** Track distinct ports per source IP in current window / 追蹤當前窗口每來源 IP 的不同埠 */
  private readonly portSets: Map<string, Set<number>>;

  /** Track distinct processes in current window / 追蹤當前窗口的不同程序 */
  private readonly processSets: Set<string>;

  /** Track connection timestamps per dest IP for frequency / 追蹤每目的 IP 的連線時間戳以計算頻率 */
  private readonly connTimestamps: Map<string, number[]>;

  /** Track auth failure counts in current window / 追蹤當前窗口的認證失敗次數 */
  private authFailureCount: number;

  /** Window start time for resetting counters / 重置計數器的窗口開始時間 */
  private windowStart: number;

  /** Window duration in milliseconds (default: 1 minute) / 窗口時間長度（預設: 1 分鐘） */
  private readonly windowMs: number;

  constructor(scorer?: AnomalyScorer, windowMs: number = 60_000) {
    this.scorer = scorer ?? new AnomalyScorer();
    this.portSets = new Map();
    this.processSets = new Set();
    this.connTimestamps = new Map();
    this.authFailureCount = 0;
    this.windowStart = Date.now();
    this.windowMs = windowMs;
  }

  /**
   * Feed a security event into the stats / 將安全事件送入統計
   *
   * Extracts relevant metrics from the event and updates the scorer.
   * 從事件提取相關指標並更新評分器。
   *
   * @param event - Security event to ingest / 要送入的安全事件
   */
  ingestEvent(event: SecurityEvent): void {
    const eventTime =
      event.timestamp instanceof Date
        ? event.timestamp.getTime()
        : new Date(event.timestamp).getTime();

    // Check if we need to flush the time window / 檢查是否需要刷新時間窗口
    this.maybeFlushWindow(eventTime);

    // Track connection frequency per destination IP / 追蹤每目的 IP 的連線頻率
    if (event.source === 'network') {
      const destIP = extractDestIP(event);
      if (destIP) {
        const metricKey = `conn_freq_${destIP}`;
        const timestamps = this.connTimestamps.get(destIP) ?? [];
        timestamps.push(eventTime);
        this.connTimestamps.set(destIP, timestamps);

        // Calculate events per minute in current window / 計算當前窗口每分鐘事件數
        const windowMinutes = Math.max(1, (eventTime - this.windowStart) / 60_000);
        const freq = timestamps.length / windowMinutes;
        this.scorer.updateStats(metricKey, freq);
      }

      // Track outbound bytes / 追蹤出站位元組
      const bytesOut = event.metadata?.['bytesOut'] as number | undefined;
      if (bytesOut !== undefined && typeof bytesOut === 'number') {
        this.scorer.updateStats('bytes_out', bytesOut);
      }

      // Track port diversity per source IP / 追蹤每來源 IP 的埠多樣性
      const sourceIP = (event.metadata?.['sourceIP'] as string) ?? undefined;
      const destPort =
        (event.metadata?.['remotePort'] as number) ??
        (event.metadata?.['destPort'] as number) ??
        undefined;
      if (sourceIP && destPort !== undefined && typeof destPort === 'number') {
        const ports = this.portSets.get(sourceIP) ?? new Set();
        ports.add(destPort);
        this.portSets.set(sourceIP, ports);
        this.scorer.updateStats(`port_diversity_${sourceIP}`, ports.size);
      }
    }

    // Track login hour / 追蹤登入小時
    const username = extractUsername(event);
    if (username) {
      const eventDate =
        event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
      this.scorer.updateStats('login_hour', eventDate.getHours());
    }

    // Track process count / 追蹤程序數量
    if (event.source === 'process' || event.source === 'syscall') {
      const processName = (event.metadata?.['processName'] as string) ?? undefined;
      if (processName) {
        this.processSets.add(processName);
        this.scorer.updateStats('process_count', this.processSets.size);
      }
    }

    // Track authentication failures / 追蹤認證失敗
    const isAuthFailure =
      event.category === 'authentication_failure' ||
      event.category === 'brute_force' ||
      event.metadata?.['authResult'] === 'failure';
    if (isAuthFailure) {
      this.authFailureCount += 1;
      this.scorer.updateStats('auth_failures', this.authFailureCount);
    }
  }

  /**
   * Score how anomalous an event is (0-100)
   * 評分事件有多異常 (0-100)
   *
   * Checks all relevant metrics for the event and returns the maximum anomaly score.
   * 檢查事件的所有相關指標並返回最大異常分數。
   *
   * @param event - Security event to score / 要評分的安全事件
   * @returns Anomaly score 0-100 / 異常分數 0-100
   */
  scoreEvent(event: SecurityEvent): number {
    const scores: number[] = [];

    // Score connection frequency / 評分連線頻率
    if (event.source === 'network') {
      const destIP = extractDestIP(event);
      if (destIP) {
        const metricKey = `conn_freq_${destIP}`;
        const timestamps = this.connTimestamps.get(destIP) ?? [];
        const eventTime =
          event.timestamp instanceof Date
            ? event.timestamp.getTime()
            : new Date(event.timestamp).getTime();
        const windowMinutes = Math.max(1, (eventTime - this.windowStart) / 60_000);
        const freq = (timestamps.length + 1) / windowMinutes;
        scores.push(this.scorer.anomalyScore(metricKey, freq));
      }

      // Score outbound bytes / 評分出站位元組
      const bytesOut = event.metadata?.['bytesOut'] as number | undefined;
      if (bytesOut !== undefined && typeof bytesOut === 'number') {
        scores.push(this.scorer.anomalyScore('bytes_out', bytesOut));
      }

      // Score port diversity / 評分埠多樣性
      const sourceIP = (event.metadata?.['sourceIP'] as string) ?? undefined;
      if (sourceIP) {
        const ports = this.portSets.get(sourceIP);
        if (ports) {
          scores.push(this.scorer.anomalyScore(`port_diversity_${sourceIP}`, ports.size));
        }
      }
    }

    // Score login hour / 評分登入小時
    const username = extractUsername(event);
    if (username) {
      const eventDate =
        event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
      scores.push(this.scorer.anomalyScore('login_hour', eventDate.getHours()));
    }

    // Score process count / 評分程序數量
    if (event.source === 'process' || event.source === 'syscall') {
      scores.push(this.scorer.anomalyScore('process_count', this.processSets.size));
    }

    // Score auth failures / 評分認證失敗
    const isAuthFailure =
      event.category === 'authentication_failure' ||
      event.category === 'brute_force' ||
      event.metadata?.['authResult'] === 'failure';
    if (isAuthFailure) {
      scores.push(this.scorer.anomalyScore('auth_failures', this.authFailureCount + 1));
    }

    // Return max score across all applicable metrics / 返回所有適用指標的最大分數
    if (scores.length === 0) return 0;
    return Math.max(...scores);
  }

  /**
   * Get the underlying scorer / 取得底層評分器
   *
   * @returns The AnomalyScorer instance / AnomalyScorer 實例
   */
  getScorer(): AnomalyScorer {
    return this.scorer;
  }

  /**
   * Flush time window counters if window has elapsed
   * 如果窗口已過期則刷新時間窗口計數器
   */
  private maybeFlushWindow(currentTime: number): void {
    if (currentTime - this.windowStart >= this.windowMs) {
      this.portSets.clear();
      this.processSets.clear();
      this.connTimestamps.clear();
      this.authFailureCount = 0;
      this.windowStart = currentTime;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers / 內部輔助函數
// ---------------------------------------------------------------------------

/** Extract destination IP from event metadata / 從事件 metadata 提取目的 IP */
function extractDestIP(event: SecurityEvent): string | undefined {
  return (
    (event.metadata?.['destinationIP'] as string) ??
    (event.metadata?.['remoteAddress'] as string) ??
    (event.metadata?.['destIP'] as string) ??
    undefined
  );
}

/** Extract username from event metadata / 從事件 metadata 提取使用者名稱 */
function extractUsername(event: SecurityEvent): string | undefined {
  return (
    (event.metadata?.['user'] as string) ?? (event.metadata?.['username'] as string) ?? undefined
  );
}
