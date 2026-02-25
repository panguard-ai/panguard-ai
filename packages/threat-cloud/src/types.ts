/**
 * Threat Cloud API type definitions
 * 威脅雲 API 型別定義
 */

/** Anonymized threat data from clients / 客戶端匿名化威脅數據 */
export interface AnonymizedThreatData {
  attackSourceIP: string;
  attackType: string;
  mitreTechnique: string;
  sigmaRuleMatched: string;
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
}

/** Server configuration / 伺服器配置 */
export interface ServerConfig {
  port: number;
  host: string;
  dbPath: string;
  apiKeyRequired: boolean;
  apiKeys: string[];
  rateLimitPerMinute: number;
}
