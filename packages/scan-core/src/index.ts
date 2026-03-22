/**
 * @panguard-ai/scan-core
 *
 * Unified skill scanning engine shared between CLI Skill Auditor and Website.
 */

// Main entry point
export { scanContent } from './scanner.js';

// Types
export type {
  Severity,
  FindingCategory,
  Finding,
  CheckResult,
  RiskLevel,
  ContextSignal,
  ContextSignals,
  SkillMetadata,
  SkillManifest,
  ATRRuleCompiled,
  CompiledRule,
  ScanOptions,
  ScanResult,
} from './types.js';

// Sub-modules (for consumers that need individual pieces)
export { contentHash, patternHash } from './hash-utils.js';
export { stripMarkdownNoise, extractCodeBlocks, stripCodeBlocks } from './markdown-utils.js';
export { parseManifestFromString, parseSkillName } from './manifest-parser.js';
export { detectContextSignals } from './context-signals.js';
export { checkInstructions } from './instruction-patterns.js';
export { detectSecrets } from './secret-detection.js';
export { compileRules, scanWithATR } from './atr-engine.js';
export type { ATRScanOptions } from './atr-engine.js';
export { calculateRiskScore } from './risk-scorer.js';
