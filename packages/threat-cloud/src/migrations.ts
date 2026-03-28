/**
 * Schema migration system for Threat Cloud database
 * 威脅雲資料庫 schema 遷移系統
 *
 * Replaces the fragile try-catch ALTER TABLE pattern with numbered migrations.
 * Each migration runs exactly once, tracked by a schema_version table.
 *
 * @module @panguard-ai/threat-cloud/migrations
 */

import type Database from 'better-sqlite3';

/** A single numbered migration / 單一編號遷移 */
export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * All migrations in order. New migrations MUST be appended with
 * the next sequential version number. Never remove or reorder.
 * 所有遷移按順序排列，新遷移必須追加下一個版本號。
 */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'add_rules_classification_columns',
    up: (db) => {
      // These columns may already exist from the original CREATE TABLE.
      // SQLite does not support IF NOT EXISTS for ADD COLUMN, so we
      // check the table_info pragma before adding each one.
      const existing = db.prepare("PRAGMA table_info('rules')").all() as Array<{ name: string }>;
      const columnNames = new Set(existing.map((c) => c.name));

      const columnsToAdd: Array<{ name: string; type: string }> = [
        { name: 'category', type: 'TEXT' },
        { name: 'severity', type: 'TEXT' },
        { name: 'mitre_techniques', type: 'TEXT' },
        { name: 'tags', type: 'TEXT' },
      ];

      for (const col of columnsToAdd) {
        if (!columnNames.has(col.name)) {
          db.exec(`ALTER TABLE rules ADD COLUMN ${col.name} ${col.type}`);
        }
      }
    },
  },
  {
    version: 2,
    name: 'create_audit_log_table',
    up: (db) => {
      // Check if audit_log exists with the correct schema.
      // If it exists with wrong columns (pre-migration legacy), skip —
      // migration v3 will drop and recreate it properly.
      const existing = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'")
        .get() as { name: string } | undefined;
      if (existing) {
        const cols = db.prepare("PRAGMA table_info('audit_log')").all() as Array<{ name: string }>;
        const colNames = new Set(cols.map((c) => c.name));
        if (!colNames.has('actor') || !colNames.has('timestamp')) {
          // Legacy table with wrong schema — skip, v3 will fix it
          return;
        }
      } else {
        db.exec(`
          CREATE TABLE audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            actor TEXT NOT NULL,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT,
            details TEXT,
            ip_address TEXT
          );
        `);
      }

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type);
      `);
    },
  },
  {
    version: 3,
    name: 'recreate_audit_log_table_v3',
    up: (db) => {
      // The audit_log table may exist from a pre-migration schema with
      // different columns (missing timestamp, actor, etc.). Drop and
      // recreate with the correct schema.
      db.exec(`
        DROP TABLE IF EXISTS audit_log;

        CREATE TABLE audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          actor TEXT NOT NULL,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT,
          details TEXT,
          ip_address TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type);
      `);
    },
  },
  {
    version: 4,
    name: 'create_scan_events_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS scan_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT NOT NULL,
          skills_scanned INTEGER NOT NULL DEFAULT 0,
          findings_count INTEGER NOT NULL DEFAULT 0,
          confirmed_malicious INTEGER NOT NULL DEFAULT 0,
          highly_suspicious INTEGER NOT NULL DEFAULT 0,
          general_suspicious INTEGER NOT NULL DEFAULT 0,
          clean_count INTEGER NOT NULL DEFAULT 0,
          device_hash TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_scan_events_source ON scan_events(source);
        CREATE INDEX IF NOT EXISTS idx_scan_events_created ON scan_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_scan_events_device ON scan_events(device_hash);
      `);
    },
  },
  {
    version: 5,
    name: 'add_canary_staging_columns',
    up: (db) => {
      const existing = db
        .prepare("PRAGMA table_info('atr_proposals')")
        .all() as Array<{ name: string }>;
      const columnNames = new Set(existing.map((c) => c.name));

      if (!columnNames.has('canary_started_at')) {
        db.exec(`ALTER TABLE atr_proposals ADD COLUMN canary_started_at TEXT`);
      }

      // Index for efficient canary queries
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_atr_proposals_canary ON atr_proposals(status, canary_started_at)`
      );
    },
  },
];

/**
 * Ensure the schema_version tracking table exists.
 * 確保 schema_version 追蹤資料表存在。
 */
function ensureVersionTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )
  `);

  // Seed with version 0 if empty (fresh database)
  const row = db.prepare('SELECT version FROM schema_version').get() as
    | { version: number }
    | undefined;
  if (row === undefined) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(0);
  }
}

/**
 * Get the current schema version from the database.
 * 取得資料庫目前的 schema 版本。
 */
function getCurrentVersion(db: Database.Database): number {
  const row = db.prepare('SELECT version FROM schema_version').get() as {
    version: number;
  };
  return row.version;
}

/**
 * Run all pending migrations above the current schema version.
 * Each migration runs inside a transaction for atomicity.
 * 執行所有高於目前版本的待處理遷移。每個遷移在交易中執行以確保原子性。
 *
 * @returns The number of migrations applied
 */
export function runMigrations(db: Database.Database): number {
  ensureVersionTable(db);
  const currentVersion = getCurrentVersion(db);

  const pending = migrations.filter((m) => m.version > currentVersion);
  if (pending.length === 0) {
    return 0;
  }

  let applied = 0;
  for (const migration of pending) {
    const runOne = db.transaction(() => {
      console.log(`[threat-cloud] Running migration v${migration.version}: ${migration.name}`);
      migration.up(db);
      db.prepare('UPDATE schema_version SET version = ?').run(migration.version);
    });
    runOne();
    applied++;
    console.log(`[threat-cloud] Migration v${migration.version} applied successfully`);
  }

  console.log(
    `[threat-cloud] Schema up to date (v${getCurrentVersion(db)}, ${applied} migration(s) applied)`
  );
  return applied;
}
