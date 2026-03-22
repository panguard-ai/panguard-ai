/**
 * Skill Install Watcher - Monitors platform configs for new MCP skill installations
 * 技能安裝監視器 - 監控平台設定檔以偵測新的 MCP 技能安裝
 *
 * Watches all detected platform MCP config files for changes.
 * When a new skill is added, auto-audits it and classifies by risk.
 * Safe skills are auto-whitelisted; dangerous ones emit an event.
 *
 * Dependencies (panguard-mcp, panguard-skill-auditor) are loaded dynamically
 * at runtime to avoid circular dependency issues in the build graph.
 *
 * @module @panguard-ai/panguard-guard/engines/skill-watcher
 */

import { EventEmitter } from 'node:events';
import { createLogger, FileMonitor } from '@panguard-ai/core';

const logger = createLogger('panguard-guard:skill-watcher');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillChange {
  readonly name: string;
  readonly platformId: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly action: 'added' | 'removed';
}

export interface SkillAuditResult {
  readonly name: string;
  readonly platformId: string;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly riskScore: number;
  readonly autoWhitelisted: boolean;
}

/** Callback for submitting skill threat data to Threat Cloud */
export type SkillThreatSubmitter = (submission: {
  skillHash: string;
  skillName: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findingSummaries?: Array<{ id: string; category: string; severity: string; title: string }>;
}) => Promise<boolean>;

/** Callback for submitting ATR rule proposals to Threat Cloud */
export type ATRProposalSubmitter = (proposal: {
  patternHash: string;
  ruleContent: string;
  llmProvider: string;
  llmModel: string;
  selfReviewVerdict: string;
}) => Promise<boolean>;

/** Callback for checking if a skill is in the community blacklist */
export type SkillBlacklistChecker = (skillName: string) => Promise<boolean>;

export interface SkillWatcherConfig {
  /** Polling interval in ms (default: 10000 = 10s) */
  readonly pollInterval?: number;
  /** Whether to auto-audit new skills (default: true) */
  readonly autoAudit?: boolean;
  /** Whether to auto-whitelist safe skills (default: true) */
  readonly autoWhitelist?: boolean;
  /** Optional callback to submit audit results to Threat Cloud */
  readonly submitThreat?: SkillThreatSubmitter;
  /** Optional callback to submit ATR rule proposals to Threat Cloud (flywheel) */
  readonly submitATRProposal?: ATRProposalSubmitter;
  /** Optional callback to check community blacklist before auditing */
  readonly checkBlacklist?: SkillBlacklistChecker;
}

// ---------------------------------------------------------------------------
// MCP Server Entry (minimal type to avoid circular dependency)
// ---------------------------------------------------------------------------

interface MCPServerEntryMinimal {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly platformId: string;
}

// ---------------------------------------------------------------------------
// Dynamic import helpers (avoids build-time references to panguard-mcp)
// ---------------------------------------------------------------------------

interface McpConfigModule {
  detectPlatforms: () => Promise<Array<{ id: string; detected: boolean }>>;
  getConfigPath: (id: string) => string;
  parseMCPServers: (configPath: string, platformId: string) => readonly MCPServerEntryMinimal[];
  resolveSkillDir: (entry: MCPServerEntryMinimal) => string | null;
}

interface AuditModule {
  auditSkill: (
    dir: string,
    opts?: { skipAI?: boolean }
  ) => Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number;
    findings?: Array<{ id: string; category: string; severity: string; title: string }>;
  }>;
}

async function loadMcpConfig(): Promise<McpConfigModule> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (await import('@panguard-ai/panguard-mcp/config' as string)) as unknown as McpConfigModule;
}

async function loadAuditor(): Promise<AuditModule> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (await import('@panguard-ai/panguard-skill-auditor' as string)) as unknown as AuditModule;
}

// ---------------------------------------------------------------------------
// Skill Watcher
// ---------------------------------------------------------------------------

/**
 * Watches platform MCP configs for new skill installations.
 * Emits: 'skill-added', 'skill-removed', 'skill-audit-complete'
 */
export class SkillWatcher extends EventEmitter {
  private fileMonitor: FileMonitor | null = null;
  private readonly config: Required<Omit<SkillWatcherConfig, 'submitThreat' | 'submitATRProposal' | 'checkBlacklist'>> &
    Pick<SkillWatcherConfig, 'submitThreat' | 'submitATRProposal' | 'checkBlacklist'>;
  private previousSkills: Map<string, MCPServerEntryMinimal> = new Map();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(config?: SkillWatcherConfig) {
    super();
    this.config = {
      pollInterval: config?.pollInterval ?? 10_000,
      autoAudit: config?.autoAudit ?? true,
      autoWhitelist: config?.autoWhitelist ?? true,
      submitThreat: config?.submitThreat,
      submitATRProposal: config?.submitATRProposal,
      checkBlacklist: config?.checkBlacklist,
    };
  }

  /** Start watching all platform configs for skill changes */
  async start(): Promise<void> {
    if (this.running) return;

    try {
      const mcpConfig = await loadMcpConfig();

      const platforms = await mcpConfig.detectPlatforms();
      const detected = platforms.filter((p) => p.detected);

      if (detected.length === 0) {
        logger.info('No platforms detected, skill watcher not started');
        return;
      }

      // Collect config file paths
      const configPaths: string[] = [];
      for (const platform of detected) {
        const configPath = mcpConfig.getConfigPath(platform.id);
        if (configPath) {
          configPaths.push(configPath);
        }
      }

      if (configPaths.length === 0) {
        logger.info('No config paths found, skill watcher not started');
        return;
      }

      // Build initial skill snapshot
      for (const platform of detected) {
        const configPath = mcpConfig.getConfigPath(platform.id);
        const servers = mcpConfig.parseMCPServers(configPath, platform.id);
        for (const server of servers) {
          if (server.name === 'panguard') continue;
          if (server.args.some((a: string) => a.includes('panguard'))) continue;
          this.previousSkills.set(`${platform.id}:${server.name}`, {
            name: server.name,
            command: server.command,
            args: server.args,
            platformId: platform.id,
          });
        }
      }

      // Start file monitor
      this.fileMonitor = new FileMonitor(configPaths, this.config.pollInterval);

      this.fileMonitor.on('file_changed', () => {
        // Debounce: config files may be written in multiple steps
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
          void this.handleConfigChange();
        }, 500);
      });

      this.fileMonitor.start();
      this.running = true;

      logger.info(
        `Skill watcher started: monitoring ${configPaths.length} config(s) across ${detected.length} platform(s)`
      );
    } catch (err) {
      logger.warn(
        `Skill watcher failed to start: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /** Stop watching */
  stop(): void {
    if (!this.running) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.fileMonitor) {
      this.fileMonitor.stop();
      this.fileMonitor = null;
    }

    this.running = false;
    logger.info('Skill watcher stopped');
  }

  /** Check if watcher is running */
  isRunning(): boolean {
    return this.running;
  }

  /** Handle a config file change: diff skills and emit events */
  private async handleConfigChange(): Promise<void> {
    try {
      const mcpConfig = await loadMcpConfig();

      const platforms = await mcpConfig.detectPlatforms();
      const detected = platforms.filter((p) => p.detected);

      // Build new skill map
      const newSkills = new Map<string, MCPServerEntryMinimal>();
      for (const platform of detected) {
        const configPath = mcpConfig.getConfigPath(platform.id);
        const servers = mcpConfig.parseMCPServers(configPath, platform.id);
        for (const server of servers) {
          if (server.name === 'panguard') continue;
          if (server.args.some((a: string) => a.includes('panguard'))) continue;
          newSkills.set(`${platform.id}:${server.name}`, {
            name: server.name,
            command: server.command,
            args: server.args,
            platformId: platform.id,
          });
        }
      }

      // Diff: find added skills
      const added: SkillChange[] = [];
      for (const [key, entry] of newSkills) {
        if (!this.previousSkills.has(key)) {
          added.push({
            name: entry.name,
            platformId: entry.platformId,
            command: entry.command,
            args: entry.args,
            action: 'added',
          });
        }
      }

      // Diff: find removed skills
      const removed: SkillChange[] = [];
      for (const [key, entry] of this.previousSkills) {
        if (!newSkills.has(key)) {
          removed.push({
            name: entry.name,
            platformId: entry.platformId,
            command: entry.command,
            args: entry.args,
            action: 'removed',
          });
        }
      }

      // Update snapshot
      this.previousSkills = newSkills;

      // Emit events
      for (const change of removed) {
        this.emit('skill-removed', change);
        logger.info(`Skill removed: ${change.name} from ${change.platformId}`);
      }

      for (const change of added) {
        this.emit('skill-added', change);
        logger.info(`New skill detected: ${change.name} on ${change.platformId}`);

        // Auto-audit if enabled
        if (this.config.autoAudit) {
          void this.auditNewSkill(change);
        }
      }
    } catch (err) {
      logger.warn(
        `Skill watcher config change handling failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /** Audit a newly installed skill */
  private async auditNewSkill(change: SkillChange): Promise<void> {
    // Check community blacklist first / 先檢查社群黑名單
    if (this.config.checkBlacklist) {
      try {
        const isBlacklisted = await this.config.checkBlacklist(change.name);
        if (isBlacklisted) {
          const result: SkillAuditResult = {
            name: change.name,
            platformId: change.platformId,
            riskLevel: 'CRITICAL',
            riskScore: 100,
            autoWhitelisted: false,
          };
          this.emit('skill-audit-complete', result);
          logger.warn(
            `Skill ${change.name} is BLACKLISTED by community — skipping local audit / ` +
              `技能 ${change.name} 已被社群列入黑名單 — 跳過本地審計`
          );
          return;
        }
      } catch (err: unknown) {
        logger.warn(
          `Blacklist check failed for ${change.name}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    try {
      const mcpConfig = await loadMcpConfig();
      const auditor = await loadAuditor();

      const entry: MCPServerEntryMinimal = {
        name: change.name,
        command: change.command,
        args: change.args,
        platformId: change.platformId,
      };

      const skillDir = mcpConfig.resolveSkillDir(entry);
      if (!skillDir) {
        logger.info(`Could not resolve directory for skill: ${change.name}, skipping audit`);
        return;
      }

      const audit = await auditor.auditSkill(skillDir, { skipAI: true });

      const result: SkillAuditResult = {
        name: change.name,
        platformId: change.platformId,
        riskLevel: audit.riskLevel,
        riskScore: audit.riskScore,
        autoWhitelisted: this.config.autoWhitelist && audit.riskLevel === 'LOW',
      };

      this.emit('skill-audit-complete', result);

      logger.info(
        `Skill audit complete: ${change.name} = ${audit.riskLevel} (score: ${audit.riskScore})`
      );

      // Submit audit result to Threat Cloud (anonymized)
      if (this.config.submitThreat && audit.riskScore > 0) {
        const { contentHash } = await import('@panguard-ai/scan-core');
        const skillHash = contentHash(`${change.name}:${change.command}`);
        this.config
          .submitThreat({
            skillHash,
            skillName: change.name,
            riskScore: audit.riskScore,
            riskLevel: audit.riskLevel,
            findingSummaries: (audit.findings ?? []).map((f) => ({
              id: f.id,
              category: f.category,
              severity: f.severity,
              title: f.title,
            })),
          })
          .catch((submitErr: unknown) => {
            logger.warn(
              `Skill threat submission failed for ${change.name}: ${submitErr instanceof Error ? submitErr.message : String(submitErr)}`
            );
          });
      }

      // Flywheel: Submit ATR proposal for HIGH/CRITICAL findings
      // This bridges skill audits into the ATR rule generation pipeline
      if (
        this.config.submitATRProposal &&
        (audit.riskLevel === 'HIGH' || audit.riskLevel === 'CRITICAL') &&
        audit.findings &&
        audit.findings.length > 0
      ) {
        void this.submitSkillATRProposal(change.name, audit.riskLevel, audit.findings).catch(
          (err: unknown) => {
            logger.warn(
              `ATR proposal from skill audit failed for ${change.name}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        );
      }
    } catch (err) {
      logger.warn(
        `Skill audit failed for ${change.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Build and submit ATR rule proposal from skill audit findings.
   * Bridges the skill audit path into the flywheel.
   */
  private async submitSkillATRProposal(
    skillName: string,
    riskLevel: 'HIGH' | 'CRITICAL',
    findings: Array<{ id: string; category: string; severity: string; title: string }>
  ): Promise<void> {
    if (!this.config.submitATRProposal) return;

    const { patternHash: computePatternHash } = await import('@panguard-ai/scan-core');

    // Build a concise description from findings for the ATR rule
    const findingDescriptions = findings
      .filter((f) => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 5)
      .map((f) => f.title);

    if (findingDescriptions.length === 0) return;

    // Use finding titles as pattern content for behavioral regex matching
    const findingSummary = findingDescriptions.join('; ');
    // Use scan-core's canonical hash — same prefix as website + CLI audit
    const patternHash = computePatternHash(skillName, findingSummary);

    // Determine ATR category from audit findings
    const categoryMap: Record<string, string> = {
      'shell-execution': 'tool-poisoning',
      'network-request': 'context-exfiltration',
      'credential-access': 'context-exfiltration',
      'code-execution': 'tool-poisoning',
      'instruction-override': 'prompt-injection',
      'env-access': 'context-exfiltration',
    };

    const primaryCategory = findings[0]?.category ?? 'tool-poisoning';
    const atrCategory = categoryMap[primaryCategory] ?? 'tool-poisoning';
    const severity = riskLevel === 'CRITICAL' ? 'critical' : 'high';

    // Build detection conditions from finding titles
    // Each title often contains the behavioral pattern description
    const conditions = findingDescriptions
      .map((title, idx) => {
        // Extract keywords that indicate attack behavior
        const keywords = title
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 4);
        if (keywords.length === 0) return null;
        const regex = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
        return `    - field: content\n      operator: regex\n      value: "(?i)${regex}"\n      description: "Pattern ${idx + 1}: ${title.slice(0, 80)}"`;
      })
      .filter(Boolean);

    if (conditions.length === 0) return;

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const ruleContent = `title: "Skill Audit: ${findingDescriptions[0]?.slice(0, 60) ?? skillName}"
id: ATR-2026-DRAFT-${patternHash.slice(0, 8)}
status: draft
description: |
  Auto-generated from skill audit of "${skillName}".
  Findings: ${findingSummary.slice(0, 200)}
author: "PanGuard Skill Watcher"
date: "${date}"
schema_version: "0.1"
detection_tier: pattern
maturity: experimental
severity: ${severity}
tags:
  category: ${atrCategory}
  subcategory: skill-audit
  confidence: medium
detection:
  conditions:
${conditions.join('\n')}
  condition: any
response:
  actions: [alert, snapshot]
test_cases:
  true_positives:
    - content: "${findingDescriptions[0]?.replace(/"/g, '\\"').slice(0, 100) ?? 'malicious pattern'}"
      expected: triggered
  true_negatives:
    - content: "list_files(directory='/tmp')"
      expected: not_triggered`;

    const success = await this.config.submitATRProposal({
      patternHash,
      ruleContent,
      llmProvider: 'skill-audit',
      llmModel: 'pattern-extraction',
      selfReviewVerdict: JSON.stringify({
        approved: true,
        source: 'skill-watcher',
        skillName,
        riskLevel,
        findingCount: findings.length,
      }),
    });

    if (success) {
      logger.info(
        `ATR proposal submitted from skill audit: ${skillName} (${patternHash}) / ` +
          `技能審計 ATR 提案已提交: ${skillName}`
      );
    }
  }
}
