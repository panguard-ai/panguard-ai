/**
 * Threat Cloud API type definitions
 * 威脅雲 API 型別定義
 */

/** Anonymized threat data from clients / 客戶端匿名化威脅數據 */
export interface AnonymizedThreatData {
  attackSourceIP: string;
  attackType: string;
  mitreTechnique: string;
  ruleMatched: string; // ATR rule ID that matched this threat
  timestamp: string;
  industry?: string;
  region: string;
}

/** Community rule update / 社群規則更新 */
export interface ThreatCloudRule {
  ruleId: string;
  ruleContent: string;
  publishedAt: string;
  source: string;
  /** Rule category extracted from content / 從內容提取的規則分類 */
  category?: string;
  /** Rule severity extracted from content / 從內容提取的嚴重等級 */
  severity?: string;
  /** Comma-separated MITRE technique IDs / 逗號分隔的 MITRE 技術 ID */
  mitreTechniques?: string;
  /** Comma-separated tags / 逗號分隔的標籤 */
  tags?: string;
}

/** API response envelope / API 回應封套 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** Threat statistics / 威脅統計 */
export interface ThreatStats {
  totalThreats: number;
  totalRules: number;
  topAttackTypes: Array<{ type: string; count: number }>;
  topMitreTechniques: Array<{ technique: string; count: number }>;
  last24hThreats: number;
  proposalStats?: { pending: number; confirmed: number; rejected: number; total: number };
  skillThreatsTotal?: number;
  /** Number of blacklisted skills / 黑名單技能數量 */
  skillBlacklistTotal?: number;
  /** Rule distribution by category / 規則分類分布 */
  rulesByCategory?: Array<{ category: string; count: number }>;
  /** Rule distribution by severity / 規則嚴重等級分布 */
  rulesBySeverity?: Array<{ severity: string; count: number }>;
  /** Rule distribution by source / 規則來源分布 */
  rulesBySource?: Array<{ source: string; count: number }>;
}

/** ATR rule proposal from client / 客戶端 ATR 規則提案 */
export interface ATRProposal {
  patternHash: string;
  ruleContent: string;
  llmProvider: string;
  llmModel: string;
  selfReviewVerdict: string;
  clientId?: string;
  status?: string;
  confirmations?: number;
}

/** Skill threat submission from audit / 技能審計威脅提交 */
export interface SkillThreatSubmission {
  skillHash: string;
  skillName: string;
  riskScore: number;
  riskLevel: string;
  findingSummaries?: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
  }>;
  clientId?: string;
}

/** Skill blacklist entry from community reports / 社群回報的技能黑名單條目 */
export interface SkillBlacklistEntry {
  skillHash: string;
  skillName: string;
  avgRiskScore: number;
  maxRiskLevel: string;
  reportCount: number;
  firstReported: string;
  lastReported: string;
}

/** Scan event from any source / 任何來源的掃描事件 */
export interface ScanEvent {
  source: 'bulk-pipeline' | 'cli-user' | 'web-scanner';
  skillsScanned: number;
  findingsCount: number;
  confirmedMalicious: number;
  highlySuspicious: number;
  generalSuspicious: number;
  cleanCount: number;
  deviceHash?: string;
}

/** Aggregated metrics across all sources / 所有來源的聚合指標 */
export interface AggregatedMetrics {
  totalSkillsScanned: number;
  totalAgentsProtected: number;
  totalThreatsDetected: number;
  totalAtrRules: number;
  whitelistedSkills: number;
  blacklistedSkills: number;
  sources: {
    bulk: { skills: number; findings: number };
    cli: { skills: number; findings: number; devices: number };
    web: { skills: number; findings: number };
  };
  lastUpdated: string;
}

/** Cached verdict entry / 快取判定條目 */
export interface CachedVerdict {
  readonly contentHash: string;
  readonly skillName: string;
  readonly verdict: string;
  readonly scannedAt: string;
  readonly expiresAt: string;
  readonly scanCount: number;
}

/** Skill hash history entry / 技能雜湊歷史條目 */
export interface SkillHashHistoryEntry {
  readonly id: number;
  readonly skillName: string;
  readonly contentHash: string;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly scanVerdict: string | null;
  readonly supersededBy: string | null;
  readonly rugPullFlag: boolean;
}

/** Server configuration / 伺服器配置 */
export interface ServerConfig {
  port: number;
  host: string;
  dbPath: string;
  apiKeyRequired: boolean;
  apiKeys: string[];
  rateLimitPerMinute: number;
  /** Optional Anthropic API key for LLM review of ATR proposals */
  anthropicApiKey?: string;
  /** Admin API key for write operations (POST /api/rules). If set, only this key can publish rules. */
  adminApiKey?: string;
}
