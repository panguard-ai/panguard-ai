/**
 * Security hardening type definitions
 * 安全強化類型定義
 *
 * @module @openclaw/security-hardening/types
 */

import type { Severity } from '@openclaw/core';

/**
 * Security policy configuration
 * 安全政策配置
 */
export interface SecurityPolicy {
  /** Enable shell access / 啟用 shell 存取 */
  allowShellAccess: boolean;
  /** Allowed filesystem directories / 允許的檔案系統目錄 */
  allowedDirectories: string[];
  /** Allowed commands for sandbox / 沙盒允許的命令 */
  allowedCommands: string[];
  /** Require CSRF tokens for WebSocket / WebSocket 要求 CSRF token */
  requireCsrfToken: boolean;
  /** Allowed WebSocket origins / 允許的 WebSocket 來源 */
  allowedOrigins: string[];
  /** Enable audit logging / 啟用稽核日誌 */
  enableAuditLog: boolean;
  /** Syslog server address (optional) / Syslog 伺服器位址（可選） */
  syslogServer?: string;
  /** Syslog server port (optional) / Syslog 伺服器連接埠（可選） */
  syslogPort?: number;
}

/**
 * CSRF token data
 * CSRF token 資料
 */
export interface CsrfToken {
  /** Token value / Token 值 */
  token: string;
  /** Session ID / 會話 ID */
  sessionId: string;
  /** Expiration timestamp / 過期時間戳 */
  expiresAt: Date;
  /** Creation timestamp / 建立時間戳 */
  createdAt: Date;
}

/**
 * Origin validation configuration
 * Origin 驗證配置
 */
export interface OriginConfig {
  /** Explicitly allowed origins / 明確允許的 origins */
  allowedOrigins: string[];
  /** Allow localhost connections / 允許本機連線 */
  allowLocalhost: boolean;
}

/**
 * Audit event action types
 * 稽核事件操作類型
 */
export type AuditAction =
  | 'websocket_connect'
  | 'credential_access'
  | 'credential_migrate'
  | 'file_access'
  | 'command_execution'
  | 'policy_check'
  | 'security_scan';

/**
 * Audit event for security operations
 * 安全操作的稽核事件
 */
export interface AuditEvent {
  /** ISO timestamp / ISO 時間戳 */
  timestamp: string;
  /** Log level / 日誌等級 */
  level: 'info' | 'warn' | 'error';
  /** Action type / 操作類型 */
  action: AuditAction;
  /** Target resource / 目標資源 */
  target: string;
  /** Operation result / 操作結果 */
  result: 'success' | 'failure' | 'blocked';
  /** Module name / 模組名稱 */
  module: string;
  /** Additional context / 額外上下文 */
  context?: Record<string, unknown>;
}

/**
 * Credential store interface
 * 憑證儲存介面
 */
export interface CredentialStore {
  /** Get credential / 取得憑證 */
  get(service: string, account: string): Promise<string | null>;
  /** Set credential / 設定憑證 */
  set(service: string, account: string, password: string): Promise<void>;
  /** Delete credential / 刪除憑證 */
  delete(service: string, account: string): Promise<boolean>;
  /** List accounts for a service / 列出服務的帳號 */
  list(service: string): Promise<string[]>;
}

/**
 * Vulnerability finding from security audit
 * 安全稽核的漏洞發現
 */
export interface VulnerabilityFinding {
  /** CVE or internal identifier / CVE 或內部識別碼 */
  id: string;
  /** Severity level / 嚴重程度 */
  severity: Severity;
  /** Vulnerability title / 漏洞標題 */
  title: string;
  /** Description / 描述 */
  description: string;
  /** Affected component / 受影響的元件 */
  component: string;
  /** Remediation steps / 修復步驟 */
  remediation: string;
  /** Is fixed / 是否已修復 */
  fixed: boolean;
}

/**
 * Security audit report
 * 安全稽核報告
 */
export interface SecurityAuditReport {
  /** Scan timestamp / 掃描時間戳 */
  timestamp: string;
  /** Security hardening version / 安全強化版本 */
  version: string;
  /** Vulnerability findings / 漏洞發現 */
  findings: VulnerabilityFinding[];
  /** Overall risk score (0-100) / 整體風險評分（0-100） */
  riskScore: number;
  /** Recommendations / 建議 */
  recommendations: string[];
}

/**
 * Migration report for credential migration
 * 憑證遷移報告
 */
export interface MigrationReport {
  /** Number of credentials scanned / 掃描的憑證數量 */
  scanned: number;
  /** Number of credentials migrated / 已遷移的憑證數量 */
  migrated: number;
  /** Number of failed migrations / 遷移失敗的數量 */
  failed: number;
  /** Error messages / 錯誤訊息 */
  errors: string[];
}
