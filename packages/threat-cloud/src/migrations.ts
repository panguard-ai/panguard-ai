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
      const existing = db.prepare("PRAGMA table_info('atr_proposals')").all() as Array<{
        name: string;
      }>;
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
  {
    version: 6,
    name: 'create_verdict_cache_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS verdict_cache (
          content_hash TEXT PRIMARY KEY,
          skill_name TEXT NOT NULL,
          verdict TEXT NOT NULL,
          scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL,
          scan_count INTEGER NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_verdict_cache_expires ON verdict_cache(expires_at);
        CREATE INDEX IF NOT EXISTS idx_verdict_cache_skill ON verdict_cache(skill_name);
      `);
    },
  },
  {
    version: 7,
    name: 'create_skill_hash_history_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS skill_hash_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          skill_name TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          first_seen TEXT NOT NULL DEFAULT (datetime('now')),
          last_seen TEXT NOT NULL DEFAULT (datetime('now')),
          scan_verdict TEXT,
          superseded_by TEXT,
          rug_pull_flag INTEGER NOT NULL DEFAULT 0,
          UNIQUE(skill_name, content_hash)
        );

        CREATE INDEX IF NOT EXISTS idx_skill_hash_name ON skill_hash_history(skill_name);
        CREATE INDEX IF NOT EXISTS idx_skill_hash_hash ON skill_hash_history(content_hash);
        CREATE INDEX IF NOT EXISTS idx_skill_hash_rug ON skill_hash_history(rug_pull_flag);
      `);
    },
  },
  {
    version: 8,
    name: 'create_orgs_devices_policies_tables',
    up: (db) => {
      db.exec(`
        -- Organizations: groups of devices under one account
        -- Threat Model: Fleet view (#6 Scope Escalation — org-level visibility)
        CREATE TABLE IF NOT EXISTS orgs (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          api_key_hash TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Devices: individual machines running Guard
        -- Threat Model: Fleet view (#6 — track all agents across org)
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          org_id TEXT NOT NULL REFERENCES orgs(id),
          hostname TEXT,
          os_type TEXT,
          agent_count INTEGER NOT NULL DEFAULT 0,
          guard_version TEXT,
          last_seen TEXT NOT NULL DEFAULT (datetime('now')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_devices_org ON devices(org_id);
        CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

        -- Org policies: per-org allow/block rules for skill categories
        -- Threat Model: Policy engine (#1 Supply Chain, #6 Scope Escalation)
        CREATE TABLE IF NOT EXISTS org_policies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id TEXT NOT NULL REFERENCES orgs(id),
          category TEXT NOT NULL,
          action TEXT NOT NULL CHECK(action IN ('allow', 'block')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(org_id, category)
        );
        CREATE INDEX IF NOT EXISTS idx_policies_org ON org_policies(org_id);
      `);
    },
  },
  {
    version: 9,
    name: 'create_client_keys_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS client_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id TEXT NOT NULL,
          client_key_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_used_at TEXT,
          revoked INTEGER NOT NULL DEFAULT 0,
          revoked_at TEXT,
          ip_address TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_client_keys_hash ON client_keys(client_key_hash);
        CREATE INDEX IF NOT EXISTS idx_client_keys_client_id ON client_keys(client_id);
      `);
    },
  },
  {
    version: 10,
    name: 'add_client_key_role_column',
    up: (db) => {
      // Role differentiates auto-provisioned Guard client keys (role='guard')
      // from manually-issued partner keys (role='partner') that can access
      // L5 live-sync endpoints. Partner keys are issued by admin via
      // /api/admin/partner-keys.
      const cols = db.prepare('PRAGMA table_info(client_keys)').all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === 'key_role')) {
        db.exec("ALTER TABLE client_keys ADD COLUMN key_role TEXT NOT NULL DEFAULT 'guard'");
      }
      db.exec(`CREATE INDEX IF NOT EXISTS idx_client_keys_role ON client_keys(key_role);`);
    },
  },
  {
    version: 11,
    name: 'add_payload_fingerprints_table',
    up: (db) => {
      // Caches LLM drafter verdicts keyed by normalized payload hash so
      // repeat submissions of the same garak prompt (or near-duplicates
      // across partner batches) skip the Anthropic API call entirely.
      // Typical hit rate on garak corpus is 90%+ → ~10x cost reduction.
      //
      // result values:
      //   novel     — LLM produced a new rule (see pattern_hash for the YAML)
      //   duplicate — LLM judged payload already covered by existing rule
      //   rejected  — LLM output failed quality gate or self-test
      //
      // rule_id + pattern_hash are only populated when result='novel'.
      db.exec(`
        CREATE TABLE IF NOT EXISTS payload_fingerprints (
          fingerprint TEXT PRIMARY KEY,
          result TEXT NOT NULL CHECK(result IN ('duplicate', 'novel', 'rejected')),
          rule_id TEXT,
          pattern_hash TEXT,
          first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
          hit_count INTEGER NOT NULL DEFAULT 1
        )
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_payload_fp_result ON payload_fingerprints(result)`);
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_payload_fp_pattern ON payload_fingerprints(pattern_hash) WHERE pattern_hash IS NOT NULL`
      );
    },
  },
  {
    version: 12,
    name: 'add_migrator_telemetry_table',
    up: (db) => {
      // Per-rule fingerprints from Migrator runs. Carries no rule body —
      // condition_hash is SHA-256 over the conditions, install_id is a
      // random per-install UUID. Used by the crystallization analyzer to
      // surface rules that recur across N+ tenants without leaking content.
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrator_telemetry (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          install_id TEXT NOT NULL,
          migrator_version TEXT NOT NULL DEFAULT 'unknown',
          source_kind TEXT NOT NULL DEFAULT 'sigma',
          atr_id TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'unknown',
          severity TEXT NOT NULL DEFAULT 'low',
          has_agent_analogue INTEGER NOT NULL DEFAULT 0,
          condition_hash TEXT NOT NULL,
          framework_count INTEGER NOT NULL DEFAULT 0,
          eu_articles TEXT,
          owasp_agentic_ids TEXT,
          owasp_llm_ids TEXT,
          run_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_migrator_tel_hash ON migrator_telemetry(condition_hash)`
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_migrator_tel_install ON migrator_telemetry(install_id)`
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_migrator_tel_created ON migrator_telemetry(created_at)`
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_migrator_tel_atr ON migrator_telemetry(atr_id)`
      );
    },
  },
  {
    version: 13,
    name: 'add_migrator_telemetry_crystallization_index',
    up: (db) => {
      // Crystallization analyzer query is:
      //   SELECT condition_hash, COUNT(DISTINCT install_id), ...
      //   FROM migrator_telemetry
      //   WHERE created_at > ?
      //   GROUP BY condition_hash HAVING tenant_count >= ?
      //
      // Existing single-column idx_migrator_tel_hash + idx_migrator_tel_created
      // each get used independently; SQLite picks one and full-scans the rest.
      // A composite index covering (condition_hash, install_id, created_at)
      // turns the GROUP BY + DISTINCT + WHERE into a single index range scan.
      // Critical at >100k rows; benign at smaller scale.
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_migrator_tel_crystallization
         ON migrator_telemetry(condition_hash, install_id, created_at)`
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
