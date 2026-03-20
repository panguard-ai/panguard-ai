/**
 * rule-sync.ts - Threat Cloud synchronization extracted from GuardEngine
 *
 * Contains:
 * - syncThreatCloud() - periodic ATR/IP/domain/whitelist/blacklist sync
 * - getSkillThreatSubmitter() - bound callback for SkillWatcher
 * - getSkillBlacklistChecker() - bound callback for SkillWatcher
 * - setupCloudSyncTimer() - timer creation helper
 *
 * @module @panguard-ai/panguard-guard/rule-sync
 */

import { createLogger } from '@panguard-ai/core';
import type { ThreatIntelFeedManager } from '@panguard-ai/core';
import type { GuardConfig } from './types.js';
import type { ThreatCloudClient } from './threat-cloud/index.js';
import type { GuardATREngine } from './engines/atr-engine.js';

const logger = createLogger('panguard-guard:rule-sync');

/** Dependencies needed for cloud sync operations */
export interface CloudSyncDeps {
  readonly atrEngine: GuardATREngine;
  readonly threatCloud: ThreatCloudClient;
  readonly feedManager: ThreatIntelFeedManager;
  readonly config: GuardConfig;
}

/**
 * Periodic Threat Cloud sync: re-fetch rules and blocklist.
 * Syncs ATR rules; IP and domain blocklists;
 * skill whitelist and blacklist.
 */
export async function syncThreatCloud(deps: CloudSyncDeps): Promise<void> {
  const { atrEngine, threatCloud, feedManager } = deps;

  try {
    // Sync ATR rules from Threat Cloud
    let newATRRules = 0;
    try {
      const atrRules = await threatCloud.fetchATRRules();
      for (const rule of atrRules) {
        try {
          const parsed = JSON.parse(rule.ruleContent) as import('@panguard-ai/atr').ATRRule;
          if (parsed.id && parsed.title && parsed.detection) {
            atrEngine.addCloudRule(parsed);
            newATRRules++;
          }
        } catch (parseErr: unknown) {
          logger.warn(
            `Skipping invalid ATR rule from cloud: ${rule.ruleId ?? 'unknown'} — ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
          );
        }
      }
      if (newATRRules > 0) {
        logger.info(
          `ATR cloud sync: ${newATRRules} rules updated / ATR 雲端同步: ${newATRRules} 條規則更新`
        );
      }
    } catch (err: unknown) {
      logger.warn(`ATR cloud sync failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Refresh IP blocklist
    const ips = await threatCloud.fetchBlocklist();
    const addedIPs =
      ips.length > 0 ? feedManager.addExternalIPs(ips, 'threat_cloud_blocklist', 85) : 0;

    // Refresh domain blocklist
    let addedDomains = 0;
    try {
      const domains = await threatCloud.fetchDomainBlocklist();
      addedDomains =
        domains.length > 0
          ? feedManager.addExternalDomains(domains, 'threat_cloud_blocklist', 85)
          : 0;
    } catch (err: unknown) {
      logger.warn(
        `Domain blocklist sync failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Report locally whitelisted skills to Threat Cloud
    try {
      const localSkills = atrEngine
        .getWhitelistManager()
        .getAll()
        .filter((s) => s.source === 'fingerprint' || s.source === 'manual');
      for (const skill of localSkills) {
        await threatCloud.reportSafeSkill(skill.name, skill.fingerprintHash);
      }
    } catch (err: unknown) {
      logger.warn(
        `Skill whitelist upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Sync community skill whitelist
    let importedSkills = 0;
    try {
      const communitySkills = await threatCloud.fetchSkillWhitelist();
      if (communitySkills.length > 0) {
        importedSkills = atrEngine
          .getWhitelistManager()
          .importCommunityWhitelist(communitySkills.map((s) => ({ name: s.name, hash: s.hash })));
      }
    } catch (err: unknown) {
      logger.warn(
        `Skill whitelist sync failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Sync community skill blacklist
    let revokedSkills = 0;
    try {
      const blacklist = await threatCloud.fetchSkillBlacklist();
      const whitelistMgr = atrEngine.getWhitelistManager();
      for (const entry of blacklist) {
        const wasRevoked = whitelistMgr.revoke(
          entry.skillName,
          `community-blacklist: ${entry.reportCount} reports, avg risk ${entry.avgRiskScore}`
        );
        if (wasRevoked) revokedSkills++;
      }
      if (revokedSkills > 0) {
        logger.warn(
          `Community blacklist: ${revokedSkills} skill(s) revoked / ` +
            `社群黑名單: ${revokedSkills} 個技能已撤銷`
        );
      }
    } catch (err: unknown) {
      logger.warn(
        `Skill blacklist sync failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    logger.info(
      `Threat Cloud sync: ${newATRRules} ATR, ` +
        `${addedIPs} IPs, ${addedDomains} domains, ${importedSkills} whitelist, ${revokedSkills} blacklist / ` +
        `Threat Cloud 同步: ${newATRRules} ATR, ` +
        `${addedIPs} IP, ${addedDomains} 網域, ${importedSkills} 白名單, ${revokedSkills} 黑名單`
    );
  } catch (err: unknown) {
    logger.warn(`Threat Cloud sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Create a cloud sync interval timer that calls syncThreatCloud every hour.
 * Returns the timer handle (caller is responsible for clearing it).
 */
export function setupCloudSyncTimer(deps: CloudSyncDeps): ReturnType<typeof setInterval> {
  return setInterval(
    () => {
      void syncThreatCloud(deps);
    },
    60 * 60 * 1000
  ); // 1 hour
}

/**
 * Get a skill threat submitter function for SkillWatcher integration.
 * Returns a bound callback that submits to Threat Cloud.
 */
export function getSkillThreatSubmitter(
  threatCloud: ThreatCloudClient
): (submission: {
  skillHash: string;
  skillName: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findingSummaries?: Array<{ id: string; category: string; severity: string; title: string }>;
}) => Promise<boolean> {
  return (submission) => threatCloud.submitSkillThreat(submission);
}

/**
 * Get an ATR proposal submitter function for SkillWatcher flywheel integration.
 * Bridges skill audit findings into the ATR rule generation pipeline.
 */
export function getATRProposalSubmitter(
  threatCloud: ThreatCloudClient
): (proposal: {
  patternHash: string;
  ruleContent: string;
  llmProvider: string;
  llmModel: string;
  selfReviewVerdict: string;
}) => Promise<boolean> {
  return (proposal) => threatCloud.submitATRProposal(proposal);
}

/**
 * Get a skill blacklist checker function for SkillWatcher integration.
 * Checks if a skill name appears in the community blacklist from Threat Cloud.
 * Uses a 5-minute in-memory cache to avoid hitting TC on every check.
 */
export function getSkillBlacklistChecker(
  threatCloud: ThreatCloudClient
): (skillName: string) => Promise<boolean> {
  const BLACKLIST_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  let cachedBlacklist: Array<{ skillName: string }> = [];
  let cacheTimestamp = 0;

  return async (skillName: string): Promise<boolean> => {
    if (Date.now() - cacheTimestamp > BLACKLIST_CACHE_TTL) {
      cachedBlacklist = await threatCloud.fetchSkillBlacklist();
      cacheTimestamp = Date.now();
    }
    const normalized = skillName.toLowerCase().trim().replace(/\s+/g, '-');
    return cachedBlacklist.some(
      (entry) => entry.skillName.toLowerCase().trim().replace(/\s+/g, '-') === normalized
    );
  };
}
