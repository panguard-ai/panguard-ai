/**
 * Migrator telemetry + crystallization analyzer.
 *
 * The "crystallization" pipeline surfaces detection rule fingerprints that
 * recur across multiple Migrator deployments, so an admin can decide whether
 * the rule pattern is worth contributing back to the public ATR repo.
 *
 * Privacy contract:
 *   - Migrator never sends rule bodies — only SHA-256 hashes of detection
 *     conditions plus per-rule metadata (atr_id, category, severity, etc).
 *   - install_id is a random UUID stored locally on each Migrator install.
 *   - This module never reconstructs rule bodies from telemetry. Crystallization
 *     candidates are surfaces only; publication requires explicit consent
 *     captured outside this module (typically a tenant admin opt-in flow).
 *
 * Auto-PR is intentionally NOT implemented here. Surfacing candidates is
 * automated; publishing them is a human gate.
 */

import type Database from 'better-sqlite3';

export interface MigratorTelemetryRule {
  readonly atr_id: string;
  readonly category: string;
  readonly severity: string;
  readonly has_agent_analogue: boolean;
  readonly condition_hash: string;
  readonly framework_count: number;
}

export interface MigratorTelemetryEvent {
  readonly install_id: string;
  readonly migrator_version: string;
  readonly source_kind: 'sigma' | 'yara' | 'mixed';
  readonly run_id?: string;
  readonly rules: readonly MigratorTelemetryRule[];
  readonly frameworks?: {
    readonly eu_ai_act_articles?: readonly string[];
    readonly owasp_agentic_ids?: readonly string[];
    readonly owasp_llm_ids?: readonly string[];
  };
}

export interface CrystallizationCandidate {
  readonly condition_hash: string;
  readonly tenant_count: number;
  readonly run_count: number;
  readonly atr_ids: readonly string[];
  readonly category: string;
  readonly severity: string;
  readonly has_agent_analogue: boolean;
  readonly avg_framework_count: number;
  readonly first_seen_at: string;
  readonly last_seen_at: string;
}

/**
 * Persist a single MigratorTelemetryEvent. One event yields N rows
 * (one per rule in the run).
 */
export function recordMigratorTelemetry(
  db: Database.Database,
  event: MigratorTelemetryEvent
): { rows_inserted: number } {
  const runId = event.run_id ?? `${event.install_id}-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO migrator_telemetry (
      install_id, migrator_version, source_kind, atr_id, category, severity,
      has_agent_analogue, condition_hash, framework_count,
      eu_articles, owasp_agentic_ids, owasp_llm_ids, run_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insert = db.transaction((rules: readonly MigratorTelemetryRule[]) => {
    let n = 0;
    for (const r of rules) {
      stmt.run(
        event.install_id,
        event.migrator_version,
        event.source_kind,
        r.atr_id,
        r.category,
        r.severity,
        r.has_agent_analogue ? 1 : 0,
        r.condition_hash,
        r.framework_count,
        JSON.stringify(event.frameworks?.eu_ai_act_articles ?? []),
        JSON.stringify(event.frameworks?.owasp_agentic_ids ?? []),
        JSON.stringify(event.frameworks?.owasp_llm_ids ?? []),
        runId
      );
      n += 1;
    }
    return n;
  });

  const rows_inserted = insert(event.rules);
  return { rows_inserted };
}

export interface CandidateQuery {
  readonly minTenantCount?: number;
  readonly windowDays?: number;
  readonly limit?: number;
}

/**
 * Surface fingerprints that recur across N+ tenants. Rule body is NOT
 * available here — only metadata. Admin uses these to identify which
 * Migrator-derived rules are most replicated across deployments and
 * therefore most valuable to crystallize back into ATR mainline.
 */
export function findCrystallizationCandidates(
  db: Database.Database,
  query: CandidateQuery = {}
): readonly CrystallizationCandidate[] {
  const minTenants = query.minTenantCount ?? 3;
  const windowDays = query.windowDays ?? 30;
  const limit = query.limit ?? 100;

  const rows = db
    .prepare(
      `SELECT
         condition_hash,
         COUNT(DISTINCT install_id) AS tenant_count,
         COUNT(DISTINCT run_id) AS run_count,
         GROUP_CONCAT(DISTINCT atr_id) AS atr_ids,
         MIN(category) AS category,
         MIN(severity) AS severity,
         MAX(has_agent_analogue) AS has_agent_analogue,
         AVG(framework_count) AS avg_framework_count,
         MIN(created_at) AS first_seen_at,
         MAX(created_at) AS last_seen_at
       FROM migrator_telemetry
       WHERE created_at > datetime('now', ?)
       GROUP BY condition_hash
       HAVING tenant_count >= ?
       ORDER BY tenant_count DESC, run_count DESC
       LIMIT ?`
    )
    .all(`-${windowDays} days`, minTenants, limit) as Array<{
    condition_hash: string;
    tenant_count: number;
    run_count: number;
    atr_ids: string;
    category: string;
    severity: string;
    has_agent_analogue: number;
    avg_framework_count: number;
    first_seen_at: string;
    last_seen_at: string;
  }>;

  return rows.map((r) => ({
    condition_hash: r.condition_hash,
    tenant_count: r.tenant_count,
    run_count: r.run_count,
    atr_ids: r.atr_ids ? r.atr_ids.split(',') : [],
    category: r.category,
    severity: r.severity,
    has_agent_analogue: r.has_agent_analogue === 1,
    avg_framework_count: Math.round(r.avg_framework_count * 10) / 10,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
  }));
}

export interface MigratorTelemetryStats {
  readonly total_events: number;
  readonly unique_installs: number;
  readonly unique_atr_ids: number;
  readonly events_last_24h: number;
  readonly by_severity: Readonly<Record<string, number>>;
  readonly by_category: Readonly<Record<string, number>>;
}

export function getMigratorTelemetryStats(db: Database.Database): MigratorTelemetryStats {
  const total = (
    db.prepare('SELECT COUNT(*) AS c FROM migrator_telemetry').get() as { c: number }
  ).c;
  const installs = (
    db.prepare('SELECT COUNT(DISTINCT install_id) AS c FROM migrator_telemetry').get() as {
      c: number;
    }
  ).c;
  const atrIds = (
    db.prepare('SELECT COUNT(DISTINCT atr_id) AS c FROM migrator_telemetry').get() as {
      c: number;
    }
  ).c;
  const last24h = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM migrator_telemetry WHERE created_at > datetime('now', '-1 day')`
      )
      .get() as { c: number }
  ).c;
  const bySeverity = db
    .prepare(`SELECT severity, COUNT(*) AS c FROM migrator_telemetry GROUP BY severity`)
    .all() as Array<{ severity: string; c: number }>;
  const byCategory = db
    .prepare(`SELECT category, COUNT(*) AS c FROM migrator_telemetry GROUP BY category`)
    .all() as Array<{ category: string; c: number }>;

  return {
    total_events: total,
    unique_installs: installs,
    unique_atr_ids: atrIds,
    events_last_24h: last24h,
    by_severity: Object.fromEntries(bySeverity.map((r) => [r.severity, r.c])),
    by_category: Object.fromEntries(byCategory.map((r) => [r.category, r.c])),
  };
}
