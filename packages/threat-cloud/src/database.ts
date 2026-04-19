/**
 * SQLite database layer for Threat Cloud
 * 威脅雲 SQLite 資料庫層
 *
 * Stores anonymized threat data and community rules using better-sqlite3.
 *
 * @module @panguard-ai/threat-cloud/database
 */

import Database from 'better-sqlite3';
import { createHmac, createHash, randomUUID } from 'node:crypto';
import type {
  AnonymizedThreatData,
  ThreatCloudRule,
  ThreatStats,
  ATRProposal,
  SkillThreatSubmission,
  SkillBlacklistEntry,
  ScanEvent,
  AggregatedMetrics,
} from './types.js';
import { runMigrations } from './migrations.js';
import { AuditLogger } from './audit-logger.js';

/**
 * Threat Cloud database backed by SQLite
 * 基於 SQLite 的威脅雲資料庫
 */
export class ThreatCloudDB {
  private readonly db: Database.Database;
  readonly audit: AuditLogger;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
    this.audit = new AuditLogger(this.db);
  }

  /** Create tables if they don't exist / 建立資料表 */
  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS threats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attack_source_ip TEXT NOT NULL,
        attack_type TEXT NOT NULL,
        mitre_technique TEXT NOT NULL,
        sigma_rule_matched TEXT NOT NULL, -- legacy column name, now stores ATR rule ID
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
        category TEXT,
        severity TEXT,
        mitre_techniques TEXT,
        tags TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_threats_timestamp ON threats(timestamp);
      CREATE INDEX IF NOT EXISTS idx_threats_attack_type ON threats(attack_type);
      CREATE INDEX IF NOT EXISTS idx_threats_mitre ON threats(mitre_technique);
      CREATE INDEX IF NOT EXISTS idx_rules_published ON rules(published_at);

      CREATE TABLE IF NOT EXISTS atr_proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_hash TEXT NOT NULL,
        rule_content TEXT NOT NULL,
        llm_provider TEXT NOT NULL,
        llm_model TEXT NOT NULL,
        self_review_verdict TEXT NOT NULL,
        client_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        confirmations INTEGER NOT NULL DEFAULT 0,
        llm_review_verdict TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS atr_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id TEXT NOT NULL,
        is_true_positive INTEGER NOT NULL,
        client_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS skill_threats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_hash TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        finding_summaries TEXT,
        client_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ioc_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        value TEXT NOT NULL UNIQUE,
        reputation INTEGER NOT NULL DEFAULT 50,
        source TEXT,
        first_seen TEXT DEFAULT (datetime('now')),
        last_seen TEXT DEFAULT (datetime('now')),
        sighting_count INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS skill_whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL UNIQUE,
        fingerprint_hash TEXT,
        confirmations INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        first_reported TEXT DEFAULT (datetime('now')),
        last_reported TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS usage_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'unknown',
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at);

      CREATE TABLE IF NOT EXISTS telemetry_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'unknown',
        skill_count INTEGER NOT NULL DEFAULT 0,
        finding_count INTEGER NOT NULL DEFAULT 0,
        severity TEXT NOT NULL DEFAULT 'LOW',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at);

      CREATE TABLE IF NOT EXISTS telemetry_hourly_aggregates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hour_bucket TEXT NOT NULL,
        event_type TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'unknown',
        event_count INTEGER NOT NULL DEFAULT 0,
        total_findings INTEGER NOT NULL DEFAULT 0,
        total_skills INTEGER NOT NULL DEFAULT 0,
        avg_severity TEXT NOT NULL DEFAULT 'LOW',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_hourly_unique
        ON telemetry_hourly_aggregates(hour_bucket, event_type, platform);

      CREATE TABLE IF NOT EXISTS activations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL DEFAULT 'unknown',
        os_type TEXT NOT NULL DEFAULT 'unknown',
        panguard_version TEXT NOT NULL DEFAULT 'unknown',
        node_version TEXT NOT NULL DEFAULT 'unknown',
        activated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Migrations are handled by the numbered migration system in migrations.ts

      -- Org/Device/Policy tables (migration v8, duplicated here as safety net
      -- because CREATE TABLE IF NOT EXISTS is idempotent)
      CREATE TABLE IF NOT EXISTS orgs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_key_hash TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES orgs(id),
        hostname TEXT,
        os_type TEXT,
        agent_count INTEGER NOT NULL DEFAULT 0,
        guard_version TEXT,
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_devices_org ON devices(org_id);
      CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
      CREATE TABLE IF NOT EXISTS org_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL REFERENCES orgs(id),
        category TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('allow', 'block')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(org_id, category)
      );
    `);

    try {
      const applied = runMigrations(this.db);
      if (applied > 0) {
        console.log(`[threat-cloud] ${applied} migration(s) applied`);
      }
    } catch (err) {
      console.error(
        '[threat-cloud] MIGRATION FAILED:',
        err instanceof Error ? err.message : String(err)
      );
      // Re-throw — migrations failing means the DB is in a broken state
      throw err;
    }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category);
      CREATE INDEX IF NOT EXISTS idx_rules_severity ON rules(severity);
      CREATE INDEX IF NOT EXISTS idx_rules_source ON rules(source);
      CREATE INDEX IF NOT EXISTS idx_atr_proposals_status ON atr_proposals(status);
      CREATE INDEX IF NOT EXISTS idx_atr_proposals_pattern ON atr_proposals(pattern_hash);
      CREATE INDEX IF NOT EXISTS idx_skill_threats_hash ON skill_threats(skill_hash);
      CREATE INDEX IF NOT EXISTS idx_atr_feedback_rule ON atr_feedback(rule_id);
      CREATE INDEX IF NOT EXISTS idx_ioc_entries_type ON ioc_entries(type);
      CREATE INDEX IF NOT EXISTS idx_ioc_entries_reputation ON ioc_entries(reputation);
      CREATE INDEX IF NOT EXISTS idx_skill_whitelist_status ON skill_whitelist(status);
      CREATE INDEX IF NOT EXISTS idx_skill_whitelist_name ON skill_whitelist(normalized_name);
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
      data.region
    );
  }

  /** Get paginated threat events (admin) / 取得分頁威脅事件 */
  getThreats(limit: number = 50, offset: number = 0): unknown[] {
    return this.db
      .prepare('SELECT * FROM threats ORDER BY timestamp DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
  }

  /** Get total threat count / 取得威脅總數 */
  getThreatCount(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM threats').get() as { count: number })
      .count;
  }

  /** Extract classification metadata from rule content / 從規則內容提取分類元資料 */
  private extractMetadata(
    ruleContent: string,
    source: string
  ): {
    category: string;
    severity: string;
    mitreTechniques: string;
    tags: string;
  } {
    let category = 'unknown';
    let severity = 'medium';
    let mitreTechniques = '';
    let tags = '';

    try {
      if (source === 'yara') {
        // YARA rules: extract from meta section
        const metaMatch = ruleContent.match(/meta\s*:\s*([\s\S]*?)(?:strings|condition)\s*:/);
        if (metaMatch && metaMatch[1]) {
          const meta = metaMatch[1];
          const catMatch = meta.match(/category\s*=\s*"([^"]+)"/);
          if (catMatch?.[1]) category = catMatch[1].toLowerCase();
          const sevMatch = meta.match(/severity\s*=\s*"([^"]+)"/);
          if (sevMatch?.[1]) severity = sevMatch[1].toLowerCase();
          const mitreMatch = meta.match(/mitre_att(?:ack|&ck)\s*=\s*"([^"]+)"/i);
          if (mitreMatch?.[1]) mitreTechniques = mitreMatch[1];
        }
        // Fallback: infer category from rule content keywords
        if (category === 'unknown') {
          if (/malware|trojan|ransom|backdoor|rat_|infostealer/i.test(ruleContent))
            category = 'malware';
          else if (/exploit|cve-/i.test(ruleContent)) category = 'exploit';
          else if (/hack_?tool|offensive|cobalt/i.test(ruleContent)) category = 'hacktool';
          else if (/webshell/i.test(ruleContent)) category = 'webshell';
          else if (/packer|obfusc|crypter/i.test(ruleContent)) category = 'packer';
        }
      } else {
        // Sigma / ATR: YAML-based extraction
        // Extract level/severity
        const sevMatch = ruleContent.match(/(?:^|\n)\s*(?:level|severity)\s*:\s*(\w+)/);
        if (sevMatch?.[1]) severity = sevMatch[1].toLowerCase();

        // Extract tags list
        const tagMatch = ruleContent.match(/(?:^|\n)\s*tags\s*:\s*\n((?:\s+-\s*.+\n?)+)/);
        if (tagMatch?.[1]) {
          const tagLines = tagMatch[1].match(/-\s*(.+)/g) ?? [];
          const tagList = tagLines.map((t) => t.replace(/^-\s*/, '').trim());
          tags = tagList.join(',');

          // Derive MITRE techniques from tags (attack.tXXXX)
          const mitreTags = tagList.filter((t) => /^attack\.t\d+/i.test(t));
          if (mitreTags.length > 0) {
            mitreTechniques = mitreTags
              .map((t) => t.replace(/^attack\./i, '').toUpperCase())
              .join(',');
          }

          // Derive category from MITRE ATT&CK tactic tags
          const attackTags = tagList.filter((t) => t.startsWith('attack.'));
          for (const tag of attackTags) {
            if (/initial.access/i.test(tag)) {
              category = 'initial-access';
              break;
            }
            if (/execution/i.test(tag)) {
              category = 'execution';
              break;
            }
            if (/persistence/i.test(tag)) {
              category = 'persistence';
              break;
            }
            if (/privilege.escalation/i.test(tag)) {
              category = 'privilege-escalation';
              break;
            }
            if (/defense.evasion/i.test(tag)) {
              category = 'defense-evasion';
              break;
            }
            if (/credential.access/i.test(tag)) {
              category = 'credential-access';
              break;
            }
            if (/discovery/i.test(tag)) {
              category = 'discovery';
              break;
            }
            if (/lateral.movement/i.test(tag)) {
              category = 'lateral-movement';
              break;
            }
            if (/collection/i.test(tag)) {
              category = 'collection';
              break;
            }
            if (/exfiltration/i.test(tag)) {
              category = 'exfiltration';
              break;
            }
            if (/command.and.control|c2/i.test(tag)) {
              category = 'command-and-control';
              break;
            }
            if (/impact/i.test(tag)) {
              category = 'impact';
              break;
            }
            if (/resource.development/i.test(tag)) {
              category = 'resource-development';
              break;
            }
            if (/reconnaissance/i.test(tag)) {
              category = 'reconnaissance';
              break;
            }
          }
        }

        // Fallback: infer from logsource (Sigma)
        if (category === 'unknown') {
          const lsCatMatch = ruleContent.match(
            /(?:^|\n)\s*logsource\s*:\s*\n(?:\s+\w+\s*:.+\n)*?\s+category\s*:\s*(\S+)/
          );
          if (lsCatMatch?.[1]) {
            category = lsCatMatch[1].toLowerCase();
          } else {
            const lsProdMatch = ruleContent.match(
              /(?:^|\n)\s*logsource\s*:\s*\n(?:\s+\w+\s*:.+\n)*?\s+product\s*:\s*(\S+)/
            );
            if (lsProdMatch?.[1]) category = lsProdMatch[1].toLowerCase();
          }
        }
      }
    } catch {
      // Extraction failed — keep defaults
    }

    // Normalize category to lowercase
    category = category.toLowerCase();
    severity = severity.toLowerCase();

    return { category, severity, mitreTechniques, tags };
  }

  /** Insert or update a community rule / 插入或更新社群規則 */
  upsertRule(rule: ThreatCloudRule): void {
    // Extract classification from content if not provided
    const meta = this.extractMetadata(rule.ruleContent, rule.source);
    const category = rule.category ?? meta.category;
    const severity = rule.severity ?? meta.severity;
    const mitreTechniques = rule.mitreTechniques ?? meta.mitreTechniques;
    const tags = rule.tags ?? meta.tags;

    const stmt = this.db.prepare(`
      INSERT INTO rules (rule_id, rule_content, published_at, source, category, severity, mitre_techniques, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(rule_id) DO UPDATE SET
        rule_content = excluded.rule_content,
        published_at = excluded.published_at,
        source = excluded.source,
        category = excluded.category,
        severity = excluded.severity,
        mitre_techniques = excluded.mitre_techniques,
        tags = excluded.tags,
        updated_at = datetime('now')
    `);
    stmt.run(
      rule.ruleId,
      rule.ruleContent,
      rule.publishedAt,
      rule.source,
      category,
      severity,
      mitreTechniques,
      tags
    );
  }

  /** Delete all rules with a given source. Returns number of deleted rows. */
  deleteRulesBySource(source: string): number {
    const stmt = this.db.prepare('DELETE FROM rules WHERE source = ?');
    const result = stmt.run(source);
    return result.changes;
  }

  /** Delete rules by a list of rule IDs. Returns number of deleted rows. */
  deleteRulesByIds(ruleIds: readonly string[]): number {
    const placeholders = ruleIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`DELETE FROM rules WHERE rule_id IN (${placeholders})`);
    const result = stmt.run(...ruleIds);
    return result.changes;
  }

  /** Fetch rules published after a given timestamp / 取得指定時間後發佈的規則 */
  getRulesSince(
    since: string,
    filters?: { category?: string; severity?: string; source?: string }
  ): ThreatCloudRule[] {
    let sql = `SELECT rule_id as ruleId, rule_content as ruleContent, published_at as publishedAt, source,
      category, severity, mitre_techniques as mitreTechniques, tags
      FROM rules WHERE published_at > ?`;
    const params: unknown[] = [since];

    if (filters?.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.severity) {
      sql += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters?.source) {
      sql += ' AND source = ?';
      params.push(filters.source);
    }

    sql += ' ORDER BY published_at ASC';
    return this.db.prepare(sql).all(...params) as ThreatCloudRule[];
  }

  /** Fetch all rules with limit / 取得所有規則（含限制） */
  getAllRules(
    limit = 5000,
    filters?: { category?: string; severity?: string; source?: string }
  ): ThreatCloudRule[] {
    let sql = `SELECT rule_id as ruleId, rule_content as ruleContent, published_at as publishedAt, source,
      category, severity, mitre_techniques as mitreTechniques, tags
      FROM rules WHERE 1=1`;
    const params: unknown[] = [];

    if (filters?.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.severity) {
      sql += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters?.source) {
      sql += ' AND source = ?';
      params.push(filters.source);
    }

    sql += ' ORDER BY published_at DESC LIMIT ?';
    params.push(limit);
    return this.db.prepare(sql).all(...params) as ThreatCloudRule[];
  }

  /** Insert ATR rule proposal / 插入 ATR 規則提案 */
  insertATRProposal(proposal: ATRProposal): void {
    const stmt = this.db.prepare(`
      INSERT INTO atr_proposals (pattern_hash, rule_content, llm_provider, llm_model, self_review_verdict, client_id, confirmations)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(
      proposal.patternHash,
      proposal.ruleContent,
      proposal.llmProvider,
      proposal.llmModel,
      proposal.selfReviewVerdict,
      proposal.clientId ?? null
    );
  }

  /** Get ATR proposals, optionally filtered by status / 取得 ATR 提案 */
  getATRProposals(status?: string): unknown[] {
    if (status) {
      return this.db
        .prepare('SELECT * FROM atr_proposals WHERE status = ? ORDER BY created_at DESC')
        .all(status);
    }
    return this.db.prepare('SELECT * FROM atr_proposals ORDER BY created_at DESC').all();
  }

  /** Increment confirmations for a proposal; auto-confirm at >= 3 / 增加提案確認數 */
  confirmATRProposal(patternHash: string): void {
    this.db
      .prepare(
        `
      UPDATE atr_proposals
      SET confirmations = confirmations + 1,
          status = CASE WHEN confirmations + 1 >= 3 THEN 'confirmed' ELSE status END,
          updated_at = datetime('now')
      WHERE pattern_hash = ?
    `
      )
      .run(patternHash);
  }

  /** Update LLM review verdict for a proposal / 更新 LLM 審查結果 */
  updateATRProposalLLMReview(patternHash: string, verdict: string): void {
    this.db
      .prepare(
        `
      UPDATE atr_proposals SET llm_review_verdict = ?, updated_at = datetime('now') WHERE pattern_hash = ?
    `
      )
      .run(verdict, patternHash);
  }

  /** Insert ATR feedback / 插入 ATR 回饋 */
  insertATRFeedback(ruleId: string, isTruePositive: boolean, clientId?: string): void {
    this.db
      .prepare(
        `
      INSERT INTO atr_feedback (rule_id, is_true_positive, client_id) VALUES (?, ?, ?)
    `
      )
      .run(ruleId, isTruePositive ? 1 : 0, clientId ?? null);
  }

  /** Get feedback stats for a rule / 取得規則回饋統計 */
  getATRFeedbackStats(ruleId: string): { truePositives: number; falsePositives: number } {
    const tp = (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM atr_feedback WHERE rule_id = ? AND is_true_positive = 1'
        )
        .get(ruleId) as { count: number }
    ).count;
    const fp = (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM atr_feedback WHERE rule_id = ? AND is_true_positive = 0'
        )
        .get(ruleId) as { count: number }
    ).count;
    return { truePositives: tp, falsePositives: fp };
  }

  /** Insert skill threat submission / 插入技能威脅提交 */
  insertSkillThreat(submission: SkillThreatSubmission): void {
    const stmt = this.db.prepare(`
      INSERT INTO skill_threats (skill_hash, skill_name, risk_score, risk_level, finding_summaries, client_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      submission.skillHash,
      submission.skillName,
      submission.riskScore,
      submission.riskLevel,
      submission.findingSummaries ? JSON.stringify(submission.findingSummaries) : null,
      submission.clientId ?? null
    );
  }

  /** Get report count and aggregated findings for a specific skill / 取得特定技能的報告數 */
  getSkillThreatAggregation(skillName: string): {
    reportCount: number;
    avgRiskScore: number;
    maxRiskLevel: string;
    findings: string[];
    /** ATR rule IDs that triggered across all reports */
    atrRuleIds: string[];
  } {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as cnt, AVG(risk_score) as avg_score, MAX(risk_level) as max_level
         FROM skill_threats WHERE skill_name = ?`
      )
      .get(skillName) as { cnt: number; avg_score: number; max_level: string } | undefined;

    const findingRows = this.db
      .prepare(
        `SELECT finding_summaries FROM skill_threats
         WHERE skill_name = ? AND finding_summaries IS NOT NULL
         ORDER BY created_at DESC LIMIT 10`
      )
      .all(skillName) as Array<{ finding_summaries: string }>;

    const findings: string[] = [];
    const ruleIdSet = new Set<string>();
    for (const fr of findingRows) {
      try {
        const parsed = JSON.parse(fr.finding_summaries) as Array<{
          id?: string;
          title: string;
          category?: string;
          severity?: string;
        }>;
        for (const f of parsed) {
          if (f.title && !findings.includes(f.title)) {
            findings.push(f.title);
          }
          if (f.id && f.id.startsWith('ATR-')) {
            ruleIdSet.add(f.id);
          }
        }
      } catch {
        /* skip invalid JSON */
      }
    }

    return {
      reportCount: row?.cnt ?? 0,
      avgRiskScore: row?.avg_score ?? 0,
      maxRiskLevel: row?.max_level ?? 'LOW',
      findings: findings.slice(0, 10),
      atrRuleIds: [...ruleIdSet],
    };
  }

  /** Fetch rule content by IDs. Returns the YAML detection patterns for crystallization. */
  getRuleContentByIds(ruleIds: string[]): Array<{ ruleId: string; ruleContent: string }> {
    if (ruleIds.length === 0) return [];
    const placeholders = ruleIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT rule_id, rule_content FROM rules WHERE rule_id IN (${placeholders})`)
      .all(...ruleIds) as Array<{ rule_id: string; rule_content: string }>;
    return rows.map((r) => ({ ruleId: r.rule_id, ruleContent: r.rule_content }));
  }

  /** Check if an ATR proposal already exists for a pattern hash */
  hasATRProposal(patternHash: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM atr_proposals WHERE pattern_hash = ? LIMIT 1')
      .get(patternHash) as Record<string, number> | undefined;
    return row !== undefined;
  }

  /** Get an ATR proposal by pattern_hash, returning client_id and confirmations */
  getATRProposalByHash(
    patternHash: string
  ): { client_id: string | null; confirmations: number } | undefined {
    return this.db
      .prepare('SELECT client_id, confirmations FROM atr_proposals WHERE pattern_hash = ? LIMIT 1')
      .get(patternHash) as { client_id: string | null; confirmations: number } | undefined;
  }

  // -------------------------------------------------------------------------
  // Payload fingerprint dedup — avoids paying Anthropic API for duplicate
  // garak prompts. Typical hit rate is 90%+ on public corpora.
  // 提示詞指紋去重 — 避免為重複的 garak 提示付 Anthropic API 錢。
  // -------------------------------------------------------------------------

  /**
   * Look up a previously-judged payload fingerprint. Caller should call this
   * BEFORE invoking the LLM drafter; on hit, skip the Anthropic call entirely
   * and reuse the cached verdict.
   *
   * 查詢先前已判斷過的 payload fingerprint。呼叫端應在叫用 LLM drafter 之前查
   * 這個表;命中時直接跳過 Anthropic 呼叫,回覆之前的結果。
   */
  getPayloadFingerprint(fingerprint: string): {
    result: 'duplicate' | 'novel' | 'rejected';
    ruleId: string | null;
    patternHash: string | null;
    hitCount: number;
  } | null {
    const row = this.db
      .prepare(
        `SELECT result, rule_id, pattern_hash, hit_count
         FROM payload_fingerprints WHERE fingerprint = ? LIMIT 1`
      )
      .get(fingerprint) as
      | {
          result: string;
          rule_id: string | null;
          pattern_hash: string | null;
          hit_count: number;
        }
      | undefined;

    if (!row) return null;
    const result = row.result as 'duplicate' | 'novel' | 'rejected';
    return {
      result,
      ruleId: row.rule_id,
      patternHash: row.pattern_hash,
      hitCount: row.hit_count,
    };
  }

  /**
   * Insert or bump a payload fingerprint verdict. UPSERT by fingerprint:
   * - First time: insert with hit_count=1
   * - Repeat: increment hit_count, refresh last_seen_at
   *
   * 新增或累計 payload fingerprint 判斷結果。
   */
  recordPayloadFingerprint(
    fingerprint: string,
    result: 'duplicate' | 'novel' | 'rejected',
    details?: { ruleId?: string; patternHash?: string }
  ): void {
    this.db
      .prepare(
        `INSERT INTO payload_fingerprints
           (fingerprint, result, rule_id, pattern_hash, first_seen_at, last_seen_at, hit_count)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 1)
         ON CONFLICT(fingerprint) DO UPDATE SET
           hit_count = hit_count + 1,
           last_seen_at = datetime('now')`
      )
      .run(
        fingerprint,
        result,
        details?.ruleId ?? null,
        details?.patternHash ?? null
      );
  }

  /**
   * Stats for the fingerprint cache. Surfaced in admin dashboard so you can
   * see the hit rate and confirm the cost-saving is real.
   * 指紋快取統計。供 admin dashboard 顯示命中率,確認省錢有效。
   */
  getPayloadFingerprintStats(): {
    total: number;
    novel: number;
    duplicate: number;
    rejected: number;
    totalHits: number;
    cacheHits: number;
  } {
    const totals = this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           COALESCE(SUM(CASE WHEN result='novel' THEN 1 ELSE 0 END), 0) as novel,
           COALESCE(SUM(CASE WHEN result='duplicate' THEN 1 ELSE 0 END), 0) as duplicate,
           COALESCE(SUM(CASE WHEN result='rejected' THEN 1 ELSE 0 END), 0) as rejected,
           COALESCE(SUM(hit_count), 0) as total_hits
         FROM payload_fingerprints`
      )
      .get() as {
      total: number;
      novel: number;
      duplicate: number;
      rejected: number;
      total_hits: number;
    };
    return {
      total: totals.total,
      novel: totals.novel,
      duplicate: totals.duplicate,
      rejected: totals.rejected,
      totalHits: totals.total_hits,
      cacheHits: Math.max(0, totals.total_hits - totals.total),
    };
  }

  /** Get recent skill threats / 取得最近技能威脅 */
  getSkillThreats(limit: number = 50): unknown[] {
    return this.db
      .prepare('SELECT * FROM skill_threats ORDER BY created_at DESC LIMIT ?')
      .all(limit);
  }

  /** Get proposal statistics / 取得提案統計 */
  getProposalStats(): {
    pending: number;
    confirmed: number;
    canary: number;
    quarantined: number;
    rejected: number;
    total: number;
  } {
    const countByStatus = (status: string): number =>
      (
        this.db
          .prepare('SELECT COUNT(*) as count FROM atr_proposals WHERE status = ?')
          .get(status) as { count: number }
      ).count;

    const total = (
      this.db.prepare('SELECT COUNT(*) as count FROM atr_proposals').get() as { count: number }
    ).count;

    return {
      pending: countByStatus('pending'),
      confirmed: countByStatus('confirmed'),
      canary: countByStatus('canary'),
      quarantined: countByStatus('quarantined'),
      rejected: countByStatus('rejected'),
      total,
    };
  }

  /** Get threat statistics / 取得威脅統計 */
  // ---------------------------------------------------------------------------
  // Usage Events
  // ---------------------------------------------------------------------------

  recordUsageEvent(eventType: string, source: string, metadata?: Record<string, unknown>): void {
    this.db
      .prepare('INSERT INTO usage_events (event_type, source, metadata) VALUES (?, ?, ?)')
      .run(eventType, source, metadata ? JSON.stringify(metadata) : null);
  }

  getUsageStats(): {
    totalScans: number;
    scansToday: number;
    scansThisWeek: number;
    scansBySource: Record<string, number>;
    cliInstalls: number;
    dailyTrend: Array<{ date: string; count: number }>;
  } {
    const totalScans = (
      this.db
        .prepare(
          "SELECT COUNT(*) as count FROM usage_events WHERE event_type IN ('scan', 'cli_scan')"
        )
        .get() as { count: number }
    ).count;

    const scansToday = (
      this.db
        .prepare(
          "SELECT COUNT(*) as count FROM usage_events WHERE event_type = 'scan' AND created_at > datetime('now', '-1 day')"
        )
        .get() as { count: number }
    ).count;

    const scansThisWeek = (
      this.db
        .prepare(
          "SELECT COUNT(*) as count FROM usage_events WHERE event_type = 'scan' AND created_at > datetime('now', '-7 days')"
        )
        .get() as { count: number }
    ).count;

    const sourceRows = this.db
      .prepare(
        "SELECT source, COUNT(*) as count FROM usage_events WHERE event_type = 'scan' GROUP BY source"
      )
      .all() as Array<{ source: string; count: number }>;
    const scansBySource: Record<string, number> = {};
    for (const r of sourceRows) scansBySource[r.source] = r.count;

    const cliInstalls = (
      this.db
        .prepare("SELECT COUNT(*) as count FROM usage_events WHERE event_type = 'cli_install'")
        .get() as { count: number }
    ).count;

    const dailyTrend = this.db
      .prepare(
        "SELECT date(created_at) as date, COUNT(*) as count FROM usage_events WHERE event_type = 'scan' AND created_at > datetime('now', '-30 days') GROUP BY date(created_at) ORDER BY date"
      )
      .all() as Array<{ date: string; count: number }>;

    return { totalScans, scansToday, scansThisWeek, scansBySource, cliInstalls, dailyTrend };
  }

  // ---------------------------------------------------------------------------
  // Telemetry Events
  // ---------------------------------------------------------------------------

  /** Record a telemetry event / 記錄遙測事件 */
  recordTelemetryEvent(event: {
    eventType: string;
    platform: string;
    skillCount: number;
    findingCount: number;
    severity: string;
  }): void {
    this.db
      .prepare(
        'INSERT INTO telemetry_events (event_type, platform, skill_count, finding_count, severity) VALUES (?, ?, ?, ?, ?)'
      )
      .run(event.eventType, event.platform, event.skillCount, event.findingCount, event.severity);
  }

  /** Get telemetry stats merging raw events + hourly aggregates / 取得遙測統計 */
  getTelemetryStats(): {
    totalEvents: number;
    eventsToday: number;
    byEventType: Record<string, number>;
    byPlatform: Record<string, number>;
    avgFindingCount: number;
  } {
    // Raw events (last 24h — anything older is aggregated)
    const rawTotal = (
      this.db.prepare('SELECT COUNT(*) as count FROM telemetry_events').get() as { count: number }
    ).count;

    const aggTotal = (
      this.db
        .prepare('SELECT COALESCE(SUM(event_count), 0) as count FROM telemetry_hourly_aggregates')
        .get() as { count: number }
    ).count;

    const eventsToday = (
      this.db
        .prepare(
          "SELECT COUNT(*) as count FROM telemetry_events WHERE created_at > datetime('now', '-1 day')"
        )
        .get() as { count: number }
    ).count;

    // By event type (raw)
    const rawByType = this.db
      .prepare('SELECT event_type, COUNT(*) as count FROM telemetry_events GROUP BY event_type')
      .all() as Array<{ event_type: string; count: number }>;

    const aggByType = this.db
      .prepare(
        'SELECT event_type, SUM(event_count) as count FROM telemetry_hourly_aggregates GROUP BY event_type'
      )
      .all() as Array<{ event_type: string; count: number }>;

    const byEventType: Record<string, number> = {};
    for (const r of rawByType)
      byEventType[r.event_type] = (byEventType[r.event_type] ?? 0) + r.count;
    for (const r of aggByType)
      byEventType[r.event_type] = (byEventType[r.event_type] ?? 0) + r.count;

    // By platform (raw)
    const rawByPlatform = this.db
      .prepare('SELECT platform, COUNT(*) as count FROM telemetry_events GROUP BY platform')
      .all() as Array<{ platform: string; count: number }>;

    const aggByPlatform = this.db
      .prepare(
        'SELECT platform, SUM(event_count) as count FROM telemetry_hourly_aggregates GROUP BY platform'
      )
      .all() as Array<{ platform: string; count: number }>;

    const byPlatform: Record<string, number> = {};
    for (const r of rawByPlatform) byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + r.count;
    for (const r of aggByPlatform) byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + r.count;

    // Avg finding count (raw only — aggregates don't track individual)
    const avgRow = this.db
      .prepare('SELECT AVG(finding_count) as avg FROM telemetry_events')
      .get() as { avg: number | null };

    return {
      totalEvents: rawTotal + aggTotal,
      eventsToday,
      byEventType,
      byPlatform,
      avgFindingCount: avgRow.avg ?? 0,
    };
  }

  /** Aggregate raw telemetry events into hourly buckets, then delete old raw events / 彙總遙測事件 */
  cleanupTelemetryEvents(): number {
    // Step 1: Aggregate events older than 24h into hourly buckets
    this.db.exec(`
      INSERT INTO telemetry_hourly_aggregates (hour_bucket, event_type, platform, event_count, total_findings, total_skills, avg_severity)
      SELECT
        strftime('%Y-%m-%dT%H:00:00', created_at) as hour_bucket,
        event_type,
        platform,
        COUNT(*) as event_count,
        SUM(finding_count) as total_findings,
        SUM(skill_count) as total_skills,
        CASE
          WHEN MAX(CASE severity WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END) >= 4 THEN 'CRITICAL'
          WHEN MAX(CASE severity WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END) >= 3 THEN 'HIGH'
          WHEN MAX(CASE severity WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END) >= 2 THEN 'MEDIUM'
          ELSE 'LOW'
        END as avg_severity
      FROM telemetry_events
      WHERE created_at < datetime('now', '-24 hours')
      GROUP BY hour_bucket, event_type, platform
      ON CONFLICT(hour_bucket, event_type, platform) DO UPDATE SET
        event_count = event_count + excluded.event_count,
        total_findings = total_findings + excluded.total_findings,
        total_skills = total_skills + excluded.total_skills
    `);

    // Step 2: Delete raw events older than 24h
    const result = this.db
      .prepare("DELETE FROM telemetry_events WHERE created_at < datetime('now', '-24 hours')")
      .run();

    return result.changes;
  }

  clearAllRules(): number {
    const rulesDeleted = this.db.prepare('DELETE FROM rules').run().changes;
    const proposalsDeleted = this.db.prepare('DELETE FROM atr_proposals').run().changes;
    return rulesDeleted + proposalsDeleted;
  }

  /** Get current schema version for health diagnostics */
  getSchemaVersion(): number {
    try {
      const row = this.db
        .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
        .get() as { version: number } | undefined;
      return row?.version ?? -1;
    } catch {
      return -1;
    }
  }

  getStats(): ThreatStats {
    const totalThreats = (
      this.db.prepare('SELECT COUNT(*) as count FROM threats').get() as { count: number }
    ).count;
    const totalRules = (
      this.db.prepare('SELECT COUNT(*) as count FROM rules').get() as { count: number }
    ).count;

    const last24h = (
      this.db
        .prepare(
          "SELECT COUNT(*) as count FROM threats WHERE received_at > datetime('now', '-1 day')"
        )
        .get() as { count: number }
    ).count;

    const topAttackTypes = this.db
      .prepare(
        `
      SELECT attack_type as type, COUNT(*) as count
      FROM threats
      GROUP BY attack_type
      ORDER BY count DESC
      LIMIT 10
    `
      )
      .all() as Array<{ type: string; count: number }>;

    const topMitreTechniques = this.db
      .prepare(
        `
      SELECT mitre_technique as technique, COUNT(*) as count
      FROM threats
      GROUP BY mitre_technique
      ORDER BY count DESC
      LIMIT 10
    `
      )
      .all() as Array<{ technique: string; count: number }>;

    const proposalStats = this.getProposalStats();
    const skillThreatsTotal = (
      this.db.prepare('SELECT COUNT(*) as count FROM skill_threats').get() as { count: number }
    ).count;

    const skillBlacklistTotal = this.getSkillBlacklist().length;

    const rulesByCategory = this.db
      .prepare(
        `
      SELECT COALESCE(category, 'unknown') as category, COUNT(*) as count
      FROM rules GROUP BY category ORDER BY count DESC LIMIT 20
    `
      )
      .all() as Array<{ category: string; count: number }>;

    const rulesBySeverity = this.db
      .prepare(
        `
      SELECT COALESCE(severity, 'unknown') as severity, COUNT(*) as count
      FROM rules GROUP BY severity ORDER BY count DESC
    `
      )
      .all() as Array<{ severity: string; count: number }>;

    const rulesBySource = this.db
      .prepare(
        `
      SELECT source, COUNT(*) as count
      FROM rules GROUP BY source ORDER BY count DESC
    `
      )
      .all() as Array<{ source: string; count: number }>;

    return {
      totalThreats,
      totalRules,
      topAttackTypes,
      topMitreTechniques,
      last24hThreats: last24h,
      proposalStats,
      skillThreatsTotal,
      skillBlacklistTotal,
      rulesByCategory,
      rulesBySeverity,
      rulesBySource,
    };
  }

  /** Get confirmed/promoted ATR rules, optionally filtered by date / 取得已確認 ATR 規則 */
  getConfirmedATRRules(
    since?: string
  ): Array<{ ruleId: string; ruleContent: string; publishedAt: string; source: string }> {
    // Combine two sources:
    // 1. Community-confirmed proposals from atr_proposals table
    // 2. Seeded ATR rules from the rules table (source='atr')
    const sinceParams = since ? [since] : [];

    const proposals = this.db
      .prepare(
        `
        SELECT pattern_hash as ruleId, rule_content as ruleContent, updated_at as publishedAt, 'atr-community' as source
        FROM atr_proposals
        WHERE status = 'promoted' ${since ? 'AND updated_at > ?' : ''}
        ORDER BY updated_at ASC
      `
      )
      .all(...sinceParams) as Array<{
      ruleId: string;
      ruleContent: string;
      publishedAt: string;
      source: string;
    }>;

    const seeded = this.db
      .prepare(
        `
        SELECT rule_id as ruleId, rule_content as ruleContent, created_at as publishedAt, 'atr' as source
        FROM rules
        WHERE source = 'atr' ${since ? 'AND created_at > ?' : ''}
        ORDER BY created_at ASC
      `
      )
      .all(...sinceParams) as Array<{
      ruleId: string;
      ruleContent: string;
      publishedAt: string;
      source: string;
    }>;

    return [...seeded, ...proposals];
  }

  /** Get IP blocklist from IoC entries and aggregated threat data / 取得 IP 封鎖清單 */
  getIPBlocklist(minReputation: number): string[] {
    // IoC entries with sufficient reputation
    const iocIPs = this.db
      .prepare(
        `
      SELECT value FROM ioc_entries
      WHERE type = 'ip' AND reputation >= ?
      ORDER BY reputation DESC
    `
      )
      .all(minReputation) as Array<{ value: string }>;

    // Aggregate from threats table: distinct IPs with >= 3 occurrences
    const threatIPs = this.db
      .prepare(
        `
      SELECT attack_source_ip as value
      FROM threats
      GROUP BY attack_source_ip
      HAVING COUNT(*) >= 3
    `
      )
      .all() as Array<{ value: string }>;

    // Merge and deduplicate
    const ipSet = new Set<string>();
    for (const row of iocIPs) ipSet.add(row.value);
    for (const row of threatIPs) ipSet.add(row.value);
    return Array.from(ipSet);
  }

  /** Get domain blocklist from IoC entries / 取得域名封鎖清單 */
  getDomainBlocklist(minReputation: number): string[] {
    const iocDomains = this.db
      .prepare(
        `
      SELECT value FROM ioc_entries
      WHERE type = 'domain' AND reputation >= ?
      ORDER BY reputation DESC
    `
      )
      .all(minReputation) as Array<{ value: string }>;

    return iocDomains.map((row) => row.value);
  }

  /** Upsert an IoC entry / 插入或更新 IoC 條目 */
  upsertIoC(type: string, value: string, reputation: number, source: string): void {
    this.db
      .prepare(
        `
      INSERT INTO ioc_entries (type, value, reputation, source)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(value) DO UPDATE SET
        reputation = excluded.reputation,
        source = excluded.source,
        last_seen = datetime('now'),
        sighting_count = sighting_count + 1
    `
      )
      .run(type, value, reputation, source);
  }

  /** Promote proposals to rules based on community consensus and/or LLM approval / 推廣提案為規則 */
  promoteConfirmedProposals(): number {
    // Path 1: LLM approved via self-review (JSON verdict with "approved":true)
    // Path 2: Community consensus (3+ confirmations, no LLM required)
    //   — This ensures the flywheel works even without ANTHROPIC_API_KEY
    // Path 3: Admin manually approved via dashboard
    //   (status='approved' set by admin-approve endpoint; verdict stored as
    //    literal 'admin-approved' or a similar opaque marker — not JSON)
    const proposals = this.db
      .prepare(
        `
      SELECT pattern_hash, rule_content, llm_review_verdict, confirmations, status
      FROM atr_proposals
      WHERE status IN ('confirmed', 'pending', 'approved')
        AND status != 'rejected'
        AND (
          -- Path 1: LLM approved
          (llm_review_verdict IS NOT NULL AND llm_review_verdict LIKE '%"approved":true%')
          OR
          -- Path 2: Community consensus (3+ confirmations, even without LLM)
          (confirmations >= 3)
          OR
          -- Path 3: Admin dashboard approval (status promoted to 'approved'
          -- by a human reviewer; the verdict field may be a plain marker
          -- like 'admin-approved' rather than a JSON blob, so trust the
          -- status column)
          (status = 'approved')
        )
    `
      )
      .all() as Array<{
      pattern_hash: string;
      rule_content: string;
      llm_review_verdict: string | null;
      confirmations: number;
      status: string;
    }>;

    let moved = 0;
    for (const proposal of proposals) {
      // If LLM reviewed, check it's approved (don't promote LLM-rejected proposals)
      if (proposal.llm_review_verdict) {
        try {
          const verdict = JSON.parse(proposal.llm_review_verdict) as { approved?: boolean };
          if (verdict.approved === false) continue;
        } catch {
          // Unparseable verdict — allow community consensus to override
        }
      }

      // Move to canary staging instead of direct promotion
      this.db
        .prepare(
          `
        UPDATE atr_proposals
        SET status = 'canary', canary_started_at = datetime('now'), updated_at = datetime('now')
        WHERE pattern_hash = ?
      `
        )
        .run(proposal.pattern_hash);

      moved++;
    }

    return moved;
  }

  /**
   * Self-heal: find proposals that are status='promoted' but have no
   * corresponding rule in the rules table, and re-upsert them. This
   * handles historical bugs where promoteCanaryRules set the status but
   * the upsertRule call failed silently (e.g., during a prior schema or
   * constraint mismatch). Idempotent — safe to run every promotion cycle.
   * Returns the number of rules restored.
   */
  healOrphanedPromotedProposals(): number {
    const orphans = this.db
      .prepare(
        `
        SELECT p.pattern_hash, p.rule_content, p.updated_at
        FROM atr_proposals p
        LEFT JOIN rules r ON r.rule_id = p.pattern_hash
        WHERE p.status = 'promoted' AND r.rule_id IS NULL
      `
      )
      .all() as Array<{ pattern_hash: string; rule_content: string; updated_at: string }>;

    let healed = 0;
    for (const o of orphans) {
      try {
        this.upsertRule({
          ruleId: o.pattern_hash,
          ruleContent: o.rule_content,
          publishedAt: o.updated_at || new Date().toISOString(),
          source: 'atr-community',
        });
        healed++;
      } catch {
        /* skip individual errors — next cycle will retry */
      }
    }
    return healed;
  }

  /** Canary period in milliseconds (24 hours) / Canary 觀察期（24 小時） */
  private static readonly CANARY_PERIOD_MS = 24 * 60 * 60 * 1000;

  /**
   * Promote canary rules that have survived the 24-hour observation period
   * without negative feedback. Quarantine rules with negative feedback.
   * 推廣存活 24 小時且無負面回饋的 canary 規則。隔離有負面回饋的規則。
   */
  promoteCanaryRules(): { promoted: number; quarantined: number } {
    const canaryProposals = this.db
      .prepare(
        `
        SELECT pattern_hash, rule_content, canary_started_at
        FROM atr_proposals
        WHERE status = 'canary'
          AND canary_started_at IS NOT NULL
      `
      )
      .all() as Array<{
      pattern_hash: string;
      rule_content: string;
      canary_started_at: string;
    }>;

    let promoted = 0;
    let quarantined = 0;

    for (const proposal of canaryProposals) {
      const negativeFeedback = this.getNegativeFeedbackCount(proposal.pattern_hash);

      if (negativeFeedback >= 3) {
        // Too much negative feedback — quarantine
        this.quarantineProposal(proposal.pattern_hash);
        quarantined++;
        continue;
      }

      const elapsed = Date.now() - new Date(proposal.canary_started_at + 'Z').getTime();
      if (elapsed < ThreatCloudDB.CANARY_PERIOD_MS) {
        continue; // Still in canary period
      }

      // Survived canary period — promote to rule
      this.upsertRule({
        ruleId: proposal.pattern_hash,
        ruleContent: proposal.rule_content,
        publishedAt: new Date().toISOString(),
        source: 'atr-community',
      });

      this.db
        .prepare(
          `UPDATE atr_proposals SET status = 'promoted', updated_at = datetime('now')
           WHERE pattern_hash = ?`
        )
        .run(proposal.pattern_hash);

      promoted++;
    }

    return { promoted, quarantined };
  }

  /** Get count of negative feedback for a rule / 取得規則負面回饋數 */
  getNegativeFeedbackCount(ruleId: string): number {
    return (
      this.db
        .prepare(
          'SELECT COUNT(*) as count FROM atr_feedback WHERE rule_id = ? AND is_true_positive = 0'
        )
        .get(ruleId) as { count: number }
    ).count;
  }

  /** Quarantine a proposal / 隔離提案 */
  quarantineProposal(patternHash: string): void {
    this.db
      .prepare(
        `UPDATE atr_proposals SET status = 'quarantined', updated_at = datetime('now')
         WHERE pattern_hash = ?`
      )
      .run(patternHash);
  }

  /** Get canary rules (for 10% client sampling) / 取得 canary 規則（供 10% 客戶端抽樣） */
  getCanaryATRRules(): Array<{
    ruleId: string;
    ruleContent: string;
    publishedAt: string;
    source: string;
  }> {
    return this.db
      .prepare(
        `SELECT pattern_hash as ruleId, rule_content as ruleContent, canary_started_at as publishedAt, 'atr-canary' as source
         FROM atr_proposals
         WHERE status = 'canary'
         ORDER BY canary_started_at ASC`
      )
      .all() as Array<{ ruleId: string; ruleContent: string; publishedAt: string; source: string }>;
  }

  /** Reject an ATR proposal / 拒絕 ATR 提案 */
  rejectATRProposal(patternHash: string): void {
    this.db
      .prepare(
        `
      UPDATE atr_proposals SET status = 'rejected', updated_at = datetime('now')
      WHERE pattern_hash = ?
    `
      )
      .run(patternHash);
  }

  /** Admin: manually approve an ATR proposal and promote to rule */
  approveATRProposal(patternHash: string): boolean {
    const proposal = this.db
      .prepare(
        'SELECT pattern_hash, rule_content FROM atr_proposals WHERE pattern_hash = ? LIMIT 1'
      )
      .get(patternHash) as { pattern_hash: string; rule_content: string } | undefined;
    if (!proposal) return false;

    // Update proposal status
    this.db
      .prepare(
        `
      UPDATE atr_proposals SET status = 'approved', llm_review_verdict = 'admin-approved', updated_at = datetime('now')
      WHERE pattern_hash = ?
    `
      )
      .run(patternHash);

    // Insert as confirmed rule
    const ruleId = `ATR-2026-DRAFT-${patternHash.slice(0, 8)}`;
    try {
      this.db
        .prepare(
          `
        INSERT OR IGNORE INTO rules (rule_id, rule_content, source, category, severity)
        VALUES (?, ?, 'atr-community', 'skill-compromise', 'high')
      `
        )
        .run(ruleId, proposal.rule_content);
    } catch {
      // Rule may already exist
    }
    return true;
  }

  /** Admin: remove a skill from whitelist */
  removeFromWhitelist(skillName: string): boolean {
    const normalized = skillName.toLowerCase().trim().replace(/\s+/g, '-');
    const result = this.db
      .prepare(
        `
      DELETE FROM skill_whitelist WHERE normalized_name = ?
    `
      )
      .run(normalized);
    return result.changes > 0;
  }

  /** Admin: manually add a skill to blacklist via skill_threats */
  addToBlacklist(skillName: string, reason: string): void {
    const hash = createHash('sha256').update(skillName).digest('hex').slice(0, 16);
    // Insert 3 threat reports to trigger blacklist threshold
    for (let i = 0; i < 3; i++) {
      this.db
        .prepare(
          `
        INSERT INTO skill_threats (skill_hash, skill_name, risk_score, risk_level, finding_summaries, client_id)
        VALUES (?, ?, 100, 'CRITICAL', ?, ?)
      `
        )
        .run(hash, skillName, reason, `admin-${i}`);
    }
  }

  /** Admin: remove a skill from blacklist by clearing its threat reports */
  removeFromBlacklist(skillHash: string): boolean {
    const result = this.db
      .prepare(
        `
      DELETE FROM skill_threats WHERE skill_hash = ?
    `
      )
      .run(skillHash);
    return result.changes > 0;
  }

  /** Get all whitelist entries (including unconfirmed, for admin) */
  getAllWhitelistEntries(): unknown[] {
    return this.db
      .prepare(
        `
      SELECT skill_name, normalized_name, fingerprint_hash, confirmations, status,
             first_reported, last_reported
      FROM skill_whitelist
      ORDER BY first_reported DESC
    `
      )
      .all();
  }

  /** Get rules by source type, optionally filtered by date / 依來源取得規則 */
  getRulesBySource(source: string, since?: string): ThreatCloudRule[] {
    if (since) {
      return this.db
        .prepare(
          `
        SELECT rule_id as ruleId, rule_content as ruleContent, published_at as publishedAt, source,
          category, severity, mitre_techniques as mitreTechniques, tags
        FROM rules
        WHERE source = ? AND published_at > ?
        ORDER BY published_at ASC
      `
        )
        .all(source, since) as ThreatCloudRule[];
    }
    return this.db
      .prepare(
        `
      SELECT rule_id as ruleId, rule_content as ruleContent, published_at as publishedAt, source,
        category, severity, mitre_techniques as mitreTechniques, tags
      FROM rules
      WHERE source = ?
      ORDER BY published_at ASC
    `
      )
      .all(source) as ThreatCloudRule[];
  }

  /** Report a safe skill (increment confirmations, auto-confirm at 3+) / 回報安全 skill */
  reportSafeSkill(skillName: string, fingerprintHash?: string): void {
    const normalized = skillName.toLowerCase().trim().replace(/\s+/g, '-');
    this.db
      .prepare(
        `
      INSERT INTO skill_whitelist (skill_name, normalized_name, fingerprint_hash)
      VALUES (?, ?, ?)
      ON CONFLICT(normalized_name) DO UPDATE SET
        confirmations = confirmations + 1,
        status = CASE WHEN confirmations + 1 >= 3 THEN 'confirmed' ELSE status END,
        fingerprint_hash = COALESCE(excluded.fingerprint_hash, fingerprint_hash),
        last_reported = datetime('now')
    `
      )
      .run(skillName, normalized, fingerprintHash ?? null);
  }

  /** Get confirmed community whitelist / 取得社群白名單 */
  getSkillWhitelist(
    since?: string
  ): Array<{ name: string; hash: string | null; confirmations: number }> {
    if (since) {
      return this.db
        .prepare(
          `SELECT skill_name as name, fingerprint_hash as hash, confirmations
           FROM skill_whitelist
           WHERE status = 'confirmed' AND last_reported > ?
           ORDER BY last_reported DESC`
        )
        .all(since) as Array<{ name: string; hash: string | null; confirmations: number }>;
    }
    return this.db
      .prepare(
        `SELECT skill_name as name, fingerprint_hash as hash, confirmations
         FROM skill_whitelist
         WHERE status = 'confirmed'
         ORDER BY confirmations DESC`
      )
      .all() as Array<{ name: string; hash: string | null; confirmations: number }>;
  }

  /**
   * Get skill blacklist: skills reported by 3+ distinct clients with avg risk >= 70
   * 取得技能黑名單：3+ 不同客戶端回報且平均風險 >= 70 的技能
   */
  getSkillBlacklist(
    minReports: number = 3,
    minAvgRisk: number = 70,
    since?: string
  ): SkillBlacklistEntry[] {
    if (since) {
      // Incremental: only entries with new reports since the given timestamp
      return this.db
        .prepare(
          `SELECT
            skill_hash as skillHash,
            skill_name as skillName,
            ROUND(AVG(risk_score)) as avgRiskScore,
            MAX(risk_level) as maxRiskLevel,
            COUNT(DISTINCT COALESCE(client_id, 'anonymous')) as reportCount,
            MIN(created_at) as firstReported,
            MAX(created_at) as lastReported
          FROM skill_threats
          GROUP BY skill_hash
          HAVING reportCount >= ? AND AVG(risk_score) >= ? AND MAX(created_at) > ?
          ORDER BY lastReported DESC`
        )
        .all(minReports, minAvgRisk, since) as SkillBlacklistEntry[];
    }
    return this.db
      .prepare(
        `SELECT
          skill_hash as skillHash,
          skill_name as skillName,
          ROUND(AVG(risk_score)) as avgRiskScore,
          MAX(risk_level) as maxRiskLevel,
          COUNT(DISTINCT COALESCE(client_id, 'anonymous')) as reportCount,
          MIN(created_at) as firstReported,
          MAX(created_at) as lastReported
        FROM skill_threats
        GROUP BY skill_hash
        HAVING reportCount >= ? AND AVG(risk_score) >= ?
        ORDER BY avgRiskScore DESC`
      )
      .all(minReports, minAvgRisk) as SkillBlacklistEntry[];
  }

  /** Backfill classification for rules with NULL category / 回填缺少分類的規則 */
  backfillClassification(): number {
    const unclassified = this.db
      .prepare(`SELECT rule_id, rule_content, source FROM rules WHERE category IS NULL`)
      .all() as Array<{ rule_id: string; rule_content: string; source: string }>;

    let updated = 0;
    const stmt = this.db.prepare(`
      UPDATE rules SET category = ?, severity = ?, mitre_techniques = ?, tags = ?, updated_at = datetime('now')
      WHERE rule_id = ?
    `);

    for (const row of unclassified) {
      const meta = this.extractMetadata(row.rule_content, row.source);
      stmt.run(meta.category, meta.severity, meta.mitreTechniques, meta.tags, row.rule_id);
      updated++;
    }
    return updated;
  }

  /**
   * Get pending proposals without LLM review verdict (for retry).
   * Also includes proposals where review failed due to rate limiting.
   * 取得尚未被 LLM 審查的待處理提案（用於重試）
   */
  getUnreviewedProposals(limit: number = 5): Array<{ patternHash: string; ruleContent: string }> {
    // Retry pending proposals that either (a) have never been reviewed, or
    // (b) previously hit a transient error (rate limit, timeout, network).
    // A legitimate `approved: false` verdict is NOT retried — that's a terminal
    // rejection and handled by rejectATRProposal() in the reviewer; leaving it
    // in the retry pool would loop forever and waste LLM API quota.
    return this.db
      .prepare(
        `SELECT pattern_hash as patternHash, rule_content as ruleContent
         FROM atr_proposals
         WHERE status = 'pending'
           AND (llm_review_verdict IS NULL
                OR llm_review_verdict LIKE '%LLM review failed%'
                OR llm_review_verdict LIKE '%rate_limit%'
                OR llm_review_verdict LIKE '%429%'
                OR llm_review_verdict LIKE '%timed out%'
                OR llm_review_verdict LIKE '%503%')
         ORDER BY created_at ASC
         LIMIT ?`
      )
      .all(limit) as Array<{ patternHash: string; ruleContent: string }>;
  }

  /** Insert scan event from any source / 插入掃描事件 */
  insertScanEvent(event: ScanEvent): void {
    this.db
      .prepare(
        `INSERT INTO scan_events (source, skills_scanned, findings_count, confirmed_malicious, highly_suspicious, general_suspicious, clean_count, device_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.source,
        event.skillsScanned,
        event.findingsCount,
        event.confirmedMalicious,
        event.highlySuspicious,
        event.generalSuspicious,
        event.cleanCount,
        event.deviceHash ?? null
      );
  }

  /** Record a one-time activation event / 記錄一次性啟動事件 */
  recordActivation(activation: {
    clientId: string;
    platform: string;
    osType: string;
    panguardVersion: string;
    nodeVersion: string;
  }): boolean {
    try {
      this.db
        .prepare(
          `INSERT OR IGNORE INTO activations (client_id, platform, os_type, panguard_version, node_version)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          activation.clientId,
          activation.platform,
          activation.osType,
          activation.panguardVersion,
          activation.nodeVersion
        );
      return true;
    } catch {
      return false;
    }
  }

  /** Get activation stats / 取得啟動統計 */
  getActivationStats(): {
    total: number;
    byPlatform: Array<{ platform: string; count: number }>;
    byOs: Array<{ osType: string; count: number }>;
    recent: Array<{
      activatedAt: string;
      platform: string;
      osType: string;
      panguardVersion: string;
    }>;
  } {
    const total = (
      this.db.prepare(`SELECT COUNT(*) as count FROM activations`).get() as { count: number }
    ).count;

    const byPlatform = this.db
      .prepare(
        `SELECT platform, COUNT(*) as count FROM activations GROUP BY platform ORDER BY count DESC`
      )
      .all() as Array<{ platform: string; count: number }>;

    const byOs = this.db
      .prepare(
        `SELECT os_type as osType, COUNT(*) as count FROM activations GROUP BY os_type ORDER BY count DESC`
      )
      .all() as Array<{ osType: string; count: number }>;

    const recent = this.db
      .prepare(
        `SELECT activated_at as activatedAt, platform, os_type as osType, panguard_version as panguardVersion
         FROM activations ORDER BY activated_at DESC LIMIT 20`
      )
      .all() as Array<{
      activatedAt: string;
      platform: string;
      osType: string;
      panguardVersion: string;
    }>;

    return { total, byPlatform, byOs, recent };
  }

  /** Get contributor leaderboard (hashed IDs, no PII) / 取得貢獻者排行榜 */
  getContributorLeaderboard(limit: number = 20): Array<{
    contributorHash: string;
    proposalsSubmitted: number;
    proposalsPromoted: number;
    skillThreatsReported: number;
  }> {
    // Hash client_id with SHA-256 for privacy
    // Group by client_id, count proposals + skill threats
    const rows = this.db
      .prepare(
        `
        SELECT
          client_id,
          COUNT(*) as proposal_count,
          SUM(CASE WHEN status = 'promoted' THEN 1 ELSE 0 END) as promoted_count
        FROM atr_proposals
        WHERE client_id IS NOT NULL
        GROUP BY client_id
        ORDER BY promoted_count DESC, proposal_count DESC
        LIMIT ?
      `
      )
      .all(limit) as Array<{
      client_id: string;
      proposal_count: number;
      promoted_count: number;
    }>;

    // Scope threat query to only the client_ids from the first query (bounded)
    const clientIds = rows.map((r) => r.client_id);
    const threatMap = new Map<string, number>();
    if (clientIds.length > 0) {
      const placeholders = clientIds.map(() => '?').join(',');
      const threatRows = this.db
        .prepare(
          `SELECT client_id, COUNT(*) as threat_count
           FROM skill_threats
           WHERE client_id IN (${placeholders})
           GROUP BY client_id`
        )
        .all(...clientIds) as Array<{ client_id: string; threat_count: number }>;
      for (const r of threatRows) {
        threatMap.set(r.client_id, r.threat_count);
      }
    }

    const hashSecret = process.env['TC_HASH_SECRET'] ?? 'panguard-default-hash-key';

    return rows.map((r) => ({
      // HMAC hash client_id — prevents PII reconstruction without server secret
      contributorHash: createHmac('sha256', hashSecret).update(r.client_id).digest('hex'),
      proposalsSubmitted: r.proposal_count,
      proposalsPromoted: r.promoted_count,
      skillThreatsReported: threatMap.get(r.client_id) ?? 0,
    }));
  }

  /** Get aggregated metrics across all sources / 取得所有來源的聚合指標 */
  getAggregatedMetrics(): AggregatedMetrics {
    // Total skills scanned across all sources (sum, not unique)
    const totals = this.db
      .prepare(
        `SELECT
          COALESCE(SUM(skills_scanned), 0) as totalSkills,
          COALESCE(SUM(findings_count), 0) as totalFindings
         FROM scan_events`
      )
      .get() as { totalSkills: number; totalFindings: number };

    // Per-source breakdown
    const sourceStats = this.db
      .prepare(
        `SELECT
          source,
          COALESCE(SUM(skills_scanned), 0) as skills,
          COALESCE(SUM(findings_count), 0) as findings,
          COUNT(DISTINCT device_hash) as devices
         FROM scan_events
         GROUP BY source`
      )
      .all() as Array<{ source: string; skills: number; findings: number; devices: number }>;

    const bulk = sourceStats.find((s) => s.source === 'bulk-pipeline') ?? {
      skills: 0,
      findings: 0,
      devices: 0,
    };
    const cli = sourceStats.find((s) => s.source === 'cli-user') ?? {
      skills: 0,
      findings: 0,
      devices: 0,
    };
    const web = sourceStats.find((s) => s.source === 'web-scanner') ?? {
      skills: 0,
      findings: 0,
      devices: 0,
    };

    // Unique devices (agents protected) = distinct device_hash from CLI users
    const agentsProtected = (
      this.db
        .prepare(
          `SELECT COUNT(DISTINCT device_hash) as count FROM scan_events WHERE device_hash IS NOT NULL`
        )
        .get() as { count: number }
    ).count;

    // ATR rules count
    const atrRulesCount = (
      this.db
        .prepare(`SELECT COUNT(*) as count FROM rules WHERE source IN ('atr', 'atr-community')`)
        .get() as { count: number }
    ).count;

    // Whitelist count
    const whitelistCount = (
      this.db.prepare(`SELECT COUNT(*) as count FROM skill_whitelist`).get() as { count: number }
    ).count;

    // Blacklist count (uses aggregated skill_threats view, same as getSkillBlacklist)
    const blacklistCount = this.getSkillBlacklist().length;

    return {
      totalSkillsScanned: totals.totalSkills,
      totalAgentsProtected: agentsProtected,
      totalThreatsDetected: totals.totalFindings,
      totalAtrRules: atrRulesCount,
      whitelistedSkills: whitelistCount,
      blacklistedSkills: blacklistCount,
      sources: {
        bulk: { skills: bulk.skills, findings: bulk.findings },
        cli: { skills: cli.skills, findings: cli.findings, devices: cli.devices },
        web: { skills: web.skills, findings: web.findings },
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // ── Verdict Cache / 判定快取 ──────────────────────────────────

  /** Look up a cached verdict by content hash. Returns null if miss or expired. */
  getVerdictCache(contentHash: string): {
    readonly contentHash: string;
    readonly skillName: string;
    readonly verdict: string;
    readonly scannedAt: string;
    readonly scanCount: number;
  } | null {
    const row = this.db
      .prepare(
        `SELECT content_hash, skill_name, verdict, scanned_at, scan_count
         FROM verdict_cache
         WHERE content_hash = ? AND expires_at > datetime('now')`
      )
      .get(contentHash) as
      | {
          content_hash: string;
          skill_name: string;
          verdict: string;
          scanned_at: string;
          scan_count: number;
        }
      | undefined;

    if (!row) return null;

    // Increment scan_count on cache hit
    this.db
      .prepare(`UPDATE verdict_cache SET scan_count = scan_count + 1 WHERE content_hash = ?`)
      .run(contentHash);

    return {
      contentHash: row.content_hash,
      skillName: row.skill_name,
      verdict: row.verdict,
      scannedAt: row.scanned_at,
      scanCount: row.scan_count + 1,
    };
  }

  /** Insert or replace a verdict cache entry with 30-day TTL. */
  insertVerdictCache(entry: {
    readonly contentHash: string;
    readonly skillName: string;
    readonly verdict: string;
  }): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO verdict_cache (content_hash, skill_name, verdict, scanned_at, expires_at, scan_count)
         VALUES (?, ?, ?, datetime('now'), datetime('now', '+30 days'), 1)`
      )
      .run(entry.contentHash, entry.skillName, entry.verdict);
  }

  /** Delete a specific cache entry. Returns true if a row was deleted. */
  invalidateVerdictCache(contentHash: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM verdict_cache WHERE content_hash = ?`)
      .run(contentHash);
    return result.changes > 0;
  }

  /** Purge all expired cache entries. Returns count deleted. */
  purgeExpiredVerdictCache(): number {
    const result = this.db
      .prepare(`DELETE FROM verdict_cache WHERE expires_at <= datetime('now')`)
      .run();
    return result.changes;
  }

  // ── Skill Hash History / 技能雜湊歷史 ────────────────────────

  /** Get the latest (non-superseded) hash entry for a skill. */
  getLatestSkillHash(
    skillName: string
  ): { readonly contentHash: string; readonly scanVerdict: string | null } | null {
    const row = this.db
      .prepare(
        `SELECT content_hash, scan_verdict
         FROM skill_hash_history
         WHERE skill_name = ? AND superseded_by IS NULL
         ORDER BY last_seen DESC
         LIMIT 1`
      )
      .get(skillName) as { content_hash: string; scan_verdict: string | null } | undefined;

    if (!row) return null;
    return { contentHash: row.content_hash, scanVerdict: row.scan_verdict };
  }

  /** Record a skill hash observation. Creates or updates last_seen. */
  recordSkillHash(entry: {
    readonly skillName: string;
    readonly contentHash: string;
    readonly scanVerdict?: string;
    readonly rugPullFlag?: boolean;
  }): void {
    this.db
      .prepare(
        `INSERT INTO skill_hash_history (skill_name, content_hash, scan_verdict, rug_pull_flag)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(skill_name, content_hash) DO UPDATE SET
           last_seen = datetime('now'),
           scan_verdict = COALESCE(excluded.scan_verdict, scan_verdict)`
      )
      .run(
        entry.skillName,
        entry.contentHash,
        entry.scanVerdict ?? null,
        entry.rugPullFlag ? 1 : 0
      );
  }

  /** Mark a previous hash as superseded by a new hash. */
  markSkillHashSuperseded(skillName: string, oldHash: string, newHash: string): void {
    this.db
      .prepare(
        `UPDATE skill_hash_history
         SET superseded_by = ?
         WHERE skill_name = ? AND content_hash = ?`
      )
      .run(newHash, skillName, oldHash);
  }

  /** Get full hash history for a skill (audit trail). */
  getSkillHashHistory(skillName: string): ReadonlyArray<{
    readonly contentHash: string;
    readonly firstSeen: string;
    readonly lastSeen: string;
    readonly scanVerdict: string | null;
    readonly supersededBy: string | null;
    readonly rugPullFlag: boolean;
  }> {
    const rows = this.db
      .prepare(
        `SELECT content_hash, first_seen, last_seen, scan_verdict, superseded_by, rug_pull_flag
         FROM skill_hash_history
         WHERE skill_name = ?
         ORDER BY first_seen ASC`
      )
      .all(skillName) as Array<{
      content_hash: string;
      first_seen: string;
      last_seen: string;
      scan_verdict: string | null;
      superseded_by: string | null;
      rug_pull_flag: number;
    }>;

    return rows.map((r) => ({
      contentHash: r.content_hash,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      scanVerdict: r.scan_verdict,
      supersededBy: r.superseded_by,
      rugPullFlag: r.rug_pull_flag === 1,
    }));
  }

  // ─── Org / Device / Policy (Threat Model #1, #6) ───────────────

  /** Create an organization / 建立組織 */
  createOrg(id: string, name: string): void {
    this.db.prepare('INSERT OR IGNORE INTO orgs (id, name) VALUES (?, ?)').run(id, name);
  }

  /** Get org by ID / 取得組織 */
  getOrg(id: string): { id: string; name: string; created_at: string } | undefined {
    return this.db.prepare('SELECT * FROM orgs WHERE id = ?').get(id) as
      | { id: string; name: string; created_at: string }
      | undefined;
  }

  /** Upsert device heartbeat / 更新裝置心跳
   *  Threat Model: Fleet view (#6 Scope Escalation — org-level visibility) */
  upsertDevice(data: {
    deviceId: string;
    orgId: string;
    hostname?: string;
    osType?: string;
    agentCount?: number;
    guardVersion?: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO devices (id, org_id, hostname, os_type, agent_count, guard_version, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           org_id = excluded.org_id,
           hostname = COALESCE(excluded.hostname, devices.hostname),
           os_type = COALESCE(excluded.os_type, devices.os_type),
           agent_count = excluded.agent_count,
           guard_version = COALESCE(excluded.guard_version, devices.guard_version),
           last_seen = datetime('now')`
      )
      .run(
        data.deviceId,
        data.orgId,
        data.hostname ?? null,
        data.osType ?? null,
        data.agentCount ?? 0,
        data.guardVersion ?? null
      );
  }

  /** List devices for an org / 列出組織下的裝置
   *  Threat Model: Fleet view (#6) */
  getDevicesByOrg(
    orgId: string,
    limit: number = 100,
    offset: number = 0
  ): ReadonlyArray<{
    id: string;
    hostname: string | null;
    os_type: string | null;
    agent_count: number;
    guard_version: string | null;
    last_seen: string;
    created_at: string;
  }> {
    return this.db
      .prepare(
        'SELECT id, hostname, os_type, agent_count, guard_version, last_seen, created_at FROM devices WHERE org_id = ? ORDER BY last_seen DESC LIMIT ? OFFSET ?'
      )
      .all(orgId, limit, offset) as ReadonlyArray<{
      id: string;
      hostname: string | null;
      os_type: string | null;
      agent_count: number;
      guard_version: string | null;
      last_seen: string;
      created_at: string;
    }>;
  }

  /** Get device count for an org / 取得組織裝置數 */
  getDeviceCount(orgId: string): number {
    return (
      this.db.prepare('SELECT COUNT(*) as count FROM devices WHERE org_id = ?').get(orgId) as {
        count: number;
      }
    ).count;
  }

  /** Set org policy / 設定組織策略
   *  Threat Model: Policy engine (#1 Supply Chain, #6 Scope Escalation) */
  setOrgPolicy(orgId: string, category: string, action: 'allow' | 'block'): void {
    this.db
      .prepare(
        `INSERT INTO org_policies (org_id, category, action)
         VALUES (?, ?, ?)
         ON CONFLICT(org_id, category) DO UPDATE SET action = excluded.action`
      )
      .run(orgId, category, action);
  }

  /** Get org policies / 取得組織策略 */
  getOrgPolicies(
    orgId: string
  ): ReadonlyArray<{ category: string; action: string; created_at: string }> {
    return this.db
      .prepare(
        'SELECT category, action, created_at FROM org_policies WHERE org_id = ? ORDER BY category'
      )
      .all(orgId) as ReadonlyArray<{ category: string; action: string; created_at: string }>;
  }

  /** Delete org policy / 刪除組織策略 */
  deleteOrgPolicy(orgId: string, category: string): boolean {
    const result = this.db
      .prepare('DELETE FROM org_policies WHERE org_id = ? AND category = ?')
      .run(orgId, category);
    return result.changes > 0;
  }

  // ---------------------------------------------------------------------------
  // Client Keys / 客戶端金鑰
  // ---------------------------------------------------------------------------

  /** Register a new client key. Returns the raw key (only time it's visible). */
  registerClientKey(clientId: string, ipAddress: string | null): { clientKey: string } {
    // Limit to 5 active keys per clientId to prevent DB flooding
    const existing = this.db
      .prepare('SELECT COUNT(*) as cnt FROM client_keys WHERE client_id = ? AND revoked = 0')
      .get(clientId) as { cnt: number };
    if (existing.cnt >= 5) {
      // Revoke oldest key to make room
      this.db
        .prepare(
          `UPDATE client_keys SET revoked = 1, revoked_at = datetime('now')
           WHERE id = (SELECT id FROM client_keys WHERE client_id = ? AND revoked = 0 ORDER BY created_at ASC LIMIT 1)`
        )
        .run(clientId);
    }

    const clientKey = randomUUID();
    const hash = createHash('sha256').update(clientKey).digest('hex');
    this.db
      .prepare('INSERT INTO client_keys (client_id, client_key_hash, ip_address) VALUES (?, ?, ?)')
      .run(clientId, hash, ipAddress);
    return { clientKey };
  }

  /** Validate a raw client key. Updates last_used_at on success. */
  validateClientKey(rawKey: string): boolean {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const row = this.db
      .prepare('SELECT id FROM client_keys WHERE client_key_hash = ? AND revoked = 0')
      .get(hash) as { id: number } | undefined;
    if (!row) return false;
    this.db
      .prepare("UPDATE client_keys SET last_used_at = datetime('now') WHERE id = ?")
      .run(row.id);
    return true;
  }

  /**
   * Look up role + clientId for a raw client key. Returns null if invalid/revoked.
   * Does NOT update last_used_at (caller should use validateClientKey for that).
   * Used by L5 partner-sync endpoints to enforce role-based access.
   */
  getClientKeyInfo(rawKey: string): { clientId: string; role: string } | null {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const row = this.db
      .prepare(
        'SELECT client_id as clientId, COALESCE(key_role, ?) as role FROM client_keys WHERE client_key_hash = ? AND revoked = 0'
      )
      .get('guard', hash) as { clientId: string; role: string } | undefined;
    return row ?? null;
  }

  /**
   * Issue a partner key. Partner keys are manually issued by admin and can
   * access L5 live-sync endpoints (e.g. /api/atr-rules/live). Returns the
   * raw key once — caller must store it securely.
   */
  registerPartnerKey(partnerName: string, issuedBy: string): { clientKey: string } {
    const clientId = `partner:${partnerName}`;
    const clientKey = randomUUID();
    const hash = createHash('sha256').update(clientKey).digest('hex');
    this.db
      .prepare(
        'INSERT INTO client_keys (client_id, client_key_hash, ip_address, key_role) VALUES (?, ?, ?, ?)'
      )
      .run(clientId, hash, `issued-by:${issuedBy}`, 'partner');
    return { clientKey };
  }

  /** Revoke all keys for a client. Returns number of keys revoked. */
  revokeClientKey(clientId: string): number {
    const result = this.db
      .prepare(
        "UPDATE client_keys SET revoked = 1, revoked_at = datetime('now') WHERE client_id = ? AND revoked = 0"
      )
      .run(clientId);
    return result.changes;
  }

  /** List client keys (admin). Never returns raw keys. */
  listClientKeys(
    limit = 50,
    offset = 0
  ): Array<{
    id: number;
    clientId: string;
    createdAt: string;
    lastUsedAt: string | null;
    revoked: boolean;
    ipAddress: string | null;
  }> {
    const rows = this.db
      .prepare(
        'SELECT id, client_id, created_at, last_used_at, revoked, ip_address FROM client_keys ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .all(limit, offset) as Array<{
      id: number;
      client_id: string;
      created_at: string;
      last_used_at: string | null;
      revoked: number;
      ip_address: string | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      clientId: r.client_id,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
      revoked: r.revoked === 1,
      ipAddress: r.ip_address,
    }));
  }

  /** Close the database / 關閉資料庫 */
  close(): void {
    this.db.close();
  }
}
