/**
 * PID file management for PanguardTrap
 * PanguardTrap 的 PID 檔案管理
 *
 * Enables cross-process stop/status by persisting the daemon PID to disk.
 * 透過將 daemon PID 持久化到磁碟來啟用跨程序的 stop/status 操作。
 *
 * @module @panguard-ai/panguard-trap/pid-file
 */

import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createLogger } from '@panguard-ai/core';

const logger = createLogger('panguard-trap:pid-file');

/**
 * PID file management / PID 檔案管理
 *
 * Writes, reads, and removes a PID file so that separate CLI invocations
 * (e.g. `panguard trap stop`) can locate and signal the running process.
 */
export class PidFile {
  private readonly pidPath: string;

  constructor(dataDir: string) {
    this.pidPath = join(dataDir, 'panguard-trap.pid');
  }

  /** Write current PID to file / 將目前 PID 寫入檔案 */
  write(): void {
    mkdirSync(dirname(this.pidPath), { recursive: true });
    writeFileSync(this.pidPath, String(process.pid), 'utf-8');
    logger.info(`PID file written: ${this.pidPath} (PID: ${process.pid}) / PID 檔案已寫入`);
  }

  /** Read PID from file / 從檔案讀取 PID */
  read(): number | null {
    try {
      if (!existsSync(this.pidPath)) return null;
      const pid = parseInt(readFileSync(this.pidPath, 'utf-8').trim(), 10);
      return isNaN(pid) ? null : pid;
    } catch {
      return null;
    }
  }

  /** Remove PID file / 移除 PID 檔案 */
  remove(): void {
    try {
      if (existsSync(this.pidPath)) {
        unlinkSync(this.pidPath);
        logger.info('PID file removed / PID 檔案已移除');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to remove PID file: ${msg} / 移除 PID 檔案失敗`);
    }
  }

  /** Check if process with stored PID is running / 檢查儲存的 PID 程序是否執行中 */
  isRunning(): boolean {
    const pid = this.read();
    if (pid === null) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
