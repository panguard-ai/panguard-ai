/**
 * AI/LLM unified interface type definitions
 * AI/LLM 統一介面型別定義
 *
 * Defines the contracts for all LLM providers, analysis results,
 * threat classifications, and token usage tracking.
 * 定義所有 LLM 供應商、分析結果、威脅分類和 Token 使用追蹤的契約。
 *
 * @module @panguard-ai/core/ai/types
 */

import type { Language, Severity, SecurityEvent } from '../types.js';

/**
 * Supported LLM provider types
 * 支援的 LLM 供應商類型
 */
export type LLMProviderType = 'ollama' | 'claude' | 'openai';

/**
 * Configuration for initializing an LLM provider
 * 初始化 LLM 供應商的配置
 */
export interface LLMConfig {
  /** Provider type / 供應商類型 */
  provider: LLMProviderType;
  /** Model name (e.g., 'llama3', 'claude-sonnet-4-20250514', 'gpt-4o') / 模型名稱 */
  model: string;
  /** API endpoint for Ollama, default 'http://localhost:11434' / Ollama API 端點 */
  endpoint?: string;
  /** API key for Claude/OpenAI / Claude/OpenAI API 金鑰 */
  apiKey?: string;
  /** Response language / 回應語言 */
  lang: Language;
  /** Sampling temperature, default 0.3 / 取樣溫度 */
  temperature?: number;
  /** Maximum output tokens, default 2048 / 最大輸出 Token 數 */
  maxTokens?: number;
  /** Request timeout in milliseconds, default 30000 / 請求逾時時間（毫秒） */
  timeout?: number;
}

/**
 * Result of an AI-powered security analysis
 * AI 驅動的安全分析結果
 */
export interface AnalysisResult {
  /** Human-readable summary of the analysis / 人類可讀的分析摘要 */
  summary: string;
  /** Assessed severity level / 評估的嚴重等級 */
  severity: Severity;
  /** Confidence score from 0 to 1 / 信心分數（0 到 1） */
  confidence: number;
  /** Actionable recommendations / 可執行的建議 */
  recommendations: string[];
  /** Raw LLM response for debugging / 原始 LLM 回應（供除錯用） */
  rawResponse?: string;
}

/**
 * MITRE ATT&CK-based threat classification
 * 基於 MITRE ATT&CK 的威脅分類
 */
export interface ThreatClassification {
  /** MITRE ATT&CK tactic category / MITRE ATT&CK 戰術分類 */
  category: string;
  /** MITRE ATT&CK technique ID (e.g., 'T1059') / MITRE ATT&CK 技術 ID */
  technique: string;
  /** Assessed severity level / 評估的嚴重等級 */
  severity: Severity;
  /** Confidence score from 0 to 1 / 信心分數（0 到 1） */
  confidence: number;
  /** Description of the classified threat / 分類威脅的描述 */
  description: string;
}

/**
 * Token usage and cost tracking
 * Token 使用量與費用追蹤
 */
export interface TokenUsage {
  /** Number of tokens in the prompt / 提示詞 Token 數量 */
  promptTokens: number;
  /** Number of tokens in the completion / 完成回應 Token 數量 */
  completionTokens: number;
  /** Total tokens (prompt + completion) / 總 Token 數量 */
  totalTokens: number;
  /** Estimated cost in USD / 估算費用（美元） */
  estimatedCost: number;
}

/**
 * Unified interface for all LLM providers
 * 所有 LLM 供應商的統一介面
 *
 * Implementations must provide security-focused analysis, classification,
 * and summarization capabilities.
 * 實作必須提供安全導向的分析、分類和摘要功能。
 */
export interface LLMProvider {
  /** The provider type identifier / 供應商類型識別碼 */
  readonly providerType: LLMProviderType;
  /** The model name being used / 使用的模型名稱 */
  readonly model: string;

  /**
   * Analyze a security prompt with optional context
   * 分析安全提示詞，可附帶上下文
   *
   * @param prompt - The analysis prompt / 分析提示詞
   * @param context - Optional additional context / 可選的額外上下文
   * @returns Analysis result / 分析結果
   */
  analyze(prompt: string, context?: string): Promise<AnalysisResult>;

  /**
   * Classify a security event using MITRE ATT&CK framework
   * 使用 MITRE ATT&CK 框架分類安全事件
   *
   * @param event - The security event to classify / 要分類的安全事件
   * @returns Threat classification / 威脅分類
   */
  classify(event: SecurityEvent): Promise<ThreatClassification>;

  /**
   * Summarize multiple security events into a report
   * 將多個安全事件摘要為報告
   *
   * @param events - Array of security events / 安全事件陣列
   * @returns Summary text / 摘要文字
   */
  summarize(events: SecurityEvent[]): Promise<string>;

  /**
   * Check if the provider is available and properly configured
   * 檢查供應商是否可用且配置正確
   *
   * @returns True if provider is ready / 供應商就緒時回傳 true
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get cumulative token usage statistics
   * 取得累計 Token 使用統計
   *
   * @returns Token usage data / Token 使用資料
   */
  getTokenUsage(): TokenUsage;
}
