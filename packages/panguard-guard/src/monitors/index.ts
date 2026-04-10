/**
 * Monitor exports barrel file
 * 監控器匯出桶檔案
 *
 * @module @panguard-ai/panguard-guard/monitors
 */

export { GitWatcher, createGitEvent, isSensitiveFile, scanLineForSecrets } from './git-watcher.js';
export type { DiffSecretPattern } from './git-watcher.js';
