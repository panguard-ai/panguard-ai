/**
 * Numbered schema migrations for the Manager SQLite database.
 * Manager SQLite 資料庫的編號 schema 遷移。
 *
 * Each migration runs exactly once; the highest applied version is tracked
 * in the `schema_version` table. Migrations are append-only — never edit a
 * shipped migration or reorder.
 *
 * @module @panguard-ai/panguard-manager/db/migrations
 */

import type Database from 'better-sqlite3';

/** A single numbered migration / 單一編號遷移 */
export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

/**
 * Migrations applied in order. NEVER remove, edit, or reorder a shipped
 * migration — append new ones with the next sequential version number.
 */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'create_agents_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE agents (
          agent_id          TEXT PRIMARY KEY,
          token             TEXT NOT NULL,
          hostname          TEXT NOT NULL,
          os_type           TEXT NOT NULL,
          panguard_version  TEXT NOT NULL,
          machine_id        TEXT NOT NULL,
          registered_at     TEXT NOT NULL,
          last_seen         TEXT,
          revoked           INTEGER NOT NULL DEFAULT 0,
          revoked_at        TEXT
        );

        -- Active-agent machine_id lookup is the hot path during register():
        -- partial index keeps it tiny + skips revoked rows automatically.
        CREATE INDEX idx_agents_machine_id_active
          ON agents (machine_id)
          WHERE revoked = 0;

        CREATE INDEX idx_agents_revoked
          ON agents (revoked);
      `);
    },
  },
  {
    version: 2,
    name: 'create_operators_and_sessions',
    up: (db) => {
      db.exec(`
        CREATE TABLE operators (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          username        TEXT NOT NULL UNIQUE,
          password_hash   TEXT NOT NULL,
          password_salt   TEXT NOT NULL,
          role            TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
          created_at      TEXT NOT NULL,
          last_login_at   TEXT,
          disabled        INTEGER NOT NULL DEFAULT 0
        );

        -- Session tokens are hashed at rest so a leaked manager.db cannot be
        -- replayed against the API. Plaintext token lives only in the client
        -- cookie + a single response body at login time.
        CREATE TABLE operator_sessions (
          token_hash      TEXT PRIMARY KEY,
          operator_id     INTEGER NOT NULL,
          created_at      TEXT NOT NULL,
          expires_at      TEXT NOT NULL,
          revoked_at      TEXT,
          user_agent      TEXT,
          ip_address      TEXT,
          FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_operator_sessions_operator_id
          ON operator_sessions (operator_id);
        CREATE INDEX idx_operator_sessions_expires_at
          ON operator_sessions (expires_at);
      `);
    },
  },
  {
    version: 3,
    name: 'create_enrollment_tokens',
    up: (db) => {
      db.exec(`
        -- One-time bearer tokens that gate agent self-registration. Issued
        -- by an admin operator, consumed once at /api/agents/register time,
        -- bound to the resulting agent_id for audit. Plaintext is shown to
        -- the operator only at issue time; storage is sha256(token).
        CREATE TABLE enrollment_tokens (
          token_hash              TEXT PRIMARY KEY,
          description             TEXT,
          created_by_operator_id  INTEGER NOT NULL,
          created_at              TEXT NOT NULL,
          expires_at              TEXT NOT NULL,
          used_at                 TEXT,
          used_by_agent_id        TEXT,
          revoked_at              TEXT,
          FOREIGN KEY (created_by_operator_id) REFERENCES operators(id)
        );

        CREATE INDEX idx_enrollment_tokens_expires_at
          ON enrollment_tokens (expires_at);
        CREATE INDEX idx_enrollment_tokens_used_at
          ON enrollment_tokens (used_at);
      `);
    },
  },
  {
    version: 4,
    name: 'create_agent_events',
    up: (db) => {
      db.exec(`
        -- Persistent log of every event / verdict / status payload relayed
        -- by a Guard. Survives Manager restarts so the dashboard can show
        -- history beyond the in-memory aggregator window. Retention is
        -- enforced by EventsStore.sweep() (default 30 days).
        --
        -- payload_json holds the original RelayEventBody slice as-is —
        -- denormalising specific fields here would couple this schema to
        -- the relay contract, which is owned by the Guard.
        --
        -- is_threat denormalises the FleetAggregator threat-counting rule
        -- so 24h rolling counts are an indexed scan, not a JSON parse over
        -- every row.
        CREATE TABLE agent_events (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id      TEXT NOT NULL,
          kind          TEXT NOT NULL CHECK (kind IN ('event', 'verdict', 'status')),
          payload_json  TEXT NOT NULL,
          observed_at   TEXT NOT NULL,
          is_threat     INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
        );

        CREATE INDEX idx_agent_events_agent_kind_observed
          ON agent_events (agent_id, kind, observed_at DESC);
        CREATE INDEX idx_agent_events_observed_at
          ON agent_events (observed_at);
        CREATE INDEX idx_agent_events_threats
          ON agent_events (agent_id, observed_at DESC)
          WHERE is_threat = 1;
      `);
    },
  },
];

/**
 * Apply all pending migrations atomically. Reads the current version from
 * `schema_version`, then runs every later migration inside a single
 * transaction so a crash mid-migration leaves the DB at a clean version.
 */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const currentRow = db
    .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version')
    .get() as { v: number };
  const current = currentRow.v;

  const pending = migrations.filter((m) => m.version > current);
  if (pending.length === 0) return;

  const recordVersion = db.prepare('INSERT INTO schema_version (version) VALUES (?)');
  const apply = db.transaction((toApply: readonly Migration[]) => {
    for (const m of toApply) {
      m.up(db);
      recordVersion.run(m.version);
    }
  });
  apply(pending);
}
