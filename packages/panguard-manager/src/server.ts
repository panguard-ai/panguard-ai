/**
 * ManagerServer — HTTP + WebSocket aggregator for multi-endpoint Guard deployments
 * ManagerServer — 多端點 Guard 部署的 HTTP + WebSocket 聚合器
 *
 * Architecturally mirrors panguard-guard's DashboardServer but:
 *  - listens on all interfaces (not just loopback) so remote Guards can relay
 *  - authenticates via Bearer tokens stored in AgentsRegistry (not random cookie)
 *  - aggregates state across N Guards rather than holding a single-host snapshot
 *
 * @module @panguard-ai/panguard-manager/server
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket as WS } from 'ws';
import { createLogger } from '@panguard-ai/core';
import { AgentsRegistry } from './agents-registry.js';
import { FleetAggregator } from './aggregator.js';
import { handleDetail, handleList, handleRegister, handleRevoke } from './api/agents.js';
import { handleRelayEvent } from './api/events.js';
import { handleHealth, handleStatus } from './api/status.js';
import { fail, newRequestId } from './api/respond.js';

const logger = createLogger('panguard-manager:server');

/** WebSocket client tracking / WebSocket 客戶端追蹤 */
interface WSClient {
  readonly ws: WS;
  alive: boolean;
  readonly ip: string;
}

const MAX_WS_CLIENTS = 50;
const RATE_LIMIT_MAX = 240;
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Constructor options for ManagerServer / ManagerServer 建構選項 */
export interface ManagerServerOptions {
  /** TCP port to listen on / 監聽的 TCP 埠 */
  readonly port: number;
  /** Bind host; defaults to 0.0.0.0 so remote Guards can connect / 綁定主機；預設 0.0.0.0 讓遠端 Guard 連得到 */
  readonly host?: string;
  /** Absolute path to dashboard.html (defaults to the bundled copy) / dashboard.html 絕對路徑（預設為打包副本） */
  readonly dashboardHtmlPath?: string;
  /** Pre-built AgentsRegistry / 預先建立的 AgentsRegistry */
  readonly registry: AgentsRegistry;
  /** Pre-built FleetAggregator / 預先建立的 FleetAggregator */
  readonly aggregator: FleetAggregator;
  /**
   * Pre-shared admin/enrollment token. When set, mutating endpoints
   * (register, revoke) require `Authorization: Bearer <token>`.
   * REQUIRED whenever host is non-loopback — the server refuses to start otherwise.
   * 預共享的 admin/enrollment token。設定後,變更類端點(register、revoke)需帶 Bearer。
   * 綁定非 loopback 時為必填 — 否則伺服器拒絕啟動。
   */
  readonly authToken?: string;
}

/** True if a bind host only accepts local connections / 綁定主機是否僅接受本機連線 */
function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * HTTP + WS server that aggregates relayed Guard events into a fleet dashboard.
 */
export class ManagerServer {
  private readonly port: number;
  private readonly host: string;
  private readonly dashboardHtmlPath: string;
  private readonly registry: AgentsRegistry;
  private readonly aggregator: FleetAggregator;
  private readonly authToken?: string;
  private readonly wsClients: Set<WSClient> = new Set();
  private readonly rateLimits: Map<string, RateLimitEntry> = new Map();
  private server: ReturnType<typeof createServer> | null = null;
  private wss: WebSocketServer | null = null;
  private readonly startedAtMs: number;

  constructor(options: ManagerServerOptions) {
    if (!Number.isInteger(options.port) || options.port <= 0) {
      throw new Error('port must be a positive integer / port 必須為正整數');
    }
    this.port = options.port;
    this.host = options.host ?? '0.0.0.0';
    // Fail closed: refuse to expose a remotely-reachable manager without an auth token,
    // otherwise anyone who can reach the port can register fake agents or revoke real ones.
    // 失敗即關閉:沒有 auth token 不准對外開放,否則任何能連到該埠的人都能註冊假代理或撤銷真代理。
    if (options.authToken && options.authToken.length < 16) {
      throw new Error('authToken must be at least 16 chars / authToken 至少 16 字元');
    }
    if (!isLoopbackHost(this.host) && !options.authToken) {
      throw new Error(
        `refusing to bind manager to non-loopback host "${this.host}" without an auth token. ` +
          'Set MANAGER_AUTH_TOKEN (openssl rand -hex 32), or bind to 127.0.0.1. ' +
          `拒絕在沒有 auth token 的情況下將 manager 綁定到非 loopback 主機 "${this.host}"。`
      );
    }
    this.authToken = options.authToken;
    this.registry = options.registry;
    this.aggregator = options.aggregator;
    this.dashboardHtmlPath = options.dashboardHtmlPath ?? this.resolveBundledDashboard();
    this.startedAtMs = Date.now();
  }

  /** Start the HTTP + WS server / 啟動 HTTP + WS 伺服器 */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`port ${this.port} already in use`));
        } else {
          reject(err);
        }
      });

      const wss = new WebSocketServer({ noServer: true });
      this.wss = wss;
      wss.on('connection', (ws: WS, req: IncomingMessage) => {
        if (this.wsClients.size >= MAX_WS_CLIENTS) {
          logger.warn('Max WebSocket connections reached, rejecting new client');
          ws.close();
          return;
        }
        const client: WSClient = {
          ws,
          alive: true,
          ip: req.socket.remoteAddress ?? 'unknown',
        };
        this.wsClients.add(client);
        ws.on('close', () => this.wsClients.delete(client));
        ws.on('error', () => this.wsClients.delete(client));
        ws.on('pong', () => {
          client.alive = true;
        });

        // Send initial snapshot so the UI does not have to wait for the next event
        // 立刻送出初始快照，UI 不必等到下一個事件
        try {
          ws.send(
            JSON.stringify({
              type: 'fleet_status',
              agent_id: '',
              data: this.aggregator.getFleetSummary(),
              timestamp: new Date().toISOString(),
            })
          );
        } catch {
          /* ignore */
        }
      });

      // Hand WS upgrades to ws server only for /ws path
      // /ws 路徑才交給 ws 伺服器處理升級
      if (!this.server) {
        reject(new Error('server not initialised'));
        return;
      }
      this.server.on('upgrade', (req, socket, head) => {
        const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        if (pathname === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
        } else {
          socket.destroy();
        }
      });

      this.server.listen(this.port, this.host, () => {
        logger.info(`Manager listening on http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  /** Stop the server and close all WebSocket clients / 停止伺服器並關閉所有 WebSocket 客戶端 */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const c of this.wsClients) {
        try {
          c.ws.close();
        } catch {
          /* ignore */
        }
      }
      this.wsClients.clear();
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }
      if (this.server) {
        this.server.close(() => {
          logger.info('Manager stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers / 內部輔助函數
  // ---------------------------------------------------------------------------

  /** Resolve bundled dashboard.html path relative to this module / 解析 dashboard.html 的打包路徑 */
  private resolveBundledDashboard(): string {
    // When built (dist/server.js) the html sits next to the source, copied via build pipeline
    // OR we fall back to the source path
    const here = dirname(fileURLToPath(import.meta.url));
    const distCandidate = join(here, 'dashboard.html');
    if (existsSync(distCandidate)) return distCandidate;
    const srcCandidate = join(here, '..', 'src', 'dashboard.html');
    return srcCandidate;
  }

  /** Broadcast a JSON payload to every WebSocket client / 將 JSON 廣播給所有 WebSocket 客戶端 */
  private broadcast(payload: {
    type: 'fleet_event' | 'fleet_verdict' | 'fleet_status';
    agent_id: string;
    data: unknown;
    timestamp: string;
  }): void {
    const text = JSON.stringify(payload);
    for (const c of this.wsClients) {
      try {
        c.ws.send(text);
      } catch {
        /* ignore broken pipe */
      }
    }
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    if (this.rateLimits.size > 1000) {
      for (const [k, v] of this.rateLimits) {
        if (now > v.resetAt) this.rateLimits.delete(k);
      }
    }
    const entry = this.rateLimits.get(ip);
    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    entry.count++;
    return entry.count <= RATE_LIMIT_MAX;
  }

  /**
   * Gate mutating/admin endpoints behind the pre-shared token.
   * Returns true (request may proceed) when no token is configured — only reachable
   * on loopback because the constructor fails closed for non-loopback binds.
   * 用預共享 token 守住變更/管理類端點。未設 token 時放行(僅可能在 loopback,因建構子已對非 loopback 失敗即關閉)。
   */
  private requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
    if (!this.authToken) return true;
    const header = req.headers.authorization ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    const expected = this.authToken;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    const okToken = a.length === b.length && timingSafeEqual(a, b);
    if (!okToken) {
      fail(res, 401, 'missing or invalid admin token', newRequestId());
      return false;
    }
    return true;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const nonce = randomBytes(16).toString('base64');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' ws: wss:`
    );

    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!this.checkRateLimit(ip)) {
      fail(res, 429, 'rate limit exceeded', newRequestId());
      return;
    }

    const url = req.url ?? '/';
    const pathname = url.split('?')[0] ?? '/';
    const method = req.method ?? 'GET';

    try {
      if (pathname === '/' && method === 'GET') {
        this.serveDashboard(res, nonce);
        return;
      }
      if (pathname === '/healthz') {
        handleHealth(res);
        return;
      }
      if (pathname === '/api/status' && method === 'GET') {
        handleStatus(res, { aggregator: this.aggregator, startedAtMs: this.startedAtMs });
        return;
      }
      if (pathname === '/api/agents' && method === 'GET') {
        handleList(res, { registry: this.registry, aggregator: this.aggregator });
        return;
      }
      if (pathname === '/api/agents/register' && method === 'POST') {
        if (!this.requireAuth(req, res)) return;
        await handleRegister(req, res, {
          registry: this.registry,
          aggregator: this.aggregator,
        });
        return;
      }
      const agentDetail = pathname.match(/^\/api\/agents\/([A-Za-z0-9_]+)$/);
      if (agentDetail && method === 'GET') {
        const id = agentDetail[1] ?? '';
        handleDetail(res, id, { registry: this.registry, aggregator: this.aggregator });
        return;
      }
      const agentRevoke = pathname.match(/^\/api\/agents\/([A-Za-z0-9_]+)\/revoke$/);
      if (agentRevoke && method === 'POST') {
        if (!this.requireAuth(req, res)) return;
        const id = agentRevoke[1] ?? '';
        handleRevoke(res, id, { registry: this.registry, aggregator: this.aggregator });
        return;
      }
      if (pathname === '/api/relay/event' && method === 'POST') {
        await handleRelayEvent(req, res, {
          registry: this.registry,
          aggregator: this.aggregator,
          broadcast: (payload) => this.broadcast(payload),
        });
        return;
      }
      fail(res, 404, 'not found', newRequestId());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Unhandled error for ${method} ${pathname}: ${msg}`);
      if (!res.headersSent) {
        fail(res, 500, 'internal server error', newRequestId());
      }
    }
  }

  private serveDashboard(res: ServerResponse, nonce: string): void {
    try {
      const html = readFileSync(this.dashboardHtmlPath, 'utf-8').replace('__NONCE__', nonce);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to load dashboard.html from ${this.dashboardHtmlPath}: ${msg}`);
      fail(res, 500, 'dashboard unavailable', newRequestId());
    }
  }
}
