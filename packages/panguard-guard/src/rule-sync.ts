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

import { hostname, platform } from 'node:os';
import { createLogger } from '@panguard-ai/core';
import type { ThreatIntelFeedManager } from '@panguard-ai/core';
import type { GuardConfig } from './types.js';
import type { ThreatCloudClient } from './threat-cloud/index.js';
import type { GuardATREngine } from './engines/atr-engine.js';

const logger = createLogger('panguard-guard:rule-sync');

/** Track last sync time for incremental blacklist/whitelist fetching */
let lastBlacklistSync: string | undefined;
let lastWhitelistSync: string | undefined;
/** First sync always does full fetch, then switches to incremental */
let isFirstSync = true;

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
    // NOTE: Detection RULES are intentionally NOT pulled from Threat Cloud here.
    // Live-applying arbitrary rule content from a network relay into the engine
    // is a supply-chain attack surface — a compromised or MITM'd relay could push
    // ReDoS patterns or auto-blocking rules to every client every few minutes with
    // no review. Rules ship bundled with the npm package (integrity-verified,
    // immutable, publicly auditable) and change only via `pga upgrade`; a daily
    // npm version check (checkForRuleUpdates) NOTIFIES when a newer published
    // ruleset is available. The feeds below are threat INDICATORS (IP/domain
    // blocklists, community skill lists), not executable detection logic.

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

    // Report locally whitelisted skills to Threat Cloud (batch)
    try {
      const localSkills = atrEngine
        .getWhitelistManager()
        .getAll()
        .filter((s) => s.source === 'fingerprint' || s.source === 'manual');
      if (localSkills.length > 0) {
        await threatCloud.reportSafeSkillsBatch(
          localSkills.map((s) => ({ skillName: s.name, fingerprintHash: s.fingerprintHash }))
        );
      }
    } catch (err: unknown) {
      logger.warn(
        `Skill whitelist upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Sync community skill whitelist (incremental after first sync)
    let importedSkills = 0;
    try {
      const since = isFirstSync ? undefined : lastWhitelistSync;
      const communitySkills = await threatCloud.fetchSkillWhitelist(since);
      if (communitySkills.length > 0) {
        importedSkills = atrEngine
          .getWhitelistManager()
          .importCommunityWhitelist(communitySkills.map((s) => ({ name: s.name, hash: s.hash })));
      }
      lastWhitelistSync = new Date().toISOString();
    } catch (err: unknown) {
      logger.warn(
        `Skill whitelist sync failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Sync community skill blacklist (incremental after first sync)
    let revokedSkills = 0;
    try {
      const since = isFirstSync ? undefined : lastBlacklistSync;
      const blacklist = await threatCloud.fetchSkillBlacklist(since);
      const whitelistMgr = atrEngine.getWhitelistManager();
      for (const entry of blacklist) {
        const wasRevoked = whitelistMgr.revoke(
          entry.skillName,
          `community-blacklist: ${entry.reportCount} reports, avg risk ${entry.avgRiskScore}`
        );
        if (wasRevoked) revokedSkills++;
      }
      if (revokedSkills > 0) {
        logger.warn(`Community blacklist: ${revokedSkills} skill(s) revoked`);
      }
      lastBlacklistSync = new Date().toISOString();
    } catch (err: unknown) {
      logger.warn(
        `Skill blacklist sync failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // After first full sync, switch to incremental
    isFirstSync = false;

    // Send device heartbeat to TC for fleet tracking
    try {
      const deviceId = threatCloud.getClientId();
      await threatCloud.sendHeartbeat({
        deviceId,
        orgId: deviceId, // Single-user: org = device until orgs are configured
        hostname: hostname(),
        osType: platform(),
        agentCount: atrEngine.getRuleCount(),
        guardVersion: 'guard',
      });
    } catch (err: unknown) {
      logger.warn(`Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    logger.info(
      `Threat Cloud indicator sync: ${addedIPs} IPs, ${addedDomains} domains, ` +
        `${importedSkills} whitelist, ${revokedSkills} blacklist`
    );
  } catch (err: unknown) {
    logger.warn(`Threat Cloud sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Create a cloud sync interval timer that calls syncThreatCloud every 5 minutes.
 * Returns the timer handle (caller is responsible for clearing it).
 */
export function setupCloudSyncTimer(deps: CloudSyncDeps): ReturnType<typeof setInterval> {
  return setInterval(
    () => {
      void syncThreatCloud(deps);
    },
    5 * 60 * 1000
  ); // 5 minutes — fast enough for near-realtime protection
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

/** Read the bundled agent-threat-rules version (filesystem walk-up, immune to
 * the package's ESM `exports` map which blocks require.resolve of package.json). */
async function readBundledAtrVersion(): Promise<string | null> {
  try {
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const { existsSync, readFileSync } = await import('node:fs');
    let dir = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 12; i++) {
      const pkgPath = join(dir, 'node_modules', 'agent-threat-rules', 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
        return pkg.version ?? null;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  } catch {
    return null;
  }
}

/** Compare dotted version strings; true iff `a` is strictly newer than `b`. */
function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export interface RuleUpdateStatus {
  readonly updateAvailable: boolean;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly checkedAt: string;
}

/**
 * Daily rule-update CHECK — notify-only. Queries the public npm registry for the
 * latest published agent-threat-rules version and compares it to the version
 * bundled with this install. It does NOT download or apply anything: detection
 * rules are the engine's trust root and change only via an explicit,
 * npm-integrity-verified `pga upgrade`. The result is logged and written to
 * <dataDir>/rule-update.json so the dashboard and CLI can surface it.
 */
export async function checkForRuleUpdates(deps: CloudSyncDeps): Promise<RuleUpdateStatus> {
  const checkedAt = new Date().toISOString();
  const currentVersion = await readBundledAtrVersion();
  let latestVersion: string | null = null;
  try {
    const res = await fetch('https://registry.npmjs.org/agent-threat-rules/latest', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const body = (await res.json()) as { version?: string };
      latestVersion = body.version ?? null;
    }
  } catch (err: unknown) {
    logger.warn(`Rule update check failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const updateAvailable =
    !!currentVersion && !!latestVersion && isNewerVersion(latestVersion, currentVersion);

  if (updateAvailable) {
    logger.info(
      `New detection rules available: agent-threat-rules ${currentVersion} -> ${latestVersion}. ` +
        `Run "pga upgrade" to update — rules are verified by npm and never auto-applied.`
    );
  }

  // Persist for the dashboard / CLI to surface (best-effort, owner-only perms).
  try {
    const { writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const status: RuleUpdateStatus = { updateAvailable, currentVersion, latestVersion, checkedAt };
    writeFileSync(join(deps.config.dataDir, 'rule-update.json'), JSON.stringify(status, null, 2), {
      mode: 0o600,
    });
  } catch {
    /* best-effort surface; the log line above is the primary signal */
  }

  return { updateAvailable, currentVersion, latestVersion, checkedAt };
}

/**
 * Create a DAILY rule-update-check timer (notify-only). Rules are not a
 * real-time feed; the integrity-checked npm registry is the source of truth, so
 * checking once a day is both sufficient and far smaller an attack surface than
 * a high-frequency live pull. Returns the timer handle (caller clears it).
 */
export function setupRuleUpdateCheckTimer(deps: CloudSyncDeps): ReturnType<typeof setInterval> {
  return setInterval(
    () => {
      void checkForRuleUpdates(deps);
    },
    24 * 60 * 60 * 1000
  );
}
