/**
 * ATR (Agent Threat Rules) - Detection rules for AI Agent threats
 *
 * ATR is an open standard for writing detection rules specifically
 * for AI agent threats. Think "Sigma for AI Agents."
 *
 * @module agent-threat-rules
 */

export { ATREngine } from './engine.js';
export type { ATREngineConfig } from './engine.js';
export { SessionTracker } from './session-tracker.js';
export type { SessionStateSnapshot } from './session-tracker.js';
export { loadRuleFile, loadRulesFromDirectory, validateRule } from './loader.js';
export { ModuleRegistry } from './modules/index.js';
export type { ATRModule, ModuleCondition, ModuleResult } from './modules/index.js';
export { SessionModule } from './modules/session.js';
export type {
  ATRRule,
  ATRMatch,
  AgentEvent,
  AgentEventType,
  ATRAction,
  ATRCategory,
  ATRSeverity,
  ATRStatus,
  ATRConfidence,
  ATRSourceType,
  ATRMatchType,
  ATROperator,
  ATRReferences,
  ATRTags,
  ATRAgentSource,
  ATRDetection,
  ATRResponse,
  ATRTestCases,
  ATRTestCase,
  ATRPatternCondition,
  ATRBehavioralCondition,
  ATRSequenceCondition,
  ATRSequenceStep,
} from './types.js';
