/**
 * PanguardAgentClient - Agent-side communication with Manager server
 * PanguardAgentClient - Agent 端與 Manager 伺服器的通訊
 *
 * Handles registration, heartbeat, event reporting, and rule pulling
 * in the distributed Manager-Agent architecture.
 *
 * @module @panguard-ai/panguard-guard/agent-client
 */

import { createLogger } from '@panguard-ai/core';
import type { SecurityEvent } from '@panguard-ai/core';
import os from 'node:os';

const logger = createLogger('panguard-guard:agent-client');

/** Agent registration payload */
export interface AgentRegistration {
  hostname: string;
  os: string;
  arch: string;
  version: string;
  ip?: string;
}

/** Agent registration response from Manager */
export interface AgentRegistrationResponse {
  agentId: string;
  token: string;
}

/** Agent heartbeat payload */
export interface AgentHeartbeat {
  eventsProcessed: number;
  threatsDetected: number;
  actionsExecuted: number;
  mode: string;
  uptime: number;
  memoryUsageMB: number;
}

/** Agent event report */
export interface AgentEventReport {
  event: SecurityEvent;
  verdict?: {
    conclusion: string;
    confidence: number;
    action: string;
  };
}

/**
 * Policy update received from Manager push
 * 從 Manager 推送收到的策略更新
 */
export interface PolicyUpdate {
  readonly policyId: string;
  readonly version: number;
  readonly rules: readonly Record<string, unknown>[];
  readonly updatedAt: string;
  readonly appliedTo: readonly string[];
}

/**
 * Incoming policy push request body from Manager
 * 來自 Manager 的策略推送請求內容
 */
export interface IncomingPolicyPush {
  readonly policy: PolicyUpdate;
  readonly timestamp: string;
}

/**
 * HTTP helper - performs a JSON request using native Node.js http/https
 */
async function jsonRequest<T>(
  url: string,
  method: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const { request: httpRequest } = url.startsWith('https')
    ? await import('node:https')
    : await import('node:http');

  const parsedUrl = new URL(url);

  return new Promise<T>((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = httpRequest(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        timeout: 10000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const data = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              resolve(data as unknown as T);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * PanguardAgentClient manages communication with the Manager server
 */
export class PanguardAgentClient {
  private readonly managerUrl: string;
  private agentId: string | null = null;
  private token: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatInterval: number;
  private policyPushHandler: ((policy: PolicyUpdate) => void) | null = null;

  constructor(managerUrl: string, heartbeatInterval = 30000) {
    // Remove trailing slash
    this.managerUrl = managerUrl.replace(/\/+$/, '');
    this.heartbeatInterval = heartbeatInterval;
  }

  /**
   * Register this agent with the Manager
   */
  async register(version: string): Promise<AgentRegistrationResponse> {
    const registration: AgentRegistration = {
      hostname: os.hostname(),
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      version,
      ip: getLocalIP(),
    };

    logger.info(`Registering agent with manager: ${this.managerUrl}`);

    const response = await jsonRequest<AgentRegistrationResponse>(
      `${this.managerUrl}/api/agents/register`,
      'POST',
      registration
    );

    this.agentId = response.agentId;
    this.token = response.token;

    logger.info(`Agent registered: id=${this.agentId}`);
    return response;
  }

  /**
   * Send heartbeat to Manager
   */
  async heartbeat(status: AgentHeartbeat): Promise<void> {
    if (!this.agentId || !this.token) {
      throw new Error('Agent not registered. Call register() first.');
    }

    await jsonRequest(
      `${this.managerUrl}/api/agents/${this.agentId}/heartbeat`,
      'POST',
      status,
      this.token
    );
  }

  /**
   * Report a security event to Manager
   */
  async reportEvent(report: AgentEventReport): Promise<void> {
    if (!this.agentId || !this.token) {
      throw new Error('Agent not registered. Call register() first.');
    }

    await jsonRequest(
      `${this.managerUrl}/api/agents/${this.agentId}/events`,
      'POST',
      report,
      this.token
    );
  }

  /**
   * Pull latest rules from Manager
   */
  async pullRules(): Promise<string[]> {
    if (!this.token) {
      throw new Error('Agent not registered. Call register() first.');
    }

    const response = await jsonRequest<{ rules: string[] }>(
      `${this.managerUrl}/api/rules/latest`,
      'GET',
      undefined,
      this.token
    );

    return response.rules ?? [];
  }

  /**
   * Start periodic heartbeat
   */
  startHeartbeat(statusGetter: () => AgentHeartbeat): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      this.heartbeat(statusGetter()).catch((err: unknown) => {
        logger.warn(`Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }, this.heartbeatInterval);

    logger.info(`Heartbeat started (interval: ${this.heartbeatInterval}ms)`);
  }

  /**
   * Stop periodic heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      logger.info('Heartbeat stopped');
    }
  }

  /**
   * Register a callback handler for incoming policy pushes from the Manager.
   * 註冊一個回呼處理器，用於接收來自 Manager 的策略推送。
   *
   * The actual HTTP endpoint (`/api/policy/push`) must be hosted by the
   * agent's API server; this method only stores the handler callback.
   *
   * @param handler - Callback invoked when a valid policy push is received
   */
  onPolicyPush(handler: (policy: PolicyUpdate) => void): void {
    this.policyPushHandler = handler;
    logger.info('Policy push handler registered / 策略推送處理器已註冊');
  }

  /**
   * Handle an incoming policy push request from the Manager.
   * 處理來自 Manager 的策略推送請求。
   *
   * Validates the policy structure and invokes the registered handler.
   * Should be called by the agent's HTTP server when it receives a POST
   * to `/api/policy/push`.
   *
   * @param request - The incoming push request body
   * @returns `{ ok: true }` on success, `{ ok: false }` on failure
   */
  handleIncomingPolicyPush(request: IncomingPolicyPush): { ok: boolean } {
    // Validate request structure / 驗證請求結構
    if (!request || typeof request !== 'object') {
      logger.warn('Invalid policy push: request is not an object / 無效的策略推送：請求不是物件');
      return { ok: false };
    }

    const { policy, timestamp } = request;

    if (!policy || typeof policy !== 'object') {
      logger.warn(
        'Invalid policy push: missing or invalid policy / 無效的策略推送：缺少或無效的策略'
      );
      return { ok: false };
    }

    if (!policy.policyId || typeof policy.policyId !== 'string') {
      logger.warn('Invalid policy push: missing policyId / 無效的策略推送：缺少 policyId');
      return { ok: false };
    }

    if (typeof policy.version !== 'number') {
      logger.warn('Invalid policy push: invalid version / 無效的策略推送：無效的版本');
      return { ok: false };
    }

    if (!Array.isArray(policy.rules)) {
      logger.warn('Invalid policy push: rules must be an array / 無效的策略推送：rules 必須為陣列');
      return { ok: false };
    }

    if (!timestamp || typeof timestamp !== 'string') {
      logger.warn('Invalid policy push: missing timestamp / 無效的策略推送：缺少時間戳');
      return { ok: false };
    }

    // Invoke handler if registered / 如已註冊則呼叫處理器
    if (!this.policyPushHandler) {
      logger.warn('No policy push handler registered / 未註冊策略推送處理器');
      return { ok: false };
    }

    try {
      this.policyPushHandler(policy);
      logger.info(
        `Policy push received: ${policy.policyId} v${policy.version} / ` +
          `收到策略推送: ${policy.policyId} v${policy.version}`
      );
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Policy push handler error: ${message} / 策略推送處理器錯誤: ${message}`);
      return { ok: false };
    }
  }

  /** Get agent ID */
  getAgentId(): string | null {
    return this.agentId;
  }

  /** Check if registered */
  isRegistered(): boolean {
    return this.agentId !== null && this.token !== null;
  }
}

/**
 * Get the first non-internal IPv4 address
 */
function getLocalIP(): string | undefined {
  const interfaces = os.networkInterfaces();
  for (const nets of Object.values(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return undefined;
}
