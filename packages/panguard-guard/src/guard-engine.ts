/**
 * GuardEngine - Main orchestrator for PanguardGuard
 * GuardEngine - PanguardGuard 主引擎
 *
 * Orchestrates the complete detection-analysis-response pipeline:
 * 1. Receives security events from MonitorEngine
 * 2. Routes through DetectAgent -> AnalyzeAgent -> RespondAgent -> ReportAgent
 * 3. Manages Context Memory baseline learning and protection transitions
 * 4. Coordinates notifications, threat cloud, and dashboard updates
 *
 * 協調完整的偵測-分析-回應管線：
 * 1. 從 MonitorEngine 接收安全事件
 * 2. 經過 DetectAgent -> AnalyzeAgent -> RespondAgent -> ReportAgent 路由
 * 3. 管理 Context Memory 基線學習和防護轉換
 * 4. 協調通知、威脅雲和儀表板更新
 *
 * @module @openclaw/panguard-guard/guard-engine
 */

import { join } from 'node:path';
import { createLogger, RuleEngine, MonitorEngine } from '@openclaw/core';
import type { SecurityEvent } from '@openclaw/core';
import type {
  GuardConfig,
  GuardStatus,
  GuardMode,
  EnvironmentBaseline,
  ThreatVerdict,
  ResponseResult,
  AnalyzeLLM,
} from './types.js';

import { DetectAgent, AnalyzeAgent, RespondAgent, ReportAgent } from './agent/index.js';
import { loadBaseline, saveBaseline, isLearningComplete, getLearningProgress, switchToProtectionMode } from './memory/index.js';
import { InvestigationEngine } from './investigation/index.js';
import { sendNotifications } from './notify/index.js';
import { ThreatCloudClient } from './threat-cloud/index.js';
import { DashboardServer } from './dashboard/index.js';
import { PidFile, Watchdog } from './daemon/index.js';
import { validateLicense, hasFeature } from './license/index.js';

const logger = createLogger('panguard-guard:engine');

/**
 * GuardEngine is the central orchestrator for all PanguardGuard functionality
 * GuardEngine 是所有 PanguardGuard 功能的中央協調器
 */
export class GuardEngine {
  private readonly config: GuardConfig;
  private mode: GuardMode;
  private baseline: EnvironmentBaseline;
  private readonly baselinePath: string;

  // Agents / 代理
  private readonly ruleEngine: RuleEngine;
  private readonly detectAgent: DetectAgent;
  private readonly analyzeAgent: AnalyzeAgent;
  private readonly respondAgent: RespondAgent;
  private readonly reportAgent: ReportAgent;
  private readonly investigationEngine: InvestigationEngine;

  // Infrastructure / 基礎設施
  private readonly threatCloud: ThreatCloudClient;
  private dashboard: DashboardServer | null = null;
  private readonly pidFile: PidFile;
  private watchdog: Watchdog | null = null;
  private monitorEngine: MonitorEngine | null = null;

  // State / 狀態
  private running = false;
  private startTime = 0;
  private eventsProcessed = 0;
  private threatsDetected = 0;
  private actionsExecuted = 0;
  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private learningCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: GuardConfig, llm: AnalyzeLLM | null = null) {
    this.config = config;
    this.mode = config.mode;
    this.baselinePath = join(config.dataDir, 'baseline.json');

    // Load or create baseline / 載入或建立基線
    this.baseline = loadBaseline(this.baselinePath);

    // Validate license / 驗證授權
    const license = validateLicense(config.licenseKey);
    logger.info(
      `License: ${license.tier} tier (valid: ${license.isValid}) / ` +
      `授權: ${license.tier} 等級 (有效: ${license.isValid})`,
    );

    // Initialize rule engine / 初始化規則引擎
    this.ruleEngine = new RuleEngine({
      rulesDir: join(config.dataDir, 'rules'),
      hotReload: true,
    });

    // Initialize agents / 初始化代理
    this.detectAgent = new DetectAgent(this.ruleEngine);

    const analyzeLLM = hasFeature(license, 'ai_analysis') ? llm : null;
    this.analyzeAgent = new AnalyzeAgent(analyzeLLM);
    this.respondAgent = new RespondAgent(config.actionPolicy, this.mode);
    this.reportAgent = new ReportAgent(
      join(config.dataDir, 'events.jsonl'),
      this.mode,
    );

    // Initialize investigation engine / 初始化調查引擎
    this.investigationEngine = new InvestigationEngine(this.baseline);

    // Initialize threat cloud / 初始化威脅雲
    this.threatCloud = new ThreatCloudClient(
      hasFeature(license, 'threat_cloud') ? config.threatCloudEndpoint : undefined,
      config.dataDir,
    );

    // PID file / PID 檔案
    this.pidFile = new PidFile(config.dataDir);

    logger.info('GuardEngine initialized / GuardEngine 已初始化');
  }

  /**
   * Start the guard engine / 啟動守護引擎
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('GuardEngine already running / GuardEngine 已在執行中');
      return;
    }

    logger.info(`Starting GuardEngine in ${this.mode} mode / 啟動 GuardEngine（${this.mode} 模式）`);

    // Write PID file / 寫入 PID 檔案
    this.pidFile.write();

    // Load rules / 載入規則
    await this.ruleEngine.loadRules();

    // Load community rules from threat cloud / 從威脅雲載入社群規則
    const cloudRules = await this.threatCloud.fetchRules();
    for (const rule of cloudRules) {
      try {
        const parsed = JSON.parse(rule.ruleContent) as import('@openclaw/core').SigmaRule;
        if (parsed.id && parsed.title && parsed.detection) {
          this.ruleEngine.addRule(parsed);
        }
      } catch {
        // Skip invalid cloud rules / 跳過無效的雲端規則
      }
    }

    // Start monitor engine / 啟動監控引擎
    this.monitorEngine = new MonitorEngine({
      networkPollInterval: this.config.monitors.networkPollInterval,
      processPollInterval: this.config.monitors.processPollInterval,
    });

    this.monitorEngine.on('event', (event: SecurityEvent) => {
      void this.processEvent(event);
    });

    this.monitorEngine.start();

    // Start dashboard if enabled / 啟動儀表板（如已啟用）
    const license = validateLicense(this.config.licenseKey);
    if (this.config.dashboardEnabled && hasFeature(license, 'dashboard')) {
      this.dashboard = new DashboardServer(this.config.dashboardPort);
      this.dashboard.setConfigGetter(() => this.config);
      await this.dashboard.start();
    }

    // Start watchdog if enabled / 啟動看門狗（如已啟用）
    if (this.config.watchdogEnabled) {
      this.watchdog = new Watchdog(this.config.watchdogInterval, () => {
        logger.error('Watchdog triggered restart / 看門狗觸發重啟');
      });
      this.watchdog.start();
    }

    // Periodic status update / 定期狀態更新
    this.statusTimer = setInterval(() => {
      this.updateDashboardStatus();
      if (this.watchdog) this.watchdog.heartbeat();
    }, 5000);

    // Learning period check / 學習期檢查
    this.learningCheckTimer = setInterval(() => {
      this.checkLearningTransition();
    }, 60000);

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

    // Clear timers / 清除計時器
    if (this.statusTimer) { clearInterval(this.statusTimer); this.statusTimer = null; }
    if (this.learningCheckTimer) { clearInterval(this.learningCheckTimer); this.learningCheckTimer = null; }

    // Stop components / 停止元件
    if (this.monitorEngine) this.monitorEngine.stop();
    if (this.dashboard) await this.dashboard.stop();
    if (this.watchdog) this.watchdog.stop();

    // Save baseline / 儲存基線
    saveBaseline(this.baselinePath, this.baseline);

    // Flush threat cloud queue / 清空威脅雲佇列
    await this.threatCloud.flushQueue();

    // Clean up / 清理
    this.ruleEngine.destroy();
    this.pidFile.remove();

    this.running = false;
    logger.info('GuardEngine stopped / GuardEngine 已停止');
  }

  /**
   * Process a single security event through the full pipeline
   * 透過完整管線處理單一安全事件
   */
  async processEvent(event: SecurityEvent): Promise<void> {
    this.eventsProcessed++;

    try {
      // Stage 1: Detect / 階段 1: 偵測
      const detection = this.detectAgent.detect(event);

      if (!detection) {
        // No threat detected - still update baseline in learning mode
        // 未偵測到威脅 - 學習模式下仍更新基線
        if (this.mode === 'learning') {
          const { updateBaseline } = await import('./memory/baseline.js');
          this.baseline = updateBaseline(this.baseline, event);
        }
        return;
      }

      this.threatsDetected++;

      // Stage 2: Analyze (with Dynamic Reasoning investigation)
      // 階段 2: 分析（使用動態推理調查）
      const verdict: ThreatVerdict = await this.analyzeAgent.analyze(
        detection,
        this.baseline,
      );

      // Run investigation for suspicious/malicious verdicts
      // 對可疑/惡意判決執行調查
      if (verdict.conclusion !== 'benign') {
        const investigation = await this.investigationEngine.investigate(event);
        verdict.investigationSteps = investigation.steps;
      }

      // Stage 3: Respond / 階段 3: 回應
      const response: ResponseResult = await this.respondAgent.respond(verdict);
      if (response.action !== 'log_only') {
        this.actionsExecuted++;
      }

      // Send notifications if needed / 需要時發送通知
      if (response.action === 'notify' || (verdict.confidence >= this.config.actionPolicy.notifyAndWait)) {
        await sendNotifications(
          this.config.notifications,
          verdict,
          event.description,
        );
      }

      // Stage 4: Report / 階段 4: 報告
      const { updatedBaseline, anonymizedData } = this.reportAgent.report(
        event,
        verdict,
        response,
        this.baseline,
      );
      this.baseline = updatedBaseline;

      // Upload to threat cloud / 上傳至威脅雲
      if (anonymizedData) {
        await this.threatCloud.upload(anonymizedData);
      }

      // Update dashboard / 更新儀表板
      if (this.dashboard) {
        this.dashboard.addVerdict(verdict);
        this.dashboard.pushEvent({
          type: 'new_event',
          data: { event: event.id, verdict: verdict.conclusion, confidence: verdict.confidence },
          timestamp: new Date().toISOString(),
        });

        // Update threat map if we have IP / 如有 IP 則更新威脅地圖
        const sourceIP = (event.metadata?.['sourceIP'] as string) ??
                         (event.metadata?.['remoteAddress'] as string);
        if (sourceIP && verdict.conclusion !== 'benign') {
          this.dashboard.addThreatMapEntry({
            sourceIP,
            attackType: event.category,
            count: 1,
            lastSeen: new Date().toISOString(),
          });
        }
      }

      // Save baseline periodically / 定期儲存基線
      if (this.eventsProcessed % 100 === 0) {
        saveBaseline(this.baselinePath, this.baseline);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Event processing failed: ${msg} / 事件處理失敗: ${msg}`);
    }
  }

  /**
   * Check if learning period should transition to protection
   * 檢查學習期是否應轉換為防護模式
   */
  private checkLearningTransition(): void {
    if (this.mode !== 'learning') return;

    if (isLearningComplete(this.baseline, this.config.learningDays)) {
      logger.info('Learning period complete, switching to protection / 學習期完成，切換至防護模式');
      this.baseline = switchToProtectionMode(this.baseline);
      this.mode = 'protection';
      this.respondAgent.setMode('protection');
      this.reportAgent.setMode('protection');
      saveBaseline(this.baselinePath, this.baseline);

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
   * Update dashboard with current status / 更新儀表板狀態
   */
  private updateDashboardStatus(): void {
    if (!this.dashboard) return;

    const memUsage = process.memoryUsage();
    this.dashboard.updateStatus({
      mode: this.mode,
      uptime: Date.now() - this.startTime,
      eventsProcessed: this.eventsProcessed,
      threatsDetected: this.threatsDetected,
      actionsExecuted: this.actionsExecuted,
      learningProgress: getLearningProgress(this.baseline, this.config.learningDays),
      baselineConfidence: this.baseline.confidenceLevel,
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 10) / 10,
      cpuPercent: 0, // CPU tracking would need os.cpus()
    });
  }

  /**
   * Get current engine status / 取得引擎狀態
   */
  getStatus(): GuardStatus {
    const license = validateLicense(this.config.licenseKey);
    const memUsage = process.memoryUsage();

    return {
      running: this.running,
      mode: this.mode,
      uptime: this.running ? Date.now() - this.startTime : 0,
      eventsProcessed: this.eventsProcessed,
      threatsDetected: this.threatsDetected,
      actionsExecuted: this.actionsExecuted,
      learningProgress: getLearningProgress(this.baseline, this.config.learningDays),
      baselineConfidence: this.baseline.confidenceLevel,
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 10) / 10,
      licenseTier: license.tier,
    };
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
