/**
 * Manager - Central orchestrator for distributed Guard agent architecture
 * Manager - 分散式 Guard 代理架構的中央協調器
 *
 * Coordinates multiple Guard agents across endpoints:
 * - Agent registration and lifecycle management
 * - Heartbeat monitoring with stale agent detection
 * - Threat ingestion and cross-agent correlation
 * - Centralized policy creation and distribution
 *
 * @module @panguard-ai/manager/manager
 */

import { createLogger } from '@panguard-ai/core';
import { AgentRegistry } from './agent-registry.js';
import { ThreatAggregator } from './threat-aggregator.js';
import { PolicyEngine } from './policy-engine.js';
import { DashboardRelay } from './dashboard-relay.js';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type {
  ManagerConfig,
  AgentRegistrationRequest,
  AgentRegistration,
  AgentHeartbeat,
  ThreatReport,
  AggregatedThreat,
  PolicyUpdate,
  PolicyRule,
  ManagerOverview,
  AgentOverview,
  ThreatSummary,
  AgentPushResult,
  PolicyBroadcastResult,
} from './types.js';

const logger = createLogger('panguard-manager:core');

/**
 * Manager is the main orchestrator for the distributed Guard architecture.
 *
 * It composes AgentRegistry, ThreatAggregator, and PolicyEngine to provide
 * a unified API for managing the entire fleet of Guard agents.
 */
export class Manager {
  private readonly config: ManagerConfig;
  private readonly registry: AgentRegistry;
  private readonly aggregator: ThreatAggregator;
  private readonly policyEngine: PolicyEngine;
  /** Dashboard relay for proxying remote dashboard connections / 用於代理遠端 dashboard 連接的 relay */
  private readonly relay: DashboardRelay;

  private running: boolean;
  private startTime: number;
  private staleCheckTimer: ReturnType<typeof setInterval> | null;
  private purgeTimer: ReturnType<typeof setInterval> | null;

  // Policy broadcast queue / 策略廣播佇列
  private readonly broadcastQueue: PolicyBroadcastResult[];

  constructor(config: ManagerConfig) {
    this.config = config;
    this.registry = new AgentRegistry(config.maxAgents);
    this.aggregator = new ThreatAggregator(config.correlationWindowMs, config.threatRetentionMs);
    this.policyEngine = new PolicyEngine();
    this.relay = new DashboardRelay({ requireAuth: !!config.authToken });

    this.running = false;
    this.startTime = 0;
    this.staleCheckTimer = null;
    this.purgeTimer = null;
    this.broadcastQueue = [];

    logger.info(
      `Manager initialized (maxAgents: ${config.maxAgents}, ` +
        `heartbeatTimeout: ${config.heartbeatTimeoutMs}ms) / ` +
        `Manager 已初始化`
    );
  }

  /**
   * Start the Manager service.
   * Begins periodic stale agent checking and threat purging.
   */
  start(): void {
    if (this.running) {
      logger.warn('Manager already running / Manager 已在執行中');
      return;
    }

    this.running = true;
    this.startTime = Date.now();

    // Periodic stale agent check / 定期檢查過期代理
    this.staleCheckTimer = setInterval(() => {
      this.checkStaleAgents();
    }, this.config.heartbeatIntervalMs);

    // Periodic threat data purge / 定期清除威脅資料
    const purgeIntervalMs = Math.min(
      this.config.threatRetentionMs / 4,
      3_600_000 // max 1 hour
    );
    this.purgeTimer = setInterval(() => {
      this.aggregator.purgeExpired();
    }, purgeIntervalMs);

    logger.info(
      `Manager started on port ${this.config.port} / ` + `Manager 已啟動於埠 ${this.config.port}`
    );
  }

  /**
   * Stop the Manager service.
   * Clears all periodic timers.
   */
  stop(): void {
    if (!this.running) return;

    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }

    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }

    // Disconnect all relay connections / 斷開所有 relay 連接
    this.relay.disconnectAll();

    this.running = false;

    logger.info(`Manager stopped (uptime: ${Date.now() - this.startTime}ms) / Manager 已停止`);
  }

  /**
   * Handle WebSocket upgrade for dashboard relay paths.
   * Routes /api/dashboard/ paths to the DashboardRelay.
   * 處理 dashboard relay 路徑的 WebSocket 升級。
   *
   * @returns true if the path was handled, false if not a dashboard path
   */
  handleDashboardUpgrade(req: IncomingMessage, socket: Socket, head: Buffer): boolean {
    const url = req.url ?? '';
    if (url.startsWith('/api/dashboard/')) {
      this.relay.handleUpgrade(req, socket, head);
      return true;
    }
    return false;
  }

  /** Get the dashboard relay instance / 取得 dashboard relay 實例 */
  getDashboardRelay(): DashboardRelay {
    return this.relay;
  }

  // ===== Agent Lifecycle / 代理生命週期 =====

  /**
   * Handle a new agent registration request.
   *
   * @param request - Registration data from the Guard agent
   * @returns Immutable copy of the registration record
   * @throws Error if max agents exceeded
   */
  handleRegistration(request: AgentRegistrationRequest): AgentRegistration {
    const registration = this.registry.registerAgent(request);

    logger.info(
      `Agent joined: ${registration.agentId} from ${registration.hostname} / ` +
        `代理已加入: ${registration.agentId} 來自 ${registration.hostname}`
    );

    return registration;
  }

  /**
   * Handle a heartbeat from a Guard agent.
   * Updates the agent's status and last-seen timestamp.
   *
   * @param heartbeat - Heartbeat data from the agent
   * @returns Updated registration, or undefined if agent unknown
   */
  handleHeartbeat(heartbeat: AgentHeartbeat): AgentRegistration | undefined {
    return this.registry.updateHeartbeat(heartbeat);
  }

  /**
   * Handle a threat report from a Guard agent.
   * Ingests threats into the aggregator and checks for cross-agent correlation.
   *
   * @param report - Threat report containing one or more events
   * @returns Array of aggregated threats, with correlation data if detected
   */
  handleThreatReport(report: ThreatReport): readonly AggregatedThreat[] {
    const agent = this.registry.getAgent(report.agentId);
    const hostname = agent?.hostname ?? 'unknown';

    const aggregated = this.aggregator.ingestReport(report, hostname);

    // Log correlation detections
    const correlated = aggregated.filter((t) => t.correlatedWith.length > 0);
    if (correlated.length > 0) {
      logger.warn(
        `ALERT: ${correlated.length} cross-agent correlations detected from ${hostname} / ` +
          `警報: 從 ${hostname} 偵測到 ${correlated.length} 個跨代理關聯`
      );
    }

    return aggregated;
  }

  /**
   * Remove an agent from the fleet.
   *
   * @param agentId - The agent's unique identifier
   * @returns true if the agent was found and removed
   */
  handleDeregistration(agentId: string): boolean {
    return this.registry.deregisterAgent(agentId);
  }

  // ===== Policy Management / 策略管理 =====

  /**
   * Create and optionally broadcast a new security policy.
   * 建立並選擇性廣播新的安全策略。
   *
   * @param rules - Policy rules to include
   * @param broadcast - Whether to push broadcast to all active agents
   * @returns The created policy
   */
  async createPolicy(rules: readonly PolicyRule[], broadcast = true): Promise<PolicyUpdate> {
    const activeAgentIds = this.registry.getActiveAgents().map((a) => a.agentId);

    const policy = this.policyEngine.createPolicy(rules, activeAgentIds);

    if (broadcast) {
      await this.broadcastPolicy(policy);
    }

    return policy;
  }

  /**
   * Push a policy update to a single agent via HTTP POST.
   * 透過 HTTP POST 將策略更新推送至單一代理。
   *
   * Looks up the agent's endpoint from the registry, sends a POST to
   * `{agent.endpoint}/api/policy/push` with JSON body `{ policy, timestamp }`.
   * Retries once on network failure. Timeout is 5 seconds per attempt.
   *
   * @param agentId - The target agent's unique identifier
   * @param policy - The policy update to push
   * @returns Push result indicating success or failure
   */
  async pushPolicyToAgent(agentId: string, policy: PolicyUpdate): Promise<AgentPushResult> {
    const agent = this.registry.getAgent(agentId);
    if (!agent) {
      return {
        agentId,
        success: false,
        error: `Agent ${agentId} not found in registry / 在登錄簿中找不到代理 ${agentId}`,
      };
    }

    const url = `${agent.endpoint.replace(/\/+$/, '')}/api/policy/push`;
    const body = JSON.stringify({
      policy,
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    // Attempt HTTP POST with one retry on failure
    // 嘗試 HTTP POST，失敗時重試一次
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        logger.info(
          `Policy ${policy.policyId} pushed to agent ${agentId} / ` +
            `策略 ${policy.policyId} 已推送至代理 ${agentId}`
        );

        return { agentId, success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        if (attempt < maxAttempts) {
          logger.warn(
            `Push to agent ${agentId} failed (attempt ${attempt}/${maxAttempts}), retrying / ` +
              `推送至代理 ${agentId} 失敗 (嘗試 ${attempt}/${maxAttempts})，重試中: ${message}`
          );
          continue;
        }

        logger.error(
          `Push to agent ${agentId} failed after ${maxAttempts} attempts / ` +
            `推送至代理 ${agentId} 在 ${maxAttempts} 次嘗試後失敗: ${message}`
        );

        return {
          agentId,
          success: false,
          error: message,
        };
      }
    }

    // Unreachable, but satisfies TypeScript
    return { agentId, success: false, error: 'Unexpected push failure' };
  }

  /**
   * Broadcast a policy update to active agents via HTTP POST push.
   * 透過 HTTP POST 推送將策略更新廣播至活躍代理。
   *
   * Gets target agents (specified IDs or all active), pushes policy to each,
   * and collects results into the broadcast queue.
   *
   * @param policy - The policy to broadcast
   * @param targetAgentIds - Optional list of specific agent IDs to target
   * @returns Broadcast result with per-agent outcomes
   */
  async broadcastPolicy(
    policy: PolicyUpdate,
    targetAgentIds?: string[]
  ): Promise<PolicyBroadcastResult> {
    // Determine target agents / 決定目標代理
    const targetIds = targetAgentIds
      ? [...targetAgentIds]
      : this.registry.getActiveAgents().map((a) => a.agentId);

    // Push to each agent concurrently / 同時推送至每個代理
    const agentResults: AgentPushResult[] = await Promise.all(
      targetIds.map((id) => this.pushPolicyToAgent(id, policy))
    );

    const successCount = agentResults.filter((r) => r.success).length;
    const failureCount = agentResults.filter((r) => !r.success).length;

    const result: PolicyBroadcastResult = {
      policyId: policy.policyId,
      targetAgents: [...targetIds],
      queuedAt: new Date().toISOString(),
      agentResults: [...agentResults],
      successCount,
      failureCount,
    };

    this.broadcastQueue.push(result);

    logger.info(
      `Policy ${policy.policyId} broadcast to ${targetIds.length} agents ` +
        `(success: ${successCount}, failed: ${failureCount}) / ` +
        `策略 ${policy.policyId} 已廣播至 ${targetIds.length} 個代理 ` +
        `(成功: ${successCount}, 失敗: ${failureCount})`
    );

    return {
      ...result,
      targetAgents: [...result.targetAgents],
      agentResults: [...agentResults],
    };
  }

  /**
   * Get the active global policy.
   *
   * @returns Active policy or null
   */
  getActivePolicy(): PolicyUpdate | null {
    return this.policyEngine.getActivePolicy();
  }

  /**
   * Get the policy applicable to a specific agent.
   *
   * @param agentId - The agent's unique identifier
   * @returns Policy for the agent, or null
   */
  getPolicyForAgent(agentId: string): PolicyUpdate | null {
    return this.policyEngine.getPolicyForAgent(agentId);
  }

  /**
   * Get pending policy broadcast results.
   *
   * @returns Immutable array of broadcast results
   */
  getPendingBroadcasts(): readonly PolicyBroadcastResult[] {
    return this.broadcastQueue.map((r) => ({
      ...r,
      targetAgents: [...r.targetAgents],
    }));
  }

  // ===== Monitoring / 監控 =====

  /**
   * Check for and handle stale agents.
   * Called periodically by the stale check timer.
   */
  private checkStaleAgents(): void {
    const stale = this.registry.getStaleAgents(this.config.heartbeatTimeoutMs);

    if (stale.length > 0) {
      logger.warn(
        `${stale.length} stale agent(s) detected / ` + `偵測到 ${stale.length} 個過期代理`
      );
    }
  }

  // ===== Dashboard / 儀表板 =====

  /**
   * Generate a comprehensive overview for the management dashboard.
   *
   * @returns Immutable manager overview object
   */
  getOverview(): ManagerOverview {
    const allAgents = this.registry.getAllAgents();
    const statusCounts = this.registry.getStatusCounts();
    const threatSummary = this.aggregator.getSummary();
    const policyVersion = this.policyEngine.getCurrentVersion();

    const agentOverviews: AgentOverview[] = allAgents.map((a) => {
      const agentThreats = this.aggregator.getThreatsByAgent(a.agentId);
      return {
        agentId: a.agentId,
        hostname: a.hostname,
        status: a.status,
        lastHeartbeat: a.lastHeartbeat,
        threatCount: agentThreats.length,
      };
    });

    return {
      totalAgents: allAgents.length,
      onlineAgents: statusCounts.online,
      staleAgents: statusCounts.stale,
      offlineAgents: statusCounts.offline,
      agents: agentOverviews,
      threatSummary,
      activePolicyVersion: policyVersion,
      uptimeMs: this.running ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Get threat summary from the aggregator.
   *
   * @returns Immutable threat summary
   */
  getThreatSummary(): ThreatSummary {
    return this.aggregator.getSummary();
  }

  /**
   * Get threats reported by a specific agent.
   *
   * @param agentId - The agent's unique identifier
   * @returns Array of aggregated threats
   */
  getThreatsByAgent(agentId: string): readonly AggregatedThreat[] {
    return this.aggregator.getThreatsByAgent(agentId);
  }

  /**
   * Get recent threats across all agents.
   *
   * @param since - Date threshold
   * @returns Array of aggregated threats
   */
  getRecentThreats(since: Date): readonly AggregatedThreat[] {
    return this.aggregator.getRecentThreats(since);
  }

  /**
   * Get a specific agent's registration.
   *
   * @param agentId - The agent's unique identifier
   * @returns Agent registration or undefined
   */
  getAgent(agentId: string): AgentRegistration | undefined {
    return this.registry.getAgent(agentId);
  }

  /**
   * Check if the manager is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the number of registered agents.
   */
  getAgentCount(): number {
    return this.registry.size;
  }
}
