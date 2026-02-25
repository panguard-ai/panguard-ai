/**
 * AI prompt templates barrel export
 * AI 提示詞範本統一匯出
 *
 * Re-exports all prompt template functions for use by LLM providers.
 * 重新匯出所有提示詞範本函式供 LLM 供應商使用。
 *
 * @module @openclaw/core/ai/prompts
 */

export { getEventClassifierPrompt } from './event-classifier.js';
export { getThreatAnalysisPrompt } from './threat-analyzer.js';
export { getReportPrompt } from './report-generator.js';
