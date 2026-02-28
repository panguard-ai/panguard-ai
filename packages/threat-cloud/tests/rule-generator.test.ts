import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreatCloudDB } from '../src/database.js';
import { RuleGenerator } from '../src/rule-generator.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('RuleGenerator', () => {
  let dbWrapper: ThreatCloudDB;
  let generator: RuleGenerator;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'rule-gen-test-'));
    dbWrapper = new ThreatCloudDB(join(tempDir, 'test.db'));
    generator = new RuleGenerator(dbWrapper.getDB(), {
      minOccurrences: 3,
      minDistinctIPs: 2,
      analysisWindowHours: 24,
    });
  });

  afterEach(() => {
    dbWrapper.close();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  // -------------------------------------------------------------------------
  // Pattern Detection / 模式偵測
  // -------------------------------------------------------------------------

  it('should detect a pattern exceeding thresholds', () => {
    const baseTime = new Date();

    for (let i = 0; i < 5; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${i + 1}`,
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const patterns = generator.detectPatterns();
    expect(patterns.length).toBe(1);
    expect(patterns[0].attackType).toBe('brute_force');
    expect(patterns[0].occurrences).toBe(5);
    expect(patterns[0].distinctIPs).toBe(5);
    expect(patterns[0].mitreTechniques).toEqual(['T1110']);
  });

  it('should not detect pattern below occurrence threshold', () => {
    const baseTime = new Date();

    // Only 2 events (threshold is 3)
    for (let i = 0; i < 2; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${i + 1}`,
          attackType: 'scan',
          mitreTechnique: 'T1046',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const patterns = generator.detectPatterns();
    expect(patterns.length).toBe(0);
  });

  it('should not detect pattern below distinct IP threshold', () => {
    const baseTime = new Date();

    // 5 events but all from same IP (threshold is 2 distinct IPs)
    for (let i = 0; i < 5; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: '10.0.0.1',
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const patterns = generator.detectPatterns();
    expect(patterns.length).toBe(0);
  });

  it('should group by attack_type + mitre_techniques combination', () => {
    const baseTime = new Date();

    // Group 1: brute_force + T1110 (4 events, 3 IPs)
    for (let i = 0; i < 4; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${(i % 3) + 1}`,
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-bf-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    // Group 2: scan + T1046 (3 events, 2 IPs)
    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `192.168.1.${(i % 2) + 1}`,
          attackType: 'scan',
          mitreTechnique: 'T1046',
          sigmaRuleMatched: `r-sc-${i}`,
          timestamp: new Date(baseTime.getTime() + (i + 10) * 60_000).toISOString(),
          region: 'JP',
        })
      );
    }

    const patterns = generator.detectPatterns();
    expect(patterns.length).toBe(2);
    const types = patterns.map((p) => p.attackType).sort();
    expect(types).toEqual(['brute_force', 'scan']);
  });

  // -------------------------------------------------------------------------
  // Rule Generation / 規則產生
  // -------------------------------------------------------------------------

  it('should generate Sigma rules from detected patterns', () => {
    const baseTime = new Date();

    for (let i = 0; i < 5; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${i + 1}`,
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const result = generator.generateRules();
    expect(result.rulesGenerated).toBe(1);
    expect(result.rulesUpdated).toBe(0);
    expect(result.patternsAnalyzed).toBe(1);

    // Verify rule was inserted into rules table
    const rules = dbWrapper.getAllRules();
    const autoRule = rules.find((r) => r.ruleId.startsWith('tc-auto-'));
    expect(autoRule).toBeDefined();
    expect(autoRule!.ruleContent).toContain('brute_force');
    expect(autoRule!.ruleContent).toContain('T1110');
    expect(autoRule!.ruleContent).toContain('Panguard Threat Cloud');
    expect(autoRule!.source).toBe('threat-cloud-auto');
  });

  it('should store pattern metadata in generated_patterns table', () => {
    const baseTime = new Date();

    for (let i = 0; i < 4; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${i + 1}`,
          attackType: 'ransomware',
          mitreTechnique: 'T1486',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    generator.generateRules();

    const patterns = generator.getGeneratedPatterns();
    expect(patterns.length).toBe(1);
    expect(patterns[0].attackType).toBe('ransomware');
    expect(patterns[0].mitreTechniques).toEqual(['T1486']);
    expect(patterns[0].occurrences).toBe(4);
    expect(patterns[0].distinctIPs).toBe(4);
    expect(patterns[0].ruleId).toMatch(/^tc-auto-/);
  });

  it('should update existing pattern on re-run', () => {
    const baseTime = new Date();

    // First batch: 3 events
    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${i + 1}`,
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-batch1-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const first = generator.generateRules();
    expect(first.rulesGenerated).toBe(1);

    // Second batch: add more events
    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.1.${i + 1}`,
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-batch2-${i}`,
          timestamp: new Date(baseTime.getTime() + (i + 10) * 60_000).toISOString(),
          region: 'JP',
        })
      );
    }

    const second = generator.generateRules();
    expect(second.rulesGenerated).toBe(0);
    expect(second.rulesUpdated).toBe(1);

    // Verify updated counts
    const patterns = generator.getGeneratedPatterns();
    expect(patterns[0].occurrences).toBe(6);
    expect(patterns[0].distinctIPs).toBe(6);
  });

  it('should generate correct Sigma YAML format', () => {
    const baseTime = new Date();

    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat({
        ...ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${i + 1}`,
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        }),
        severity: i === 0 ? 'critical' : 'medium',
      });
    }

    generator.generateRules();

    const rules = dbWrapper.getAllRules();
    const autoRule = rules.find((r) => r.ruleId.startsWith('tc-auto-'))!;
    const content = autoRule.ruleContent;

    expect(content).toContain('title:');
    expect(content).toContain('status: experimental');
    expect(content).toContain('detection:');
    expect(content).toContain('EventType: brute_force');
    expect(content).toContain('condition: selection');
    expect(content).toContain('level: critical'); // max severity
    expect(content).toContain('attack.credential_access');
    expect(content).toContain('attack.t1110');
  });

  // -------------------------------------------------------------------------
  // Edge Cases / 邊界條件
  // -------------------------------------------------------------------------

  it('should handle empty database', () => {
    const result = generator.generateRules();
    expect(result.patternsAnalyzed).toBe(0);
    expect(result.rulesGenerated).toBe(0);
    expect(result.rulesUpdated).toBe(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should collect regions from multiple events', () => {
    const baseTime = new Date();
    const regions = ['TW', 'JP', 'US'];

    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `10.0.0.${i + 1}`,
          attackType: 'scan',
          mitreTechnique: 'T1046',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: regions[i],
        })
      );
    }

    const patterns = generator.detectPatterns();
    expect(patterns.length).toBe(1);
    expect(patterns[0].regions.sort()).toEqual(['JP', 'TW', 'US']);
  });
});
