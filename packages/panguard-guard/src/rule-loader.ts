/**
 * rule-loader.ts - Rule initialization and loading logic extracted from GuardEngine
 *
 * Contains:
 * - autoDetectLLM() re-exported from llm-detect.ts
 * - Rule engine / ATR initialization helpers
 * - Bundled rule loading (loadAllRules)
 * - getRuleCounts()
 *
 * @module @panguard-ai/panguard-guard/rule-loader
 */

import { join } from 'node:path';
import { createPublicKey, verify as edVerify } from 'node:crypto';
import {
  createLogger,
  ThreatIntelFeedManager,
  setFeedManager,
  SmartRouter,
  KnowledgeDistiller,
} from '@panguard-ai/core';
import type { QuotaTier } from '@panguard-ai/core';
import type { GuardConfig, LicenseTier, AnalyzeLLM } from './types.js';
import { TIER_FEATURES } from './types.js';

import { DetectAgent, AnalyzeAgent, RespondAgent, ReportAgent } from './agent/index.js';
import { getAuditKey } from './audit/index.js';
import { loadBaseline } from './memory/index.js';
import { InvestigationEngine } from './investigation/index.js';
import { ThreatCloudClient } from './threat-cloud/index.js';
import { validateLicense } from './license/index.js';
// Detection handled by ATR Engine
import { GuardATREngine } from './engines/atr-engine.js';
import { ATRDrafter } from './engines/atr-drafter.js';
import { PlaybookEngine } from './playbook/index.js';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const logger = createLogger('panguard-guard:rule-loader');

/** Result of initializing all engines and agents */
export interface InitEnginesResult {
  readonly atrEngine: GuardATREngine;
  readonly detectAgent: DetectAgent;
  readonly analyzeAgent: AnalyzeAgent;
  readonly respondAgent: RespondAgent;
  readonly reportAgent: ReportAgent;
  readonly investigationEngine: InvestigationEngine;
  readonly threatCloud: ThreatCloudClient;
  readonly feedManager: ThreatIntelFeedManager;
  readonly smartRouter: SmartRouter | null;
  readonly knowledgeDistiller: KnowledgeDistiller | null;
  readonly atrDrafter: ATRDrafter | null;
  readonly baseline: import('./types.js').EnvironmentBaseline;
  readonly baselinePath: string;
  readonly license: { tier: LicenseTier; isValid: boolean };
}

/**
 * Locate the bundled playbooks directory by walking up from this file's location.
 */
function findPlaybooksDir(): string | undefined {
  try {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    let dir = thisDir;
    for (let i = 0; i < 8; i++) {
      const candidate = join(dir, 'config', 'playbooks');
      if (existsSync(candidate)) {
        return candidate;
      }
      dir = dirname(dir);
    }
  } catch {
    // fileURLToPath may fail in some environments
  }
  return undefined;
}

/**
 * Initialize all engines, agents, and shared infrastructure for GuardEngine.
 * This replaces the constructor body of the old monolith.
 */
export async function initEngines(
  config: GuardConfig,
  llm: AnalyzeLLM | null
): Promise<InitEnginesResult> {
  const baselinePath = join(config.dataDir, 'baseline.json');
  const baseline = loadBaseline(baselinePath);

  // Validate license
  let license = await validateLicense(config.licenseKey ?? '');

  if (config.cliTier) {
    const cliTierMap: Record<string, LicenseTier> = {
      community: 'free',
      solo: 'pro',
      pro: 'pro',
      business: 'enterprise',
      enterprise: 'enterprise',
    };
    const mappedTier = cliTierMap[config.cliTier] ?? 'free';
    const tierLevels: Record<LicenseTier, number> = {
      free: 0,
      community: 0,
      pro: 1,
      pilot: 1,
      enterprise: 2,
    };
    const keyTierLevel = tierLevels[license.tier] ?? 0;
    const cliTierLevel = tierLevels[mappedTier] ?? 0;

    if (cliTierLevel > keyTierLevel) {
      license = {
        ...license,
        tier: mappedTier,
        features: [...TIER_FEATURES[mappedTier]],
        isValid: true,
      };
    }
  }

  logger.info(
    `License: ${license.tier} tier (valid: ${license.isValid}) / ` +
      `授權: ${license.tier} 等級 (有效: ${license.isValid})`
  );

  const atrEngine = new GuardATREngine({
    rulesDir: join(config.dataDir, 'atr-rules'),
    hotReload: true,
    whitelist: {
      persistPath: join(config.dataDir, 'skill-whitelist.json'),
      staticSkills: config.trustedSkills ?? [],
      autoPromoteStable: true,
    },
  });

  const detectAgent = new DetectAgent();
  // Bring-your-own: the semantic layer is available on any tier once the operator configures a
  // model (cloud or local). It is advisory only — never auto-blocks (see AnalyzeAgent).
  const analyzeLLM = llm;
  const analyzeAgent = new AnalyzeAgent(analyzeLLM);

  let smartRouter: SmartRouter | null = null;
  let knowledgeDistiller: KnowledgeDistiller | null = null;
  if (analyzeLLM) {
    const tierToQuota: Record<LicenseTier, string> = {
      free: 'free',
      community: 'free',
      pro: 'pro',
      pilot: 'pro',
      enterprise: 'business',
    };
    const quotaTier = (tierToQuota[license.tier] ?? 'free') as unknown as QuotaTier;

    smartRouter = new SmartRouter({
      tier: quotaTier,
    });

    knowledgeDistiller = new KnowledgeDistiller({
      onRuleDistilled: (rule) => {
        logger.info(
          `Knowledge distilled: ${rule.ruleId} (confidence: ${rule.aiConfidence}) / ` +
            `知識蒸餾: ${rule.ruleId} (信心: ${rule.aiConfidence})`
        );
      },
    });
  }

  // Resolve the tamper-evident audit HMAC key once (keychain-first, file
  // fallback). getAuditKey never throws; on total failure it yields an in-memory
  // key so audit signing still works for the life of the process. Shared by the
  // action-manifest chain (RespondAgent) and the events chain (ReportAgent).
  const auditKey = await getAuditKey();

  // EnforcementPolicy: take from config or fall back to the conservative
  // DEFAULT_ENFORCEMENT_POLICY (all OS actions OFF) defined in safety-rules.ts.
  // Operators must explicitly opt in to enforcement via GuardConfig.enforcementPolicy.
  const respondAgent = new RespondAgent(
    config.actionPolicy,
    config.mode,
    [],
    config.dataDir,
    config.enforcementPolicy,
    auditKey
  );
  respondAgent.setWhitelistManager(atrEngine.getWhitelistManager());

  try {
    const playbookEngine = new PlaybookEngine();
    const playbooksDir = findPlaybooksDir();
    if (playbooksDir) {
      playbookEngine.loadFromDir(playbooksDir);
      respondAgent.setPlaybookEngine(playbookEngine);
      logger.info(
        `PlaybookEngine wired: ${playbookEngine.count} playbooks loaded from ${playbooksDir} / ` +
          `PlaybookEngine 已連接: 從 ${playbooksDir} 載入 ${playbookEngine.count} 個劇本`
      );
    } else {
      logger.warn(
        'PlaybookEngine: no bundled playbooks directory found, skipping / ' +
          'PlaybookEngine: 找不到內建劇本目錄，跳過'
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(
      `PlaybookEngine initialization failed, continuing without playbooks: ${msg} / ` +
        `PlaybookEngine 初始化失敗，將在無劇本的情況下繼續: ${msg}`
    );
  }

  const reportAgent = new ReportAgent(
    join(config.dataDir, 'events.jsonl'),
    config.mode,
    undefined,
    auditKey
  );
  const investigationEngine = new InvestigationEngine(baseline);

  // Auto-provision TC client key so a fresh `pga up` becomes a Threat Cloud sensor
  // without requiring the user to pre-configure an API key. If the endpoint is
  // unreachable or opt-out env vars are set, create() falls back to offline mode.
  const threatCloud = await ThreatCloudClient.create(
    config.threatCloudEndpoint,
    config.dataDir,
    config.threatCloudApiKey
  );

  const feedManager = new ThreatIntelFeedManager({
    abuseIPDBKey: process.env['ABUSEIPDB_KEY'],
  });
  setFeedManager(feedManager);

  // ATRDrafter's sole output is an OUTBOUND submission of drafted rule proposals
  // to Threat Cloud. That is collective-defense sharing, so it only runs when the
  // user has explicitly opted in (=== true, never !== false). No opt-in => no
  // drafter is created, so nothing is drafted and nothing is uploaded.
  let atrDrafter: ATRDrafter | null = null;
  if (analyzeLLM && config.threatCloudUploadEnabled === true) {
    atrDrafter = new ATRDrafter(analyzeLLM, threatCloud, {
      llmProvider: process.env['ANTHROPIC_API_KEY']
        ? 'claude'
        : process.env['OPENAI_API_KEY']
          ? 'openai'
          : 'ollama',
      llmModel: process.env['PANGUARD_LLM_MODEL'] ?? 'unknown',
    });
  }

  logger.info('GuardEngine initialized / GuardEngine 已初始化');

  return {
    atrEngine,
    detectAgent,
    analyzeAgent,
    respondAgent,
    reportAgent,
    investigationEngine,
    threatCloud,
    feedManager,
    smartRouter,
    knowledgeDistiller,
    atrDrafter,
    baseline,
    baselinePath,
    license: { tier: license.tier, isValid: license.isValid },
  };
}

/**
 * Load all rules from bundled directories and cloud.
 * Called during GuardEngine.start().
 */
/**
 * Verify an ed25519 signature on a network-delivered detection rule BEFORE it is
 * loaded into the engine. Detection rules are executable trust (regex → ReDoS,
 * auto-block rules → destructive response), so a rule pulled from Threat Cloud
 * must be cryptographically attributable to the ATR publisher, not just shaped
 * like JSON. Fail CLOSED: no provisioned public key, or no/invalid signature →
 * reject. The publisher key is supplied out-of-band via PANGUARD_RULE_PUBKEY
 * (PEM, ed25519); until it is provisioned, opt-in cloud rule sync loads nothing.
 */
export function verifyCloudRuleSignature(rule: {
  ruleContent?: string;
  signature?: string;
}): boolean {
  const pem = process.env['PANGUARD_RULE_PUBKEY'];
  if (!pem || !rule.signature || !rule.ruleContent) return false;
  try {
    const key = createPublicKey(pem);
    return edVerify(
      null,
      Buffer.from(rule.ruleContent, 'utf-8'),
      key,
      Buffer.from(rule.signature, 'base64')
    );
  } catch {
    return false;
  }
}

export async function loadAllRules(
  atrEngine: GuardATREngine,
  threatCloud: ThreatCloudClient,
  feedManager: ThreatIntelFeedManager,
  config: GuardConfig
): Promise<void> {
  feedManager
    .start()
    .then(() => {
      logger.info(
        `Threat intel feeds loaded: ${feedManager.getIoCCount()} IoCs, ${feedManager.getIPCount()} IPs indexed`
      );
    })
    .catch((err: unknown) => {
      logger.warn(
        `Threat intel feed start failed (using hardcoded list): ${err instanceof Error ? err.message : String(err)}`
      );
    });

  // Load bundled rules FIRST, then fetch cloud rules.
  // This ensures bundledRuleIds is populated before addCloudRule dedup checks.
  atrEngine
    .loadRules()
    .then((count) => {
      if (count > 0) {
        logger.info(`ATR rules loaded: ${count} rules / ATR 規則已載入: ${count} 條`);
      }
      atrEngine.startSessionCleanup();

      // TRUST ROOT: detection rules are the engine's executable trust. By default
      // they come ONLY from the signed npm package (updated via `pga upgrade`,
      // npm-integrity-verified) and are NEVER auto-pulled from the network — a
      // compromised or MITM'd relay must not be able to inject detection logic.
      // Cloud rule sync is strictly opt-in AND every rule must carry a valid
      // publisher signature; we fail closed otherwise.
      if (config.threatCloudRuleSyncEnabled !== true) {
        logger.info(
          'Cloud rule sync disabled (default) — detection rules loaded from the signed package only; nothing auto-pulled.'
        );
        return [] as Awaited<ReturnType<typeof threatCloud.fetchATRRules>>;
      }
      // Cloud rule sync is opt-in AND fails closed: every rule must carry a valid
      // publisher ed25519 signature, verified against PANGUARD_RULE_PUBKEY. The
      // signing infrastructure that issues signed rules is NOT yet deployed, so
      // with no publisher key provisioned this path would fetch rules and reject
      // 100% of them. Be HONEST about that instead of silently loading zero:
      // warn loudly and skip the network fetch entirely.
      if (!process.env['PANGUARD_RULE_PUBKEY']) {
        logger.warn(
          'Cloud rule sync ENABLED but no publisher key (PANGUARD_RULE_PUBKEY) is provisioned. ' +
            'Signed-rule infrastructure is not yet available, so NO cloud rules will be loaded ' +
            '(fail-closed by design). Detection rules remain those from the signed package. ' +
            'Set threatCloudRuleSyncEnabled=false to silence this warning.'
        );
        return [] as Awaited<ReturnType<typeof threatCloud.fetchATRRules>>;
      }
      logger.warn(
        'Cloud rule sync ENABLED — fetching from Threat Cloud; each rule must pass publisher signature verification.'
      );
      return threatCloud.fetchATRRules();
    })
    .then((atrCloudRules) => {
      let added = 0;
      let rejected = 0;
      for (const rule of atrCloudRules) {
        try {
          // Reject any network rule that is not signed by the ATR publisher key.
          if (!verifyCloudRuleSignature(rule)) {
            rejected++;
            continue;
          }
          const parsed = JSON.parse(rule.ruleContent) as import('@panguard-ai/atr').ATRRule;
          if (parsed.id && parsed.title && parsed.detection && parsed.agent_source?.type) {
            atrEngine.addCloudRule(parsed);
            added++;
          }
        } catch {
          // skip invalid
        }
      }
      if (added > 0) {
        logger.info(`ATR cloud rules loaded: ${added} signature-verified rules`);
      }
      if (rejected > 0) {
        logger.warn(
          `ATR cloud rules rejected: ${rejected} rule(s) failed signature verification (fail-closed; not loaded).`
        );
      }
    })
    .catch((err: unknown) => {
      logger.warn(
        `ATR rules/cloud fetch failed: ${err instanceof Error ? err.message : String(err)}`
      );
    });

  threatCloud
    .fetchBlocklist()
    .then((ips) => {
      if (ips.length > 0) {
        const added = feedManager.addExternalIPs(ips, 'threat_cloud_blocklist', 85);
        logger.info(
          `Threat Cloud blocklist loaded: ${added} IPs / ` +
            `Threat Cloud 封鎖清單已載入: ${added} 個 IP`
        );
      }
    })
    .catch((err: unknown) => {
      logger.warn(
        `Threat Cloud blocklist fetch skipped: ${err instanceof Error ? err.message : String(err)}`
      );
    });
}

/**
 * Get loaded rule counts for each engine layer.
 */
export function getRuleCounts(atrEngine: GuardATREngine): { atr: number } {
  return {
    atr: atrEngine.getRuleCount(),
  };
}
