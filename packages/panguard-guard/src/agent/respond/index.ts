/**
 * Respond Agent module barrel export
 * @module @panguard-ai/panguard-guard/agent/respond
 */

export type { ActionManifestEntry, EscalationRecord } from './types.js';
export {
  SAFETY_RULES,
  DEFAULT_ENFORCEMENT_POLICY,
  PERMISSIVE_ENFORCEMENT_POLICY,
  matchesProcessAllowlist,
  matchesFilePathAllowlist,
} from './safety-rules.js';
export { ActionRateLimiter } from './action-rate-limiter.js';
export { ActionManifest } from './action-manifest.js';
export { EscalationTracker } from './escalation-tracker.js';
export {
  extractIP,
  extractPID,
  extractUsername,
  extractFilePath,
  extractProcessName,
  extractTarget,
} from './evidence-extractor.js';
export {
  blockIP,
  unblockIP,
  killProcess,
  disableAccount,
  isolateFile,
  execFilePromise,
} from './os-actions.js';
export type { BlockIPDeps } from './os-actions.js';
