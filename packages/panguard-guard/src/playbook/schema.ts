/**
 * SOAR Playbook Schema Definition
 * SOAR 劇本架構定義
 *
 * Defines the structure of YAML playbooks that describe automated
 * response strategies for specific threat patterns.
 *
 * @module @panguard-ai/panguard-guard/playbook/schema
 */

import type { ResponseAction } from '../types.js';

/**
 * Correlation pattern types that playbooks can trigger on.
 * 劇本可觸發的關聯模式類型。
 */
export type CorrelationPatternType =
  | 'brute_force'
  | 'port_scan'
  | 'data_exfiltration'
  | 'lateral_movement'
  | 'privilege_escalation'
  | 'command_and_control'
  | 'credential_access'
  | 'reconnaissance'
  | 'malware'
  | 'web_attack'
  | 'denial_of_service'
  | 'cryptomining';

/** All valid correlation pattern types / 所有有效的關聯模式類型 */
export const VALID_CORRELATION_PATTERNS: ReadonlySet<string> = new Set<string>([
  'brute_force',
  'port_scan',
  'data_exfiltration',
  'lateral_movement',
  'privilege_escalation',
  'command_and_control',
  'credential_access',
  'reconnaissance',
  'malware',
  'web_attack',
  'denial_of_service',
  'cryptomining',
]);

/** All valid response action types / 所有有效的回應動作類型 */
export const VALID_RESPONSE_ACTIONS: ReadonlySet<string> = new Set<string>([
  'log_only',
  'notify',
  'block_ip',
  'kill_process',
  'disable_account',
  'isolate_file',
]);

/** All valid severity levels / 所有有效的嚴重等級 */
export const VALID_SEVERITIES: ReadonlySet<string> = new Set<string>([
  'low',
  'medium',
  'high',
  'critical',
]);

/** Severity numeric mapping for comparison / 嚴重度數值映射（用於比較） */
export const SEVERITY_ORDER: Readonly<Record<string, number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * A single action within a playbook.
 * 劇本中的單一動作。
 */
export interface PlaybookAction {
  /** Response action type / 回應動作類型 */
  type: ResponseAction;
  /** Optional action parameters / 選用的動作參數 */
  params?: Record<string, unknown>;
}

/**
 * Trigger conditions for a playbook (AND logic).
 * 劇本的觸發條件（AND 邏輯）。
 */
export interface PlaybookTrigger {
  /** Correlation pattern type to match / 要匹配的關聯模式類型 */
  pattern?: CorrelationPatternType;
  /** Minimum confidence to trigger / 觸發的最低信心度 */
  minConfidence?: number;
  /** Minimum severity / 最低嚴重度 */
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
  /** Event category match / 事件分類匹配 */
  category?: string;
  /** MITRE ATT&CK technique ID / MITRE ATT&CK 技術 ID */
  mitreTechnique?: string;
}

/**
 * Escalation configuration for repeated occurrences.
 * 重複發生時的升級配置。
 */
export interface PlaybookEscalation {
  /** Number of occurrences before escalation / 升級前的發生次數 */
  after: number;
  /** Time window for counting occurrences (e.g., '1h', '24h') / 計數時間窗口 */
  within?: string;
  /** Escalated actions / 升級後的動作 */
  actions: PlaybookAction[];
}

/**
 * Complete playbook definition.
 * 完整的劇本定義。
 */
export interface Playbook {
  /** Unique playbook name / 唯一劇本名稱 */
  name: string;
  /** English description / 英文描述 */
  description?: string;
  /** Traditional Chinese description / 繁體中文描述 */
  descriptionZh?: string;
  /** Trigger conditions (AND logic) / 觸發條件（AND 邏輯） */
  trigger: PlaybookTrigger;
  /** Actions to execute on match / 匹配時執行的動作 */
  actions: PlaybookAction[];
  /** Escalation for repeated occurrences / 重複發生時的升級 */
  escalation?: PlaybookEscalation;
  /** Whether the playbook is enabled (default: true) / 劇本是否啟用 */
  enabled?: boolean;
  /** Priority (higher = checked first, default: 0) / 優先級（越高越先檢查） */
  priority?: number;
}
