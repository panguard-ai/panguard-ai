/**
 * Tests for telemetry-related methods in ThreatCloudDB
 * packages/threat-cloud/src/database.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreatCloudDB } from '../src/database.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('ThreatCloudDB Telemetry', () => {
  let db: ThreatCloudDB;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tc-telemetry-test-'));
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

  describe('recordTelemetryEvent', () => {
    it('inserts a record correctly', () => {
      db.recordTelemetryEvent({
        eventType: 'scan',
        platform: 'claude-code',
        skillCount: 5,
        findingCount: 3,
        severity: 'HIGH',
      });

      const stats = db.getTelemetryStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.byEventType['scan']).toBe(1);
      expect(stats.byPlatform['claude-code']).toBe(1);
    });
  });

  describe('getTelemetryStats', () => {
    it('returns correct counts', () => {
      db.recordTelemetryEvent({
        eventType: 'scan',
        platform: 'claude-code',
        skillCount: 5,
        findingCount: 3,
        severity: 'HIGH',
      });
      db.recordTelemetryEvent({
        eventType: 'scan',
        platform: 'cursor',
        skillCount: 2,
        findingCount: 1,
        severity: 'LOW',
      });
      db.recordTelemetryEvent({
        eventType: 'audit',
        platform: 'claude-code',
        skillCount: 10,
        findingCount: 7,
        severity: 'CRITICAL',
      });

      const stats = db.getTelemetryStats();
      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsToday).toBe(3);
      expect(stats.byEventType['scan']).toBe(2);
      expect(stats.byEventType['audit']).toBe(1);
      expect(stats.byPlatform['claude-code']).toBe(2);
      expect(stats.byPlatform['cursor']).toBe(1);
      expect(stats.avgFindingCount).toBeCloseTo(3.667, 1);
    });

    it('merges raw + aggregated data', () => {
      // Insert an event directly into hourly_aggregates to simulate prior aggregation
      // Access the internal db via a workaround: insert raw events with old timestamps,
      // then run cleanup to aggregate them, then add fresh events.

      // We cannot easily backdate timestamps with the public API, so instead we use
      // the DB object through recordTelemetryEvent + direct SQL for old data.
      // The getTelemetryStats merges both tables.

      // Insert fresh raw event
      db.recordTelemetryEvent({
        eventType: 'scan',
        platform: 'claude-code',
        skillCount: 1,
        findingCount: 1,
        severity: 'LOW',
      });

      // Manually insert into hourly_aggregates to simulate aggregated old data
      (db as any).db.exec(`
        INSERT INTO telemetry_hourly_aggregates
          (hour_bucket, event_type, platform, event_count, total_findings, total_skills, avg_severity)
        VALUES
          ('2026-03-26T10:00:00', 'scan', 'claude-code', 10, 20, 30, 'MEDIUM')
      `);

      const stats = db.getTelemetryStats();
      // 1 raw + 10 aggregated = 11 total
      expect(stats.totalEvents).toBe(11);
      // byEventType merges both: 1 raw scan + 10 agg scan = 11
      expect(stats.byEventType['scan']).toBe(11);
      // byPlatform merges both: 1 raw claude-code + 10 agg claude-code = 11
      expect(stats.byPlatform['claude-code']).toBe(11);
    });
  });

  describe('cleanupTelemetryEvents', () => {
    it('aggregates before deleting and returns correct deletion count', () => {
      // Insert events with old timestamps by going through the internal DB directly
      const internalDb = (db as any).db;

      // Insert 3 events dated > 24h ago
      internalDb
        .prepare(
          `INSERT INTO telemetry_events (event_type, platform, skill_count, finding_count, severity, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '-48 hours'))`
        )
        .run('scan', 'claude-code', 5, 3, 'HIGH');
      internalDb
        .prepare(
          `INSERT INTO telemetry_events (event_type, platform, skill_count, finding_count, severity, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '-48 hours'))`
        )
        .run('scan', 'claude-code', 2, 1, 'LOW');
      internalDb
        .prepare(
          `INSERT INTO telemetry_events (event_type, platform, skill_count, finding_count, severity, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now', '-48 hours'))`
        )
        .run('audit', 'cursor', 10, 7, 'CRITICAL');

      // Insert 1 recent event (should not be deleted)
      db.recordTelemetryEvent({
        eventType: 'scan',
        platform: 'cursor',
        skillCount: 1,
        findingCount: 0,
        severity: 'LOW',
      });

      const deleted = db.cleanupTelemetryEvents();
      expect(deleted).toBe(3);

      // Verify aggregates were created
      const aggRows = internalDb
        .prepare('SELECT * FROM telemetry_hourly_aggregates')
        .all() as Array<{ event_type: string; platform: string; event_count: number }>;
      expect(aggRows.length).toBeGreaterThanOrEqual(2); // scan/claude-code + audit/cursor

      // Recent event still exists
      const rawCount = (
        internalDb.prepare('SELECT COUNT(*) as count FROM telemetry_events').get() as {
          count: number;
        }
      ).count;
      expect(rawCount).toBe(1);
    });

    it('preserves hourly aggregates', () => {
      const internalDb = (db as any).db;

      // Pre-existing aggregate
      internalDb.exec(`
        INSERT INTO telemetry_hourly_aggregates
          (hour_bucket, event_type, platform, event_count, total_findings, total_skills, avg_severity)
        VALUES
          ('2026-03-25T10:00:00', 'scan', 'claude-code', 5, 10, 15, 'MEDIUM')
      `);

      // Running cleanup with no old raw events should not destroy existing aggregates
      const deleted = db.cleanupTelemetryEvents();
      expect(deleted).toBe(0);

      const aggRows = internalDb
        .prepare('SELECT * FROM telemetry_hourly_aggregates')
        .all() as Array<{ event_count: number }>;
      expect(aggRows.length).toBe(1);
      expect(aggRows[0].event_count).toBe(5);
    });
  });

  describe('telemetry_hourly_aggregates UPSERT', () => {
    it('running cleanup twice merges counts correctly', () => {
      const internalDb = (db as any).db;

      // Insert old events in the same hour bucket and group
      const insertOld = internalDb.prepare(
        `INSERT INTO telemetry_events (event_type, platform, skill_count, finding_count, severity, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      // Batch 1: 2 events at a specific old hour
      insertOld.run('scan', 'claude-code', 5, 3, 'HIGH', '2026-03-25T10:30:00');
      insertOld.run('scan', 'claude-code', 2, 1, 'LOW', '2026-03-25T10:45:00');

      // First cleanup: aggregates 2 events into hour bucket 2026-03-25T10:00:00
      db.cleanupTelemetryEvents();

      const afterFirst = internalDb
        .prepare(
          "SELECT event_count, total_findings, total_skills FROM telemetry_hourly_aggregates WHERE hour_bucket = '2026-03-25T10:00:00'"
        )
        .get() as { event_count: number; total_findings: number; total_skills: number };
      expect(afterFirst.event_count).toBe(2);
      expect(afterFirst.total_findings).toBe(4);
      expect(afterFirst.total_skills).toBe(7);

      // Batch 2: 3 more events in the same hour bucket
      insertOld.run('scan', 'claude-code', 1, 2, 'MEDIUM', '2026-03-25T10:15:00');
      insertOld.run('scan', 'claude-code', 3, 4, 'HIGH', '2026-03-25T10:50:00');
      insertOld.run('scan', 'claude-code', 0, 0, 'LOW', '2026-03-25T10:05:00');

      // Second cleanup: should UPSERT (merge) into existing aggregate
      db.cleanupTelemetryEvents();

      const afterSecond = internalDb
        .prepare(
          "SELECT event_count, total_findings, total_skills FROM telemetry_hourly_aggregates WHERE hour_bucket = '2026-03-25T10:00:00'"
        )
        .get() as { event_count: number; total_findings: number; total_skills: number };
      // 2 (from first) + 3 (from second) = 5
      expect(afterSecond.event_count).toBe(5);
      // 4 (from first) + 6 (from second) = 10
      expect(afterSecond.total_findings).toBe(10);
      // 7 (from first) + 4 (from second) = 11
      expect(afterSecond.total_skills).toBe(11);
    });
  });
});
