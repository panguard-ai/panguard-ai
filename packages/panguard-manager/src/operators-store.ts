/**
 * OperatorStore — SQLite-backed authentication for Manager dashboard users.
 * OperatorStore — Manager dashboard 使用者的 SQLite 認證後端。
 *
 * Separate concern from {@link AgentsStore}: operators are humans who log
 * into the dashboard, agents are Guards relaying telemetry. They share a
 * DB connection (single-file deployment) but live in distinct tables.
 *
 * Passwords: scrypt (N=2^15, r=8, p=1) → 64-byte derived key, stored as
 * hex alongside a random 16-byte salt. ~100ms per hash on a modern laptop.
 *
 * Sessions: 32-byte random plaintext token, stored as sha256(token) in the
 * DB so a leaked manager.db cannot be replayed against the live API.
 *
 * @module @panguard-ai/panguard-manager/operators-store
 */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Operator, OperatorRole } from './types.js';
import type { OperatorRow, OperatorSessionRow } from './db/types.js';

/**
 * scrypt cost parameters. N=2^15 r=8 p=1 matches OWASP password-storage
 * guidance (~33 MB peak memory per hash, ~100ms on a 2024 laptop). Node's
 * default scryptSync `maxmem` is 32 MB — just below what N=2^15 needs, so
 * we set it explicitly to 64 MB.
 */
const SCRYPT_N = 1 << 15; // 32768
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const SCRYPT_OPTS = {
  N: SCRYPT_N,
  r: SCRYPT_R,
  p: SCRYPT_P,
  maxmem: SCRYPT_MAXMEM,
} as const;
const SALT_BYTES = 16;
const SESSION_TOKEN_BYTES = 32;
const DEFAULT_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** Options for {@link OperatorStore} / OperatorStore 選項 */
export interface OperatorStoreOptions {
  /** Shared DB handle (typically from AgentsStore.getRawDb()) / 共享 DB（通常來自 AgentsStore.getRawDb()） */
  readonly db: Database.Database;
}

/** Successful login / session validation result / 登入或 session 驗證成功的結果 */
export interface SessionLookup {
  readonly operator: Operator;
  readonly expires_at: string;
}

/** Optional context attached to a session at creation time / 建立 session 時的可選上下文 */
export interface CreateSessionContext {
  /** TTL in ms (defaults to 14 days) / TTL 毫秒（預設 14 天） */
  readonly ttlMs?: number;
  /** Originating user agent string / 來源使用者代理字串 */
  readonly userAgent?: string;
  /** Originating IP / 來源 IP */
  readonly ipAddress?: string;
}

/** Hash a session token for at-rest storage / 將 session token 雜湊以便儲存 */
function hashSessionToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/** Constant-time string compare via Buffer XOR / 用 Buffer XOR 做常數時間字串比較 */
function constantEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** Convert raw DB row to the public Operator shape / 將原始 DB 列轉成公開的 Operator */
function rowToOperator(row: OperatorRow): Operator {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
    disabled: row.disabled === 1,
    ...(row.last_login_at ? { last_login_at: row.last_login_at } : {}),
  };
}

/**
 * Persistent operator + session store. Single-process; better-sqlite3
 * serialises writes through SQLite locks.
 */
export class OperatorStore {
  private readonly db: Database.Database;
  private readonly stmtInsertOperator: Database.Statement;
  private readonly stmtSelectByUsername: Database.Statement;
  private readonly stmtSelectById: Database.Statement;
  private readonly stmtListOperators: Database.Statement;
  private readonly stmtUpdateLastLogin: Database.Statement;
  private readonly stmtSetDisabled: Database.Statement;
  private readonly stmtUpdatePassword: Database.Statement;
  private readonly stmtCountAdmins: Database.Statement;
  private readonly stmtInsertSession: Database.Statement;
  private readonly stmtSelectSession: Database.Statement;
  private readonly stmtRevokeSession: Database.Statement;
  private readonly stmtRevokeAllSessionsForOperator: Database.Statement;
  private readonly stmtDeleteExpiredSessions: Database.Statement;

  constructor(options: OperatorStoreOptions) {
    if (!options.db) {
      throw new Error('db is required / db 為必要參數');
    }
    this.db = options.db;

    this.stmtInsertOperator = this.db.prepare(
      `INSERT INTO operators (
         username, password_hash, password_salt, role, created_at, disabled
       ) VALUES (@username, @password_hash, @password_salt, @role, @created_at, 0)`
    );
    this.stmtSelectByUsername = this.db.prepare(
      `SELECT * FROM operators WHERE username = ?`
    );
    this.stmtSelectById = this.db.prepare(`SELECT * FROM operators WHERE id = ?`);
    this.stmtListOperators = this.db.prepare(
      `SELECT * FROM operators ORDER BY id ASC`
    );
    this.stmtUpdateLastLogin = this.db.prepare(
      `UPDATE operators SET last_login_at = ? WHERE id = ?`
    );
    this.stmtSetDisabled = this.db.prepare(
      `UPDATE operators SET disabled = ? WHERE id = ?`
    );
    this.stmtUpdatePassword = this.db.prepare(
      `UPDATE operators SET password_hash = ?, password_salt = ? WHERE id = ?`
    );
    this.stmtCountAdmins = this.db.prepare(
      `SELECT COUNT(*) AS n FROM operators WHERE role = 'admin' AND disabled = 0`
    );
    this.stmtInsertSession = this.db.prepare(
      `INSERT INTO operator_sessions (
         token_hash, operator_id, created_at, expires_at, user_agent, ip_address
       ) VALUES (@token_hash, @operator_id, @created_at, @expires_at, @user_agent, @ip_address)`
    );
    this.stmtSelectSession = this.db.prepare(
      `SELECT s.*, o.id AS o_id, o.username, o.password_hash, o.password_salt,
              o.role, o.created_at AS o_created_at, o.last_login_at, o.disabled
         FROM operator_sessions s
         JOIN operators o ON o.id = s.operator_id
        WHERE s.token_hash = ?`
    );
    this.stmtRevokeSession = this.db.prepare(
      `UPDATE operator_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`
    );
    this.stmtRevokeAllSessionsForOperator = this.db.prepare(
      `UPDATE operator_sessions SET revoked_at = ?
        WHERE operator_id = ? AND revoked_at IS NULL`
    );
    this.stmtDeleteExpiredSessions = this.db.prepare(
      `DELETE FROM operator_sessions
        WHERE expires_at < ? OR revoked_at IS NOT NULL`
    );
  }

  /** Create a new operator with the given password / 用指定密碼建立新管理員 */
  createOperator(input: {
    username: string;
    password: string;
    role: OperatorRole;
  }): Operator {
    if (!input.username.trim()) throw new Error('username required');
    if (input.password.length < 12) {
      throw new Error('password must be at least 12 characters / 密碼至少 12 字元');
    }
    if (input.role !== 'admin' && input.role !== 'viewer') {
      throw new Error('role must be admin or viewer');
    }

    const salt = randomBytes(SALT_BYTES).toString('hex');
    const hash = scryptSync(input.password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString('hex');

    const info = this.stmtInsertOperator.run({
      username: input.username,
      password_hash: hash,
      password_salt: salt,
      role: input.role,
      created_at: new Date().toISOString(),
    });
    const id = Number(info.lastInsertRowid);
    const row = this.stmtSelectById.get(id) as OperatorRow;
    return rowToOperator(row);
  }

  /** True if a username exists / 使用者名稱是否存在 */
  hasOperator(username: string): boolean {
    return this.stmtSelectByUsername.get(username) !== undefined;
  }

  /** Total active admin count — useful for "don't disable the last admin" / 啟用中的 admin 總數 */
  activeAdminCount(): number {
    return (this.stmtCountAdmins.get() as { n: number }).n;
  }

  /**
   * Verify a username + password. Always runs the scrypt KDF even when the
   * username is unknown — prevents trivial username-enumeration timing.
   */
  verifyPassword(username: string, password: string): Operator | null {
    const row = this.stmtSelectByUsername.get(username) as OperatorRow | undefined;

    // Dummy salt + dummy hash so the timing of unknown-user path matches the
    // known-user path. We don't actually compare against this hash.
    // 假鹽 + 假雜湊：未知使用者路徑要花同樣時間以避免列舉。
    const salt = row?.password_salt ?? 'a'.repeat(SALT_BYTES * 2);
    const expected = row?.password_hash ?? 'b'.repeat(SCRYPT_KEYLEN * 2);
    const computed = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString('hex');

    const matches = constantEqual(computed, expected);
    if (!row || row.disabled === 1 || !matches) return null;
    return rowToOperator(row);
  }

  /** Issue a session token. Returns the PLAINTEXT token — store nothing. / 發放 session token；返回明文 */
  createSession(
    operator_id: number,
    context: CreateSessionContext = {}
  ): { token: string; expires_at: string } {
    const ttl = context.ttlMs ?? DEFAULT_SESSION_TTL_MS;
    const now = Date.now();
    const expiresAt = new Date(now + ttl).toISOString();
    const plaintext = randomBytes(SESSION_TOKEN_BYTES).toString('hex');
    this.stmtInsertSession.run({
      token_hash: hashSessionToken(plaintext),
      operator_id,
      created_at: new Date(now).toISOString(),
      expires_at: expiresAt,
      user_agent: context.userAgent ?? null,
      ip_address: context.ipAddress ?? null,
    });
    this.stmtUpdateLastLogin.run(new Date(now).toISOString(), operator_id);
    return { token: plaintext, expires_at: expiresAt };
  }

  /**
   * Look up and validate a session by its PLAINTEXT token. Returns the
   * operator + expiry, or null if the session is unknown, expired,
   * revoked, or its operator is disabled.
   */
  validateSession(plaintext: string): SessionLookup | null {
    if (!plaintext) return null;
    const row = this.stmtSelectSession.get(hashSessionToken(plaintext)) as
      | (OperatorSessionRow & {
          o_id: number;
          username: string;
          password_hash: string;
          password_salt: string;
          role: OperatorRole;
          o_created_at: string;
          last_login_at: string | null;
          disabled: number;
        })
      | undefined;
    if (!row) return null;
    if (row.revoked_at) return null;
    if (Date.parse(row.expires_at) < Date.now()) return null;
    if (row.disabled === 1) return null;

    return {
      operator: {
        id: row.o_id,
        username: row.username,
        role: row.role,
        created_at: row.o_created_at,
        disabled: row.disabled === 1,
        ...(row.last_login_at ? { last_login_at: row.last_login_at } : {}),
      },
      expires_at: row.expires_at,
    };
  }

  /** Revoke a single session. Returns true if a row flipped. / 撤銷單一 session */
  revokeSession(plaintext: string): boolean {
    if (!plaintext) return false;
    const info = this.stmtRevokeSession.run(
      new Date().toISOString(),
      hashSessionToken(plaintext)
    );
    return info.changes === 1;
  }

  /** Revoke every active session for an operator (forced logout) / 撤銷某管理員的所有有效 session */
  revokeAllSessionsForOperator(operator_id: number): number {
    const info = this.stmtRevokeAllSessionsForOperator.run(
      new Date().toISOString(),
      operator_id
    );
    return info.changes;
  }

  /** Find by id / 依 id 查找 */
  findById(id: number): Operator | null {
    const row = this.stmtSelectById.get(id) as OperatorRow | undefined;
    return row ? rowToOperator(row) : null;
  }

  /** List every operator (admin UI uses this) / 列出所有管理員 */
  listOperators(): ReadonlyArray<Operator> {
    return (this.stmtListOperators.all() as OperatorRow[]).map(rowToOperator);
  }

  /** Disable or re-enable an operator. Refuses to disable the last active admin. / 停用或啟用管理員 */
  setDisabled(id: number, disabled: boolean): void {
    if (disabled) {
      const target = this.stmtSelectById.get(id) as OperatorRow | undefined;
      if (target?.role === 'admin' && target.disabled === 0 && this.activeAdminCount() <= 1) {
        throw new Error('cannot disable the last active admin');
      }
    }
    this.stmtSetDisabled.run(disabled ? 1 : 0, id);
    if (disabled) this.revokeAllSessionsForOperator(id);
  }

  /** Set a new password for an operator. Existing sessions stay valid unless caller revokes. / 更新管理員密碼 */
  setPassword(id: number, newPassword: string): void {
    if (newPassword.length < 12) {
      throw new Error('password must be at least 12 characters');
    }
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const hash = scryptSync(newPassword, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString('hex');
    this.stmtUpdatePassword.run(hash, salt, id);
  }

  /** Sweep expired/revoked sessions. Returns rows deleted. Run periodically. / 清理過期/已撤銷 session */
  sweepExpiredSessions(): number {
    const info = this.stmtDeleteExpiredSessions.run(new Date().toISOString());
    return info.changes;
  }
}
