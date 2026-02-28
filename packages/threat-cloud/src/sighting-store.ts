/**
 * Sighting Store — IoC observation tracking with learning feedback
 * 觀測儲存 — IoC 觀測追蹤與學習回饋
 *
 * When agents (Guard/Trap) report threats that match existing IoCs,
 * sightings are created and feed back into the reputation engine.
 * Positive sightings boost confidence; false positives flag for review.
 *
 * @module @panguard-ai/threat-cloud/sighting-store
 */

import type Database from 'better-sqlite3';
import type {
  SightingInput,
  SightingRecord,
  SightingType,
  PaginationParams,
  PaginatedResponse,
} from './types.js';

/** Raw sighting row from SQLite */
interface SightingRow {
  id: number;
  ioc_id: number;
  type: string;
  source: string;
  confidence: number;
  details: string;
  actor_hash: string;
  created_at: string;
}

function rowToRecord(row: SightingRow): SightingRecord {
  return {
    id: row.id,
    iocId: row.ioc_id,
    type: row.type as SightingType,
    source: row.source,
    confidence: row.confidence,
    details: row.details,
    actorHash: row.actor_hash,
    createdAt: row.created_at,
  };
}

/** Confidence adjustment per sighting type */
const CONFIDENCE_DELTA: Record<SightingType, number> = {
  positive: 5,
  negative: -10,
  false_positive: -25,
};

export class SightingStore {
  constructor(private readonly db: Database.Database) {}

  /**
   * Record a new sighting for an IoC.
   * Updates the IoC's confidence and status based on sighting type.
   * 記錄新的觀測，根據觀測類型更新 IoC 信心度和狀態
   */
  createSighting(input: SightingInput, actorHash = ''): SightingRecord {
    const sightingConfidence = input.confidence ?? 50;

    const result = this.db
      .prepare(
        `INSERT INTO sightings (ioc_id, type, source, confidence, details, actor_hash)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.iocId,
        input.type,
        input.source,
        sightingConfidence,
        input.details ?? '',
        actorHash
      );

    // Apply feedback to the IoC
    this.applyFeedback(input.iocId, input.type, sightingConfidence);

    return this.getSightingById(Number(result.lastInsertRowid))!;
  }

  /**
   * Auto-create a positive sighting when agent data matches an existing IoC.
   * Called from threat/trap-intel upload handlers.
   * 當 Agent 資料匹配現有 IoC 時自動建立正面觀測
   */
  recordAgentMatch(iocId: number, source: 'guard' | 'trap', actorHash = ''): SightingRecord {
    return this.createSighting(
      {
        iocId,
        type: 'positive',
        source: `agent:${source}`,
        confidence: source === 'trap' ? 70 : 55,
        details: `Auto-sighting from ${source} agent match`,
      },
      actorHash
    );
  }

  /**
   * Record cross-source correlation: same IoC seen by both Guard and Trap.
   * Gives a larger confidence boost than single-source sightings.
   * 跨來源關聯：同一 IoC 被 Guard 和 Trap 同時看到時，信心度提升更大
   */
  recordCrossSourceMatch(iocId: number, actorHash = ''): SightingRecord | null {
    // Check if we already have sightings from both guard and trap
    const sources = this.db
      .prepare(
        `SELECT DISTINCT source FROM sightings
         WHERE ioc_id = ? AND type = 'positive' AND source LIKE 'agent:%'`
      )
      .all(iocId) as Array<{ source: string }>;

    const hasGuard = sources.some((s) => s.source === 'agent:guard');
    const hasTrap = sources.some((s) => s.source === 'agent:trap');

    if (hasGuard && hasTrap) {
      // Already have cross-source — check if we already recorded this
      const existing = this.db
        .prepare(
          `SELECT id FROM sightings
           WHERE ioc_id = ? AND source = 'cross-source-correlation'
           AND created_at > datetime('now', '-1 day')`
        )
        .get(iocId) as { id: number } | undefined;

      if (existing) return null;

      return this.createSighting(
        {
          iocId,
          type: 'positive',
          source: 'cross-source-correlation',
          confidence: 85,
          details: 'Confirmed by both Guard and Trap agents',
        },
        actorHash
      );
    }

    return null;
  }

  /**
   * Get sightings for an IoC / 取得 IoC 的觀測記錄
   */
  getSightingsForIoC(
    iocId: number,
    pagination: PaginationParams
  ): PaginatedResponse<SightingRecord> {
    const safePage = Math.max(1, pagination.page);
    const safeLimit = Math.min(Math.max(1, pagination.limit), 500);
    const offset = (safePage - 1) * safeLimit;

    const total = (
      this.db.prepare('SELECT COUNT(*) as count FROM sightings WHERE ioc_id = ?').get(iocId) as {
        count: number;
      }
    ).count;

    const rows = this.db
      .prepare(
        `SELECT * FROM sightings WHERE ioc_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(iocId, safeLimit, offset) as SightingRow[];

    return {
      items: rows.map(rowToRecord),
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: offset + safeLimit < total,
    };
  }

  /**
   * Get sighting summary for an IoC / 取得 IoC 的觀測摘要
   */
  getSightingSummary(iocId: number): {
    total: number;
    positive: number;
    negative: number;
    falsePositive: number;
    uniqueSources: number;
    lastSeen: string | null;
  } {
    const row = this.db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN type = 'positive' THEN 1 ELSE 0 END) as positive,
          SUM(CASE WHEN type = 'negative' THEN 1 ELSE 0 END) as negative,
          SUM(CASE WHEN type = 'false_positive' THEN 1 ELSE 0 END) as false_positive,
          COUNT(DISTINCT source) as unique_sources,
          MAX(created_at) as last_seen
        FROM sightings WHERE ioc_id = ?`
      )
      .get(iocId) as {
      total: number;
      positive: number;
      negative: number;
      false_positive: number;
      unique_sources: number;
      last_seen: string | null;
    };

    return {
      total: row.total,
      positive: row.positive,
      negative: row.negative,
      falsePositive: row.false_positive,
      uniqueSources: row.unique_sources,
      lastSeen: row.last_seen,
    };
  }

  /**
   * Get recent sighting count within time window / 取得時間窗口內的近期觀測數量
   */
  getRecentSightingCount(iocId: number, windowHours = 24): number {
    return (
      this.db
        .prepare(
          `SELECT COUNT(*) as count FROM sightings
           WHERE ioc_id = ? AND created_at > datetime('now', '-' || ? || ' hours')`
        )
        .get(iocId, windowHours) as { count: number }
    ).count;
  }

  /** Get sighting by ID */
  private getSightingById(id: number): SightingRecord | null {
    const row = this.db.prepare('SELECT * FROM sightings WHERE id = ?').get(id) as
      | SightingRow
      | undefined;
    return row ? rowToRecord(row) : null;
  }

  /**
   * Apply sighting feedback to IoC confidence and status.
   * 將觀測回饋套用到 IoC 的信心度和狀態
   */
  private applyFeedback(iocId: number, type: SightingType, sightingConfidence: number): void {
    const delta = CONFIDENCE_DELTA[type];

    if (type === 'false_positive') {
      // Mark IoC as under review and reduce confidence
      this.db
        .prepare(
          `UPDATE iocs SET
            status = 'under_review',
            confidence = MAX(0, MIN(100, confidence + ?)),
            updated_at = datetime('now')
          WHERE id = ? AND status != 'revoked'`
        )
        .run(delta, iocId);
    } else if (type === 'positive') {
      // Boost confidence and update last_seen
      this.db
        .prepare(
          `UPDATE iocs SET
            confidence = MAX(0, MIN(100, confidence + ?)),
            sightings = sightings + 1,
            last_seen = datetime('now'),
            status = CASE WHEN status = 'expired' THEN 'active' ELSE status END,
            updated_at = datetime('now')
          WHERE id = ?`
        )
        .run(delta, iocId);
    } else {
      // Negative sighting: reduce confidence
      this.db
        .prepare(
          `UPDATE iocs SET
            confidence = MAX(0, MIN(100, confidence + ?)),
            updated_at = datetime('now')
          WHERE id = ?`
        )
        .run(delta, iocId);
    }
  }
}
