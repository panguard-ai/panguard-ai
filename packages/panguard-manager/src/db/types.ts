/**
 * Row types for direct DB queries. These mirror the on-disk schema and are
 * deliberately separated from the public domain types in `../types.ts` so
 * future schema rewrites don't ripple into API contracts.
 *
 * @module @panguard-ai/panguard-manager/db/types
 */

/** Row shape of the `agents` table / `agents` 表的列形狀 */
export interface AgentRow {
  agent_id: string;
  token: string;
  hostname: string;
  os_type: string;
  panguard_version: string;
  machine_id: string;
  registered_at: string;
  last_seen: string | null;
  revoked: number;
  revoked_at: string | null;
}

/** Row shape of the `operators` table / `operators` 表的列形狀 */
export interface OperatorRow {
  id: number;
  username: string;
  password_hash: string;
  password_salt: string;
  role: 'admin' | 'viewer';
  created_at: string;
  last_login_at: string | null;
  disabled: number;
}

/** Row shape of the `operator_sessions` table / `operator_sessions` 表的列形狀 */
export interface OperatorSessionRow {
  token_hash: string;
  operator_id: number;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

/** Row shape of the `enrollment_tokens` table / `enrollment_tokens` 表的列形狀 */
export interface EnrollmentTokenRow {
  token_hash: string;
  description: string | null;
  created_by_operator_id: number;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_agent_id: string | null;
  revoked_at: string | null;
}

/** Kinds of payloads persisted in the `agent_events` table / `agent_events` 表持久化的承載類型 */
export type AgentEventKind = 'event' | 'verdict' | 'status';

/** Row shape of the `agent_events` table / `agent_events` 表的列形狀 */
export interface AgentEventRow {
  id: number;
  agent_id: string;
  kind: AgentEventKind;
  payload_json: string;
  observed_at: string;
  is_threat: number;
}
