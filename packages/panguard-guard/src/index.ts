/**
 * PanguardGuard - AI Real-time Endpoint Monitoring & Auto-response
 * PanguardGuard - AI 即時端點監控與自動回應
 *
 * Main entry point for the PanguardGuard package.
 * Exports all public modules for programmatic use.
 * PanguardGuard 套件的主要入口點。匯出所有公開模組供程式化使用。
 *
 * @module @panguard-ai/panguard-guard
 */

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

/** Package version / 套件版本 */
export const PANGUARD_GUARD_VERSION: string = _pkg.version;
export const CLAWGUARD_NAME = 'PanguardGuard';

// Types / 型別
export type {
  InvestigationTool,
  InvestigationStep,
  InvestigationResult,
  InvestigationPlan,
  EvidenceSource,
  Evidence,
  ResponseAction,
  ThreatVerdict,
  ActionPolicy,
  ProcessPattern,
  ConnectionPattern,
  LoginPattern,
  PortPattern,
  EnvironmentBaseline,
  DeviationResult,
  CorrelationPatternType,
  CorrelationEvent,
  CorrelationPattern,
  CorrelationResult,
  DetectionResult,
  ResponseResult,
  TelegramConfig,
  SlackConfig,
  EmailConfig,
  NotificationConfig,
  NotificationResult,
  AnonymizedThreatData,
  ThreatCloudUpdate,
  ThreatCloudStatus,
  LicenseTier,
  LicenseInfo,
  LLMAnalysisResult,
  LLMClassificationResult,
  AnalyzeLLM,
  DashboardStatus,
  DashboardEvent,
  ThreatMapEntry,
  GuardMode,
  GuardConfig,
  GuardStatus,
} from './types.js';

export { DEFAULT_ACTION_POLICY, TIER_FEATURES } from './types.js';

// Config / 配置
export {
  loadConfig,
  saveConfig,
  ensureDataDir,
  DEFAULT_DATA_DIR,
  DEFAULT_GUARD_CONFIG,
} from './config.js';

// Guard Engine / 守護引擎
export { GuardEngine } from './guard-engine.js';

// Multi-Agent Pipeline / 多代理管線
export { DetectAgent, AnalyzeAgent, RespondAgent, ReportAgent } from './agent/index.js';
export type { ReportRecord } from './agent/index.js';

// Event Correlation / 事件關聯
export { EventCorrelator } from './correlation/event-correlator.js';

// Context Memory / 情境記憶
export {
  createEmptyBaseline,
  checkDeviation,
  updateBaseline,
  loadBaseline,
  saveBaseline,
  isLearningComplete,
  getLearningProgress,
  getRemainingDays,
  switchToProtectionMode,
  getBaselineSummary,
  AnomalyScorer,
  BaselineStats,
} from './memory/index.js';
export type { MetricStats } from './memory/index.js';

// Investigation / Dynamic Reasoning / 調查/動態推理
export { InvestigationEngine } from './investigation/index.js';

// Notifications / 通知
export {
  sendNotifications,
  sendTelegramNotify,
  sendSlackNotify,
  sendEmailNotify,
} from './notify/index.js';

// Threat Cloud / 威脅雲
export { ThreatCloudClient } from './threat-cloud/index.js';

// Dashboard / 儀表板
export { DashboardServer } from './dashboard/index.js';
export { DashboardRelayClient } from './dashboard/relay-client.js';
export type { RelayClientConfig } from './dashboard/relay-client.js';
export type { DashboardRelayOptions } from './dashboard/index.js';

// License / 授權
export {
  validateLicense,
  hasFeature,
  getTierFeatures,
  generateTestLicenseKey,
} from './license/index.js';

// Daemon / 服務
export { PidFile, Watchdog, installService, uninstallService } from './daemon/index.js';

// Install / 安裝
export { generateInstallScript } from './install/index.js';

// Monitors / 監控器
export {
  GitWatcher,
  createGitEvent,
  isSensitiveFile,
  scanLineForSecrets,
} from './monitors/index.js';
export type { DiffSecretPattern } from './monitors/index.js';

// Log Collectors / 日誌收集器
export {
  LogCollector,
  parseSyslog3164,
  parseSyslog5424,
  parseAuthLog,
  parseLogLine,
} from './collectors/index.js';
export type { LogCollectorConfig } from './collectors/index.js';

// Playbook / SOAR 劇本
export {
  PlaybookEngine,
  parsePlaybook,
  validatePlaybook,
  loadPlaybooksFromDir,
  parseDuration,
  VALID_CORRELATION_PATTERNS,
  VALID_RESPONSE_ACTIONS,
  VALID_SEVERITIES,
  SEVERITY_ORDER,
} from './playbook/index.js';

export type {
  Playbook,
  PlaybookAction,
  PlaybookTrigger,
  PlaybookEscalation,
  PlaybookCorrelationMatch,
  ValidationResult,
} from './playbook/index.js';

// ATR (Agent Threat Rules) Engine / ATR 引擎
export { GuardATREngine } from './engines/atr-engine.js';
export type { GuardATREngineConfig } from './engines/atr-engine.js';

// Skill Whitelist / 技能白名單
export { SkillWhitelistManager } from './engines/skill-whitelist.js';
export type {
  WhitelistedSkill,
  WhitelistSource,
  SkillWhitelistConfig,
} from './engines/skill-whitelist.js';

// Skill Watcher / 技能監視器
export { SkillWatcher } from './engines/skill-watcher.js';
export type {
  SkillChange,
  SkillAuditResult,
  SkillWatcherConfig,
  SkillThreatSubmitter,
} from './engines/skill-watcher.js';

// Dashboard Renderer / 儀表板渲染器
export { DashboardRenderer } from './cli/dashboard-renderer.js';
export type { DashboardState, TuiEvent, TuiThreat } from './cli/dashboard-renderer.js';

// Interactive Threat Handler / 互動式威脅處理器
export {
  classifyThreatResponse,
  renderAutoResponse,
  renderLowConfidenceNote,
  promptThreatDecision,
  InteractiveThreatQueue,
} from './cli/interactive-handler.js';
export type {
  ThreatResponseAction,
  ThreatContext,
  ThreatDecision,
} from './cli/interactive-handler.js';

// Daily Summary / 每日摘要
export { DailySummaryCollector } from './summary/daily-summary.js';
export type { DailySummaryData } from './summary/daily-summary.js';

// Bridges / 橋接
export { trapSessionToSecurityEvent } from './bridges/trap-bridge.js';

// CLI / 命令列
export { runCLI, CLI_VERSION } from './cli/index.js';
