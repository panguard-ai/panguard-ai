/**
 * Shared types for PanGuard Manager / PanGuard Manager 共用型別
 *
 * @module @panguard-ai/panguard-manager/types
 */

import type { DashboardEvent, ThreatVerdict } from '@panguard-ai/panguard-guard';

/** Persisted record for a registered Guard agent / 已註冊 Guard 代理的持久化記錄 */
export interface AgentRecord {
  readonly agent_id: string;
  readonly token: string;
  readonly hostname: string;
  readonly os_type: string;
  readonly panguard_version: string;
  readonly machine_id: string;
  readonly registered_at: string;
  readonly revoked: boolean;
  readonly last_seen?: string;
}

/** In-memory snapshot describing one Guard's current state / 描述某個 Guard 當前狀態的記憶體快照 */
export interface AgentSnapshot {
  readonly agent_id: string;
  readonly hostname: string;
  readonly os_type: string;
  readonly panguard_version: string;
  readonly mode: 'learning' | 'protection' | 'unknown';
  readonly last_seen: string;
  readonly online: boolean;
  readonly threats_24h: number;
  readonly events_total: number;
  readonly atr_rules_active: number;
  readonly recent_events: ReadonlyArray<DashboardEvent>;
  readonly recent_verdicts: ReadonlyArray<ThreatVerdict>;
}

/** Aggregate KPIs across the entire fleet / 整個 fleet 的彙總 KPI */
export interface FleetSummary {
  readonly agents_total: number;
  readonly agents_online: number;
  readonly agents_offline: number;
  readonly threats_24h: number;
  readonly events_total: number;
  readonly atr_rules_active: number;
  readonly generated_at: string;
}

/** Body posted by a Guard relay-client per relay event / Guard relay-client 每筆 relay 事件 POST 的請求體 */
export interface RelayEventBody {
  readonly agent_id: string;
  readonly event?: Readonly<DashboardEvent>;
  readonly threat_verdict?: Readonly<ThreatVerdict>;
  readonly status?: Readonly<{
    mode?: 'learning' | 'protection';
    events_processed?: number;
    threats_detected?: number;
    atr_rule_count?: number;
  }>;
}

/** Body posted to register a new Guard / 註冊新 Guard 的 POST 請求體 */
export interface RegisterBody {
  readonly hostname: string;
  readonly os_type: string;
  readonly panguard_version: string;
  readonly machine_id: string;
}

/** Standard PanGuard JSON envelope / 標準 PanGuard JSON 信封 */
export interface ApiResponse<T> {
  readonly ok: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly request_id: string;
}
