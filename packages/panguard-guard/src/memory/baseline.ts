/**
 * Baseline Memory - Environment behavior baseline management
 * 基線記憶 - 環境行為基線管理
 *
 * Tracks normal system behavior patterns and detects deviations.
 * 追蹤正常系統行為模式並偵測偏離。
 *
 * @module @panguard-ai/panguard-guard/memory/baseline
 */

import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import type {
  EnvironmentBaseline,
  DeviationResult,
  ProcessPattern,
  ConnectionPattern,
  LoginPattern,
} from '../types.js';
import type { AnomalyScorer } from './anomaly-scorer.js';

const logger = createLogger('panguard-guard:baseline');

/**
 * Create an empty baseline / 建立空白基線
 */
export function createEmptyBaseline(): EnvironmentBaseline {
  return {
    normalProcesses: [],
    normalConnections: [],
    normalLoginPatterns: [],
    normalServicePorts: [],
    learningStarted: new Date().toISOString(),
    learningComplete: false,
    confidenceLevel: 0,
    lastUpdated: new Date().toISOString(),
    eventCount: 0,
  };
}

/**
 * Check if a security event deviates from the environment baseline
 * 檢查安全事件是否偏離環境基線
 *
 * When an optional AnomalyScorer is provided, the confidence values are
 * replaced with statistical anomaly scores (0-100) instead of hardcoded
 * values. This enables graduated scoring where a never-seen IP is
 * differentiated from a brute force attack.
 * 當提供可選的 AnomalyScorer 時，信心值將替換為統計異常分數 (0-100)
 * 而非硬編碼值。這實現了分級評分，讓未見過的 IP 與暴力攻擊有不同分數。
 *
 * @param baseline - The current environment baseline / 當前環境基線
 * @param event - The security event to check / 要檢查的安全事件
 * @param scorer - Optional anomaly scorer for statistical confidence / 可選的異常評分器
 * @returns DeviationResult indicating whether a deviation was found / 偏離結果
 */
export function checkDeviation(
  baseline: EnvironmentBaseline,
  event: SecurityEvent,
  scorer?: AnomalyScorer
): DeviationResult {
  // Check for new process / 檢查新程序
  if (event.source === 'process') {
    const processName = extractProcessName(event);
    if (processName) {
      const known = baseline.normalProcesses.some((p: ProcessPattern) => p.name === processName);
      if (!known) {
        // Use statistical score when scorer is available / 有評分器時使用統計分數
        const confidence = scorer
          ? Math.max(70, scorer.anomalyScore('process_count', baseline.normalProcesses.length + 1))
          : 70;

        return {
          isDeviation: true,
          deviationType: 'new_process',
          confidence,
          description:
            `New process detected: ${processName} (not in baseline) / ` +
            `偵測到新程序: ${processName} (不在基線中)`,
        };
      }
    }
  }

  // Check for new network destination / 檢查新網路目的地
  if (event.source === 'network') {
    const remoteAddr = extractRemoteAddress(event);
    if (remoteAddr) {
      const known = baseline.normalConnections.some(
        (c: ConnectionPattern) => c.remoteAddress === remoteAddr
      );
      if (!known) {
        // Use statistical score when scorer is available / 有評分器時使用統計分數
        const connFreqMetric = `conn_freq_${remoteAddr}`;
        const confidence = scorer ? Math.max(65, scorer.anomalyScore(connFreqMetric, 1)) : 65;

        return {
          isDeviation: true,
          deviationType: 'new_network_dest',
          confidence,
          description:
            `New network destination: ${remoteAddr} (not in baseline) / ` +
            `偵測到新網路目的地: ${remoteAddr} (不在基線中)`,
        };
      }
    }
  }

  // Check for new user login pattern / 檢查新使用者登入模式
  const username = extractUsername(event);
  if (username) {
    const known = baseline.normalLoginPatterns.some((l: LoginPattern) => l.username === username);
    if (!known) {
      // Use statistical score for login hour when scorer is available / 有評分器時使用登入小時統計分數
      const eventDate =
        event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
      const loginHour = eventDate.getHours();
      const confidence = scorer ? Math.max(60, scorer.anomalyScore('login_hour', loginHour)) : 60;

      return {
        isDeviation: true,
        deviationType: 'new_user',
        confidence,
        description:
          `New user activity: ${username} (not in baseline) / ` +
          `偵測到新使用者活動: ${username} (不在基線中)`,
      };
    }
  }

  // No deviation / 無偏離
  return {
    isDeviation: false,
    deviationType: 'none',
    confidence: 0,
    description: 'Event within normal baseline parameters / 事件在正常基線參數範圍內',
  };
}

/**
 * Update the baseline with a new event (learning mode)
 * 使用新事件更新基線（學習模式）
 *
 * @param baseline - The current baseline to update / 要更新的當前基線
 * @param event - The security event to learn from / 要學習的安全事件
 * @returns Updated baseline / 更新後的基線
 */
export function updateBaseline(
  baseline: EnvironmentBaseline,
  event: SecurityEvent
): EnvironmentBaseline {
  const now = new Date().toISOString();
  const updated: EnvironmentBaseline = {
    ...baseline,
    lastUpdated: now,
    eventCount: baseline.eventCount + 1,
  };

  // Update process patterns / 更新程序模式
  if (event.source === 'process') {
    const processName = extractProcessName(event);
    if (processName) {
      updated.normalProcesses = updateProcessPatterns(
        [...baseline.normalProcesses],
        processName,
        (event.metadata?.['processPath'] as string) ?? undefined,
        now
      );
    }
  }

  // Update connection patterns / 更新連線模式
  if (event.source === 'network') {
    const remoteAddr = extractRemoteAddress(event);
    if (remoteAddr) {
      updated.normalConnections = updateConnectionPatterns(
        [...baseline.normalConnections],
        remoteAddr,
        (event.metadata?.['remotePort'] as number) ?? 0,
        (event.metadata?.['protocol'] as string) ?? 'tcp',
        now
      );
    }
  }

  // Update login patterns / 更新登入模式
  const username = extractUsername(event);
  if (username) {
    const eventDate = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
    updated.normalLoginPatterns = updateLoginPatterns(
      [...baseline.normalLoginPatterns],
      username,
      (event.metadata?.['sourceIP'] as string) ?? undefined,
      eventDate.getHours(),
      eventDate.getDay(),
      now
    );
  }

  // Recalculate confidence / 重新計算信心度
  updated.confidenceLevel = calculateConfidence(updated);

  logger.info(
    `Baseline updated: ${event.source}/${event.category} ` +
      `(events: ${updated.eventCount}, confidence: ${(updated.confidenceLevel * 100).toFixed(1)}%) / ` +
      `基線已更新`
  );

  return updated;
}

// ---------------------------------------------------------------------------
// Internal helpers / 內部輔助函數
// ---------------------------------------------------------------------------

/** Extract process name from event metadata / 從事件 metadata 提取程序名稱 */
function extractProcessName(event: SecurityEvent): string | undefined {
  return (event.metadata?.['processName'] as string) ?? undefined;
}

/** Extract remote address from event metadata / 從事件 metadata 提取遠端地址 */
function extractRemoteAddress(event: SecurityEvent): string | undefined {
  return (
    (event.metadata?.['remoteAddress'] as string) ??
    (event.metadata?.['destinationIP'] as string) ??
    (event.metadata?.['sourceIP'] as string) ??
    undefined
  );
}

/** Extract username from event metadata / 從事件 metadata 提取使用者名稱 */
function extractUsername(event: SecurityEvent): string | undefined {
  return (
    (event.metadata?.['user'] as string) ?? (event.metadata?.['username'] as string) ?? undefined
  );
}

/** Update process patterns list / 更新程序模式列表 */
function updateProcessPatterns(
  patterns: ProcessPattern[],
  name: string,
  path: string | undefined,
  now: string
): ProcessPattern[] {
  const existing = patterns.find((p) => p.name === name);
  if (existing) {
    existing.frequency += 1;
    existing.lastSeen = now;
  } else {
    patterns.push({
      name,
      path,
      frequency: 1,
      firstSeen: now,
      lastSeen: now,
    });
  }
  return patterns;
}

/** Update connection patterns list / 更新連線模式列表 */
function updateConnectionPatterns(
  patterns: ConnectionPattern[],
  remoteAddress: string,
  remotePort: number,
  protocol: string,
  now: string
): ConnectionPattern[] {
  const existing = patterns.find(
    (c) => c.remoteAddress === remoteAddress && c.remotePort === remotePort
  );
  if (existing) {
    existing.frequency += 1;
    existing.lastSeen = now;
  } else {
    patterns.push({
      remoteAddress,
      remotePort,
      protocol,
      frequency: 1,
      firstSeen: now,
      lastSeen: now,
    });
  }
  return patterns;
}

/** Update login patterns list / 更新登入模式列表 */
function updateLoginPatterns(
  patterns: LoginPattern[],
  username: string,
  sourceIP: string | undefined,
  hourOfDay: number,
  dayOfWeek: number,
  now: string
): LoginPattern[] {
  const existing = patterns.find((l) => l.username === username);
  if (existing) {
    existing.frequency += 1;
    existing.lastSeen = now;
  } else {
    patterns.push({
      username,
      sourceIP,
      hourOfDay,
      dayOfWeek,
      frequency: 1,
      firstSeen: now,
      lastSeen: now,
    });
  }
  return patterns;
}

/**
 * Prune stale patterns from a baseline that have not been seen within the retention window.
 * Returns a new baseline without mutating the original.
 * 從基線中修剪在保留窗口內未見過的過時模式。
 * 回傳新基線而不改變原始基線。
 *
 * @param baseline - The current baseline / 當前基線
 * @param retentionDays - Number of days to retain patterns (default: 30) / 保留模式的天數
 * @returns New baseline with stale patterns removed / 已移除過時模式的新基線
 */
export function pruneStalePatterns(
  baseline: EnvironmentBaseline,
  retentionDays = 30
): EnvironmentBaseline {
  const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return {
    ...baseline,
    normalProcesses: baseline.normalProcesses.filter(
      (p) => now - new Date(p.lastSeen).getTime() < cutoffMs
    ),
    normalConnections: baseline.normalConnections.filter(
      (c) => now - new Date(c.lastSeen).getTime() < cutoffMs
    ),
    normalLoginPatterns: baseline.normalLoginPatterns.filter(
      (l) => now - new Date(l.lastSeen).getTime() < cutoffMs
    ),
    normalServicePorts: baseline.normalServicePorts.filter(
      (s) => now - new Date(s.lastSeen).getTime() < cutoffMs
    ),
  };
}

/**
 * Continuously update the baseline in protection mode with benign events.
 * Only updates for 'benign' verdicts. Increments pattern frequencies by 0.25.
 * Optionally prunes stale patterns if retentionDays is provided.
 * Returns a new baseline without mutating the original.
 * 在防護模式下使用良性事件持續更新基線。
 * 僅對 'benign' 判定進行更新。將模式頻率增加 0.25。
 * 若提供 retentionDays，則可選地修剪過時模式。
 *
 * @param baseline - The current baseline / 當前基線
 * @param event - The security event to incorporate / 要納入的安全事件
 * @param verdict - The event verdict ('benign', 'suspicious', 'malicious') / 事件判定
 * @param retentionDays - Optional retention window for pruning stale patterns / 修剪過時模式的可選保留窗口
 * @returns Updated baseline or original if verdict is not benign / 更新後的基線，若非良性判定則回傳原始基線
 */
export function continuousBaselineUpdate(
  baseline: EnvironmentBaseline,
  event: SecurityEvent,
  verdict: string,
  retentionDays?: number
): EnvironmentBaseline {
  // Only update for benign events / 僅對良性事件更新
  if (verdict !== 'benign') {
    return baseline;
  }

  const now = new Date().toISOString();

  // Start from the current baseline, optionally pruned
  const base =
    retentionDays !== undefined ? pruneStalePatterns(baseline, retentionDays) : { ...baseline };

  const updated: EnvironmentBaseline = {
    ...base,
    lastUpdated: now,
    lastContinuousUpdate: now,
    eventCount: base.eventCount + 1,
    normalProcesses: [...base.normalProcesses],
    normalConnections: [...base.normalConnections],
    normalLoginPatterns: [...base.normalLoginPatterns],
    normalServicePorts: [...base.normalServicePorts],
  };

  // Update process patterns (frequency increment by 0.25) / 更新程序模式（頻率增加 0.25）
  if (event.source === 'process') {
    const processName = extractProcessName(event);
    if (processName) {
      const existing = updated.normalProcesses.find((p) => p.name === processName);
      if (existing) {
        updated.normalProcesses = updated.normalProcesses.map((p) =>
          p.name === processName ? { ...p, frequency: p.frequency + 0.25, lastSeen: now } : p
        );
      } else {
        const path = (event.metadata?.['processPath'] as string) ?? undefined;
        updated.normalProcesses = [
          ...updated.normalProcesses,
          { name: processName, path, frequency: 0.25, firstSeen: now, lastSeen: now },
        ];
      }
    }
  }

  // Update connection patterns / 更新連線模式
  if (event.source === 'network') {
    const remoteAddr = extractRemoteAddress(event);
    if (remoteAddr) {
      const remotePort = (event.metadata?.['remotePort'] as number) ?? 0;
      const protocol = (event.metadata?.['protocol'] as string) ?? 'tcp';
      const existing = updated.normalConnections.find(
        (c) => c.remoteAddress === remoteAddr && c.remotePort === remotePort
      );
      if (existing) {
        updated.normalConnections = updated.normalConnections.map((c) =>
          c.remoteAddress === remoteAddr && c.remotePort === remotePort
            ? { ...c, frequency: c.frequency + 0.25, lastSeen: now }
            : c
        );
      } else {
        updated.normalConnections = [
          ...updated.normalConnections,
          {
            remoteAddress: remoteAddr,
            remotePort,
            protocol,
            frequency: 0.25,
            firstSeen: now,
            lastSeen: now,
          },
        ];
      }
    }
  }

  // Update login patterns / 更新登入模式
  const username = extractUsername(event);
  if (username) {
    const eventDate = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);
    const existing = updated.normalLoginPatterns.find((l) => l.username === username);
    if (existing) {
      updated.normalLoginPatterns = updated.normalLoginPatterns.map((l) =>
        l.username === username ? { ...l, frequency: l.frequency + 0.25, lastSeen: now } : l
      );
    } else {
      const sourceIP = (event.metadata?.['sourceIP'] as string) ?? undefined;
      updated.normalLoginPatterns = [
        ...updated.normalLoginPatterns,
        {
          username,
          sourceIP,
          hourOfDay: eventDate.getHours(),
          dayOfWeek: eventDate.getDay(),
          frequency: 0.25,
          firstSeen: now,
          lastSeen: now,
        },
      ];
    }
  }

  // Recalculate confidence / 重新計算信心度
  updated.confidenceLevel = calculateConfidence(updated);

  return updated;
}

/**
 * Calculate baseline confidence based on data volume
 * 根據數據量計算基線信心度
 *
 * Confidence grows logarithmically with event count, capping at 0.95
 * 信心度隨事件數量對數增長，上限為 0.95
 */
function calculateConfidence(baseline: EnvironmentBaseline): number {
  const minEvents = 100;
  const targetEvents = 10000;

  if (baseline.eventCount < minEvents) {
    return (baseline.eventCount / minEvents) * 0.3;
  }

  const logProgress =
    Math.log(baseline.eventCount / minEvents) / Math.log(targetEvents / minEvents);
  return Math.min(0.95, 0.3 + logProgress * 0.65);
}
