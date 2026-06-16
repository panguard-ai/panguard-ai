/**
 * File Quarantine - Isolate suspicious files with metadata and restore
 * 檔案隔離 - 隔離可疑檔案（含中繼資料與還原功能）
 *
 * Features:
 * - Move files to quarantine directory with restricted permissions
 * - SHA-256 hash recording for evidence
 * - Quarantine manifest (JSON) for tracking
 * - Restore functionality to return files to original location
 *
 * @module @panguard-ai/panguard-guard/response/file-quarantine
 */

import { createHash } from 'node:crypto';
import { readFile, rename, mkdir, chmod, writeFile, readdir, stat } from 'node:fs/promises';
import { join, basename, resolve, normalize } from 'node:path';
import { homedir, platform } from 'node:os';
import { createLogger } from '@panguard-ai/core';

const logger = createLogger('panguard-guard:file-quarantine');

/** Quarantine record for a single file / 單一檔案的隔離紀錄 */
export interface QuarantineRecord {
  id: string;
  originalPath: string;
  quarantinePath: string;
  sha256: string;
  fileSize: number;
  reason: string;
  quarantinedAt: string;
  restoredAt?: string;
  /** True when the quarantined entry is a directory-style skill (~/.claude/skills/<name>/). */
  isDirectory?: boolean;
}

/** Quarantine manifest stored as JSON / 隔離清單（JSON 格式） */
export interface QuarantineManifest {
  version: 1;
  records: QuarantineRecord[];
}

/**
 * Manages file quarantine with metadata tracking and restore
 * 管理檔案隔離（含中繼資料追蹤與還原功能）
 */
export class FileQuarantine {
  private readonly quarantineDir: string;
  private readonly manifestPath: string;
  private manifest: QuarantineManifest = { version: 1, records: [] };

  constructor(quarantineDir?: string) {
    this.quarantineDir = quarantineDir ?? join(homedir(), '.panguard', 'quarantine');
    this.manifestPath = join(this.quarantineDir, 'manifest.json');
  }

  /** Initialize quarantine directory / 初始化隔離目錄 */
  async initialize(): Promise<void> {
    await mkdir(this.quarantineDir, { recursive: true, mode: 0o700 });
    try {
      const data = await readFile(this.manifestPath, 'utf-8');
      this.manifest = JSON.parse(data) as QuarantineManifest;
    } catch {
      // No existing manifest
      this.manifest = { version: 1, records: [] };
    }
  }

  /**
   * Quarantine a file
   * 隔離檔案
   */
  async quarantine(filePath: string, reason: string): Promise<QuarantineRecord> {
    await this.initialize();

    const absPath = resolve(normalize(filePath));

    // Prevent quarantining files inside the quarantine directory
    if (absPath.startsWith(this.quarantineDir)) {
      throw new Error('Cannot quarantine a file already in quarantine directory');
    }

    // stat FIRST: a Claude Code skill is a DIRECTORY (~/.claude/skills/<name>/),
    // not a single file. readFile() on a directory throws EISDIR, which is why
    // one-click quarantine used to 500 on the most common skill type. Branch on
    // the entry type before any file read.
    const entryStat = await stat(absPath);
    const isDirectory = entryStat.isDirectory();

    // Evidence hash: for a file, hash its bytes. For a directory-style skill,
    // hash its SKILL.md (the instructions are the threat surface), falling back
    // to empty when absent. We never readFile() a directory.
    let sha256: string;
    let fileSize: number;
    if (isDirectory) {
      let manifestBuf: Buffer;
      try {
        manifestBuf = await readFile(join(absPath, 'SKILL.md'));
      } catch {
        manifestBuf = Buffer.alloc(0);
      }
      sha256 = createHash('sha256').update(manifestBuf).digest('hex');
      fileSize = manifestBuf.length;
    } else {
      const fileBuffer = await readFile(absPath);
      sha256 = createHash('sha256').update(fileBuffer).digest('hex');
      fileSize = entryStat.size;
    }

    // Generate unique quarantine name
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const quarantineName = `${id}_${basename(absPath)}`;
    const quarantinePath = join(this.quarantineDir, quarantineName);

    // Move the file OR the whole directory into quarantine — rename handles both.
    await rename(absPath, quarantinePath);

    // Restrict permissions (not on Windows). 0o000 blocks access to a file or a
    // directory alike.
    if (platform() !== 'win32') {
      await chmod(quarantinePath, 0o000);
    }

    const record: QuarantineRecord = {
      id,
      originalPath: absPath,
      quarantinePath,
      sha256,
      fileSize,
      reason,
      quarantinedAt: new Date().toISOString(),
      isDirectory,
    };

    this.manifest.records.push(record);
    await this.saveManifest();

    logger.info(
      `Quarantined: ${absPath} -> ${quarantinePath} (SHA-256: ${sha256.slice(0, 16)}...)`
    );
    return record;
  }

  /**
   * Restore a quarantined file to its original location
   * 還原隔離檔案到原始位置
   */
  async restore(id: string): Promise<{ success: boolean; message: string }> {
    await this.initialize();

    const record = this.manifest.records.find((r) => r.id === id);
    if (!record) {
      return { success: false, message: `Quarantine record not found: ${id}` };
    }

    if (record.restoredAt) {
      return { success: false, message: `File already restored at ${record.restoredAt}` };
    }

    try {
      // Restore permissions before moving. A directory needs the execute bit to
      // be traversable again (0o700); a regular file gets 0o644.
      if (platform() !== 'win32') {
        await chmod(record.quarantinePath, record.isDirectory ? 0o700 : 0o644);
      }

      await rename(record.quarantinePath, record.originalPath);
      record.restoredAt = new Date().toISOString();
      await this.saveManifest();

      logger.info(`Restored: ${record.quarantinePath} -> ${record.originalPath}`);
      return { success: true, message: `File restored to ${record.originalPath}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Restore failed: ${msg}` };
    }
  }

  /** Get all quarantine records / 取得所有隔離紀錄 */
  getRecords(): QuarantineRecord[] {
    return [...this.manifest.records];
  }

  /** Get active (not restored) quarantine records / 取得未還原的隔離紀錄 */
  getActiveRecords(): QuarantineRecord[] {
    return this.manifest.records.filter((r) => !r.restoredAt);
  }

  /** Find record by ID / 以 ID 搜尋紀錄 */
  findRecord(id: string): QuarantineRecord | undefined {
    return this.manifest.records.find((r) => r.id === id);
  }

  /** Count files in quarantine / 隔離區檔案數量 */
  async getQuarantineCount(): Promise<number> {
    try {
      const files = await readdir(this.quarantineDir);
      return files.filter((f) => f !== 'manifest.json').length;
    } catch {
      return 0;
    }
  }

  private async saveManifest(): Promise<void> {
    await writeFile(this.manifestPath, JSON.stringify(this.manifest, null, 2), 'utf-8');
  }
}
