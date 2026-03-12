/**
 * SOAR Playbook Module - Automated response orchestration via YAML playbooks
 * SOAR 劇本模組 - 透過 YAML 劇本實現自動化回應編排
 *
 * @module @panguard-ai/panguard-guard/playbook
 */

// Schema types and constants / 架構型別和常數
export type {
  Playbook,
  PlaybookAction,
  PlaybookTrigger,
  PlaybookEscalation,
  CorrelationPatternType,
} from './schema.js';

export {
  VALID_CORRELATION_PATTERNS,
  VALID_RESPONSE_ACTIONS,
  VALID_SEVERITIES,
  SEVERITY_ORDER,
} from './schema.js';

// Parser / 解析器
export { parsePlaybook, validatePlaybook, loadPlaybooksFromDir } from './parser.js';

export type { ValidationResult } from './parser.js';

// Engine / 引擎
export { PlaybookEngine, parseDuration } from './engine.js';
export type { PlaybookCorrelationMatch } from './engine.js';
