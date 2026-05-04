/**
 * Migrator crystallization analyzer tests.
 *
 * Covers:
 *   - recordMigratorTelemetry inserts one row per rule
 *   - findCrystallizationCandidates respects N-tenant threshold
 *   - findCrystallizationCandidates respects window
 *   - getMigratorTelemetryStats aggregates correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreatCloudDB } from '../src/database.js';
import {
  recordMigratorTelemetry,
  findCrystallizationCandidates,
  getMigratorTelemetryStats,
  type MigratorTelemetryEvent,
} from '../src/migrator-crystallization.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

let tempDir: string;
let db: ThreatCloudDB;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mig-crystal-test-'));
  db = new ThreatCloudDB(join(tempDir, 'test.db'));
});

afterEach(() => {
  db.close();
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

function ev(install_id: string, hashes: string[], runId?: string): MigratorTelemetryEvent {
  return {
    install_id,
    migrator_version: '0.0.1',
    source_kind: 'sigma',
    ...(runId !== undefined ? { run_id: runId } : {}),
    rules: hashes.map((h) => ({
      // Derive atr_id from condition_hash so the same hash always maps to
      // the same atr_id across tenants (matches real Migrator behavior:
      // identical Sigma rules produce identical ATR ids).
      atr_id: `ATR-2026-${h.replace(/[^0-9]/g, '').padStart(5, '0').slice(0, 5) || '00000'}`,
      category: 'tool-poisoning',
      severity: 'high',
      has_agent_analogue: true,
      condition_hash: h,
      framework_count: 4,
    })),
  };
}

describe('recordMigratorTelemetry', () => {
  it('inserts one row per rule', () => {
    const result = recordMigratorTelemetry(
      db.getRawDb(),
      ev('install-A', ['hash-1', 'hash-2', 'hash-3'])
    );
    expect(result.rows_inserted).toBe(3);
  });

  it('persists install_id and condition_hash for later querying', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['1234']));
    const row = db
      .getRawDb()
      .prepare('SELECT install_id, condition_hash FROM migrator_telemetry WHERE atr_id = ?')
      .get('ATR-2026-01234') as { install_id: string; condition_hash: string };
    expect(row.install_id).toBe('install-A');
    expect(row.condition_hash).toBe('1234');
  });
});

describe('findCrystallizationCandidates', () => {
  it('returns empty when no rows', () => {
    const candidates = findCrystallizationCandidates(db.getRawDb());
    expect(candidates).toEqual([]);
  });

  it('returns empty when fingerprint appears in only 1 tenant (default minTenants=3)', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['hash-1']));
    const candidates = findCrystallizationCandidates(db.getRawDb());
    expect(candidates).toEqual([]);
  });

  it('returns empty when fingerprint appears in 2 tenants (below default threshold)', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['hash-1']));
    recordMigratorTelemetry(db.getRawDb(), ev('install-B', ['hash-1']));
    const candidates = findCrystallizationCandidates(db.getRawDb());
    expect(candidates).toEqual([]);
  });

  it('returns candidate when fingerprint hits 3+ distinct tenants', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['hash-x']));
    recordMigratorTelemetry(db.getRawDb(), ev('install-B', ['hash-x']));
    recordMigratorTelemetry(db.getRawDb(), ev('install-C', ['hash-x']));
    const candidates = findCrystallizationCandidates(db.getRawDb());
    expect(candidates.length).toBe(1);
    expect(candidates[0]!.condition_hash).toBe('hash-x');
    expect(candidates[0]!.tenant_count).toBe(3);
  });

  it('counts distinct install_ids only (same tenant repeating ≠ multiple tenants)', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['hash-x'], 'run-1'));
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['hash-x'], 'run-2'));
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['hash-x'], 'run-3'));
    const candidates = findCrystallizationCandidates(db.getRawDb());
    expect(candidates).toEqual([]);
  });

  it('respects custom minTenantCount', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['hash-x']));
    recordMigratorTelemetry(db.getRawDb(), ev('install-B', ['hash-x']));
    const candidates = findCrystallizationCandidates(db.getRawDb(), { minTenantCount: 2 });
    expect(candidates.length).toBe(1);
  });

  it('orders candidates by tenant_count desc', () => {
    // hash-popular: 4 tenants
    for (const i of ['A', 'B', 'C', 'D']) {
      recordMigratorTelemetry(db.getRawDb(), ev(`install-${i}`, ['hash-popular']));
    }
    // hash-also: 3 tenants
    for (const i of ['E', 'F', 'G']) {
      recordMigratorTelemetry(db.getRawDb(), ev(`install-${i}`, ['hash-also']));
    }
    const candidates = findCrystallizationCandidates(db.getRawDb());
    expect(candidates.length).toBe(2);
    expect(candidates[0]!.condition_hash).toBe('hash-popular');
    expect(candidates[0]!.tenant_count).toBe(4);
    expect(candidates[1]!.condition_hash).toBe('hash-also');
    expect(candidates[1]!.tenant_count).toBe(3);
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      const hash = `hash-${i}`;
      recordMigratorTelemetry(db.getRawDb(), ev('install-A', [hash]));
      recordMigratorTelemetry(db.getRawDb(), ev('install-B', [hash]));
      recordMigratorTelemetry(db.getRawDb(), ev('install-C', [hash]));
    }
    const candidates = findCrystallizationCandidates(db.getRawDb(), { limit: 3 });
    expect(candidates.length).toBe(3);
  });
});

describe('getMigratorTelemetryStats', () => {
  it('returns zero stats on empty DB', () => {
    const stats = getMigratorTelemetryStats(db.getRawDb());
    expect(stats.total_events).toBe(0);
    expect(stats.unique_installs).toBe(0);
    expect(stats.unique_atr_ids).toBe(0);
  });

  it('aggregates across multiple installs', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['h1', 'h2']));
    recordMigratorTelemetry(db.getRawDb(), ev('install-B', ['h3']));
    const stats = getMigratorTelemetryStats(db.getRawDb());
    expect(stats.total_events).toBe(3);
    expect(stats.unique_installs).toBe(2);
    expect(stats.unique_atr_ids).toBe(3);
  });

  it('reports by_severity breakdown', () => {
    recordMigratorTelemetry(db.getRawDb(), ev('install-A', ['h1']));
    const stats = getMigratorTelemetryStats(db.getRawDb());
    expect(stats.by_severity['high']).toBe(1);
  });
});
