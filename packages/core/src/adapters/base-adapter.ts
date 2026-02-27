/**
 * Abstract base class for security tool adapters
 * 安全工具對接器抽象基底類別
 *
 * Provides shared functionality for all adapters including configuration
 * management, logging, and standard alert-to-SecurityEvent conversion.
 * 為所有對接器提供共用功能，包括配置管理、日誌記錄和標準
 * 告警到 SecurityEvent 的轉換。
 *
 * @module @panguard-ai/core/adapters/base-adapter
 */

import { randomUUID } from 'node:crypto';
import os from 'node:os';

import { createLogger } from '../utils/logger.js';
import type { Logger } from '../utils/logger.js';
import type { SecurityEvent, Severity, EventSource } from '../types.js';
import type { AdapterConfig, AdapterAlert, SecurityAdapter } from './types.js';

/**
 * Map a severity string to the standard Severity type
 * 將嚴重等級字串映射為標準 Severity 型別
 *
 * Handles common severity labels from various security tools and normalizes
 * them into the five-level Severity scale used throughout Panguard.
 * 處理來自各種安全工具的常見嚴重等級標籤，並將其正規化為
 * Panguard 中使用的五級 Severity 量表。
 *
 * @param severity - Raw severity string from the adapter / 來自對接器的原始嚴重等級字串
 * @returns Normalized Severity value / 正規化的 Severity 值
 */
export function mapSeverity(severity: string): Severity {
  const normalized = severity.toLowerCase().trim();

  switch (normalized) {
    case 'critical':
    case 'fatal':
    case 'emergency':
    case '5':
      return 'critical';

    case 'high':
    case 'severe':
    case 'major':
    case '4':
      return 'high';

    case 'medium':
    case 'moderate':
    case 'warning':
    case 'warn':
    case '3':
      return 'medium';

    case 'low':
    case 'minor':
    case '2':
      return 'low';

    case 'info':
    case 'informational':
    case 'notice':
    case 'debug':
    case '1':
    case '0':
      return 'info';

    default:
      return 'info';
  }
}

/**
 * Map an adapter source string to the standard EventSource type
 * 將對接器來源字串映射為標準 EventSource 型別
 *
 * @param source - Raw source string from the adapter / 來自對接器的原始來源字串
 * @returns Normalized EventSource value / 正規化的 EventSource 值
 */
export function mapEventSource(source: string): EventSource {
  const normalized = source.toLowerCase().trim();

  if (normalized.includes('falco')) {
    return 'falco';
  }
  if (normalized.includes('suricata')) {
    return 'suricata';
  }
  if (normalized.includes('syslog')) {
    return 'syslog';
  }
  if (normalized.includes('network') || normalized.includes('wazuh')) {
    return 'network';
  }
  if (normalized.includes('process')) {
    return 'process';
  }
  if (normalized.includes('file')) {
    return 'file';
  }
  // Default: Windows events for Defender, syslog for others
  // 預設：Defender 使用 windows_event，其他使用 syslog
  if (normalized.includes('defender') || normalized.includes('windows')) {
    return 'windows_event';
  }

  return 'syslog';
}

/**
 * Abstract base adapter providing shared implementation for security adapters
 * 提供安全對接器共用實作的抽象基底對接器
 *
 * Subclasses must implement:
 * - `isAvailable()`: Check if the underlying tool is reachable
 * - `getAlerts(since?)`: Retrieve alerts from the underlying tool
 *
 * 子類別必須實作：
 * - `isAvailable()`：檢查底層工具是否可連線
 * - `getAlerts(since?)`：從底層工具取得告警
 */
export abstract class BaseAdapter implements SecurityAdapter {
  /**
   * Human-readable adapter name
   * 人類可讀的對接器名稱
   */
  abstract readonly name: string;

  /**
   * Adapter type identifier
   * 對接器類型識別碼
   */
  abstract readonly type: string;

  /**
   * Logger instance scoped to this adapter
   * 範圍限定於此對接器的日誌記錄器實例
   */
  protected readonly logger: Logger;

  /**
   * Adapter configuration
   * 對接器配置
   */
  protected readonly config: AdapterConfig;

  /**
   * Create a new BaseAdapter instance
   * 建立新的 BaseAdapter 實例
   *
   * @param moduleName - Logger module name / 日誌記錄器模組名稱
   * @param config - Adapter configuration / 對接器配置
   */
  constructor(moduleName: string, config: AdapterConfig) {
    this.logger = createLogger(moduleName);
    this.config = config;
  }

  /**
   * Check if the underlying security tool is available
   * 檢查底層安全工具是否可用
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Retrieve alerts from the security tool
   * 從安全工具取得告警
   */
  abstract getAlerts(since?: Date): Promise<AdapterAlert[]>;

  /**
   * Convert adapter alerts to standardized SecurityEvent format
   * 將對接器告警轉換為標準化的 SecurityEvent 格式
   *
   * Uses shared mapping logic for severity and event source normalization.
   * The host field defaults to the current system hostname.
   * 使用共用映射邏輯進行嚴重等級和事件來源正規化。
   * host 欄位預設為目前系統主機名稱。
   *
   * @param alerts - Array of adapter alerts to convert / 要轉換的對接器告警陣列
   * @returns Array of SecurityEvent instances / SecurityEvent 實例陣列
   */
  toSecurityEvents(alerts: AdapterAlert[]): SecurityEvent[] {
    return alerts.map((alert) => ({
      id: alert.id || randomUUID(),
      timestamp: new Date(alert.timestamp),
      source: mapEventSource(alert.source),
      severity: mapSeverity(alert.severity),
      category: `adapter/${alert.source}`,
      description: `[${alert.title}] ${alert.description}`,
      raw: alert.raw ?? alert,
      host: os.hostname(),
      metadata: {
        adapterName: this.name,
        adapterType: this.type,
        originalSeverity: alert.severity,
        alertId: alert.id,
      },
    }));
  }
}
