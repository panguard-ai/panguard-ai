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

export interface SkillWatcherConfig {
  /** Polling interval in ms (default: 10000 = 10s) */
  readonly pollInterval?: number;
  /** Whether to auto-audit new skills (default: true) */
  readonly autoAudit?: boolean;
  /** Whether to auto-whitelist safe skills (default: true) */
  readonly autoWhitelist?: boolean;
  /** Optional callback to submit audit results to Threat Cloud */
  readonly submitThreat?: SkillThreatSubmitter;
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
  auditSkill: (dir: string, opts?: { skipAI?: boolean }) => Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number;
    findings?: Array<{ id: string; category: string; severity: string; title: string }>;
  }>;
}

async function loadMcpConfig(): Promise<McpConfigModule> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return await import('@panguard-ai/panguard-mcp/config' as string) as unknown as McpConfigModule;
}

async function loadAuditor(): Promise<AuditModule> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return await import('@panguard-ai/panguard-skill-auditor' as string) as unknown as AuditModule;
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
  private readonly config: Required<Omit<SkillWatcherConfig, 'submitThreat'>> & Pick<SkillWatcherConfig, 'submitThreat'>;
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
        autoWhitelisted: this.config.autoWhitelist && (audit.riskLevel === 'LOW'),
      };

      this.emit('skill-audit-complete', result);

      logger.info(
        `Skill audit complete: ${change.name} = ${audit.riskLevel} (score: ${audit.riskScore})`
      );

      // Submit audit result to Threat Cloud (anonymized)
      if (this.config.submitThreat && audit.riskScore > 0) {
        const { createHash } = await import('node:crypto');
        const skillHash = createHash('sha256').update(`${change.name}:${change.command}`).digest('hex');
        this.config.submitThreat({
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
        }).catch((submitErr: unknown) => {
          logger.warn(
            `Skill threat submission failed for ${change.name}: ${submitErr instanceof Error ? submitErr.message : String(submitErr)}`
          );
        });
      }
    } catch (err) {
      logger.warn(
        `Skill audit failed for ${change.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
