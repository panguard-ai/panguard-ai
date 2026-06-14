/**
 * PanguardGuard type definitions
 * PanguardGuard 型別定義
 * @module @panguard-ai/panguard-guard/types
 */

import type { Language, Severity, SecurityEvent } from '@panguard-ai/core';

// ===== Investigation / Dynamic Reasoning =====

/** Investigation tool name / 調查工具名稱 */
export type InvestigationTool =
  | 'checkIPHistory'
  | 'checkUserPrivilege'
  | 'checkTimeAnomaly'
  | 'checkGeoLocation'
  | 'checkRelatedEvents'
  | 'checkProcessTree'
  | 'checkFileReputation'
  | 'checkNetworkPattern';

/** Single investigation step / 單一調查步驟 */
export interface InvestigationStep {
  tool: InvestigationTool;
  reason: string;
  result?: InvestigationResult;
  durationMs?: number;
}

/** Investigation result / 調查結果 */
export interface InvestigationResult {
  finding: string;
  riskContribution: number; // 0-100
  needsAdditionalInvestigation: boolean;
  data?: Record<string, unknown>;
}

/** Investigation plan from AI / AI 產生的調查計畫 */
export interface InvestigationPlan {
  steps: InvestigationStep[];
  reasoning: string;
}

// ===== Evidence & Verdict =====

/** Evidence source type / 證據來源類型 */
export type EvidenceSource =
  | 'rule_match'
  | 'ai_analysis'
  | 'baseline_deviation'
  | 'threat_intel'
  | 'investigation';

/** Evidence item / 證據項目 */
export interface Evidence {
  source: EvidenceSource;
  description: string;
  confidence: number; // 0-100
  data?: Record<string, unknown>;
}

/** Response action type / 回應動作類型 */
export type ResponseAction =
  | 'log_only'
  | 'notify'
  | 'block_ip'
  | 'kill_process'
  | 'disable_account'
  | 'isolate_file'
  // ATR agent-specific actions / ATR 代理專用動作
  | 'block_tool'
  | 'kill_agent'
  | 'quarantine_session'
  | 'revoke_skill'
  | 'reduce_permissions';

/** Threat verdict from Analyze Agent / 分析代理的威脅判決 */
export interface ThreatVerdict {
  /** Conclusion / 結論 */
  conclusion: 'benign' | 'suspicious' | 'malicious';
  /** Confidence score 0-100 / 信心分數 */
  confidence: number;
  /**
   * Confidence from deterministic evidence only (excludes the advisory AI layer). Auto-enforcement
   * uses this, so a bring-your-own LLM can never trigger a block on its own — it can only raise
   * `confidence` to notify / flag-for-review. Falls back to `confidence` when unset.
   * 僅由確定性證據計算;自動處置以此為準,自帶 LLM 永遠無法單獨觸發 block。
   */
  enforcementConfidence?: number;
  /** AI reasoning chain / AI 推理鏈 */
  reasoning: string;
  /** Supporting evidence / 支持判斷的證據 */
  evidence: Evidence[];
  /** Recommended response action / 建議的回應動作 */
  recommendedAction: ResponseAction;
  /** MITRE ATT&CK technique ID / MITRE ATT&CK 技術 ID */
  mitreTechnique?: string;
  /** Investigation steps taken / 執行的調查步驟 */
  investigationSteps?: InvestigationStep[];
}

// ===== Confidence Scoring / Action Policy =====

/** Configurable action thresholds / 可配置的動作閾值 */
export interface ActionPolicy {
  /** Auto-respond threshold (default 85) / 自動回應閾值 */
  autoRespond: number;
  /** Notify-and-wait threshold (default 50) / 通知等待閾值 */
  notifyAndWait: number;
  /** Log-only threshold (default 0) / 僅記錄閾值 */
  logOnly: number;
}

/** Default action policy / 預設動作策略 */
export const DEFAULT_ACTION_POLICY: ActionPolicy = {
  autoRespond: 85,
  notifyAndWait: 50,
  logOnly: 0,
};

// ===== Context Memory =====

/** Process pattern for baseline / 基線程序模式 */
export interface ProcessPattern {
  name: string;
  path?: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
}

/** Connection pattern for baseline / 基線連線模式 */
export interface ConnectionPattern {
  remoteAddress: string;
  remotePort: number;
  protocol: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
}

/** Login pattern for baseline / 基線登入模式 */
export interface LoginPattern {
  username: string;
  sourceIP?: string;
  hourOfDay: number;
  dayOfWeek: number;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
}

/** Port pattern for baseline / 基線埠模式 */
export interface PortPattern {
  port: number;
  service?: string;
  firstSeen: string;
  lastSeen: string;
}

/** Environment baseline built during learning / 學習期建立的環境基線 */
export interface EnvironmentBaseline {
  normalProcesses: ProcessPattern[];
  normalConnections: ConnectionPattern[];
  normalLoginPatterns: LoginPattern[];
  normalServicePorts: PortPattern[];
  learningStarted: string;
  learningComplete: boolean;
  confidenceLevel: number; // 0-1
  lastUpdated: string;
  eventCount: number;
  lastContinuousUpdate?: string;
}

/** Deviation check result / 偏離檢查結果 */
export interface DeviationResult {
  isDeviation: boolean;
  deviationType: string;
  confidence: number; // 0-100
  description: string;
}

// ===== Correlation =====

/** Correlation pattern type / 關聯模式類型 */
export type CorrelationPatternType =
  | 'brute_force'
  | 'port_scan'
  | 'lateral_movement'
  | 'data_exfiltration'
  | 'backdoor_install'
  | 'privilege_escalation'
  | 'attack_chain';

/** Event submitted to the correlator / 提交至關聯器的事件 */
export interface CorrelationEvent {
  /** Unique event identifier / 唯一事件識別碼 */
  id: string;
  /** Unix timestamp in ms / Unix 時間戳 (毫秒) */
  timestamp: number;
  /** Source IP address (if available) / 來源 IP 位址 */
  sourceIP?: string;
  /** Event source type / 事件來源類型 */
  source: string;
  /** MITRE ATT&CK or general category / MITRE ATT&CK 或通用分類 */
  category: string;
  /** Severity level / 嚴重等級 */
  severity: string;
  /** Rule IDs that matched this event / 此事件匹配的規則 ID */
  ruleIds: string[];
  /** Additional metadata / 額外中繼資料 */
  metadata: Record<string, unknown>;
}

/** A single matched correlation pattern / 單一匹配的關聯模式 */
export interface CorrelationPattern {
  /** Pattern type / 模式類型 */
  type: CorrelationPatternType;
  /** Confidence score 0-100 / 信心分數 */
  confidence: number;
  /** Source IP (if applicable) / 來源 IP */
  sourceIP?: string;
  /** Number of correlated events / 關聯事件數 */
  eventCount: number;
  /** IDs of correlated events / 關聯事件 ID */
  eventIds: string[];
  /** Human-readable description / 人類可讀描述 */
  description: string;
  /** MITRE ATT&CK technique ID / MITRE ATT&CK 技術 ID */
  mitreTechnique?: string;
  /** Suggested severity for the correlated pattern / 建議嚴重等級 */
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical';
}

/** Result from the event correlator / 事件關聯器結果 */
export interface CorrelationResult {
  /** Whether any patterns matched / 是否有模式匹配 */
  matched: boolean;
  /** All matched patterns / 所有匹配的模式 */
  patterns: CorrelationPattern[];
}

// ===== Detection =====

/** Detection result from Detect Agent / 偵測代理的偵測結果 */
export interface DetectionResult {
  event: SecurityEvent;
  ruleMatches: Array<{ ruleId: string; ruleName: string; severity: Severity }>;
  threatIntelMatch?: { ip: string; threat: string };
  timestamp: string;
  /** Attack chain correlation data (present when multiple events from same source detected) */
  attackChain?: {
    sourceIP: string;
    eventCount: number;
    ruleIds: string[];
    windowMs: number;
  };
  /** ATR (Agent Threat Rules) matches for agent-related events */
  atrMatches?: Array<{
    ruleId: string;
    category: string;
    severity: string;
    /** Preserved response actions from ATR rule definition */
    responseActions?: string[];
    /** ATR match confidence score (0-1) */
    confidence?: number;
  }>;
}

// ===== Response =====

/** Response execution result / 回應執行結果 */
export interface ResponseResult {
  action: ResponseAction;
  success: boolean;
  details: string;
  timestamp: string;
  target?: string;
}

// ===== Notification =====

/** Telegram Bot config / Telegram Bot 配置 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/** Slack Webhook config / Slack Webhook 配置 */
export interface SlackConfig {
  webhookUrl: string;
}

/** Email SMTP config / Email SMTP 配置 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
  to: string[];
}

/** Webhook config / Webhook 配置 */
export interface WebhookConfig {
  url: string;
  secret?: string;
}

/** Webhook notify config alias / Webhook 通知配置別名 */
export type WebhookNotifyConfig = WebhookConfig;

/** LINE Notify config / LINE Notify 配置 */
export interface LineConfig {
  accessToken: string;
}

/** LINE Notify config alias / LINE Notify 配置別名 */
export type LineNotifyConfig = LineConfig;

/** Notification config combining all channels / 通知配置（所有通道） */
export interface NotificationConfig {
  telegram?: TelegramConfig;
  slack?: SlackConfig;
  email?: EmailConfig;
  webhook?: WebhookConfig;
  line?: LineConfig;
}

/** Notification result / 通知結果 */
export interface NotificationResult {
  channel: 'telegram' | 'slack' | 'email' | 'line' | 'webhook';
  success: boolean;
  error?: string;
}

// ===== Threat Cloud =====

/** Anonymized threat data for cloud upload / 匿名化威脅數據 */
export interface AnonymizedThreatData {
  attackSourceIP: string;
  attackType: string;
  mitreTechnique: string;
  sigmaRuleMatched: string;
  timestamp: string;
  industry?: string;
  region: string;
  /** Unique event identifier / 唯一事件識別碼 */
  eventId?: string;
  /** SHA-256 hash of threat pattern / 威脅模式的 SHA-256 雜湊 */
  patternHash?: string;
  /** Confidence score 0-100 / 信心分數 */
  confidence?: number;
  /** Severity level / 嚴重等級 */
  severity?: 'low' | 'medium' | 'high' | 'critical';
  /** Auto-response action taken / 自動回應動作 */
  autoResponseTaken?: string;
  /** Panguard client version / Panguard 客戶端版本 */
  panguardVersion?: string;
  /** OS type (darwin/linux/windows) / 作業系統類型 */
  osType?: string;
  /** ATR rule IDs that matched (comma-separated) */
  atrRulesMatched?: string;
  /** ATR threat category (prompt-injection, tool-poisoning, etc.) */
  atrCategory?: string;
}

/** Threat cloud rule update / 威脅雲規則更新 */
export interface ThreatCloudUpdate {
  ruleId: string;
  ruleContent: string;
  publishedAt: string;
  source: string;
}

/** Threat cloud status / 威脅雲狀態 */
export type ThreatCloudStatus = 'connected' | 'disconnected' | 'offline';

// ===== License =====
//
// LicenseTier + TIER_FEATURES are defined canonically in ./license/index.ts.
// Re-export here so callers that import from './types.js' keep working,
// without duplicating the feature-gate tables (which previously drifted —
// e.g. the local copy was missing `skill_audit`, `evidence_pack`,
// `sarif_export`, `sso`, `dedicated_tc`, etc. that the canonical table
// already covers).

// Re-export so callers that `import { LicenseTier, TIER_FEATURES } from './types.js'`
// continue to work. The GuardStatus interface below references LicenseTier
// by name — it resolves to the re-exported symbol.
import type { LicenseTier, LicenseInfo } from './license/index.js';
export type { LicenseTier, LicenseInfo };
export { TIER_FEATURES } from './license/index.js';

// ===== LLM interface for PanguardGuard =====

/** LLM analysis result / LLM 分析結果 */
export interface LLMAnalysisResult {
  summary: string;
  severity: string;
  confidence: number;
  recommendations: string[];
}

/** LLM classification result / LLM 分類結果 */
export interface LLMClassificationResult {
  technique: string;
  severity: string;
  confidence: number;
  description: string;
}

/** LLM provider interface for analysis / 分析用 LLM 供應商介面 */
export interface AnalyzeLLM {
  analyze(prompt: string, context?: string): Promise<LLMAnalysisResult>;
  classify(event: SecurityEvent): Promise<LLMClassificationResult>;
  isAvailable(): Promise<boolean>;
}

// ===== Dashboard =====

/** Dashboard status data / Dashboard 狀態資料 */
export interface DashboardStatus {
  mode: GuardMode;
  uptime: number;
  eventsProcessed: number;
  threatsDetected: number;
  actionsExecuted: number;
  learningProgress: number;
  baselineConfidence: number;
  memoryUsageMB: number;
  cpuPercent: number;
  lastEvent?: SecurityEvent;
  recentVerdicts: ThreatVerdict[];
  atrRuleCount?: number;
  atrMatchCount?: number;
  atrDrafterPatterns?: number;
  atrDrafterSubmitted?: number;
  whitelistedSkills?: number;
  trackedSkills?: number;
  stableFingerprints?: number;
  licenseTier?: string;
  /** Heap total in MB / 堆積總量（MB） */
  heapTotalMB?: number;
  /** V8 heap size limit in MB / V8 堆積上限（MB） */
  heapLimitMB?: number;
  /** Heap usage as percentage of limit / 堆積使用率（佔上限百分比） */
  heapUsagePercent?: number;
  /** Memory pressure status / 記憶體壓力狀態 */
  memoryStatus?: 'healthy' | 'warning' | 'critical';
}

/** Dashboard event for WebSocket push / WebSocket 推送事件 */
export interface DashboardEvent {
  type:
    | 'status_update'
    | 'new_event'
    | 'new_verdict'
    | 'action_executed'
    | 'learning_progress'
    | 'proxy_verdict';
  data: unknown;
  timestamp: string;
}

/** Threat map entry / 威脅地圖條目 */
export interface ThreatMapEntry {
  sourceIP: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  attackType: string;
  count: number;
  lastSeen: string;
}

// ===== Guard Config =====

/**
 * Guard engine operating mode / 守護引擎運作模式
 *
 * - `learning`: observe only, no action, baseline-building (default for first N days)
 * - `report-only`: would-have-taken action is logged + alerted, but NO OS-level command
 *   runs. Recommended default for new deployments — verify detection quality before
 *   granting OS-action authority to a model.
 * - `protection`: full enforcement. OS actions execute, subject to per-action
 *   `EnforcementPolicy` allowlists below.
 */
export type GuardMode = 'learning' | 'report-only' | 'protection';

/**
 * Per-action enforcement policy. Defines exactly which OS-level actions the
 * guard is permitted to perform, and against which targets. Used only when
 * `GuardMode === 'protection'`.
 *
 * Conservative defaults: every destructive action is disabled. Operators must
 * opt in explicitly. `isolateFiles.allowedPaths` is required when enabled —
 * `$HOME`-wide isolation is no longer accepted because the guard cannot tell
 * the difference between `~/Downloads/malware.bin` and `~/.ssh/authorized_keys`.
 */
export interface EnforcementPolicy {
  /** Block remote IPs via pfctl / iptables / netsh */
  readonly blockIPs: {
    readonly enabled: boolean;
  };
  /** Kill processes by PID. Allowlist limits which process names may be killed. */
  readonly killProcesses: {
    readonly enabled: boolean;
    /** Glob patterns of process names that may be killed. Empty = none. */
    readonly allowedProcessNames: ReadonlyArray<string>;
  };
  /** Move files to quarantine. Allowlist limits source directories. */
  readonly isolateFiles: {
    readonly enabled: boolean;
    /** Absolute or `~/...` paths that contain isolatable files. Empty = none. */
    readonly allowedPaths: ReadonlyArray<string>;
  };
  /** Disable OS user accounts. Default OFF — too destructive for autonomous response. */
  readonly disableAccounts: {
    readonly enabled: boolean;
  };
}

/** Complete guard configuration / 完整守護配置 */
export interface GuardConfig {
  lang: Language;
  mode: GuardMode;
  learningDays: number;
  actionPolicy: ActionPolicy;
  notifications: NotificationConfig;
  ai?: {
    provider:
      | 'ollama'
      | 'claude'
      | 'openai'
      | 'gemini'
      | 'groq'
      | 'mistral'
      | 'deepseek'
      | 'lmstudio';
    model: string;
    endpoint?: string;
    apiKey?: string;
    byokApiKey?: string;
  };
  dataDir: string;
  threatCloudEndpoint?: string;
  threatCloudApiKey?: string;
  threatCloudUploadEnabled?: boolean;
  /** Receive new ATR rules from Threat Cloud. ON by default; false pins to bundled rules. */
  threatCloudRuleSyncEnabled?: boolean;
  licenseKey?: string;
  /** CLI tier from panguard credentials (overrides key-based license) */
  cliTier?: string;
  dashboardPort: number;
  dashboardEnabled: boolean;
  verbose: boolean;
  monitors: {
    logMonitor: boolean;
    networkMonitor: boolean;
    processMonitor: boolean;
    fileMonitor: boolean;
    networkPollInterval: number;
    processPollInterval: number;
    /** Log collector config / 日誌收集器配置 */
    logCollector?: {
      enabled: boolean;
      filePaths?: string[];
      syslogPort?: number;
    };
  };
  watchdogEnabled: boolean;
  watchdogInterval: number;
  /** SOAR playbook directory for custom response strategies / SOAR 劇本目錄 */
  playbookDir?: string;
  /** Manager URL for agent mode (distributed architecture) */
  managerUrl?: string;
  /** Agent ID (auto-assigned on registration) */
  agentId?: string;
  /** @deprecated Use threatCloudUploadEnabled instead. Kept for backwards compatibility. */
  telemetryEnabled?: boolean;
  /** Show anonymized upload data before sending (debug mode) */
  showUploadData?: boolean;
  /** Skill whitelist: static list of trusted skill names / Skill 白名單 */
  trustedSkills?: string[];
  /**
   * Per-action enforcement policy. Required only when `mode === 'protection'`.
   * If omitted, the engine falls back to `DEFAULT_ENFORCEMENT_POLICY` from
   * `agent/respond/safety-rules.ts`, which is conservative (all OS actions OFF).
   */
  enforcementPolicy?: EnforcementPolicy;
}

/** Guard engine status / 守護引擎狀態 */
export interface GuardStatus {
  running: boolean;
  mode: GuardMode;
  uptime: number;
  eventsProcessed: number;
  threatsDetected: number;
  actionsExecuted: number;
  learningProgress: number;
  baselineConfidence: number;
  memoryUsageMB: number;
  licenseTier: LicenseTier;
  /** Number of loaded ATR rules / 已載入的 ATR 規則數 */
  atrRuleCount?: number;
  /** Number of ATR matches / ATR 匹配數 */
  atrMatchCount?: number;
  /** Number of patterns accumulated by ATR drafter / ATR 草稿器累積的模式數 */
  atrDrafterPatterns?: number;
  /** Number of proposals submitted by ATR drafter / ATR 草稿器已提交的提案數 */
  atrDrafterSubmitted?: number;
  /** Number of whitelisted skills / 白名單 skill 數量 */
  whitelistedSkills?: number;
  /** Number of skills tracked by fingerprinting / 指紋追蹤的 skill 數量 */
  trackedSkills?: number;
  /** Number of stable fingerprints / 已穩定的指紋數量 */
  stableFingerprints?: number;
  /** Heap total in MB / 堆積總量（MB） */
  heapTotalMB?: number;
  /** V8 heap size limit in MB / V8 堆積上限（MB） */
  heapLimitMB?: number;
  /** Heap usage as percentage of limit / 堆積使用率（佔上限百分比） */
  heapUsagePercent?: number;
  /** Memory pressure status / 記憶體壓力狀態 */
  memoryStatus?: 'healthy' | 'warning' | 'critical';
}
