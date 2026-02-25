/**
 * System monitoring engine type definitions
 * 系統監控引擎型別定義
 *
 * @module @openclaw/core/monitor/types
 */

/**
 * Configuration for the monitoring engine
 * 監控引擎配置
 */
export interface MonitorConfig {
  /** Enable log monitoring / 啟用日誌監控 */
  logMonitor: boolean;
  /** Enable network monitoring / 啟用網路監控 */
  networkMonitor: boolean;
  /** Enable process monitoring / 啟用程序監控 */
  processMonitor: boolean;
  /** Enable file integrity monitoring / 啟用檔案完整性監控 */
  fileMonitor: boolean;
  /** Network polling interval in ms / 網路輪詢間隔（毫秒） */
  networkPollInterval: number;
  /** Process polling interval in ms / 程序輪詢間隔（毫秒） */
  processPollInterval: number;
  /** File paths to watch for integrity changes / 要監控完整性變更的檔案路徑 */
  watchPaths?: string[];
}

/**
 * Default monitoring configuration
 * 預設監控配置
 */
export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  logMonitor: true,
  networkMonitor: true,
  processMonitor: true,
  fileMonitor: false,
  networkPollInterval: 30000,
  processPollInterval: 15000,
  watchPaths: [],
};

/**
 * Monitor operational status
 * 監控運作狀態
 */
export type MonitorStatus = 'running' | 'stopped' | 'error';

/**
 * Threat intelligence entry for known malicious IP addresses
 * 已知惡意 IP 位址的威脅情報條目
 */
export interface ThreatIntelEntry {
  /** IP address or CIDR range / IP 位址或 CIDR 範圍 */
  ip: string;
  /** Threat type / 威脅類型 */
  type: 'c2' | 'scanner' | 'botnet' | 'malware';
  /** Intelligence source / 情報來源 */
  source: string;
  /** Last seen timestamp (ISO string) / 最後發現時間（ISO 字串） */
  lastSeen?: string;
}

/**
 * File hash record for integrity monitoring
 * 用於完整性監控的檔案雜湊記錄
 */
export interface FileHashRecord {
  /** File path / 檔案路徑 */
  path: string;
  /** SHA-256 hash / SHA-256 雜湊 */
  hash: string;
  /** Last checked timestamp (ISO string) / 最後檢查時間（ISO 字串） */
  lastChecked: string;
  /** File size in bytes / 檔案大小（位元組） */
  size: number;
}
