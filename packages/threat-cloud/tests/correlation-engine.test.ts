import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreatCloudDB } from '../src/database.js';
import { CorrelationEngine } from '../src/correlation-engine.js';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('CorrelationEngine', () => {
  let dbWrapper: ThreatCloudDB;
  let engine: CorrelationEngine;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'correlation-test-'));
    dbWrapper = new ThreatCloudDB(join(tempDir, 'test.db'));
    engine = new CorrelationEngine(dbWrapper.getDB(), {
      minEventsForCampaign: 3,
      minIPsForPatternCampaign: 3,
      timeWindowMinutes: 60,
      scanWindowHours: 24,
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
  // IP Cluster / IP 聚類
  // -------------------------------------------------------------------------

  it('should detect IP cluster campaign from same source IP', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    for (let i = 0; i < 4; i++) {
      const enriched = ThreatCloudDB.guardToEnriched({
        attackSourceIP: '10.0.0.1',
        attackType: 'brute_force',
        mitreTechnique: 'T1110',
        sigmaRuleMatched: `rule-${i}`,
        timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
        region: 'TW',
      });
      dbWrapper.insertEnrichedThreat(enriched);
    }

    const result = engine.scanForCampaigns();
    expect(result.newCampaigns).toBe(1);
    expect(result.eventsCorrelated).toBe(4);
  });

  it('should not create campaign with fewer than minEventsForCampaign', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    for (let i = 0; i < 2; i++) {
      const enriched = ThreatCloudDB.guardToEnriched({
        attackSourceIP: '10.0.0.1',
        attackType: 'scan',
        mitreTechnique: 'T1046',
        sigmaRuleMatched: `rule-${i}`,
        timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
        region: 'TW',
      });
      dbWrapper.insertEnrichedThreat(enriched);
    }

    const result = engine.scanForCampaigns();
    expect(result.newCampaigns).toBe(0);
    expect(result.eventsCorrelated).toBe(0);
  });

  it('should split events outside time window into separate clusters', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    // First cluster: 3 events within 10 minutes
    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: '10.0.0.1',
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-a-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    // Second cluster: 3 events 2 hours later (outside 60-min window)
    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: '10.0.0.1',
          attackType: 'brute_force',
          mitreTechnique: 'T1110',
          sigmaRuleMatched: `r-b-${i}`,
          timestamp: new Date(baseTime.getTime() + 2 * 3600_000 + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const result = engine.scanForCampaigns();
    expect(result.newCampaigns).toBe(2);
    expect(result.eventsCorrelated).toBe(6);
  });

  // -------------------------------------------------------------------------
  // Pattern Cluster / 模式聚類
  // -------------------------------------------------------------------------

  it('should detect pattern cluster from multiple IPs with same attack', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    // 3 distinct IPs, same attack pattern (minIPsForPatternCampaign = 3)
    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `192.168.1.${i + 1}`,
          attackType: 'ransomware',
          mitreTechnique: 'T1486',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const result = engine.scanForCampaigns();
    expect(result.newCampaigns).toBe(1);
    expect(result.eventsCorrelated).toBe(3);
  });

  it('should not create pattern campaign with fewer than minIPsForPatternCampaign', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    // Only 2 distinct IPs
    for (let i = 0; i < 2; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: `192.168.1.${i + 1}`,
          attackType: 'ransomware',
          mitreTechnique: 'T1486',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        })
      );
    }

    const result = engine.scanForCampaigns();
    expect(result.newCampaigns).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Campaign CRUD / Campaign 增刪查
  // -------------------------------------------------------------------------

  it('should retrieve campaign by ID after scan', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    for (let i = 0; i < 3; i++) {
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

    engine.scanForCampaigns();

    const campaigns = engine.listCampaigns({ page: 1, limit: 10 });
    expect(campaigns.items.length).toBe(1);

    const campaign = engine.getCampaign(campaigns.items[0].campaignId);
    expect(campaign).not.toBeNull();
    expect(campaign!.campaignType).toBe('ip_cluster');
    expect(campaign!.eventCount).toBe(3);
    expect(campaign!.uniqueIPs).toBe(1);
    expect(campaign!.attackTypes).toContain('brute_force');
    expect(campaign!.mitreTechniques).toContain('T1110');
  });

  it('should return campaign events', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: '10.0.0.1',
          attackType: 'scan',
          mitreTechnique: 'T1046',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'JP',
        })
      );
    }

    engine.scanForCampaigns();

    const campaigns = engine.listCampaigns({ page: 1, limit: 10 });
    const events = engine.getCampaignEvents(campaigns.items[0].campaignId);
    expect(events.length).toBe(3);
    expect(events[0].attackSourceIP).toBe('10.0.0.1');
  });

  it('should return null for non-existing campaign', () => {
    expect(engine.getCampaign('C-00000000-deadbeef')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Campaign Stats / Campaign 統計
  // -------------------------------------------------------------------------

  it('should return campaign stats', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    for (let i = 0; i < 4; i++) {
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

    engine.scanForCampaigns();

    const stats = engine.getCampaignStats();
    expect(stats.totalCampaigns).toBe(1);
    expect(stats.activeCampaigns).toBe(1);
    expect(stats.totalCorrelatedEvents).toBe(4);
    expect(stats.topAttackTypes.length).toBeGreaterThan(0);
    expect(stats.topAttackTypes[0].type).toBe('brute_force');
  });

  // -------------------------------------------------------------------------
  // Edge Cases / 邊界條件
  // -------------------------------------------------------------------------

  it('should handle empty database', () => {
    const result = engine.scanForCampaigns();
    expect(result.newCampaigns).toBe(0);
    expect(result.updatedCampaigns).toBe(0);
    expect(result.eventsCorrelated).toBe(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should not re-correlate already assigned events', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    for (let i = 0; i < 4; i++) {
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

    const first = engine.scanForCampaigns();
    expect(first.newCampaigns).toBe(1);

    // Second scan should find nothing new
    const second = engine.scanForCampaigns();
    expect(second.newCampaigns).toBe(0);
    expect(second.eventsCorrelated).toBe(0);
  });

  it('should pick max severity for campaign', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');
    const severities = ['low', 'medium', 'critical'];

    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat({
        ...ThreatCloudDB.guardToEnriched({
          attackSourceIP: '10.0.0.1',
          attackType: 'mixed',
          mitreTechnique: 'T1059',
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: 'TW',
        }),
        severity: severities[i],
      });
    }

    engine.scanForCampaigns();

    const campaigns = engine.listCampaigns({ page: 1, limit: 10 });
    expect(campaigns.items[0].severity).toBe('critical');
  });

  it('should list campaigns with pagination', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');

    // Create 2 campaigns from 2 different IPs
    for (const ip of ['10.0.0.1', '10.0.0.2']) {
      for (let i = 0; i < 3; i++) {
        dbWrapper.insertEnrichedThreat(
          ThreatCloudDB.guardToEnriched({
            attackSourceIP: ip,
            attackType: 'scan',
            mitreTechnique: 'T1046',
            sigmaRuleMatched: `r-${ip}-${i}`,
            timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
            region: 'TW',
          })
        );
      }
    }

    engine.scanForCampaigns();

    const page1 = engine.listCampaigns({ page: 1, limit: 1 });
    expect(page1.items.length).toBe(1);
    expect(page1.total).toBe(2);
    expect(page1.hasMore).toBe(true);

    const page2 = engine.listCampaigns({ page: 2, limit: 1 });
    expect(page2.items.length).toBe(1);
    expect(page2.hasMore).toBe(false);
  });

  it('should collect multiple attack types and regions', () => {
    const baseTime = new Date('2026-02-28T10:00:00Z');
    const attacks = [
      { type: 'brute_force', technique: 'T1110', region: 'TW' },
      { type: 'scan', technique: 'T1046', region: 'JP' },
      { type: 'exploit', technique: 'T1059', region: 'US' },
    ];

    for (let i = 0; i < 3; i++) {
      dbWrapper.insertEnrichedThreat(
        ThreatCloudDB.guardToEnriched({
          attackSourceIP: '10.0.0.1',
          attackType: attacks[i].type,
          mitreTechnique: attacks[i].technique,
          sigmaRuleMatched: `r-${i}`,
          timestamp: new Date(baseTime.getTime() + i * 60_000).toISOString(),
          region: attacks[i].region,
        })
      );
    }

    engine.scanForCampaigns();

    const campaigns = engine.listCampaigns({ page: 1, limit: 10 });
    const campaign = campaigns.items[0];
    expect(campaign.attackTypes).toHaveLength(3);
    expect(campaign.attackTypes).toContain('brute_force');
    expect(campaign.attackTypes).toContain('scan');
    expect(campaign.attackTypes).toContain('exploit');
    expect(campaign.regions).toHaveLength(3);
    expect(campaign.mitreTechniques).toHaveLength(3);
  });
});
