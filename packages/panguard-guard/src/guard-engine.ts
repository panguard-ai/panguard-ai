/**
 * GuardEngine - Main orchestrator for PanguardGuard
 * GuardEngine - PanguardGuard 主引擎
 *
 * Thin orchestrator that delegates to extracted modules:
 * - rule-loader.ts: LLM auto-detection, engine initialization, rule loading
 * - rule-sync.ts: Threat Cloud sync, skill threat/blacklist helpers
 * - event-processor.ts: Full detection-analysis-response pipeline
 * - response-engine.ts: Policy application and polling
 *
 * @module @panguard-ai/panguard-guard/guard-engine
 */

import v8 from 'node:v8';
import {
  createLogger,
  MonitorEngine,
  setFeedManager,
} from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import type {
  GuardConfig,
  GuardStatus,
  GuardMode,
  AnalyzeLLM,
  EnvironmentBaseline,
} from './types.js';

import {
  saveBaseline,
  isLearningComplete,
  getLearningProgress,
  switchToProtectionMode,
} from './memory/index.js';
import { DashboardServer } from './dashboard/index.js';
import { PidFile, Watchdog } from './daemon/index.js';
import { validateLicense } from './license/index.js';
import {
  loadSecurityPolicy,
  runSecurityAudit,
  SyslogAdapter,
} from '@panguard-ai/security-hardening';
import { FalcoMonitor } from './monitors/falco-monitor.js';
import { SuricataMonitor } from './monitors/suricata-monitor.js';
import { LogCollector } from './collectors/index.js';
import { PanguardAgentClient } from './agent-client/index.js';
import type { AgentHeartbeat } from './agent-client/index.js';

// Extracted modules
import { autoDetectLLM, initEngines, loadAllRules, getRuleCounts } from './rule-loader.js';
import {
  syncThreatCloud,
  setupCloudSyncTimer,
  getSkillThreatSubmitter as _getSkillThreatSubmitter,
  getSkillBlacklistChecker as _getSkillBlacklistChecker,
} from './rule-sync.js';
import { processEvent as _processEvent } from './event-processor.js';
import type { EventProcessorState, EventProcessorDeps } from './event-processor.js';
import { applyPolicy as _applyPolicy, pollPolicy as _pollPolicy } from './response-engine.js';
import type { PolicyUpdate } from './response-engine.js';

const logger = createLogger('panguard-guard:engine');

/**
 * GuardEngine is the central orchestrator for all PanguardGuard functionality
 * GuardEngine 是所有 PanguardGuard 功能的中央協調器
 */
export class GuardEngine {
  // Engines and agents (initialized in constructor via initEngines)
  private readonly engines: ReturnType<typeof initEngines>;
  private readonly config: GuardConfig;

  // Mutable operating state
  private mode: GuardMode;
  private baseline: EnvironmentBaseline;

  // Infrastructure (initialized in start())
  private dashboard: DashboardServer | null = null;
  private readonly pidFile: PidFile;
  private watchdog: Watchdog | null = null;
  private monitorEngine: MonitorEngine | null = null;
  private syslogAdapter: SyslogAdapter | null = null;
  private falcoMonitor: FalcoMonitor | null = null;
  private suricataMonitor: SuricataMonitor | null = null;
  private agentClient: PanguardAgentClient | null = null;
  private logCollector: LogCollector | null = null;

  // State
  private running = false;
  private startTime = 0;
  private eventsProcessed = 0;
  private threatsDetected = 0;
  private actionsExecuted = 0;
  private threatCloudUploaded = 0;
  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private learningCheckTimer: ReturnType<typeof setInterval> | null = null;
  private cloudSyncTimer: ReturnType<typeof setInterval> | null = null;
  private eventCallback?: (type: string, data: Record<string, unknown>) => void;
  private consecutiveCriticalChecks = 0;

  constructor(config: GuardConfig, llm: AnalyzeLLM | null = null) {
    this.config = config;
    this.mode = config.mode;
    this.engines = initEngines(config, llm);
    this.baseline = this.engines.baseline;

    // PID file
    this.pidFile = new PidFile(config.dataDir);
  }

  /**
   * Create a GuardEngine with auto-detected LLM provider.
   * Checks env vars for ANTHROPIC_API_KEY, OPENAI_API_KEY, or tries Ollama.
   */
  static async create(config: GuardConfig): Promise<GuardEngine> {
    const llm = await autoDetectLLM();
    return new GuardEngine(config, llm);
  }

  // -- Event processor state and deps accessors (private) --

  private get eventProcessorState(): EventProcessorState {
    return {
      mode: this.mode,
      baseline: this.baseline,
      eventsProcessed: this.eventsProcessed,
      threatsDetected: this.threatsDetected,
      actionsExecuted: this.actionsExecuted,
      threatCloudUploaded: this.threatCloudUploaded,
      baselinePath: this.engines.baselinePath,
      config: this.config,
      eventCallback: this.eventCallback,
    };
  }

  private syncStateBack(state: EventProcessorState): void {
    this.mode = state.mode;
    this.baseline = state.baseline;
    this.eventsProcessed = state.eventsProcessed;
    this.threatsDetected = state.threatsDetected;
    this.actionsExecuted = state.actionsExecuted;
    this.threatCloudUploaded = state.threatCloudUploaded;
  }

  private get eventProcessorDeps(): EventProcessorDeps {
    return {
      ruleEngine: this.engines.ruleEngine,
      yaraScanner: this.engines.yaraScanner,
      atrEngine: this.engines.atrEngine,
      detectAgent: this.engines.detectAgent,
      analyzeAgent: this.engines.analyzeAgent,
      respondAgent: this.engines.respondAgent,
      reportAgent: this.engines.reportAgent,
      investigationEngine: this.engines.investigationEngine,
      threatCloud: this.engines.threatCloud,
      smartRouter: this.engines.smartRouter,
      knowledgeDistiller: this.engines.knowledgeDistiller,
      atrDrafter: this.engines.atrDrafter,
      dashboard: this.dashboard,
      syslogAdapter: this.syslogAdapter,
      agentClient: this.agentClient,
    };
  }

  /**
   * Start the guard engine / 啟動守護引擎
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('GuardEngine already running / GuardEngine 已在執行中');
      return;
    }

    logger.info(
      `Starting GuardEngine in ${this.mode} mode / 啟動 GuardEngine（${this.mode} 模式）`
    );

    // Write PID file
    this.pidFile.write();

    // Security self-audit on startup
    try {
      const policy = loadSecurityPolicy({});
      const auditReport = runSecurityAudit(policy);
      const unfixed = auditReport.findings.filter((f) => !f.fixed);
      if (unfixed.length > 0) {
        logger.warn(
          `Security audit: ${unfixed.length} issue(s) found (risk score: ${auditReport.riskScore})`
        );
      } else {
        logger.info('Security audit: all checks passed');
      }
    } catch (err: unknown) {
      logger.warn(`Security audit skipped: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Initialize syslog adapter if configured
    const syslogServer = process.env['PANGUARD_SYSLOG_SERVER'];
    if (syslogServer) {
      const syslogPort = parseInt(process.env['PANGUARD_SYSLOG_PORT'] ?? '514', 10);
      this.syslogAdapter = new SyslogAdapter(syslogServer, syslogPort);
      logger.info(`Syslog adapter initialized: ${syslogServer}:${syslogPort}`);
    }

    // Load all rules (Sigma, ATR, YARA, cloud rules, blocklist)
    await loadAllRules(
      this.engines.ruleEngine,
      this.engines.yaraScanner,
      this.engines.atrEngine,
      this.engines.threatCloud,
      this.engines.feedManager,
      this.config
    );

    // Periodic Threat Cloud sync (every hour) + initial sync
    const syncDeps = {
      ruleEngine: this.engines.ruleEngine,
      yaraScanner: this.engines.yaraScanner,
      atrEngine: this.engines.atrEngine,
      threatCloud: this.engines.threatCloud,
      feedManager: this.engines.feedManager,
      config: this.config,
    };
    this.cloudSyncTimer = setupCloudSyncTimer(syncDeps);
    void syncThreatCloud(syncDeps);

    // Start monitor engine
    this.monitorEngine = new MonitorEngine({
      networkPollInterval: this.config.monitors.networkPollInterval,
      processPollInterval: this.config.monitors.processPollInterval,
    });

    this.monitorEngine.on('event', (event: SecurityEvent) => {
      void this.processEvent(event);
    });

    this.monitorEngine.start();

    // Start Falco eBPF monitor (optional, graceful degradation)
    this.falcoMonitor = new FalcoMonitor();
    const falcoAvailable = await this.falcoMonitor.checkAvailability();
    if (falcoAvailable) {
      this.falcoMonitor.on('event', (event) => void this.processEvent(event));
      await this.falcoMonitor.start();
      logger.info('Falco eBPF kernel-level monitoring active');
    }

    // Start Suricata network IDS monitor (optional, graceful degradation)
    this.suricataMonitor = new SuricataMonitor();
    const suricataAvailable = await this.suricataMonitor.checkAvailability();
    if (suricataAvailable) {
      this.suricataMonitor.on('event', (event) => void this.processEvent(event));
      await this.suricataMonitor.start();
      logger.info('Suricata network IDS monitoring active');
    }

    // Start log collector if configured
    if (this.config.monitors.logCollector?.enabled) {
      const lcConfig = this.config.monitors.logCollector;
      this.logCollector = new LogCollector({
        filePaths: lcConfig.filePaths,
        syslogUdp: lcConfig.syslogPort ? { port: lcConfig.syslogPort } : undefined,
      });
      this.logCollector.on('event', (event) => void this.processEvent(event));
      this.logCollector.start();
      logger.info('Log collector active / 日誌收集器已啟動');
    }

    // Start agent client if manager URL is configured (distributed mode)
    if (this.config.managerUrl) {
      try {
        this.agentClient = new PanguardAgentClient(this.config.managerUrl);
        const reg = await this.agentClient.register('1.0.0');
        logger.info(`Agent mode active: registered as ${reg.agentId}`);

        this.agentClient.startHeartbeat(
          (): AgentHeartbeat => ({
            eventsProcessed: this.eventsProcessed,
            threatsDetected: this.threatsDetected,
            actionsExecuted: this.actionsExecuted,
            mode: this.mode,
            uptime: Date.now() - this.startTime,
            memoryUsageMB: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
          })
        );
      } catch (err: unknown) {
        logger.warn(
          `Agent registration failed (standalone mode): ${err instanceof Error ? err.message : String(err)}`
        );
        this.agentClient = null;
      }
    }

    // Start dashboard if enabled
    if (this.config.dashboardEnabled) {
      this.dashboard = new DashboardServer(this.config.dashboardPort);
      this.dashboard.setConfigGetter(() => this.config);
      await this.dashboard.start();

      const dashPort = Number(this.config.dashboardPort);
      const token = this.dashboard.getAuthToken();
      const dashUrl = `http://127.0.0.1:${dashPort}#token=${token}`;
      logger.info(`Dashboard: http://127.0.0.1:${dashPort}`);
      try {
        const { execFile } = await import('node:child_process');
        const openCmd =
          process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'start'
              : 'xdg-open';
        execFile(openCmd, [dashUrl]);
      } catch {
        logger.debug('Could not auto-open browser');
      }
    }

    // Start watchdog if enabled
    if (this.config.watchdogEnabled) {
      this.watchdog = new Watchdog(this.config.watchdogInterval, () => {
        logger.error('Watchdog triggered restart / 看門狗觸發重啟');
      });
      this.watchdog.start();
    }

    // Periodic status update
    this.statusTimer = setInterval(() => {
      this.updateDashboardStatus();
      this.eventCallback?.('status', {
        eventsProcessed: this.eventsProcessed,
        threatsDetected: this.threatsDetected,
        actionsExecuted: this.actionsExecuted,
        uploaded: this.threatCloudUploaded,
        mode: this.mode,
        uptime: Date.now() - this.startTime,
      });
      if (this.watchdog) this.watchdog.heartbeat();

      // Memory pressure monitoring
      const memCheck = this.checkMemoryPressure();
      if (memCheck.memoryStatus === 'critical') {
        this.consecutiveCriticalChecks++;
        logger.warn(
          `Memory pressure CRITICAL: ${memCheck.heapUsagePercent}% of heap limit ` +
            `(${memCheck.heapUsedMB}MB / ${memCheck.heapLimitMB}MB) — ` +
            `consecutive critical: ${this.consecutiveCriticalChecks}`
        );
        if (this.consecutiveCriticalChecks >= 3) {
          logger.warn(
            'Memory pressure sustained for 15+ seconds, triggering graceful restart'
          );
          this.eventCallback?.('memory_critical', {
            heapUsedMB: memCheck.heapUsedMB,
            heapLimitMB: memCheck.heapLimitMB,
            heapUsagePercent: memCheck.heapUsagePercent,
          });
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
            logger.info('Forced garbage collection triggered');
          }
        }
      } else {
        if (this.consecutiveCriticalChecks > 0) {
          logger.info(
            `Memory pressure resolved: ${memCheck.heapUsagePercent}% ` +
              `(was critical for ${this.consecutiveCriticalChecks} checks)`
          );
        }
        this.consecutiveCriticalChecks = 0;
        if (memCheck.memoryStatus === 'warning') {
          logger.warn(
            `Memory pressure WARNING: ${memCheck.heapUsagePercent}% of heap limit ` +
              `(${memCheck.heapUsedMB}MB / ${memCheck.heapLimitMB}MB)`
          );
        }
      }
    }, 5000);

    // Learning period check
    this.learningCheckTimer = setInterval(() => {
      this.checkLearningTransition();
    }, 60000);

    // Start ATR Drafter for distributed rule proposals
    if (this.engines.atrDrafter) {
      this.engines.atrDrafter.start();
    }

    this.running = true;
    this.startTime = Date.now();

    logger.info('GuardEngine started / GuardEngine 已啟動');
  }

  /**
   * Stop the guard engine / 停止守護引擎
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    logger.info('Stopping GuardEngine / 停止 GuardEngine');

    // Clear timers
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
    if (this.learningCheckTimer) {
      clearInterval(this.learningCheckTimer);
      this.learningCheckTimer = null;
    }
    if (this.cloudSyncTimer) {
      clearInterval(this.cloudSyncTimer);
      this.cloudSyncTimer = null;
    }

    // Stop components
    if (this.engines.atrDrafter) {
      this.engines.atrDrafter.stop();
    }
    this.engines.atrEngine.stop();
    this.engines.feedManager.stop();
    setFeedManager(null);
    if (this.monitorEngine) this.monitorEngine.stop();
    if (this.dashboard) await this.dashboard.stop();
    if (this.watchdog) this.watchdog.stop();
    if (this.syslogAdapter) this.syslogAdapter = null;
    if (this.falcoMonitor) {
      this.falcoMonitor.stop();
      this.falcoMonitor = null;
    }
    if (this.suricataMonitor) {
      this.suricataMonitor.stop();
      this.suricataMonitor = null;
    }
    if (this.logCollector) {
      this.logCollector.stop();
      this.logCollector = null;
    }
    if (this.agentClient) {
      this.agentClient.stopHeartbeat();
      this.agentClient = null;
    }

    // Save baseline
    saveBaseline(this.engines.baselinePath, this.baseline);

    // Flush threat cloud buffer and queue
    await this.engines.threatCloud.flushQueue();

    // Clean up
    this.engines.ruleEngine.destroy();
    this.pidFile.remove();

    this.running = false;
    logger.info('GuardEngine stopped / GuardEngine 已停止');
  }

  /**
   * Process a single security event through the full pipeline
   * Delegates to event-processor module.
   */
  async processEvent(event: SecurityEvent): Promise<void> {
    const state = this.eventProcessorState;
    await _processEvent(
      event,
      state,
      this.eventProcessorDeps,
      (e: SecurityEvent) => void this.processEvent(e)
    );
    this.syncStateBack(state);
  }

  /**
   * Check if learning period should transition to protection
   */
  private checkLearningTransition(): void {
    if (this.mode !== 'learning') return;

    if (isLearningComplete(this.baseline, this.config.learningDays)) {
      logger.info('Learning period complete, switching to protection / 學習期完成，切換至防護模式');
      this.baseline = switchToProtectionMode(this.baseline);
      this.mode = 'protection';
      this.engines.respondAgent.setMode('protection');
      this.engines.reportAgent.setMode('protection');
      saveBaseline(this.engines.baselinePath, this.baseline);

      if (this.dashboard) {
        this.dashboard.updateStatus({ mode: 'protection' });
        this.dashboard.pushEvent({
          type: 'learning_progress',
          data: { progress: 100, mode: 'protection' },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Update dashboard with current status
   */
  private updateDashboardStatus(): void {
    if (!this.dashboard) return;

    const memCheck = this.checkMemoryPressure();
    const ruleCounts = getRuleCounts(
      this.engines.ruleEngine,
      this.engines.atrEngine,
      this.engines.yaraScanner
    );
    this.dashboard.updateStatus({
      mode: this.mode,
      uptime: Date.now() - this.startTime,
      eventsProcessed: this.eventsProcessed,
      threatsDetected: this.threatsDetected,
      actionsExecuted: this.actionsExecuted,
      learningProgress: getLearningProgress(this.baseline, this.config.learningDays),
      baselineConfidence: this.baseline.confidenceLevel,
      memoryUsageMB: memCheck.heapUsedMB,
      heapTotalMB: memCheck.heapTotalMB,
      heapLimitMB: memCheck.heapLimitMB,
      heapUsagePercent: memCheck.heapUsagePercent,
      memoryStatus: memCheck.memoryStatus,
      cpuPercent: 0,
      sigmaRuleCount: ruleCounts.sigma,
      yaraRuleCount: ruleCounts.yara,
      atrRuleCount: this.engines.atrEngine.getRuleCount(),
      atrMatchCount: this.engines.atrEngine.getMatchCount(),
      atrDrafterPatterns: this.engines.atrDrafter?.getPatternCount() ?? 0,
      atrDrafterSubmitted: this.engines.atrDrafter?.getSubmittedCount() ?? 0,
      whitelistedSkills: this.engines.atrEngine.getWhitelistManager().getStats().active,
      trackedSkills: this.engines.atrEngine.getTrackedSkillCount(),
      stableFingerprints: this.engines.atrEngine.getStableFingerprintCount(),
    });
  }

  /**
   * Register event callback for external consumers (e.g. CLI quiet mode).
   */
  setEventCallback(cb: (type: string, data: Record<string, unknown>) => void): void {
    this.eventCallback = cb;
  }

  /**
   * Apply a policy update. Delegates to response-engine module.
   */
  private applyPolicy(policy: PolicyUpdate): void {
    _applyPolicy(policy, this.engines.respondAgent);
  }

  /**
   * Poll the Manager for a policy update. Delegates to response-engine module.
   */
  private async pollPolicy(): Promise<void> {
    await _pollPolicy(this.agentClient);
  }

  /**
   * Get a skill threat submitter function for SkillWatcher integration.
   */
  getSkillThreatSubmitter(): (submission: {
    skillHash: string;
    skillName: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    findingSummaries?: Array<{ id: string; category: string; severity: string; title: string }>;
  }) => Promise<boolean> {
    return _getSkillThreatSubmitter(this.engines.threatCloud);
  }

  /**
   * Get a skill blacklist checker function for SkillWatcher integration.
   */
  getSkillBlacklistChecker(): (skillName: string) => Promise<boolean> {
    return _getSkillBlacklistChecker(this.engines.threatCloud);
  }

  /**
   * Check current memory pressure using V8 heap statistics.
   */
  private checkMemoryPressure(): {
    heapUsedMB: number;
    heapTotalMB: number;
    heapLimitMB: number;
    heapUsagePercent: number;
    memoryStatus: 'healthy' | 'warning' | 'critical';
  } {
    const mem = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10;
    const heapTotalMB = Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10;
    const heapLimitMB = Math.round((heapStats.heap_size_limit / 1024 / 1024) * 10) / 10;
    const heapUsagePercent =
      Math.round((mem.heapUsed / heapStats.heap_size_limit) * 1000) / 10;

    let memoryStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (heapUsagePercent >= 80) {
      memoryStatus = 'critical';
    } else if (heapUsagePercent >= 60) {
      memoryStatus = 'warning';
    }

    return { heapUsedMB, heapTotalMB, heapLimitMB, heapUsagePercent, memoryStatus };
  }

  /**
   * Get current engine status / 取得引擎狀態
   */
  getStatus(): GuardStatus {
    const license = validateLicense(this.config.licenseKey);
    const memCheck = this.checkMemoryPressure();

    return {
      running: this.running,
      mode: this.mode,
      uptime: this.running ? Date.now() - this.startTime : 0,
      eventsProcessed: this.eventsProcessed,
      threatsDetected: this.threatsDetected,
      actionsExecuted: this.actionsExecuted,
      learningProgress: getLearningProgress(this.baseline, this.config.learningDays),
      baselineConfidence: this.baseline.confidenceLevel,
      memoryUsageMB: memCheck.heapUsedMB,
      heapTotalMB: memCheck.heapTotalMB,
      heapLimitMB: memCheck.heapLimitMB,
      heapUsagePercent: memCheck.heapUsagePercent,
      memoryStatus: memCheck.memoryStatus,
      licenseTier: license.tier,
      atrRuleCount: this.engines.atrEngine.getRuleCount(),
      atrMatchCount: this.engines.atrEngine.getMatchCount(),
      atrDrafterPatterns: this.engines.atrDrafter?.getPatternCount() ?? 0,
      atrDrafterSubmitted: this.engines.atrDrafter?.getSubmittedCount() ?? 0,
      whitelistedSkills: this.engines.atrEngine.getWhitelistManager().getStats().active,
      trackedSkills: this.engines.atrEngine.getTrackedSkillCount(),
      stableFingerprints: this.engines.atrEngine.getStableFingerprintCount(),
    };
  }

  /**
   * Get loaded rule counts for each engine layer.
   */
  getRuleCounts(): { sigma: number; atr: number; yara: number } {
    return getRuleCounts(
      this.engines.ruleEngine,
      this.engines.atrEngine,
      this.engines.yaraScanner
    );
  }

  /**
   * Get the current baseline / 取得當前基線
   */
  getBaseline(): EnvironmentBaseline {
    return this.baseline;
  }

  /**
   * Check if engine is running / 檢查引擎是否執行中
   */
  isRunning(): boolean {
    return this.running;
  }
}
