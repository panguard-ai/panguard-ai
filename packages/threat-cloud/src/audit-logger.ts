/**
 * Audit logger for Threat Cloud operations
 * 威脅雲操作審計日誌
 *
 * Records administrative and system actions in the audit_log table
 * for compliance, debugging, and the admin dashboard.
 *
 * @module @panguard-ai/threat-cloud/audit-logger
 */

import type Database from 'better-sqlite3';

/** Valid audit action types / 有效的審計動作類型 */
export type AuditAction =
  | 'rule.create'
  | 'rule.delete'
  | 'proposal.approve'
  | 'proposal.reject'
  | 'threat.submit'
  | 'skill_threat.submit'
  | 'admin.login';

/** An entry from the audit_log table / audit_log 資料表的條目 */
export interface AuditLogEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}

/** Row shape returned by SQLite for audit_log queries */
interface AuditLogRow {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
}

/**
 * Audit logger backed by the audit_log SQLite table.
 * 基於 audit_log SQLite 資料表的審計日誌器。
 *
 * Usage:
 *   const logger = new AuditLogger(db);
 *   logger.logAction('admin', 'rule.create', 'rule', 'sigma-123', { source: 'sigma' });
 */
export class AuditLogger {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Record an audit action.
   * 記錄審計動作。
   *
   * @param actor - Who performed the action (username, client_id, or 'system')
   * @param action - The action type (e.g. 'rule.create')
   * @param resourceType - The type of resource affected (e.g. 'rule', 'proposal')
   * @param resourceId - Optional identifier of the affected resource
   * @param details - Optional structured metadata about the action
   * @param ipAddress - Optional IP address of the actor
   */
  logAction(
    actor: string,
    action: AuditAction,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string
  ): void {
    const detailsJson = details !== undefined ? JSON.stringify(details) : null;

    this.db
      .prepare(
        `
        INSERT INTO audit_log (actor, action, resource_type, resource_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(actor, action, resourceType, resourceId ?? null, detailsJson, ipAddress ?? null);
  }

  /**
   * Retrieve audit log entries for the admin dashboard.
   * 取得審計日誌條目供管理面板使用。
   *
   * @param limit - Maximum entries to return (default 100)
   * @param offset - Number of entries to skip for pagination (default 0)
   * @returns Array of audit log entries, newest first
   */
  getAuditLog(limit: number = 100, offset: number = 0): AuditLogEntry[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, timestamp, actor, action, resource_type, resource_id, details, ip_address
        FROM audit_log
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(limit, offset) as AuditLogRow[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      actor: row.actor,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details !== null ? (JSON.parse(row.details) as Record<string, unknown>) : null,
      ipAddress: row.ip_address,
    }));
  }

  /**
   * Get the total count of audit log entries.
   * 取得審計日誌條目總數。
   */
  getAuditLogCount(): number {
    return (
      this.db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as {
        count: number;
      }
    ).count;
  }
}
