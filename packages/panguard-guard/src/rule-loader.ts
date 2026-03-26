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
import { loadBaseline } from './memory/index.js';
import { InvestigationEngine } from './investigation/index.js';
import { ThreatCloudClient } from './threat-cloud/index.js';
import { validateLicense, hasFeature } from './license/index.js';
// Detection handled by ATR Engine
import { GuardATREngine } from './engines/atr-engine.js';
import { ATRDrafter } from './engines/atr-drafter.js';
import { PlaybookEngine } from './playbook/index.js';

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

// Re-export autoDetectLLM from its own module
export { autoDetectLLM } from './llm-detect.js';

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
export function initEngines(config: GuardConfig, llm: AnalyzeLLM | null): InitEnginesResult {
  const baselinePath = join(config.dataDir, 'baseline.json');
  const baseline = loadBaseline(baselinePath);

  // Validate license
  let license = validateLicense(config.licenseKey);

  if (config.cliTier) {
    const cliTierMap: Record<string, LicenseTier> = {
      community: 'free',
      solo: 'pro',
      pro: 'pro',
      business: 'enterprise',
      enterprise: 'enterprise',
    };
    const mappedTier = cliTierMap[config.cliTier] ?? 'free';
    const keyTierLevel = { free: 0, pro: 1, enterprise: 2 }[license.tier] ?? 0;
    const cliTierLevel = { free: 0, pro: 1, enterprise: 2 }[mappedTier] ?? 0;

    if (cliTierLevel > keyTierLevel) {
      license = {
        ...license,
        tier: mappedTier,
        features: TIER_FEATURES[mappedTier],
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
  const analyzeLLM = hasFeature(license, 'ai_analysis') ? llm : null;
  const analyzeAgent = new AnalyzeAgent(analyzeLLM);

  let smartRouter: SmartRouter | null = null;
  let knowledgeDistiller: KnowledgeDistiller | null = null;
  if (analyzeLLM) {
    const tierToQuota: Record<string, string> = {
      free: 'free',
      pro: 'pro',
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

  const respondAgent = new RespondAgent(config.actionPolicy, config.mode);
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

  const reportAgent = new ReportAgent(join(config.dataDir, 'events.jsonl'), config.mode);
  const investigationEngine = new InvestigationEngine(baseline);

  const threatCloud = new ThreatCloudClient(
    config.threatCloudEndpoint,
    config.dataDir,
    config.threatCloudApiKey
  );

  const feedManager = new ThreatIntelFeedManager({
    abuseIPDBKey: process.env['ABUSEIPDB_KEY'],
  });
  setFeedManager(feedManager);

  let atrDrafter: ATRDrafter | null = null;
  if (analyzeLLM) {
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
export async function loadAllRules(
  atrEngine: GuardATREngine,
  threatCloud: ThreatCloudClient,
  feedManager: ThreatIntelFeedManager,
  _config: GuardConfig
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

  atrEngine
    .loadRules()
    .then((count) => {
      if (count > 0) {
        logger.info(`ATR rules loaded: ${count} rules / ATR 規則已載入: ${count} 條`);
      }
      atrEngine.startSessionCleanup();
    })
    .catch((err: unknown) => {
      logger.warn(`ATR rules load failed: ${err instanceof Error ? err.message : String(err)}`);
    });

  threatCloud
    .fetchATRRules()
    .then((atrCloudRules) => {
      let added = 0;
      for (const rule of atrCloudRules) {
        try {
          const parsed = JSON.parse(rule.ruleContent) as import('@panguard-ai/atr').ATRRule;
          if (parsed.id && parsed.title && parsed.detection) {
            atrEngine.addCloudRule(parsed);
            added++;
          }
        } catch {
          // skip invalid
        }
      }
      if (added > 0) {
        logger.info(`ATR cloud rules loaded: ${added} rules / ATR 雲端規則已載入: ${added} 條`);
      }
    })
    .catch((err: unknown) => {
      logger.warn(
        `ATR cloud rules fetch skipped: ${err instanceof Error ? err.message : String(err)}`
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
