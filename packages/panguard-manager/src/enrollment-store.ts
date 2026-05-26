/**
 * EnrollmentTokenStore — one-time tokens that gate agent self-registration.
 * EnrollmentTokenStore — 用一次性 token 控管代理自我註冊。
 *
 * Flow:
 *   1. Admin operator issues a token (CLI or admin UI) and shares it
 *      out-of-band with the Guard installer.
 *   2. The Guard's first /api/agents/register call presents the token in
 *      the `X-Enrollment-Token` header.
 *   3. Server calls {@link EnrollmentTokenStore.consume} which marks the
 *      token used + records which agent_id it created. Future register
 *      calls with the same token are rejected.
 *
 * @module @panguard-ai/panguard-manager/enrollment-store
 */

import { createHash, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { EnrollmentTokenRow } from './db/types.js';

const TOKEN_BYTES = 24;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Hash a plaintext token for at-rest storage / 將明文 token 雜湊以便儲存 */
function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Public-facing token record. Includes `token_hash` so an admin UI can
 * identify tokens for revoke without ever seeing the plaintext (hash is
 * SHA256(plaintext) — not reversible).
 *
 * 對外公開的 token 紀錄；含 token_hash 讓管理介面能識別到要撤銷哪一個,
 * 但永遠看不到 plaintext。
 */
export interface EnrollmentToken {
  readonly token_hash: string;
  readonly description?: string;
  readonly created_by_operator_id: number;
  readonly created_at: string;
  readonly expires_at: string;
  readonly used_at?: string;
  readonly used_by_agent_id?: string;
  readonly revoked: boolean;
}

/** Options for {@link EnrollmentTokenStore} / EnrollmentTokenStore 選項 */
export interface EnrollmentTokenStoreOptions {
  readonly db: Database.Database;
}

/** Options for {@link EnrollmentTokenStore.issue} / issue() 選項 */
export interface IssueTokenOptions {
  readonly createdByOperatorId: number;
  readonly ttlMs?: number;
  readonly description?: string;
}

/** Result of {@link EnrollmentTokenStore.consume} / consume() 結果 */
export type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: 'unknown' | 'used' | 'expired' | 'revoked' };

function rowToToken(row: EnrollmentTokenRow): EnrollmentToken {
  return {
    token_hash: row.token_hash,
    created_by_operator_id: row.created_by_operator_id,
    created_at: row.created_at,
    expires_at: row.expires_at,
    revoked: row.revoked_at !== null,
    ...(row.description ? { description: row.description } : {}),
    ...(row.used_at ? { used_at: row.used_at } : {}),
    ...(row.used_by_agent_id ? { used_by_agent_id: row.used_by_agent_id } : {}),
  };
}

export class EnrollmentTokenStore {
  private readonly db: Database.Database;
  private readonly stmtInsert: Database.Statement;
  private readonly stmtSelect: Database.Statement;
  private readonly stmtConsume: Database.Statement;
  private readonly stmtRevoke: Database.Statement;
  private readonly stmtListActive: Database.Statement;
  private readonly stmtListAll: Database.Statement;
  private readonly stmtDeleteExpired: Database.Statement;

  constructor(options: EnrollmentTokenStoreOptions) {
    if (!options.db) throw new Error('db is required / db 為必要參數');
    this.db = options.db;

    this.stmtInsert = this.db.prepare(
      `INSERT INTO enrollment_tokens (
         token_hash, description, created_by_operator_id, created_at, expires_at
       ) VALUES (@token_hash, @description, @created_by_operator_id, @created_at, @expires_at)`
    );
    this.stmtSelect = this.db.prepare(
      `SELECT * FROM enrollment_tokens WHERE token_hash = ?`
    );
    // Conditional UPDATE makes consume atomic: only one register call can
    // claim a given token, even on concurrent attempts.
    this.stmtConsume = this.db.prepare(
      `UPDATE enrollment_tokens
          SET used_at = ?, used_by_agent_id = ?
        WHERE token_hash = ?
          AND used_at IS NULL
          AND revoked_at IS NULL
          AND expires_at >= ?`
    );
    this.stmtRevoke = this.db.prepare(
      `UPDATE enrollment_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`
    );
    this.stmtListActive = this.db.prepare(
      `SELECT * FROM enrollment_tokens
        WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at >= ?
        ORDER BY created_at DESC`
    );
    this.stmtListAll = this.db.prepare(
      `SELECT * FROM enrollment_tokens ORDER BY created_at DESC`
    );
    this.stmtDeleteExpired = this.db.prepare(
      `DELETE FROM enrollment_tokens
        WHERE (used_at IS NOT NULL AND used_at < ?)
           OR (revoked_at IS NOT NULL AND revoked_at < ?)
           OR (used_at IS NULL AND expires_at < ?)`
    );
  }

  /** Issue a new enrollment token. Returns the PLAINTEXT — store nowhere else. / 發放新 token，僅此一次明文 */
  issue(options: IssueTokenOptions): { token: string; expires_at: string } {
    const now = Date.now();
    const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
    const plaintext = randomBytes(TOKEN_BYTES).toString('base64url');
    const expires_at = new Date(now + ttl).toISOString();
    this.stmtInsert.run({
      token_hash: hashToken(plaintext),
      description: options.description ?? null,
      created_by_operator_id: options.createdByOperatorId,
      created_at: new Date(now).toISOString(),
      expires_at,
    });
    return { token: plaintext, expires_at };
  }

  /** Look up a token's metadata (no plaintext returned) / 查找 token 中繼資料 */
  lookup(plaintext: string): EnrollmentToken | null {
    if (!plaintext) return null;
    const row = this.stmtSelect.get(hashToken(plaintext)) as
      | EnrollmentTokenRow
      | undefined;
    return row ? rowToToken(row) : null;
  }

  /**
   * Atomically claim a token for a specific agent. Returns the reason for
   * failure so callers can surface useful errors.
   */
  consume(plaintext: string, agentId: string): ConsumeResult {
    if (!plaintext) return { ok: false, reason: 'unknown' };
    const row = this.stmtSelect.get(hashToken(plaintext)) as
      | EnrollmentTokenRow
      | undefined;
    if (!row) return { ok: false, reason: 'unknown' };
    if (row.revoked_at) return { ok: false, reason: 'revoked' };
    if (row.used_at) return { ok: false, reason: 'used' };
    if (Date.parse(row.expires_at) < Date.now()) return { ok: false, reason: 'expired' };

    const info = this.stmtConsume.run(
      new Date().toISOString(),
      agentId,
      hashToken(plaintext),
      new Date().toISOString()
    );
    if (info.changes !== 1) {
      // Lost a race — re-check why
      const reLookup = this.stmtSelect.get(hashToken(plaintext)) as
        | EnrollmentTokenRow
        | undefined;
      if (reLookup?.used_at) return { ok: false, reason: 'used' };
      return { ok: false, reason: 'unknown' };
    }
    return { ok: true };
  }

  /** Revoke an unused token by its plaintext / 用明文撤銷未使用的 token */
  revoke(plaintext: string): boolean {
    if (!plaintext) return false;
    const info = this.stmtRevoke.run(new Date().toISOString(), hashToken(plaintext));
    return info.changes === 1;
  }

  /**
   * Revoke a token by its stored hash. Used by the admin UI which only
   * ever sees the hash (plaintext was destroyed after issue).
   * 用 hash 撤銷 token；管理 UI 永遠只看到 hash,不會看到 plaintext。
   */
  revokeByHash(tokenHash: string): boolean {
    if (!tokenHash || !/^[a-f0-9]{64}$/.test(tokenHash)) return false;
    const info = this.stmtRevoke.run(new Date().toISOString(), tokenHash);
    return info.changes === 1;
  }

  /** List all tokens still usable / 列出所有仍可用的 token */
  listActive(): ReadonlyArray<EnrollmentToken> {
    return (
      this.stmtListActive.all(new Date().toISOString()) as EnrollmentTokenRow[]
    ).map(rowToToken);
  }

  /** List all tokens (for admin audit) / 列出所有 token（管理稽核用） */
  listAll(): ReadonlyArray<EnrollmentToken> {
    return (this.stmtListAll.all() as EnrollmentTokenRow[]).map(rowToToken);
  }

  /**
   * Sweep tokens whose terminal status (used / revoked / expired) is older
   * than `olderThanMs` ago. Returns rows deleted. Run periodically.
   */
  sweep(olderThanMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - olderThanMs).toISOString();
    const info = this.stmtDeleteExpired.run(cutoff, cutoff, cutoff);
    return info.changes;
  }
}
