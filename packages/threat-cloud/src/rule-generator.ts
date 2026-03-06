/**
 * Automatic Sigma Rule Generator
 * 自動 Sigma 規則產生器
 *
 * Analyzes enriched threat events, detects recurring patterns,
 * and generates Sigma detection rules automatically.
 *
 * @module @panguard-ai/threat-cloud/rule-generator
 */

import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { DetectedPattern, RuleGenerationResult, RuleGeneratorConfig } from './types.js';

/** MITRE technique → tactic mapping (simplified) */
const TECHNIQUE_TACTIC_MAP: Record<string, string> = {
  T1110: 'credential_access',
  T1021: 'lateral_movement',
  T1046: 'discovery',
  T1059: 'execution',
  T1486: 'impact',
  T1190: 'initial_access',
  T1078: 'defense_evasion',
  T1071: 'command_and_control',
  T1048: 'exfiltration',
  T1569: 'execution',
  T1053: 'execution',
  T1543: 'persistence',
  T1547: 'persistence',
  T1098: 'persistence',
  T1027: 'defense_evasion',
  T1070: 'defense_evasion',
  T1562: 'defense_evasion',
  T1018: 'discovery',
  T1057: 'discovery',
  T1082: 'discovery',
  T1560: 'collection',
};

/** Severity mapping for pattern analysis */
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

/** Default configuration */
const DEFAULT_CONFIG: RuleGeneratorConfig = {
  minOccurrences: 10,
  analysisWindowHours: 168, // 7 days
  minDistinctIPs: 3,
};

export class RuleGenerator {
  private readonly config: RuleGeneratorConfig;

  constructor(
    private readonly db: Database.Database,
    config?: Partial<RuleGeneratorConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze recent events and generate rules for recurring patterns.
   * 分析近期事件並為反覆出現的模式產生規則
   */
  generateRules(): RuleGenerationResult {
    const startTime = Date.now();

    const patterns = this.detectPatterns();
    let rulesGenerated = 0;
    let rulesUpdated = 0;

    this.db.transaction(() => {
      for (const pattern of patterns) {
        const existing = this.db
          .prepare('SELECT pattern_hash FROM generated_patterns WHERE pattern_hash = ?')
          .get(pattern.patternHash) as { pattern_hash: string } | undefined;

        if (existing) {
          this.updatePattern(pattern);
          rulesUpdated++;
        } else {
          this.createRuleFromPattern(pattern);
          rulesGenerated++;
        }
      }
    })();

    return {
      patternsAnalyzed: patterns.length,
      rulesGenerated,
      rulesUpdated,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Detect recurring patterns in enriched threat events.
   * 偵測豐富化威脅事件中的反覆模式
   */
  detectPatterns(): DetectedPattern[] {
    const sinceDate = new Date(
      Date.now() - this.config.analysisWindowHours * 60 * 60 * 1000
    ).toISOString();

    const rows = this.db
      .prepare(
        `SELECT attack_type, mitre_techniques, attack_source_ip, region, severity, timestamp
         FROM enriched_threats
         WHERE received_at > ?
         ORDER BY timestamp ASC`
      )
      .all(sinceDate) as Array<{
      attack_type: string;
      mitre_techniques: string;
      attack_source_ip: string;
      region: string;
      severity: string;
      timestamp: string;
    }>;

    // Group by (attack_type, sorted mitre_techniques)
    const grouped = new Map<
      string,
      {
        attackType: string;
        techniques: string[];
        ips: Set<string>;
        regions: Set<string>;
        severityCounts: Record<string, number>;
        occurrences: number;
        firstSeen: string;
        lastSeen: string;
      }
    >();

    for (const row of rows) {
      const techniques = (JSON.parse(row.mitre_techniques) as string[]).sort();
      const key = `${row.attack_type}|${techniques.join(',')}`;

      let group = grouped.get(key);
      if (!group) {
        group = {
          attackType: row.attack_type,
          techniques,
          ips: new Set<string>(),
          regions: new Set<string>(),
          severityCounts: {},
          occurrences: 0,
          firstSeen: row.timestamp,
          lastSeen: row.timestamp,
        };
        grouped.set(key, group);
      }

      group.ips.add(row.attack_source_ip);
      group.regions.add(row.region);
      group.severityCounts[row.severity] = (group.severityCounts[row.severity] ?? 0) + 1;
      group.occurrences++;
      if (row.timestamp > group.lastSeen) group.lastSeen = row.timestamp;
    }

    // Filter by thresholds
    const patterns: DetectedPattern[] = [];
    for (const group of grouped.values()) {
      if (
        group.occurrences >= this.config.minOccurrences &&
        group.ips.size >= this.config.minDistinctIPs
      ) {
        const patternHash = createHash('sha256')
          .update(group.attackType + group.techniques.join(','))
          .digest('hex')
          .slice(0, 16);

        patterns.push({
          attackType: group.attackType,
          mitreTechniques: group.techniques,
          patternHash,
          occurrences: group.occurrences,
          distinctIPs: group.ips.size,
          regions: [...group.regions],
          severityCounts: group.severityCounts,
          firstSeen: group.firstSeen,
          lastSeen: group.lastSeen,
        });
      }
    }

    return patterns;
  }

  /**
   * Get all generated patterns.
   * 取得所有已產生的模式
   */
  getGeneratedPatterns(): Array<{
    patternHash: string;
    attackType: string;
    mitreTechniques: string[];
    ruleId: string;
    occurrences: number;
    distinctIPs: number;
  }> {
    const rows = this.db
      .prepare(
        `SELECT pattern_hash, attack_type, mitre_techniques, rule_id, occurrences, distinct_ips
         FROM generated_patterns
         ORDER BY occurrences DESC`
      )
      .all() as Array<{
      pattern_hash: string;
      attack_type: string;
      mitre_techniques: string;
      rule_id: string;
      occurrences: number;
      distinct_ips: number;
    }>;

    return rows.map((r) => ({
      patternHash: r.pattern_hash,
      attackType: r.attack_type,
      mitreTechniques: JSON.parse(r.mitre_techniques) as string[],
      ruleId: r.rule_id,
      occurrences: r.occurrences,
      distinctIPs: r.distinct_ips,
    }));
  }

  // -------------------------------------------------------------------------
  // Private helpers / 私有輔助方法
  // -------------------------------------------------------------------------

  /** Create a new rule from a detected pattern */
  private createRuleFromPattern(pattern: DetectedPattern): void {
    const ruleId = `tc-auto-${pattern.patternHash}`;
    const severity = this.pickMaxSeverity(pattern.severityCounts);
    const sigmaYaml = this.generateSigmaYaml(pattern, ruleId, severity);

    // Insert into rules table
    this.db
      .prepare(
        `INSERT INTO rules (rule_id, rule_content, published_at, source)
         VALUES (?, ?, datetime('now'), 'threat-cloud-auto')
         ON CONFLICT(rule_id) DO UPDATE SET
           rule_content = excluded.rule_content,
           published_at = excluded.published_at,
           updated_at = datetime('now')`
      )
      .run(ruleId, sigmaYaml);

    // Insert into generated_patterns table
    this.db
      .prepare(
        `INSERT INTO generated_patterns
          (pattern_hash, attack_type, mitre_techniques, rule_id, occurrences, distinct_ips, first_seen, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        pattern.patternHash,
        pattern.attackType,
        JSON.stringify(pattern.mitreTechniques),
        ruleId,
        pattern.occurrences,
        pattern.distinctIPs,
        pattern.firstSeen,
        pattern.lastSeen
      );
  }

  /** Update an existing pattern's statistics */
  private updatePattern(pattern: DetectedPattern): void {
    this.db
      .prepare(
        `UPDATE generated_patterns SET
           occurrences = ?,
           distinct_ips = ?,
           last_seen = ?,
           updated_at = datetime('now')
         WHERE pattern_hash = ?`
      )
      .run(pattern.occurrences, pattern.distinctIPs, pattern.lastSeen, pattern.patternHash);

    // Also update the rule content
    const ruleId = `tc-auto-${pattern.patternHash}`;
    const severity = this.pickMaxSeverity(pattern.severityCounts);
    const sigmaYaml = this.generateSigmaYaml(pattern, ruleId, severity);

    this.db
      .prepare(
        `UPDATE rules SET rule_content = ?, published_at = datetime('now'), updated_at = datetime('now')
         WHERE rule_id = ?`
      )
      .run(sigmaYaml, ruleId);
  }

  /** Generate Sigma YAML rule content */
  private generateSigmaYaml(pattern: DetectedPattern, ruleId: string, severity: string): string {
    const tags = pattern.mitreTechniques.map((t) => {
      const tactic = TECHNIQUE_TACTIC_MAP[t] ?? 'unknown';
      return `  - attack.${tactic}\n  - attack.${t.toLowerCase()}`;
    });

    const regionList = pattern.regions.join(', ');

    return [
      `title: "Threat Cloud Auto: ${pattern.attackType} via ${pattern.mitreTechniques.join(', ')}"`,
      `id: ${ruleId}`,
      `status: experimental`,
      `author: Panguard Threat Cloud (auto-generated)`,
      `description: |`,
      `  Pattern observed ${pattern.occurrences} times from ${pattern.distinctIPs} distinct IPs across ${regionList}.`,
      `date: ${new Date().toISOString().slice(0, 10)}`,
      `logsource:`,
      `  product: panguard`,
      `  service: guard`,
      `detection:`,
      `  selection:`,
      `    category: ${pattern.attackType}`,
      `  condition: selection`,
      `level: ${severity}`,
      `tags:`,
      ...tags,
    ].join('\n');
  }

  /** Pick highest severity from counts */
  private pickMaxSeverity(severityCounts: Record<string, number>): string {
    for (const s of SEVERITY_ORDER) {
      if (severityCounts[s] && severityCounts[s] > 0) return s;
    }
    return 'medium';
  }

  // -------------------------------------------------------------------------
  // YARA Rule Generation / YARA 規則產生
  // -------------------------------------------------------------------------

  /**
   * Generate YARA rules from detected patterns and known IoC hashes.
   * 從偵測到的模式和已知 IoC 雜湊值產生 YARA 規則
   *
   * Generates rules based on:
   * - File hashes (SHA-256) from IoC store
   * - String patterns extracted from attack descriptions
   * All generated rules are marked `status: experimental`.
   */
  generateYaraRules(): RuleGenerationResult {
    const startTime = Date.now();

    const patterns = this.detectPatterns();
    let rulesGenerated = 0;
    let rulesUpdated = 0;

    this.db.transaction(() => {
      for (const pattern of patterns) {
        const yaraRuleId = `tc-yara-${pattern.patternHash}`;

        const existing = this.db
          .prepare('SELECT rule_id FROM rules WHERE rule_id = ?')
          .get(yaraRuleId) as { rule_id: string } | undefined;

        const hashes = this.getRelatedHashes(pattern.attackType);
        const yaraContent = this.generateYaraContent(pattern, yaraRuleId, hashes);

        if (existing) {
          this.db
            .prepare(
              `UPDATE rules SET rule_content = ?, published_at = datetime('now'), updated_at = datetime('now')
               WHERE rule_id = ?`
            )
            .run(yaraContent, yaraRuleId);
          rulesUpdated++;
        } else {
          this.db
            .prepare(
              `INSERT INTO rules (rule_id, rule_content, published_at, source)
               VALUES (?, ?, datetime('now'), 'threat-cloud-yara-auto')`
            )
            .run(yaraRuleId, yaraContent);
          rulesGenerated++;
        }
      }
    })();

    return {
      patternsAnalyzed: patterns.length,
      rulesGenerated,
      rulesUpdated,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get file hashes associated with an attack type from IoC store
   * 從 IoC 儲存庫取得與攻擊類型相關的檔案雜湊值
   */
  private getRelatedHashes(attackType: string): string[] {
    try {
      const rows = this.db
        .prepare(
          `SELECT DISTINCT ioc_value FROM ioc_store
           WHERE ioc_type = 'hash' AND source LIKE ?
           ORDER BY last_seen_at DESC
           LIMIT 20`
        )
        .all(`%${attackType}%`) as Array<{ ioc_value: string }>;

      return rows.map((r) => r.ioc_value);
    } catch {
      return [];
    }
  }

  /**
   * Generate YARA rule content from a detected pattern
   * 從偵測到的模式產生 YARA 規則內容
   */
  private generateYaraContent(
    pattern: DetectedPattern,
    ruleId: string,
    hashes: string[]
  ): string {
    const safeName = ruleId.replace(/[^a-zA-Z0-9_]/g, '_');
    const severity = this.pickMaxSeverity(pattern.severityCounts);
    const techniques = pattern.mitreTechniques.join(', ');
    const regionList = pattern.regions.join(', ');

    const lines: string[] = [
      `rule ${safeName}`,
      `{`,
      `    meta:`,
      `        description = "Threat Cloud Auto: ${pattern.attackType} via ${techniques}"`,
      `        author = "Panguard Threat Cloud (auto-generated)"`,
      `        date = "${new Date().toISOString().slice(0, 10)}"`,
      `        status = "experimental"`,
      `        severity = "${severity}"`,
      `        occurrences = "${pattern.occurrences}"`,
      `        distinct_ips = "${pattern.distinctIPs}"`,
      `        regions = "${regionList}"`,
      `        mitre = "${techniques}"`,
      ``,
    ];

    // Strings section
    const hasStrings = pattern.attackType.length > 3;
    const hasHashes = hashes.length > 0;

    if (hasStrings || hasHashes) {
      lines.push(`    strings:`);

      if (hasStrings) {
        // Generate string patterns from attack type keywords
        const keywords = pattern.attackType
          .split(/[_\-\s]+/)
          .filter((k) => k.length >= 3);
        keywords.forEach((kw, i) => {
          lines.push(`        $s${i} = "${kw}" ascii nocase`);
        });
      }

      if (hasHashes) {
        hashes.forEach((hash, i) => {
          // Only include hashes that look like valid hex strings
          if (/^[a-f0-9]{64}$/i.test(hash)) {
            const hexPairs = hash.match(/.{2}/g);
            if (hexPairs) {
              lines.push(`        $h${i} = { ${hexPairs.join(' ')} }`);
            }
          }
        });
      }

      lines.push(``);
    }

    // Condition section
    lines.push(`    condition:`);
    if (hasStrings && hasHashes) {
      lines.push(`        any of ($s*) or any of ($h*)`);
    } else if (hasStrings) {
      lines.push(`        any of ($s*)`);
    } else if (hasHashes) {
      lines.push(`        any of ($h*)`);
    } else {
      lines.push(`        false`);
    }
    lines.push(`}`);

    return lines.join('\n');
  }
}
