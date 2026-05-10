/**
 * Types mirroring the Supabase schema defined in /supabase/migrations/.
 *
 * Canonical sources:
 *   supabase/migrations/20260422000001_initial.sql   (workspaces / members / api_keys / device_codes / reports / audit_log)
 *   supabase/migrations/20260422000004_events.sql    (endpoints / events + summary helpers)
 *   supabase/migrations/20260422000005_device_pending.sql  (device_codes.pending_plaintext)
 *
 * Regenerate via `supabase gen types typescript` once a Supabase project is
 * linked, but until then keep this file hand-edited to match the SQL above.
 */

export type Role = 'admin' | 'analyst' | 'auditor' | 'readonly';

export type Tier = 'community' | 'pilot' | 'enterprise';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReportFramework =
  | 'owasp-agentic'
  | 'owasp-llm'
  | 'eu-ai-act'
  | 'colorado-ai-act'
  | 'nist-ai-rmf'
  | 'iso-42001';

export type ReportFormat = 'md' | 'json' | 'pdf';

export type EventType =
  | 'scan.rule_match'
  | 'scan.completed'
  | 'guard.blocked'
  | 'guard.flagged'
  | 'trap.triggered'
  | 'respond.action';

// ─── Row types ───────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  tier: Tier;
  tier_expires_at: string | null;
  tc_api_key_hash: string | null;
  /**
   * UUID matching tc.panguard.ai `orgs.id`. Used to correlate paid-tier events
   * (stored in Supabase `events` table) with anonymous Community telemetry
   * (stored in TC SQLite). Populated by scripts/provision-workspace.ts.
   */
  tc_org_id: string | null;
  tc_client_key_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: Role;
  invited_at: string;
  accepted_at: string | null;
}

export interface ApiKey {
  id: string;
  workspace_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface DeviceCode {
  id: string;
  user_code: string;
  device_code: string;
  user_id: string | null;
  workspace_id: string | null;
  scope: string;
  expires_at: string;
  approved_at: string | null;
  issued_api_key_id: string | null;
  polling_interval_s: number;
  pending_plaintext: string | null;
  created_at: string;
}

export interface Endpoint {
  id: string;
  workspace_id: string;
  machine_id: string;
  hostname: string | null;
  os_type: string | null;
  panguard_version: string | null;
  first_seen_at: string;
  last_seen_at: string;
  metadata: Record<string, unknown>;
}

export interface SecurityEvent {
  id: string;
  workspace_id: string;
  endpoint_id: string | null;
  event_type: EventType;
  severity: Severity;
  rule_id: string | null;
  target: string;
  target_hash: string | null;
  payload_summary: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  ingested_at: string;
}

export interface Report {
  id: string;
  workspace_id: string;
  framework: ReportFramework;
  format: ReportFormat;
  org_name: string;
  sha256: string;
  hmac_sha256: string | null;
  storage_path: string | null;
  size_bytes: number | null;
  rules_loaded: number | null;
  rules_mapped: number | null;
  total_mappings: number | null;
  generated_by: string | null;
  generated_at: string;
}

export interface AuditLogRow {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  occurred_at: string;
}

// ─── Database<> generic for Supabase client ──────────────────────────────────

type InsertOf<T, Opt extends keyof T> = Omit<T, Opt> & Partial<Pick<T, Opt>>;

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: InsertOf<
          Workspace,
          | 'id'
          | 'created_at'
          | 'updated_at'
          | 'tier'
          | 'tier_expires_at'
          | 'tc_api_key_hash'
          | 'tc_org_id'
          | 'tc_client_key_hash'
        >;
        Update: Partial<Workspace>;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: InsertOf<WorkspaceMember, 'invited_at' | 'accepted_at'>;
        Update: Partial<WorkspaceMember>;
        Relationships: [];
      };
      api_keys: {
        Row: ApiKey;
        Insert: InsertOf<ApiKey, 'id' | 'created_at' | 'last_used_at' | 'revoked_at'>;
        Update: Partial<ApiKey>;
        Relationships: [];
      };
      device_codes: {
        Row: DeviceCode;
        Insert: InsertOf<
          DeviceCode,
          | 'id'
          | 'created_at'
          | 'scope'
          | 'polling_interval_s'
          | 'approved_at'
          | 'issued_api_key_id'
          | 'pending_plaintext'
          | 'user_id'
          | 'workspace_id'
        >;
        Update: Partial<DeviceCode>;
        Relationships: [];
      };
      endpoints: {
        Row: Endpoint;
        Insert: InsertOf<Endpoint, 'id' | 'first_seen_at' | 'last_seen_at' | 'metadata'>;
        Update: Partial<Endpoint>;
        Relationships: [];
      };
      events: {
        Row: SecurityEvent;
        Insert: InsertOf<
          SecurityEvent,
          | 'id'
          | 'occurred_at'
          | 'ingested_at'
          | 'metadata'
          | 'rule_id'
          | 'target_hash'
          | 'payload_summary'
          | 'endpoint_id'
        >;
        Update: Partial<SecurityEvent>;
        Relationships: [];
      };
      reports: {
        Row: Report;
        Insert: InsertOf<
          Report,
          | 'id'
          | 'generated_at'
          | 'hmac_sha256'
          | 'storage_path'
          | 'size_bytes'
          | 'rules_loaded'
          | 'rules_mapped'
          | 'total_mappings'
        >;
        Update: Partial<Report>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: InsertOf<
          AuditLogRow,
          | 'id'
          | 'occurred_at'
          | 'metadata'
          | 'target_type'
          | 'target_id'
          | 'ip_address'
          | 'user_agent'
          | 'user_id'
          | 'workspace_id'
        >;
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
    };
    Views: {
      events_with_endpoint: {
        Row: SecurityEvent & {
          endpoint_machine_id: string | null;
          endpoint_hostname: string | null;
          endpoint_os_type: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_workspace: {
        Args: { p_name: string; p_slug: string };
        Returns: Workspace;
      };
      workspace_event_summary: {
        Args: { p_workspace_id: string; p_days?: number };
        Returns: {
          total_events: number;
          critical_count: number;
          high_count: number;
          unique_rules: number;
          unique_endpoints: number;
          last_event_at: string | null;
        }[];
      };
      is_workspace_member: {
        Args: { p_workspace_id: string; p_min_role?: Role };
        Returns: boolean;
      };
      upsert_endpoint: {
        Args: {
          p_workspace_id: string;
          p_machine_id: string;
          p_hostname: string | null;
          p_os_type: string | null;
          p_panguard_version: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Dashboard-view derived types ────────────────────────────────────────────

export interface EventListRow extends SecurityEvent {
  endpoint_machine_id: string | null;
  endpoint_hostname: string | null;
  endpoint_os_type: string | null;
}

export interface PaginatedEvents {
  rows: ReadonlyArray<EventListRow>;
  total: number;
  page: number;
  pageSize: number;
}
