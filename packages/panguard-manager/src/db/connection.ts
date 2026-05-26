/**
 * SQLite connection helper for the Manager database.
 * Manager 資料庫的 SQLite 連線輔助。
 *
 * Centralises pragmas + migration application so every caller gets a DB in
 * the same state. WAL mode lets a single-process server perform many small
 * writes (token touch, event ingest) without blocking the read path.
 *
 * @module @panguard-ai/panguard-manager/db/connection
 */

import Database from 'better-sqlite3';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runMigrations } from './migrations.js';

/** Options for {@link openDatabase} / openDatabase 的選項 */
export interface OpenDatabaseOptions {
  /** Absolute path to the SQLite file, or ':memory:' for tests / SQLite 檔案絕對路徑，或測試用 ':memory:' */
  readonly path: string;
  /** Skip running migrations (tests that want a blank DB) / 跳過遷移（需要空 DB 的測試） */
  readonly skipMigrations?: boolean;
}

/**
 * Open the Manager SQLite database, applying canonical pragmas and any
 * pending migrations. Creates the parent directory if missing.
 */
export function openDatabase(options: OpenDatabaseOptions): Database.Database {
  if (!options.path) {
    throw new Error('path is required / path 為必要參數');
  }

  if (options.path !== ':memory:') {
    const dir = dirname(options.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  const db = new Database(options.path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  if (!options.skipMigrations) {
    runMigrations(db);
  }

  // DB holds plaintext relay tokens — must not be world-readable. WAL mode
  // creates .db-wal + .db-shm alongside the main file; chmod each that
  // exists. Skip for :memory:.
  if (options.path !== ':memory:') {
    for (const suffix of ['', '-wal', '-shm']) {
      const path = options.path + suffix;
      if (existsSync(path)) {
        try {
          chmodSync(path, 0o600);
        } catch {
          /* best-effort; ignore EPERM on shared filesystems */
        }
      }
    }
  }

  return db;
}
