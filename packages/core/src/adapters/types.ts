/**
 * Security tool adapter type definitions
 * 資安工具對接器型別定義
 *
 * Defines all interfaces used by security tool adapters for
 * integrating with external security systems (Defender, Wazuh, Syslog, etc.).
 * 定義資安工具對接器所使用的所有介面，用於與外部安全系統整合
 * （Defender、Wazuh、Syslog 等）。
 *
 * @module @panguard-ai/core/adapters/types
 */

import type { SecurityEvent } from '../types.js';

/**
 * Configuration for a security adapter
 * 安全對接器配置
 */
export interface AdapterConfig {
  /**
   * Whether this adapter is enabled
   * 此對接器是否已啟用
   */
  enabled: boolean;

  /**
   * API endpoint URL (for REST-based adapters)
   * API 端點 URL（用於基於 REST 的對接器）
   */
  endpoint?: string;

  /**
   * API key for authentication
   * 用於認證的 API 金鑰
   */
  apiKey?: string;

  /**
   * Username for basic authentication
   * 用於基本認證的使用者名稱
   */
  username?: string;

  /**
   * Password for basic authentication
   * 用於基本認證的密碼
   */
  password?: string;

  /**
   * Polling interval in milliseconds for periodic alert collection
   * 定期收集告警的輪詢間隔（毫秒）
   */
  pollInterval?: number;
}

/**
 * Normalized alert from an external security tool
 * 來自外部安全工具的正規化告警
 */
export interface AdapterAlert {
  /**
   * Unique alert identifier
   * 唯一告警識別碼
   */
  id: string;

  /**
   * Alert timestamp (ISO 8601 string)
   * 告警時間戳（ISO 8601 字串）
   */
  timestamp: string;

  /**
   * Severity level as string (mapped to Severity type in SecurityEvent)
   * 嚴重等級字串（在 SecurityEvent 中映射為 Severity 型別）
   */
  severity: string;

  /**
   * Alert title / summary
   * 告警標題/摘要
   */
  title: string;

  /**
   * Alert description with full details
   * 告警描述及完整詳情
   */
  description: string;

  /**
   * Source system name (e.g. 'defender', 'wazuh', 'syslog')
   * 來源系統名稱（例如 'defender'、'wazuh'、'syslog'）
   */
  source: string;

  /**
   * Raw alert data from the original source
   * 來自原始來源的原始告警資料
   */
  raw?: unknown;
}

/**
 * Common interface for all security tool adapters
 * 所有安全工具對接器的通用介面
 *
 * Each adapter wraps a specific security tool or data source and provides
 * a uniform way to check availability, retrieve alerts, and convert them
 * to the standardized SecurityEvent format.
 * 每個對接器包裝一個特定的安全工具或資料來源，提供統一的方式來
 * 檢查可用性、取得告警，並將其轉換為標準化的 SecurityEvent 格式。
 */
export interface SecurityAdapter {
  /**
   * Human-readable adapter name (e.g. 'Windows Defender')
   * 人類可讀的對接器名稱（例如 'Windows Defender'）
   */
  readonly name: string;

  /**
   * Adapter type identifier (e.g. 'antivirus', 'siem', 'syslog')
   * 對接器類型識別碼（例如 'antivirus'、'siem'、'syslog'）
   */
  readonly type: string;

  /**
   * Check if the underlying security tool is available and reachable
   * 檢查底層安全工具是否可用且可連線
   *
   * @returns True if available, false otherwise / 可用則回傳 true，否則 false
   */
  isAvailable(): Promise<boolean>;

  /**
   * Retrieve alerts from the security tool
   * 從安全工具取得告警
   *
   * @param since - Optional cutoff date; only return alerts after this time / 可選截止日期，僅回傳此時間之後的告警
   * @returns Array of normalized adapter alerts / 正規化對接器告警陣列
   */
  getAlerts(since?: Date): Promise<AdapterAlert[]>;

  /**
   * Convert adapter alerts to standardized SecurityEvent format
   * 將對接器告警轉換為標準化的 SecurityEvent 格式
   *
   * @param alerts - Array of adapter alerts to convert / 要轉換的對接器告警陣列
   * @returns Array of SecurityEvent instances / SecurityEvent 實例陣列
   */
  toSecurityEvents(alerts: AdapterAlert[]): SecurityEvent[];
}
