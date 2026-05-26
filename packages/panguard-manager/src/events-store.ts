/**
 * EventsStore — SQLite-backed persistent log of every relayed event,
 * verdict, and status snapshot.
 * EventsStore — 每筆 relay 進來的 event/verdict/status 的 SQLite 持久化記錄。
 *
 * Lives alongside the in-memory {@link FleetAggregator}:
 *   - Aggregator answers "current state" (online flag, 24h counts) fast.
 *   - EventsStore is the source of truth that survives restarts and
 *     backs historical drill-down beyond the aggregator's bounded window.
 *
 * Schema lives in migrations.ts (v4 = create_agent_events).
 *
 * @module @panguard-ai/panguard-manager/events-store
 */

import type Database from 'better-sqlite3';
import type { DashboardEvent, ThreatVerdict } from '@panguard-ai/panguard-guard';
import type { AgentEventKind, AgentEventRow } from './db/types.js';
import type { RelayEventBody } from './types.js';

/** Decode a payload row back into its original object. / 將 payload 列解碼回原始物件 */
function decodePayload<T>(row: AgentEventRow): T {
  return JSON.parse(row.payload_json) as T;
}

/**
 * Heuristic shared with FleetAggregator: which verdicts count as threats
 * for the 24h rolling counter. Exported so callers can mirror the rule
 * when computing aggregate metrics outside this store.
 */
export function isThreatVerdict(v: ThreatVerdict): boolean {
  const cls = (v as { classification?: string }).classification;
  const sev = (v as { severity?: string }).severity;
  if (cls === 'malicious' || cls === 'suspicious') return true;
  if (sev === 'high' || sev === 'critical') return true;
  return false;
}

/** Options for {@link EventsStore} / EventsStore 選項 */
export interface EventsStoreOptions {
  readonly db: Database.Database;
}

/** A single recorded row with its payload decoded / 已解碼承載的單一紀錄 */
export interface RecordedEvent {
  readonly id: number;
  readonly agent_id: string;
  readonly kind: AgentEventKind;
  readonly observed_at: string;
  readonly is_threat: boolean;
  readonly payload: DashboardEvent | ThreatVerdict | Record<string, unknown>;
}

/** Per-agent boot hydration payload (used by FleetAggregator) / 代理啟動水合用承載 */
export interface AgentHydration {
  readonly events: ReadonlyArray<DashboardEvent>;
  readonly verdicts: ReadonlyArray<ThreatVerdict>;
  readonly threat_times_ms: ReadonlyArray<number>;
  readonly last_seen_ms: number | undefined;
  readonly events_total: number;
  readonly atr_rules_active: number;
  readonly mode: 'learning' | 'protection' | 'unknown';
}

/** Default retention: 30 days / 預設保留期：30 天 */
export const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Default per-agent hydration cap (matches aggregator MAX_EVENTS_PER_AGENT) */
const DEFAULT_HYDRATION_EVENTS = 500;
const DEFAULT_HYDRATION_VERDICTS = 100;
const THREATS_WINDOW_MS = 24 * 60 * 60 * 1000;

export class EventsStore {
  private readonly db: Database.Database;
  private readonly stmtInsert: Database.Statement;
  private readonly stmtRecentForAgentByKind: Database.Statement;
  private readonly stmtCountEventsForAgent: Database.Statement;
  private readonly stmtThreatCountSince: Database.Statement;
  private readonly stmtGlobalThreatCountSince: Database.Statement;
  private readonly stmtThreatTimesSince: Database.Statement;
  private readonly stmtLatestStatusForAgent: Database.Statement;
  private readonly stmtLastSeenForAgent: Database.Statement;
  private readonly stmtDeleteOlderThan: Database.Statement;

  constructor(options: EventsStoreOptions) {
    if (!options.db) throw new Error('db is required / db 為必要參數');
    this.db = options.db;

    this.stmtInsert = this.db.prepare(
      `INSERT INTO agent_events (
         agent_id, kind, payload_json, observed_at, is_threat
       ) VALUES (@agent_id, @kind, @payload_json, @observed_at, @is_threat)`
    );
    this.stmtRecentForAgentByKind = this.db.prepare(
      `SELECT * FROM agent_events
        WHERE agent_id = ? AND kind = ?
        ORDER BY observed_at DESC, id DESC
        LIMIT ?`
    );
    this.stmtCountEventsForAgent = this.db.prepare(
      `SELECT COUNT(*) AS n FROM agent_events WHERE agent_id = ? AND kind = 'event'`
    );
    this.stmtThreatCountSince = this.db.prepare(
      `SELECT COUNT(*) AS n FROM agent_events
        WHERE agent_id = ? AND is_threat = 1 AND observed_at >= ?`
    );
    this.stmtGlobalThreatCountSince = this.db.prepare(
      `SELECT COUNT(*) AS n FROM agent_events WHERE is_threat = 1 AND observed_at >= ?`
    );
    this.stmtThreatTimesSince = this.db.prepare(
      `SELECT observed_at FROM agent_events
        WHERE agent_id = ? AND is_threat = 1 AND observed_at >= ?
        ORDER BY observed_at ASC`
    );
    this.stmtLatestStatusForAgent = this.db.prepare(
      `SELECT * FROM agent_events
        WHERE agent_id = ? AND kind = 'status'
        ORDER BY observed_at DESC, id DESC
        LIMIT 1`
    );
    this.stmtLastSeenForAgent = this.db.prepare(
      `SELECT MAX(observed_at) AS last_seen FROM agent_events WHERE agent_id = ?`
    );
    this.stmtDeleteOlderThan = this.db.prepare(
      `DELETE FROM agent_events WHERE observed_at < ?`
    );
  }

  /**
   * Persist one relay payload. Inserts up to three rows in a single
   * transaction so a half-written body never appears mid-query.
   */
  record(agent_id: string, body: RelayEventBody, atMs: number = Date.now()): void {
    if (!agent_id) return;
    const observed_at = new Date(atMs).toISOString();
    const writes: Array<{
      agent_id: string;
      kind: AgentEventKind;
      payload_json: string;
      observed_at: string;
      is_threat: number;
    }> = [];
    if (body.event) {
      writes.push({
        agent_id,
        kind: 'event',
        payload_json: JSON.stringify(body.event),
        observed_at,
        is_threat: 0,
      });
    }
    if (body.threat_verdict) {
      writes.push({
        agent_id,
        kind: 'verdict',
        payload_json: JSON.stringify(body.threat_verdict),
        observed_at,
        is_threat: isThreatVerdict(body.threat_verdict) ? 1 : 0,
      });
    }
    if (body.status) {
      writes.push({
        agent_id,
        kind: 'status',
        payload_json: JSON.stringify(body.status),
        observed_at,
        is_threat: 0,
      });
    }
    if (writes.length === 0) return;

    const tx = this.db.transaction(
      (rows: ReadonlyArray<(typeof writes)[number]>) => {
        for (const r of rows) this.stmtInsert.run(r);
      }
    );
    tx(writes);
  }

  /** Most recent N events for an agent / 取得單一代理最近 N 筆 event */
  recentEvents(agent_id: string, limit = 50): ReadonlyArray<DashboardEvent> {
    const rows = this.stmtRecentForAgentByKind.all(agent_id, 'event', limit) as AgentEventRow[];
    return rows.reverse().map((r) => decodePayload<DashboardEvent>(r));
  }

  /** Most recent N verdicts for an agent / 取得單一代理最近 N 筆 verdict */
  recentVerdicts(agent_id: string, limit = 25): ReadonlyArray<ThreatVerdict> {
    const rows = this.stmtRecentForAgentByKind.all(agent_id, 'verdict', limit) as AgentEventRow[];
    return rows.reverse().map((r) => decodePayload<ThreatVerdict>(r));
  }

  /** Total events_total counter (kind='event') for an agent / 取得單一代理的 events_total */
  countEventsForAgent(agent_id: string): number {
    const row = this.stmtCountEventsForAgent.get(agent_id) as { n: number } | undefined;
    return row?.n ?? 0;
  }

  /** Threat count since a UTC ISO timestamp / 自某 UTC ISO 起的威脅計數 */
  threatCountSince(agent_id: string, since: string): number {
    const row = this.stmtThreatCountSince.get(agent_id, since) as { n: number } | undefined;
    return row?.n ?? 0;
  }

  /** Global (fleet-wide) threat count since a UTC ISO timestamp / 全 fleet 自某時間起的威脅計數 */
  globalThreatCountSince(since: string): number {
    const row = this.stmtGlobalThreatCountSince.get(since) as { n: number } | undefined;
    return row?.n ?? 0;
  }

  /**
   * Build a per-agent hydration record for the FleetAggregator. Reads the
   * most-recent events and verdicts (capped at the same limits the
   * aggregator's in-memory buffers use) plus the last known status
   * snapshot, so a restarted Manager rebuilds dashboard state from disk.
   */
  hydrateAgent(
    agent_id: string,
    options: {
      readonly eventLimit?: number;
      readonly verdictLimit?: number;
    } = {}
  ): AgentHydration {
    const events = this.recentEvents(agent_id, options.eventLimit ?? DEFAULT_HYDRATION_EVENTS);
    const verdicts = this.recentVerdicts(
      agent_id,
      options.verdictLimit ?? DEFAULT_HYDRATION_VERDICTS
    );
    const events_total = this.countEventsForAgent(agent_id);

    const since = new Date(Date.now() - THREATS_WINDOW_MS).toISOString();
    const threatRows = this.stmtThreatTimesSince.all(agent_id, since) as Array<{
      observed_at: string;
    }>;
    const threat_times_ms = threatRows.map((r) => Date.parse(r.observed_at));

    const lastSeenRow = this.stmtLastSeenForAgent.get(agent_id) as
      | { last_seen: string | null }
      | undefined;
    const last_seen_ms =
      lastSeenRow?.last_seen != null ? Date.parse(lastSeenRow.last_seen) : undefined;

    let mode: 'learning' | 'protection' | 'unknown' = 'unknown';
    let atr_rules_active = 0;
    const statusRow = this.stmtLatestStatusForAgent.get(agent_id) as AgentEventRow | undefined;
    if (statusRow) {
      try {
        const payload = decodePayload<{
          mode?: 'learning' | 'protection';
          atr_rule_count?: number;
        }>(statusRow);
        if (payload.mode === 'learning' || payload.mode === 'protection') mode = payload.mode;
        if (typeof payload.atr_rule_count === 'number') atr_rules_active = payload.atr_rule_count;
      } catch {
        /* skip malformed */
      }
    }

    return {
      events,
      verdicts,
      threat_times_ms,
      last_seen_ms,
      events_total,
      atr_rules_active,
      mode,
    };
  }

  /** Delete rows older than `retentionMs`. Returns the number deleted. / 刪除超過保留期的列 */
  sweep(retentionMs: number = DEFAULT_RETENTION_MS): number {
    const cutoff = new Date(Date.now() - retentionMs).toISOString();
    return this.stmtDeleteOlderThan.run(cutoff).changes;
  }
}
