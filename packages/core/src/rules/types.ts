/**
 * Sigma rules engine type definitions
 * Sigma 規則引擎型別定義
 *
 * Defines all types used by the Sigma rule parser, matcher, and engine.
 * 定義 Sigma 規則解析器、比對器和引擎使用的所有型別。
 *
 * @module @openclaw/core/rules/types
 */

import type { Severity, SecurityEvent } from '../types.js';

/**
 * Sigma log source definition
 * Sigma 日誌來源定義
 *
 * Describes where a rule's log data originates from.
 * 描述規則的日誌資料來源。
 */
export interface SigmaLogSource {
  /** Log category (e.g., 'authentication', 'process_creation') / 日誌分類 */
  category?: string;
  /** Product name (e.g., 'windows', 'linux', 'any') / 產品名稱 */
  product?: string;
  /** Service name (e.g., 'sshd', 'sysmon') / 服務名稱 */
  service?: string;
}

/**
 * Sigma detection block
 * Sigma 偵測區塊
 *
 * Contains named selections and a condition expression that combines them.
 * Each selection maps field names to expected values (string or string[]).
 * Field names may include modifiers like '|contains', '|endswith', '|startswith'.
 * 包含命名選擇項和組合它們的條件表達式。
 * 每個選擇項將欄位名稱映射到預期值（字串或字串陣列）。
 * 欄位名稱可包含修飾符如 '|contains'、'|endswith'、'|startswith'。
 */
export interface SigmaDetection {
  /** Named selections mapping field names to expected values / 命名選擇項，將欄位名映射到預期值 */
  [selectionName: string]: Record<string, string | string[]> | string;
  /** Condition expression combining selections (e.g., 'selection1 AND selection2') / 組合選擇項的條件表達式 */
  condition: string;
}

/**
 * Sigma rule definition
 * Sigma 規則定義
 *
 * A complete Sigma rule that can be parsed from YAML and matched against events.
 * 可從 YAML 解析並與事件比對的完整 Sigma 規則。
 */
export interface SigmaRule {
  /** Unique rule identifier / 唯一規則識別碼 */
  id: string;
  /** Rule title / 規則標題 */
  title: string;
  /** Rule maturity status / 規則成熟度狀態 */
  status: 'experimental' | 'test' | 'stable';
  /** Rule description / 規則描述 */
  description: string;
  /** Rule author / 規則作者 */
  author?: string;
  /** Rule creation or last modification date / 規則建立或最後修改日期 */
  date?: string;
  /** Log source specification / 日誌來源規格 */
  logsource: SigmaLogSource;
  /** Detection logic with selections and condition / 偵測邏輯，包含選擇項和條件 */
  detection: SigmaDetection;
  /** Alert severity level / 警報嚴重等級 */
  level: Severity;
  /** Tags (e.g., MITRE ATT&CK references) / 標籤（如 MITRE ATT&CK 參考） */
  tags?: string[];
  /** Known false positive scenarios / 已知誤報情境 */
  falsepositives?: string[];
  /** External reference URLs / 外部參考連結 */
  references?: string[];
}

/**
 * Result of matching an event against a Sigma rule
 * 安全事件與 Sigma 規則比對的結果
 *
 * Produced when an event matches a rule's detection logic.
 * 當事件符合規則的偵測邏輯時產生。
 */
export interface RuleMatch {
  /** The matched Sigma rule / 比對到的 Sigma 規則 */
  rule: SigmaRule;
  /** The event that triggered the match / 觸發比對的事件 */
  event: SecurityEvent;
  /** Field names that matched in the detection / 偵測中比對到的欄位名稱 */
  matchedFields: string[];
  /** ISO timestamp when the match was detected / 偵測到比對的 ISO 時間戳 */
  timestamp: string;
}

/**
 * Configuration for the rule engine
 * 規則引擎配置
 *
 * Controls how the rule engine loads and manages rules.
 * 控制規則引擎如何載入和管理規則。
 */
export interface RuleEngineConfig {
  /** Directory containing Sigma rule YAML files / 包含 Sigma 規則 YAML 檔案的目錄 */
  rulesDir?: string;
  /** Enable hot-reloading of rules when files change / 啟用檔案變更時的規則熱載入 */
  hotReload?: boolean;
  /** Pre-loaded custom rules / 預載入的自訂規則 */
  customRules?: SigmaRule[];
}
