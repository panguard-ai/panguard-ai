/**
 * EDR Watchers barrel export
 * EDR 監控器統一匯出
 */

export { SecretWatcher } from './secret-watcher.js';
export type { SecretPattern } from './secret-watcher.js';

export { DependencyWatcher, levenshtein, detectTyposquat, detectSuspiciousScripts, runNpmAudit } from './dependency-watcher.js';

export {
  ProcessWatcher,
  scanCommandLine,
  isSuspiciousBinary,
  createProcessEvent,
} from './process-watcher.js';
export type { CommandPattern, ProcessSnapshot } from './process-watcher.js';
