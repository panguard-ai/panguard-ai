/**
 * AgentsStore — SQLite-backed registry of Guard agents.
 * AgentsStore — 以 SQLite 為後端的 Guard 代理註冊。
 *
 * Successor to the previous JSON-file-backed AgentsRegistry. Public surface
 * mirrors AgentsRegistry exactly so callers swap by constructing AgentsStore
 * instead — the public method names + return shapes are unchanged.
 *
 * Why SQLite over JSON:
 *   - touch() is the relay hot-path; rewriting the whole file every relay
 *     event scales O(N agents) per event. Indexed UPDATE is O(log N).
 *   - register() needs a machine_id uniqueness check; partial index makes
 *     this O(log N) on disk instead of O(N) in memory.
 *   - Future tables (operators, sessions, enrollment tokens, agent_events)
 *     share the same DB + transactional guarantees.
 *
 * Token storage is plaintext (parity with the JSON impl). At-rest hashing
 * is tracked as a future hardening item — does not gate Fleet Auth.
 *
 * @module @panguard-ai/panguard-manager/agents-store
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type Database from 'better-sqlite3';
import { createLogger } from '@panguard-ai/core';
import { openDatabase } from './db/connection.js';
import type { AgentRow } from './db/types.js';
import type { AgentRecord, RegisterBody } from './types.js';

const logger = createLogger('panguard-manager:store');

/** Options for {@link AgentsStore} / AgentsStore 選項 */
export interface AgentsStoreOptions {
  /** Absolute path to the SQLite file (use ':memory:' in tests) / SQLite 檔案絕對路徑（測試用 ':memory:'） */
  readonly dbPath: string;
  /** Inject a pre-opened DB (advanced; usually omitted) / 注入已開啟的 DB（進階；通常省略） */
  readonly db?: Database.Database;
}

/**
 * Persistent registry of Guard agents backed by SQLite.
 *
 * Thread-safety: assumes single-process access. better-sqlite3 serialises
 * writes via the SQLite engine's own lock, so concurrent calls from the
 * Node event loop are safe.
 */
export class AgentsStore {
  private readonly db: Database.Database;
  private readonly stmtInsert: Database.Statement;
  private readonly stmtSelectByAgentId: Database.Statement;
  private readonly stmtSelectActiveByMachineId: Database.Statement;
  private readonly stmtMarkRevoked: Database.Statement;
  private readonly stmtTouch: Database.Statement;
  private readonly stmtSelectActive: Database.Statement;
  private readonly stmtSelectAll: Database.Statement;
  private readonly stmtCountActive: Database.Statement;

  constructor(options: AgentsStoreOptions) {
    if (!options.dbPath && !options.db) {
      throw new Error('dbPath is required / dbPath 為必要參數');
    }
    this.db = options.db ?? openDatabase({ path: options.dbPath });

    this.stmtInsert = this.db.prepare(
      `INSERT INTO agents (
         agent_id, token, hostname, os_type, panguard_version,
         machine_id, registered_at, revoked
       ) VALUES (
         @agent_id, @token, @hostname, @os_type, @panguard_version,
         @machine_id, @registered_at, 0
       )`
    );
    this.stmtSelectByAgentId = this.db.prepare(
      `SELECT * FROM agents WHERE agent_id = ?`
    );
    this.stmtSelectActiveByMachineId = this.db.prepare(
      `SELECT * FROM agents WHERE machine_id = ? AND revoked = 0 LIMIT 1`
    );
    this.stmtMarkRevoked = this.db.prepare(
      `UPDATE agents SET revoked = 1, revoked_at = ? WHERE agent_id = ? AND revoked = 0`
    );
    this.stmtTouch = this.db.prepare(
      `UPDATE agents SET last_seen = ? WHERE agent_id = ? AND revoked = 0`
    );
    this.stmtSelectActive = this.db.prepare(
      `SELECT * FROM agents WHERE revoked = 0 ORDER BY registered_at ASC`
    );
    this.stmtSelectAll = this.db.prepare(
      `SELECT * FROM agents ORDER BY registered_at ASC`
    );
    this.stmtCountActive = this.db.prepare(
      `SELECT COUNT(*) AS n FROM agents WHERE revoked = 0`
    );
  }

  /**
   * Register a new Guard agent and return its id + token. If the same
   * machine_id already has an active record, that record is returned
   * unchanged — matches the JSON-impl idempotent re-register behavior so
   * a Guard that restarts can fetch its existing credentials.
   */
  register(body: RegisterBody): { agent_id: string; token: string } {
    if (!body.hostname || !body.machine_id) {
      throw new Error('hostname and machine_id are required / hostname 與 machine_id 為必要參數');
    }

    const existing = this.stmtSelectActiveByMachineId.get(body.machine_id) as
      | AgentRow
      | undefined;
    if (existing) {
      return { agent_id: existing.agent_id, token: existing.token };
    }

    const agent_id = `agent_${randomBytes(8).toString('hex')}`;
    const token = randomBytes(32).toString('hex');
    this.stmtInsert.run({
      agent_id,
      token,
      hostname: body.hostname,
      os_type: body.os_type ?? 'unknown',
      panguard_version: body.panguard_version ?? 'unknown',
      machine_id: body.machine_id,
      registered_at: new Date().toISOString(),
    });
    return { agent_id, token };
  }

  /** Lookup by agent_id; returns undefined if unknown or revoked / 依 agent_id 查詢；若未知或已撤銷則回傳 undefined */
  findByAgentId(agent_id: string): AgentRecord | undefined {
    const row = this.stmtSelectByAgentId.get(agent_id) as AgentRow | undefined;
    if (!row || row.revoked === 1) return undefined;
    return rowToRecord(row);
  }

  /** Validate (agent_id, token) for an incoming relay call / 驗證 relay 呼叫的 (agent_id, token) */
  validateToken(agent_id: string, token: string): boolean {
    const row = this.stmtSelectByAgentId.get(agent_id) as AgentRow | undefined;
    if (!row || row.revoked === 1) return false;
    if (token.length !== row.token.length) return false;
    try {
      return timingSafeEqual(Buffer.from(token), Buffer.from(row.token));
    } catch {
      return false;
    }
  }

  /** Mark an agent revoked. Returns true if a row was actually flipped. / 將代理標記為已撤銷；若確實翻轉一列則回傳 true */
  revoke(agent_id: string): boolean {
    const info = this.stmtMarkRevoked.run(new Date().toISOString(), agent_id);
    return info.changes === 1;
  }

  /** Update last_seen for the relay hot-path / 為 relay 熱路徑更新 last_seen */
  touch(agent_id: string): void {
    try {
      this.stmtTouch.run(new Date().toISOString(), agent_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.debug(`touch(${agent_id}) failed: ${msg}`);
    }
  }

  /** List all non-revoked agents / 列出所有未撤銷的代理 */
  list(): ReadonlyArray<AgentRecord> {
    const rows = this.stmtSelectActive.all() as AgentRow[];
    return rows.map(rowToRecord);
  }

  /** List every agent including revoked (CLI inspection) / 列出所有代理含已撤銷（CLI 檢視） */
  listAll(): ReadonlyArray<AgentRecord> {
    const rows = this.stmtSelectAll.all() as AgentRow[];
    return rows.map(rowToRecord);
  }

  /** Number of non-revoked agents / 未撤銷代理總數 */
  count(): number {
    const r = this.stmtCountActive.get() as { n: number };
    return r.n;
  }

  /** Close the underlying DB. Idempotent. / 關閉底層 DB；冪等 */
  close(): void {
    try {
      this.db.close();
    } catch {
      /* already closed */
    }
  }

  /** Escape hatch: raw DB for sibling stores (operators, enrollment, events) / 後門：給兄弟 store 直接使用 DB */
  getRawDb(): Database.Database {
    return this.db;
  }

  /** Default DB file location given a data directory / 給定資料目錄的預設 DB 檔案位置 */
  static defaultDbPath(dataDir: string): string {
    return join(dataDir, 'manager.db');
  }

  /**
   * If a sibling `agents.json` exists alongside the DB AND the DB has no
   * agents yet, import every record and rename the JSON file so subsequent
   * boots skip the migration.
   *
   * Returns the number of agents imported (0 if no migration needed).
   * Existing tokens are preserved so already-deployed Guards keep working.
   */
  static migrateLegacyJson(dbPath: string): { imported: number; archivedTo?: string } {
    const jsonPath = join(dirname(dbPath), 'agents.json');
    if (!existsSync(jsonPath)) {
      return { imported: 0 };
    }

    const store = new AgentsStore({ dbPath });
    try {
      // Skip if the SQLite store already has agents — assume operator
      // imported manually or the JSON is stale.
      if (store.listAll().length > 0) {
        return { imported: 0 };
      }

      let parsed: { agents?: ReadonlyArray<Partial<AgentRecord>> };
      try {
        parsed = JSON.parse(readFileSync(jsonPath, 'utf-8')) as typeof parsed;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`migrateLegacyJson: malformed ${jsonPath} (${msg}) — skipping`);
        return { imported: 0 };
      }

      const records = Array.isArray(parsed.agents) ? parsed.agents : [];
      if (records.length === 0) {
        const archivedTo = `${jsonPath}.migrated.${Date.now()}`;
        renameSync(jsonPath, archivedTo);
        return { imported: 0, archivedTo };
      }

      const insert = store.db.prepare(
        `INSERT OR IGNORE INTO agents (
           agent_id, token, hostname, os_type, panguard_version,
           machine_id, registered_at, last_seen, revoked, revoked_at
         ) VALUES (
           @agent_id, @token, @hostname, @os_type, @panguard_version,
           @machine_id, @registered_at, @last_seen, @revoked, @revoked_at
         )`
      );
      let imported = 0;
      const tx = store.db.transaction((rows: ReadonlyArray<Partial<AgentRecord>>) => {
        for (const r of rows) {
          if (!r.agent_id || !r.token || !r.hostname || !r.machine_id || !r.registered_at) {
            continue;
          }
          insert.run({
            agent_id: r.agent_id,
            token: r.token,
            hostname: r.hostname,
            os_type: r.os_type ?? 'unknown',
            panguard_version: r.panguard_version ?? 'unknown',
            machine_id: r.machine_id,
            registered_at: r.registered_at,
            last_seen: r.last_seen ?? null,
            revoked: r.revoked ? 1 : 0,
            revoked_at: r.revoked ? (r.last_seen ?? r.registered_at) : null,
          });
          imported++;
        }
      });
      tx(records);

      const archivedTo = `${jsonPath}.migrated.${Date.now()}`;
      renameSync(jsonPath, archivedTo);
      logger.info(
        `Migrated ${imported}/${records.length} agents from ${jsonPath}; archived to ${archivedTo}`
      );
      return { imported, archivedTo };
    } finally {
      store.close();
    }
  }
}

function rowToRecord(row: AgentRow): AgentRecord {
  return {
    agent_id: row.agent_id,
    token: row.token,
    hostname: row.hostname,
    os_type: row.os_type,
    panguard_version: row.panguard_version,
    machine_id: row.machine_id,
    registered_at: row.registered_at,
    revoked: row.revoked === 1,
    ...(row.last_seen ? { last_seen: row.last_seen } : {}),
  };
}
