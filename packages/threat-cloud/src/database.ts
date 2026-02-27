/**
 * SQLite database layer for Threat Cloud
 * 威脅雲 SQLite 資料庫層
 *
 * Stores anonymized threat data and community rules using better-sqlite3.
 *
 * @module @panguard-ai/threat-cloud/database
 */

import Database from 'better-sqlite3';
import type { AnonymizedThreatData, ThreatCloudRule, ThreatStats } from './types.js';

/**
 * Threat Cloud database backed by SQLite
 * 基於 SQLite 的威脅雲資料庫
 */
export class ThreatCloudDB {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  /** Create tables if they don't exist / 建立資料表 */
  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS threats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attack_source_ip TEXT NOT NULL,
        attack_type TEXT NOT NULL,
        mitre_technique TEXT NOT NULL,
        sigma_rule_matched TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        industry TEXT,
        region TEXT NOT NULL,
        received_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS rules (
        rule_id TEXT PRIMARY KEY,
        rule_content TEXT NOT NULL,
        published_at TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_threats_timestamp ON threats(timestamp);
      CREATE INDEX IF NOT EXISTS idx_threats_attack_type ON threats(attack_type);
      CREATE INDEX IF NOT EXISTS idx_threats_mitre ON threats(mitre_technique);
      CREATE INDEX IF NOT EXISTS idx_rules_published ON rules(published_at);
    `);
  }

  /** Insert anonymized threat data / 插入匿名化威脅數據 */
  insertThreat(data: AnonymizedThreatData): void {
    const stmt = this.db.prepare(`
      INSERT INTO threats (attack_source_ip, attack_type, mitre_technique, sigma_rule_matched, timestamp, industry, region)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.attackSourceIP,
      data.attackType,
      data.mitreTechnique,
      data.sigmaRuleMatched,
      data.timestamp,
      data.industry ?? null,
      data.region,
    );
  }

  /** Insert or update a community rule / 插入或更新社群規則 */
  upsertRule(rule: ThreatCloudRule): void {
    const stmt = this.db.prepare(`
      INSERT INTO rules (rule_id, rule_content, published_at, source)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(rule_id) DO UPDATE SET
        rule_content = excluded.rule_content,
        published_at = excluded.published_at,
        source = excluded.source,
        updated_at = datetime('now')
    `);
    stmt.run(rule.ruleId, rule.ruleContent, rule.publishedAt, rule.source);
  }

  /** Fetch rules published after a given timestamp / 取得指定時間後發佈的規則 */
  getRulesSince(since: string): ThreatCloudRule[] {
    const stmt = this.db.prepare(`
      SELECT rule_id as ruleId, rule_content as ruleContent, published_at as publishedAt, source
      FROM rules
      WHERE published_at > ?
      ORDER BY published_at ASC
    `);
    return stmt.all(since) as ThreatCloudRule[];
  }

  /** Fetch all rules / 取得所有規則 */
  getAllRules(): ThreatCloudRule[] {
    const stmt = this.db.prepare(`
      SELECT rule_id as ruleId, rule_content as ruleContent, published_at as publishedAt, source
      FROM rules
      ORDER BY published_at DESC
    `);
    return stmt.all() as ThreatCloudRule[];
  }

  /** Get threat statistics / 取得威脅統計 */
  getStats(): ThreatStats {
    const totalThreats = (this.db.prepare('SELECT COUNT(*) as count FROM threats').get() as { count: number }).count;
    const totalRules = (this.db.prepare('SELECT COUNT(*) as count FROM rules').get() as { count: number }).count;

    const last24h = (this.db.prepare(
      "SELECT COUNT(*) as count FROM threats WHERE received_at > datetime('now', '-1 day')"
    ).get() as { count: number }).count;

    const topAttackTypes = this.db.prepare(`
      SELECT attack_type as type, COUNT(*) as count
      FROM threats
      GROUP BY attack_type
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ type: string; count: number }>;

    const topMitreTechniques = this.db.prepare(`
      SELECT mitre_technique as technique, COUNT(*) as count
      FROM threats
      GROUP BY mitre_technique
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ technique: string; count: number }>;

    return {
      totalThreats,
      totalRules,
      topAttackTypes,
      topMitreTechniques,
      last24hThreats: last24h,
    };
  }

  /** Close the database / 關閉資料庫 */
  close(): void {
    this.db.close();
  }
}
