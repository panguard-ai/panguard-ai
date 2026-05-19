/**
 * Aggregator — in-memory fleet state across all connected Guard agents
 * Aggregator — 所有已連接 Guard 代理的 fleet 記憶體狀態
 *
 * Holds a Map<agent_id, AgentSnapshot> and exposes summary + drill-down queries
 * for the Manager dashboard.
 *
 * @module @panguard-ai/panguard-manager/aggregator
 */

import type { DashboardEvent, ThreatVerdict } from '@panguard-ai/panguard-guard';
import type { AgentRecord, AgentSnapshot, FleetSummary, RelayEventBody } from './types.js';

/** Maximum events buffered per agent / 每個代理緩衝的事件最大數量 */
const MAX_EVENTS_PER_AGENT = 500;
/** Maximum verdicts buffered per agent / 每個代理緩衝的判定最大數量 */
const MAX_VERDICTS_PER_AGENT = 100;
/** Agent considered offline after this many ms without heartbeat / 超過此毫秒未心跳視為離線 */
const ONLINE_THRESHOLD_MS = 90_000;
/** Rolling window for threats_24h / threats_24h 滾動視窗 */
const THREATS_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Mutable per-agent state held by the aggregator / 聚合器持有的代理可變狀態 */
interface AgentState {
  hostname: string;
  os_type: string;
  panguard_version: string;
  mode: 'learning' | 'protection' | 'unknown';
  last_seen_ms: number;
  events_total: number;
  atr_rules_active: number;
  events: DashboardEvent[];
  verdicts: ThreatVerdict[];
  /** Timestamps (ms) of recent threat verdicts for 24h rolling window */
  threat_times_ms: number[];
}

/** Constructor options for FleetAggregator / FleetAggregator 建構選項 */
export interface FleetAggregatorOptions {
  /** Override for the online-threshold (ms), useful for tests / 線上閾值的覆寫（毫秒），測試用 */
  readonly onlineThresholdMs?: number;
  /** Override for now() — useful for deterministic tests / now() 的覆寫——測試確定性用 */
  readonly nowMs?: () => number;
}

/**
 * Aggregates state from N relay-connected Guards into a fleet view.
 */
export class FleetAggregator {
  private readonly state: Map<string, AgentState> = new Map();
  private readonly onlineThresholdMs: number;
  private readonly now: () => number;

  constructor(options: FleetAggregatorOptions = {}) {
    this.onlineThresholdMs = options.onlineThresholdMs ?? ONLINE_THRESHOLD_MS;
    this.now = options.nowMs ?? (() => Date.now());
  }

  /** Bootstrap aggregator with previously-registered agents (offline by default) / 用先前註冊的代理開機聚合器（預設離線） */
  hydrateFromRegistry(records: ReadonlyArray<AgentRecord>): void {
    for (const r of records) {
      if (this.state.has(r.agent_id)) continue;
      this.state.set(r.agent_id, {
        hostname: r.hostname,
        os_type: r.os_type,
        panguard_version: r.panguard_version,
        mode: 'unknown',
        last_seen_ms: r.last_seen ? Date.parse(r.last_seen) : 0,
        events_total: 0,
        atr_rules_active: 0,
        events: [],
        verdicts: [],
        threat_times_ms: [],
      });
    }
  }

  /** Apply an incoming relay event to the aggregated state / 把進來的 relay 事件套用到彙整狀態 */
  ingest(record: AgentRecord, body: RelayEventBody): void {
    const existing = this.state.get(record.agent_id);
    const base: AgentState = existing ?? {
      hostname: record.hostname,
      os_type: record.os_type,
      panguard_version: record.panguard_version,
      mode: 'unknown',
      last_seen_ms: 0,
      events_total: 0,
      atr_rules_active: 0,
      events: [],
      verdicts: [],
      threat_times_ms: [],
    };

    // Always create new arrays — immutable pattern per coding-style rules
    // 一律建立新陣列——遵守 coding-style 規範的不可變模式
    const next: AgentState = {
      ...base,
      last_seen_ms: this.now(),
      events: base.events,
      verdicts: base.verdicts,
      threat_times_ms: base.threat_times_ms,
    };

    if (body.event) {
      const nextEvents = base.events.concat(body.event);
      next.events =
        nextEvents.length > MAX_EVENTS_PER_AGENT
          ? nextEvents.slice(nextEvents.length - MAX_EVENTS_PER_AGENT)
          : nextEvents;
      next.events_total = base.events_total + 1;
    }

    if (body.threat_verdict) {
      const nextVerdicts = base.verdicts.concat(body.threat_verdict);
      next.verdicts =
        nextVerdicts.length > MAX_VERDICTS_PER_AGENT
          ? nextVerdicts.slice(nextVerdicts.length - MAX_VERDICTS_PER_AGENT)
          : nextVerdicts;

      if (this.isThreat(body.threat_verdict)) {
        const cutoff = this.now() - THREATS_WINDOW_MS;
        const filtered = base.threat_times_ms.filter((t) => t >= cutoff);
        next.threat_times_ms = filtered.concat(this.now());
      }
    }

    if (body.status) {
      if (body.status.mode) {
        next.mode = body.status.mode;
      }
      if (typeof body.status.atr_rule_count === 'number') {
        next.atr_rules_active = body.status.atr_rule_count;
      }
    }

    this.state.set(record.agent_id, next);
  }

  /** Build a single-agent drill-down view / 建立單代理 drill-down 視圖 */
  getAgentDetail(agent_id: string): AgentSnapshot | undefined {
    const s = this.state.get(agent_id);
    if (!s) return undefined;
    return this.toSnapshot(agent_id, s);
  }

  /** Build the fleet-wide aggregate KPIs / 建立 fleet 範圍的彙總 KPI */
  getFleetSummary(): FleetSummary {
    const snapshots = this.listAgents();
    let online = 0;
    let threats_24h = 0;
    let events_total = 0;
    let atr_rules_active = 0;
    for (const s of snapshots) {
      if (s.online) online++;
      threats_24h += s.threats_24h;
      events_total += s.events_total;
      // Fleet rules-active is the max observed (rule files are bundled with each Guard build)
      // Fleet 規則啟用數取觀察到的最大值（規則檔案隨每個 Guard 構建打包）
      if (s.atr_rules_active > atr_rules_active) {
        atr_rules_active = s.atr_rules_active;
      }
    }
    return {
      agents_total: snapshots.length,
      agents_online: online,
      agents_offline: snapshots.length - online,
      threats_24h,
      events_total,
      atr_rules_active,
      generated_at: new Date(this.now()).toISOString(),
    };
  }

  /** List every known agent as snapshots / 以快照列出每個已知代理 */
  listAgents(): ReadonlyArray<AgentSnapshot> {
    return Array.from(this.state.entries()).map(([id, s]) => this.toSnapshot(id, s));
  }

  /** Remove an agent from the aggregator (when revoked) / 從聚合器移除代理（被撤銷時） */
  drop(agent_id: string): void {
    this.state.delete(agent_id);
  }

  // ---------------------------------------------------------------------------
  // Private helpers / 私有輔助函數
  // ---------------------------------------------------------------------------

  /** Heuristic: does a verdict count as a threat for the 24h rolling counter? / 啟發式：判定是否計為 24h 滾動威脅 */
  private isThreat(v: ThreatVerdict): boolean {
    const cls = (v as { classification?: string }).classification;
    const sev = (v as { severity?: string }).severity;
    if (cls === 'malicious' || cls === 'suspicious') return true;
    if (sev === 'high' || sev === 'critical') return true;
    return false;
  }

  /** Convert mutable AgentState to readonly AgentSnapshot / 把可變 AgentState 轉成唯讀 AgentSnapshot */
  private toSnapshot(agent_id: string, s: AgentState): AgentSnapshot {
    const nowMs = this.now();
    const online = s.last_seen_ms > 0 && nowMs - s.last_seen_ms <= this.onlineThresholdMs;
    const cutoff = nowMs - THREATS_WINDOW_MS;
    const threats_24h = s.threat_times_ms.filter((t) => t >= cutoff).length;
    return {
      agent_id,
      hostname: s.hostname,
      os_type: s.os_type,
      panguard_version: s.panguard_version,
      mode: s.mode,
      last_seen: s.last_seen_ms > 0 ? new Date(s.last_seen_ms).toISOString() : 'never',
      online,
      threats_24h,
      events_total: s.events_total,
      atr_rules_active: s.atr_rules_active,
      recent_events: s.events.slice(-50),
      recent_verdicts: s.verdicts.slice(-25),
    };
  }
}
