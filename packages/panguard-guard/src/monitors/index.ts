/**
 * Monitor exports barrel file
 * 監控器匯出桶檔案
 *
 * @module @panguard-ai/panguard-guard/monitors
 */

export { FalcoMonitor, parseFalcoEvent } from './falco-monitor.js';
export type { FalcoAlert } from './falco-monitor.js';

export { SuricataMonitor, parseSuricataEvent } from './suricata-monitor.js';
export type { SuricataEveAlert } from './suricata-monitor.js';

export {
  RootkitDetector,
  createRootkitEvent,
  checkLdPreload,
  getPidsFromProc,
  getPidsFromPs,
  detectHiddenProcesses,
  getModulesFromProc,
  getModulesFromLsmod,
  checkKernelModules,
  detectHiddenFiles,
  checkBinaryIntegrity,
} from './rootkit-detector.js';
export type { RootkitFinding } from './rootkit-detector.js';

export { SyscallMonitor, parseSyscallEvent } from './syscall-monitor.js';
export type { SyscallEvent } from './syscall-monitor.js';

export { MemoryScanner } from './memory-scanner.js';
export type { MemoryScanResult, MemoryMatch } from './memory-scanner.js';

export { DpiMonitor } from './dpi-monitor.js';

export {
  GitWatcher,
  createGitEvent,
  isSensitiveFile,
  scanLineForSecrets,
} from './git-watcher.js';
export type { DiffSecretPattern } from './git-watcher.js';
