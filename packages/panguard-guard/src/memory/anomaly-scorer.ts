/**
 * Statistical anomaly scorer using Welford's online algorithm
 * 使用 Welford 在線算法的統計異常評分器
 *
 * Provides z-score and IQR-based anomaly detection without external dependencies.
 * Supports online/streaming computation via Welford's algorithm for incremental
 * mean and variance updates.
 * 提供基於 z-score 和 IQR 的異常偵測，無需外部依賴。
 * 透過 Welford 算法支援線上/串流計算，增量更新平均值和變異數。
 *
 * @module @panguard-ai/panguard-guard/memory/anomaly-scorer
 */

/** Running statistics for a single metric / 單一指標的運行統計 */
export interface MetricStats {
  /** Number of observations / 觀測值數量 */
  count: number;
  /** Running mean / 運行平均值 */
  mean: number;
  /** Sum of squares of differences from mean (Welford's M2) / 與平均值差異平方和 */
  m2: number;
  /** Minimum observed value / 觀測最小值 */
  min: number;
  /** Maximum observed value / 觀測最大值 */
  max: number;
  /** Sorted values for IQR (kept when count < MAX_SORTED_SAMPLES) / 排序值用於 IQR */
  sorted?: number[];
}

/** Maximum sample count to keep sorted array for IQR / 保留排序陣列的最大樣本數 */
const MAX_SORTED_SAMPLES = 10000;

/** Default anomaly threshold (0-100) / 預設異常閾值 */
const DEFAULT_ANOMALY_THRESHOLD = 50;

/** Z-score to 0-100 scale multiplier / z-score 到 0-100 範圍的乘數 */
const Z_SCORE_SCALE = 15;

/** IQR fence multiplier / IQR 圍欄乘數 */
const IQR_FENCE_MULTIPLIER = 1.5;

/** Maximum anomaly score / 最大異常分數 */
const MAX_SCORE = 100;

/**
 * Statistical anomaly scorer using Welford's online algorithm
 * 使用 Welford 在線算法的統計異常評分器
 */
export class AnomalyScorer {
  private readonly metrics: Map<string, MetricStats>;

  constructor() {
    this.metrics = new Map();
  }

  /**
   * Update running statistics for a metric using Welford's online algorithm
   * 使用 Welford 在線算法更新指標的運行統計
   *
   * @param metric - Metric name / 指標名稱
   * @param value - New observation value / 新觀測值
   */
  updateStats(metric: string, value: number): void {
    const existing = this.metrics.get(metric);

    if (!existing) {
      // First observation / 第一個觀測值
      this.metrics.set(metric, {
        count: 1,
        mean: value,
        m2: 0,
        min: value,
        max: value,
        sorted: [value],
      });
      return;
    }

    // Welford's online algorithm for incremental mean and M2
    // Welford 在線算法增量計算平均值和 M2
    const newCount = existing.count + 1;
    const delta = value - existing.mean;
    const newMean = existing.mean + delta / newCount;
    const delta2 = value - newMean;
    const newM2 = existing.m2 + delta * delta2;

    const updated: MetricStats = {
      count: newCount,
      mean: newMean,
      m2: newM2,
      min: Math.min(existing.min, value),
      max: Math.max(existing.max, value),
    };

    // Maintain sorted array for IQR when sample count is manageable
    // 當樣本數可管理時維護排序陣列用於 IQR
    if (existing.sorted && existing.sorted.length < MAX_SORTED_SAMPLES) {
      const sorted = [...existing.sorted];
      const insertIdx = binarySearchInsert(sorted, value);
      sorted.splice(insertIdx, 0, value);
      updated.sorted = sorted;
    }

    this.metrics.set(metric, updated);
  }

  /**
   * Get current stats for a metric / 取得指標的目前統計
   *
   * @param metric - Metric name / 指標名稱
   * @returns MetricStats or undefined if metric not tracked / 統計或 undefined
   */
  getStats(metric: string): MetricStats | undefined {
    const stats = this.metrics.get(metric);
    if (!stats) return undefined;
    // Return immutable copy / 返回不可變副本
    return { ...stats, sorted: stats.sorted ? [...stats.sorted] : undefined };
  }

  /**
   * Calculate sample variance using Welford's algorithm
   * 用 Welford 算法計算樣本變異數
   *
   * @param metric - Metric name / 指標名稱
   * @returns Sample variance, or 0 if insufficient data / 樣本變異數
   */
  variance(metric: string): number {
    const stats = this.metrics.get(metric);
    if (!stats || stats.count < 2) return 0;
    return stats.m2 / (stats.count - 1);
  }

  /**
   * Calculate standard deviation / 計算標準差
   *
   * @param metric - Metric name / 指標名稱
   * @returns Standard deviation, or 0 if insufficient data / 標準差
   */
  stddev(metric: string): number {
    return Math.sqrt(this.variance(metric));
  }

  /**
   * Calculate z-score for a value / 計算 z-score
   *
   * z-score = (value - mean) / stddev
   * Returns 0 if stddev is 0 or count < 2 (insufficient data).
   * 如果 stddev 為 0 或 count < 2（數據不足）則返回 0。
   *
   * @param metric - Metric name / 指標名稱
   * @param value - Value to score / 要評分的值
   * @returns z-score / z-score 值
   */
  zScore(metric: string, value: number): number {
    const stats = this.metrics.get(metric);
    if (!stats || stats.count < 2) return 0;

    const sd = this.stddev(metric);
    if (sd === 0) return 0;

    return (value - stats.mean) / sd;
  }

  /**
   * Calculate IQR-based anomaly score (0-100)
   * 計算基於 IQR 的異常分數 (0-100)
   *
   * Uses Q1, Q3 percentiles to define normal range.
   * Score = distance from [Q1 - 1.5*IQR, Q3 + 1.5*IQR] fence, normalized to 0-100.
   * 使用 Q1、Q3 百分位數定義正常範圍。
   * 分數 = 與 [Q1 - 1.5*IQR, Q3 + 1.5*IQR] 圍欄的距離，正規化到 0-100。
   *
   * @param metric - Metric name / 指標名稱
   * @param value - Value to score / 要評分的值
   * @returns IQR anomaly score 0-100 / IQR 異常分數 0-100
   */
  iqrScore(metric: string, value: number): number {
    const stats = this.metrics.get(metric);
    if (!stats || !stats.sorted || stats.sorted.length < 4) return 0;

    const sorted = stats.sorted;
    const q1 = percentile(sorted, 25);
    const q3 = percentile(sorted, 75);
    const iqr = q3 - q1;

    // If IQR is 0, all values are identical in the middle range / IQR 為 0 表示中間範圍所有值相同
    if (iqr === 0) {
      return value === q1 ? 0 : Math.min(MAX_SCORE, Math.abs(value - q1) > 0 ? 50 : 0);
    }

    const lowerFence = q1 - IQR_FENCE_MULTIPLIER * iqr;
    const upperFence = q3 + IQR_FENCE_MULTIPLIER * iqr;

    if (value >= lowerFence && value <= upperFence) {
      return 0;
    }

    // Distance from nearest fence, normalized by IQR / 到最近圍欄的距離，以 IQR 正規化
    const distance =
      value < lowerFence ? lowerFence - value : value - upperFence;
    const normalizedDistance = distance / iqr;

    // Scale: 1 IQR beyond fence -> ~33, 2 IQR -> ~67, 3+ IQR -> 100
    // 比例: 超出圍欄 1 個 IQR -> ~33, 2 個 IQR -> ~67, 3+ 個 IQR -> 100
    return Math.min(MAX_SCORE, Math.round(normalizedDistance * 33.33));
  }

  /**
   * Combined anomaly score (0-100) using both z-score and IQR
   * 使用 z-score 和 IQR 的綜合異常分數 (0-100)
   *
   * Takes the maximum of:
   * - abs(z-score) * 15 (maps z=3 to ~45, z=6 to ~90)
   * - IQR score
   * Clamped to 0-100.
   *
   * @param metric - Metric name / 指標名稱
   * @param value - Value to score / 要評分的值
   * @returns Combined anomaly score 0-100 / 綜合異常分數 0-100
   */
  anomalyScore(metric: string, value: number): number {
    const z = this.zScore(metric, value);
    const zScaled = Math.abs(z) * Z_SCORE_SCALE;
    const iqr = this.iqrScore(metric, value);

    return Math.min(MAX_SCORE, Math.max(Math.round(zScaled), iqr));
  }

  /**
   * Check if value is anomalous / 檢查值是否異常
   *
   * @param metric - Metric name / 指標名稱
   * @param value - Value to check / 要檢查的值
   * @param threshold - Anomaly threshold 0-100 (default 50) / 異常閾值
   * @returns Whether the value exceeds the anomaly threshold / 是否超過異常閾值
   */
  isAnomaly(metric: string, value: number, threshold: number = DEFAULT_ANOMALY_THRESHOLD): boolean {
    return this.anomalyScore(metric, value) > threshold;
  }

  /**
   * Serialize stats for persistence / 序列化統計以便持久化
   *
   * @returns Serializable record of all metric stats / 所有指標統計的可序列化記錄
   */
  toJSON(): Record<string, MetricStats> {
    const result: Record<string, MetricStats> = {};
    for (const [key, stats] of this.metrics) {
      result[key] = { ...stats, sorted: stats.sorted ? [...stats.sorted] : undefined };
    }
    return result;
  }

  /**
   * Restore from serialized stats / 從序列化統計恢復
   *
   * @param data - Serialized metric stats / 序列化的指標統計
   * @returns Restored AnomalyScorer instance / 恢復的 AnomalyScorer 實例
   */
  static fromJSON(data: Record<string, MetricStats>): AnomalyScorer {
    const scorer = new AnomalyScorer();
    for (const [key, stats] of Object.entries(data)) {
      scorer.metrics.set(key, {
        ...stats,
        sorted: stats.sorted ? [...stats.sorted] : undefined,
      });
    }
    return scorer;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers / 內部輔助函數
// ---------------------------------------------------------------------------

/**
 * Calculate percentile from sorted array using linear interpolation
 * 使用線性內插法從排序陣列計算百分位數
 *
 * @param sorted - Sorted array of numbers / 排序的數字陣列
 * @param p - Percentile (0-100) / 百分位數
 * @returns Percentile value / 百分位數值
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return sorted[lower]!;

  return sorted[lower]! + fraction * (sorted[upper]! - sorted[lower]!);
}

/**
 * Binary search for insertion index in sorted array
 * 在排序陣列中二分搜尋插入位置
 *
 * @param sorted - Sorted array / 排序陣列
 * @param value - Value to insert / 要插入的值
 * @returns Insertion index / 插入位置
 */
function binarySearchInsert(sorted: number[], value: number): number {
  let low = 0;
  let high = sorted.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sorted[mid]! < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}
