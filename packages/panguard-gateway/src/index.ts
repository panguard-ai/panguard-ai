/**
 * @panguard-ai/panguard-gateway — an Open Responses gateway that checks what
 * passes between an agent and its model provider against ATR rules: tool
 * definitions, user input, tool results, the model's tool calls (before the
 * client can run them) and the model's text.
 *
 * @module @panguard-ai/panguard-gateway
 */

export { startGateway, type Gateway, type GatewayOverrides } from './gateway.js';
export {
  DEFAULT_POLICY,
  configFromEnv,
  resolveConfig,
  type BlockStyle,
  type GatewayConfig,
  type GatewayConfigInput,
  type GatewayPolicy,
  type TextPolicy,
} from './config.js';
export {
  WorkerEvaluatorPool,
  type Evaluation,
  type Evaluator,
  type EvaluatorPoolOptions,
} from './evaluator-pool.js';
export {
  canonicalArgs,
  functionCallEvent,
  functionCallOutputEvent,
  outputTextEvent,
  toolDefinitionEvent,
  userMessageEvent,
} from './atr-events.js';
export { VerdictLedger, type LedgerCall, type LedgerOptions } from './ledger.js';
export { ChainAuditSink, DEFAULT_AUDIT_LOG, NO_AUDIT, type AuditSink } from './audit.js';
export { GATEWAY_RULES, type Decision, type Disposition } from './decision.js';
export { VERDICT_FIELD, type VerdictField } from './verdict-field.js';
export { DEFAULT_MAX_SCAN_CHARS, ENGINE_MAX_EVAL_LENGTH, scanPlan } from './windows.js';
