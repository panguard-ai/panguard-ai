/**
 * Web Dashboard - Real-time monitoring interface
 * Web Dashboard - 即時監控介面
 *
 * Provides an HTTP server with WebSocket push for:
 * - System status overview / 系統狀態概覽
 * - Event timeline / 事件時間軸
 * - Threat map visualization / 威脅地圖視覺化
 * - Configuration management / 配置管理
 * - Language toggle (EN/ZH) / 語言切換
 *
 * Uses only Node.js built-in http module with native WebSocket handshake.
 *
 * @module @panguard-ai/panguard-guard/dashboard
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { WebSocketServer, type WebSocket as WS } from 'ws';
import { createLogger } from '@panguard-ai/core';
import type {
  DashboardStatus,
  DashboardEvent,
  ThreatMapEntry,
  GuardConfig,
  ThreatVerdict,
} from '../types.js';
import { saveConfig } from '../config.js';
import { DashboardRelayClient, type RelayClientConfig } from './relay-client.js';

const logger = createLogger('panguard-guard:dashboard');

/** WebSocket client tracking */
interface WSClient {
  ws: WS;
  alive: boolean;
  connectedAt: number;
  ip: string;
}

/** Rate limiter state per IP */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_MAX = 120;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_WS_CLIENTS = 20;
const MAX_WS_PER_IP = 5;

/** Relay configuration for connecting to a remote Manager */
export interface DashboardRelayOptions {
  readonly managerUrl: string;
  readonly agentId: string;
  readonly token: string;
}

/**
 * Dashboard Server manages the HTTP + WebSocket real-time dashboard
 */
export class DashboardServer {
  private server: ReturnType<typeof createServer> | null = null;
  private wsClients: Set<WSClient> = new Set();
  private status: DashboardStatus;
  private recentEvents: DashboardEvent[] = [];
  private threatMap: ThreatMapEntry[] = [];
  private readonly maxRecentEvents = 200;
  private readonly port: number;
  private getConfig: (() => GuardConfig) | null = null;
  private readonly authToken: string;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private relayClient: DashboardRelayClient | null = null;
  private readonly relayConfig: DashboardRelayOptions | undefined;

  constructor(port: number, relayConfig?: DashboardRelayOptions) {
    this.port = port;
    this.authToken = randomBytes(32).toString('hex');
    this.relayConfig = relayConfig;
    this.status = {
      mode: 'learning',
      uptime: 0,
      eventsProcessed: 0,
      threatsDetected: 0,
      actionsExecuted: 0,
      learningProgress: 0,
      baselineConfidence: 0,
      memoryUsageMB: 0,
      cpuPercent: 0,
      recentVerdicts: [],
    };
  }

  setConfigGetter(getter: () => GuardConfig): void {
    this.getConfig = getter;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      const wss = new WebSocketServer({ server: this.server, path: '/ws', maxPayload: 64 * 1024 });

      wss.on('connection', (ws: WS, req: IncomingMessage) => {
        if (this.wsClients.size >= MAX_WS_CLIENTS) {
          logger.warn('Max WebSocket connections reached');
          ws.close();
          return;
        }

        const origin = req.headers.origin ?? '';
        // Strict origin check: must be exactly loopback or absent (native clients)
        if (origin) {
          try {
            const parsed = new URL(origin);
            const isLoopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1';
            if (!isLoopback) {
              logger.warn(`Rejected WebSocket from non-loopback origin: ${origin}`);
              ws.close();
              return;
            }
          } catch {
            logger.warn(`Rejected WebSocket with malformed origin: ${origin}`);
            ws.close();
            return;
          }
        }

        // Per-IP connection limit
        const clientIP = req.socket.remoteAddress ?? 'unknown';
        const ipCount = [...this.wsClients].filter(c => c.ip === clientIP).length;
        if (ipCount >= MAX_WS_PER_IP) {
          logger.warn(`Max WS connections per IP reached for ${clientIP}`);
          ws.close();
          return;
        }

        const client: WSClient = { ws, alive: true, connectedAt: Date.now(), ip: clientIP };
        this.wsClients.add(client);

        this.sendToClient(client, {
          type: 'status_update',
          data: this.status,
          timestamp: new Date().toISOString(),
        });

        ws.on('pong', () => {
          client.alive = true;
        });

        ws.on('close', () => {
          this.wsClients.delete(client);
        });

        ws.on('error', () => {
          this.wsClients.delete(client);
        });
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        logger.info(`Dashboard started on http://127.0.0.1:${this.port}`);
        // Token never logged — auth via HttpOnly cookie only

        if (this.relayConfig) {
          this.startRelayClient(this.relayConfig);
        }

        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.relayClient) {
      this.relayClient.disconnect();
      this.relayClient = null;
    }

    return new Promise((resolve) => {
      for (const client of this.wsClients) {
        try {
          client.ws.close();
        } catch {
          /* ignore */
        }
      }
      this.wsClients.clear();

      if (this.server) {
        this.server.close(() => {
          logger.info('Dashboard stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  updateStatus(update: Partial<DashboardStatus>): void {
    this.status = { ...this.status, ...update };
    this.broadcast({
      type: 'status_update',
      data: this.status,
      timestamp: new Date().toISOString(),
    });
  }

  pushEvent(event: DashboardEvent): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }
    this.broadcast(event);
  }

  addVerdict(verdict: ThreatVerdict): void {
    this.status.recentVerdicts.push(verdict);
    if (this.status.recentVerdicts.length > 50) {
      this.status.recentVerdicts.shift();
    }
    this.broadcast({
      type: 'new_verdict',
      data: verdict,
      timestamp: new Date().toISOString(),
    });
  }

  addThreatMapEntry(entry: ThreatMapEntry): void {
    const existing = this.threatMap.find(
      (t) => t.sourceIP === entry.sourceIP && t.attackType === entry.attackType
    );
    if (existing) {
      existing.count += entry.count;
      existing.lastSeen = entry.lastSeen;
    } else {
      this.threatMap.push(entry);
    }
  }

  // ---------------------------------------------------------------------------
  // HTTP request handling
  // ---------------------------------------------------------------------------

  getAuthToken(): string {
    return this.authToken;
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Generate per-request nonce for CSP — eliminates unsafe-inline for scripts
    const nonce = randomBytes(16).toString('base64');

    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:' + this.port);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' ws://127.0.0.1:* ws://localhost:*`
    );

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const clientIP = req.socket.remoteAddress ?? 'unknown';
    if (!this.checkRateLimit(clientIP)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
      return;
    }

    const url = req.url ?? '/';

    if (url === '/') {
      this.serveIndex(res, nonce);
      return;
    }

    if (url.startsWith('/api/')) {
      const authHeader = req.headers.authorization ?? '';
      // Parse auth token from: 1) Authorization header, 2) HttpOnly cookie, 3) query param (deprecated)
      const cookieToken = (req.headers.cookie ?? '').split(';').map(c => c.trim()).find(c => c.startsWith('panguard_auth='))?.split('=')[1] ?? '';
      const queryToken = new URL(url, `http://127.0.0.1:${this.port}`).searchParams.get('token');
      const providedToken = authHeader.replace('Bearer ', '') || cookieToken || queryToken;

      if (
        !providedToken ||
        providedToken.length !== this.authToken.length ||
        !timingSafeEqual(Buffer.from(providedToken), Buffer.from(this.authToken))
      ) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    const pathname = url.split('?')[0];

    switch (pathname) {
      case '/api/status':
        this.jsonResponse(res, this.status);
        break;
      case '/api/events':
        this.jsonResponse(res, this.recentEvents);
        break;
      case '/api/threat-map':
        this.jsonResponse(res, this.threatMap);
        break;
      case '/api/verdicts':
        this.jsonResponse(res, this.status.recentVerdicts);
        break;
      case '/api/config':
        if (this.getConfig) {
          this.jsonResponse(res, this.getConfig());
        } else {
          this.jsonResponse(res, { error: 'Config not available' }, 503);
        }
        break;
      case '/api/skills':
        this.handleSkillsApi(res);
        break;
      case '/api/ai-config':
        if (req.method === 'POST') {
          this.handleAiConfigPost(req, res);
        } else {
          this.handleAiConfigGet(res);
        }
        break;
      case '/api/rules':
        this.handleRulesApi(res);
        break;
      case '/api/threat-cloud':
        if (req.method === 'POST') {
          this.handleThreatCloudPost(req, res);
        } else {
          this.handleThreatCloudGet(res);
        }
        break;
      case '/api/loaded-rules':
        this.handleLoadedRulesApi(res);
        break;
      case '/api/proxy-verdicts':
        this.handleProxyVerdictsApi(res);
        break;
      case '/api/installed-skills':
        this.handleInstalledSkillsApi(res).catch((err: unknown) => {
          logger.error(
            `handleInstalledSkillsApi error: ${err instanceof Error ? err.message : String(err)}`
          );
          if (!res.headersSent) this.jsonResponse(res, { error: 'Internal error' }, 500);
        });
        break;
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();

    // Periodic cleanup of expired entries to prevent unbounded growth
    if (this.rateLimits.size > 100) {
      for (const [key, val] of this.rateLimits) {
        if (now > val.resetAt) this.rateLimits.delete(key);
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

  private serveIndex(res: ServerResponse, nonce: string): void {
    // Set auth token as HttpOnly cookie — never exposed in HTML source or JS
    // Inject nonce into <script> tag for CSP compliance
    const html = DASHBOARD_HTML.replace('<script>', `<script nonce="${nonce}">`);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': `panguard_auth=${this.authToken}; HttpOnly; SameSite=Strict; Path=/`,
    });
    res.end(html);
  }

  private jsonResponse(res: ServerResponse, data: unknown, statusCode = 200): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  // ---------------------------------------------------------------------------
  // Skills + AI Config API
  // ---------------------------------------------------------------------------

  private handleSkillsApi(res: ServerResponse): void {
    const dataDir = this.getConfig?.()?.dataDir;
    const whitelistPath = join(
      dataDir ?? join(homedir(), '.panguard-guard'),
      'skill-whitelist.json'
    );

    if (!existsSync(whitelistPath)) {
      this.jsonResponse(res, { skills: [], total: 0, autoCount: 0, manualCount: 0 });
      return;
    }

    try {
      const raw = readFileSync(whitelistPath, 'utf-8');
      const data = JSON.parse(raw) as {
        whitelist?: Array<{ name: string; source?: string; reason?: string; addedAt?: string }>;
        skills?: Array<{ name: string; source?: string; reason?: string; addedAt?: string }>;
      };
      // Support both formats: engine writes 'whitelist', legacy might use 'skills'
      const skills = data.whitelist ?? data.skills ?? [];
      const autoCount = skills.filter(
        (s) => s.source === 'fingerprint' || s.source === 'static'
      ).length;
      const manualCount = skills.filter(
        (s) => s.source === 'manual' || s.source === 'community'
      ).length;
      this.jsonResponse(res, { skills, total: skills.length, autoCount, manualCount });
    } catch {
      this.jsonResponse(res, { skills: [], total: 0, autoCount: 0, manualCount: 0 });
    }
  }

  private handleAiConfigGet(res: ServerResponse): void {
    if (!this.getConfig) {
      this.jsonResponse(res, { error: 'Config not available' }, 503);
      return;
    }
    const config = this.getConfig();
    this.jsonResponse(res, {
      ai: config.ai ?? null,
      mode: config.mode,
      dashboardEnabled: config.dashboardEnabled,
    });
  }

  private handleAiConfigPost(req: IncomingMessage, res: ServerResponse): void {
    if (!this.getConfig) {
      this.jsonResponse(res, { error: 'Config not available' }, 503);
      return;
    }

    let body = '';
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 10_000) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        const update = JSON.parse(body) as {
          provider?: string;
          model?: string;
          endpoint?: string;
          apiKey?: string;
        };

        if (
          update.endpoint !== undefined &&
          update.endpoint !== '' &&
          !DashboardServer.isValidEndpointUrl(update.endpoint)
        ) {
          this.jsonResponse(res, { error: 'Invalid endpoint URL' }, 400);
          return;
        }

        const validProviders = [
          'ollama',
          'claude',
          'openai',
          'gemini',
          'groq',
          'mistral',
          'deepseek',
          'lmstudio',
        ];
        if (update.provider && !validProviders.includes(update.provider)) {
          this.jsonResponse(res, { error: 'Invalid provider' }, 400);
          return;
        }

        const config = this.getConfig!();
        const providerValue = update.provider ?? config.ai?.provider ?? 'ollama';
        const updatedConfig: GuardConfig = {
          ...config,
          ai: {
            provider: providerValue as NonNullable<GuardConfig['ai']>['provider'],
            model: update.model ?? config.ai?.model ?? '',
            endpoint: update.endpoint ?? config.ai?.endpoint,
            apiKey: update.apiKey ?? config.ai?.apiKey,
          },
        };

        saveConfig(updatedConfig);
        this.jsonResponse(res, { success: true, ai: updatedConfig.ai });
      } catch {
        this.jsonResponse(res, { error: 'Invalid JSON' }, 400);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  private static isValidEndpointUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
      if (parsed.hostname.length === 0) return false;

      // Block private/internal IPs to prevent SSRF
      const h = parsed.hostname.toLowerCase();
      if (
        h === 'localhost' ||
        h.startsWith('127.') ||
        h.startsWith('10.') ||
        h.startsWith('192.168.') ||
        h === '169.254.169.254' ||
        h.startsWith('169.254.') ||
        h === '[::1]' ||
        h === '0.0.0.0'
      ) return false;
      // Block 172.16.0.0/12
      if (h.startsWith('172.')) {
        const second = parseInt(h.split('.')[1] ?? '0', 10);
        if (second >= 16 && second <= 31) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Rules + Threat Cloud + Installed Skills API
  // ---------------------------------------------------------------------------

  private handleRulesApi(res: ServerResponse): void {
    const dataDir = this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard');
    const config = this.getConfig?.();

    let lastSync: string | null = null;
    const cachePath = join(dataDir, 'threat-cloud-cache.json');
    if (existsSync(cachePath)) {
      try {
        const cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as { lastSync?: string };
        lastSync = cache.lastSync ?? null;
      } catch {
        /* ignore */
      }
    }

    this.jsonResponse(res, {
      atr: this.status.atrRuleCount ?? 0,
      atrMatchCount: this.status.atrMatchCount ?? 0,
      atrDrafterPatterns: this.status.atrDrafterPatterns ?? 0,
      atrDrafterSubmitted: this.status.atrDrafterSubmitted ?? 0,
      lastSync,
      syncIntervalHours: 1,
      threatCloudEnabled: config?.threatCloudEndpoint !== undefined,
    });
  }

  private handleThreatCloudGet(res: ServerResponse): void {
    const dataDir = this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard');
    const config = this.getConfig?.();

    let stats = { totalUploaded: 0, totalRulesReceived: 0, queueSize: 0 };
    let lastSync: string | null = null;
    const cachePath = join(dataDir, 'threat-cloud-cache.json');
    if (existsSync(cachePath)) {
      try {
        const cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as {
          totalUploaded?: number;
          totalRulesReceived?: number;
          queueSize?: number;
          lastSync?: string;
        };
        stats = {
          totalUploaded: cache.totalUploaded ?? 0,
          totalRulesReceived: cache.totalRulesReceived ?? 0,
          queueSize: cache.queueSize ?? 0,
        };
        lastSync = cache.lastSync ?? null;
      } catch {
        /* ignore */
      }
    }

    let clientId = '';
    // Client ID lives in ~/.panguard/client-id (not dataDir which is ~/.panguard-guard)
    const clientIdPath = join(homedir(), '.panguard', 'client-id');
    if (existsSync(clientIdPath)) {
      try {
        const fullId = readFileSync(clientIdPath, 'utf-8').trim();
        clientId = fullId.slice(0, 8) + '****-****-' + fullId.slice(-4);
      } catch {
        /* ignore */
      }
    }

    const uploadEnabled = config?.threatCloudUploadEnabled !== false;
    const endpoint = config?.threatCloudEndpoint ?? 'https://tc.panguard.ai/api';

    this.jsonResponse(res, {
      enabled: config?.threatCloudEndpoint !== undefined,
      endpoint,
      uploadEnabled,
      ...stats,
      clientId,
      lastSync,
    });
  }

  private handleThreatCloudPost(req: IncomingMessage, res: ServerResponse): void {
    if (!this.getConfig) {
      this.jsonResponse(res, { error: 'Config not available' }, 503);
      return;
    }

    let body = '';
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 10_000) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) return;
      try {
        const update = JSON.parse(body) as {
          uploadEnabled?: boolean;
          endpoint?: string;
        };

        if (update.endpoint !== undefined && !DashboardServer.isValidEndpointUrl(update.endpoint)) {
          this.jsonResponse(res, { error: 'Invalid endpoint URL' }, 400);
          return;
        }

        const config = this.getConfig!();
        const updatedConfig: GuardConfig = {
          ...config,
          threatCloudUploadEnabled: update.uploadEnabled ?? config.threatCloudUploadEnabled,
          threatCloudEndpoint: update.endpoint ?? config.threatCloudEndpoint,
        };

        saveConfig(updatedConfig);
        this.jsonResponse(res, { success: true });
      } catch {
        this.jsonResponse(res, { error: 'Invalid JSON' }, 400);
      }
    });
  }

  private handleLoadedRulesApi(res: ServerResponse): void {
    try {
      const rulesDir = join(
        this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard'),
        '..',
        'agent-threat-rules',
        'rules'
      );

      // Try multiple rule locations
      const candidates = [
        rulesDir,
        join(homedir(), '.panguard-guard', 'rules'),
      ];

      // Also try monorepo atr package
      candidates.push(join(homedir(), '.panguard-guard', 'atr', 'rules'));

      const rules: Array<{ id: string; title: string; severity: string; category: string; description: string }> = [];

      for (const dir of candidates) {
        if (!existsSync(dir)) continue;
        try {
          const files = readdirSync(dir).filter((f: string) => f.endsWith('.yaml') || f.endsWith('.yml'));
          for (const file of files) {
            try {
              const content = readFileSync(join(dir, file), 'utf-8');
              // Quick YAML parse for id, title, severity, category, description
              const id = content.match(/^id:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? file;
              const title = content.match(/^title:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? '';
              const severity = content.match(/^severity:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? 'medium';
              const category = content.match(/category:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? 'unknown';
              const description = content.match(/^description:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? '';
              if (id && title) {
                rules.push({ id, title, severity, category, description: description.slice(0, 200) });
              }
            } catch { /* skip unparseable files */ }
          }
          if (rules.length > 0) break; // Found rules in this dir
        } catch { /* skip unreadable dirs */ }
      }

      this.jsonResponse(res, { rules, total: rules.length });
    } catch {
      this.jsonResponse(res, { rules: [], total: 0 });
    }
  }

  private handleProxyVerdictsApi(res: ServerResponse): void {
    const verdictLog = join(homedir(), '.panguard-guard', 'proxy-verdicts.jsonl');
    if (!existsSync(verdictLog)) {
      this.jsonResponse(res, { verdicts: [], total: 0 });
      return;
    }

    try {
      const raw = readFileSync(verdictLog, 'utf-8');
      const lines = raw.trim().split('\n').filter(Boolean);
      // Return last 50 verdicts, newest first
      const verdicts = lines
        .slice(-50)
        .reverse()
        .map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);
      this.jsonResponse(res, { verdicts, total: lines.length });
    } catch {
      this.jsonResponse(res, { verdicts: [], total: 0 });
    }
  }

  private async handleInstalledSkillsApi(res: ServerResponse): Promise<void> {
    const dataDir = this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard');
    const whitelistPath = join(dataDir, 'skill-whitelist.json');

    let whitelist: Array<{ name: string; source?: string }> = [];
    if (existsSync(whitelistPath)) {
      try {
        const raw = readFileSync(whitelistPath, 'utf-8');
        const data = JSON.parse(raw) as {
          whitelist?: Array<{ name: string; source?: string }>;
          skills?: Array<{ name: string; source?: string }>;
        };
        whitelist = data.whitelist ?? data.skills ?? [];
      } catch {
        /* ignore */
      }
    }

    const whitelistedNames = new Set(whitelist.map((s) => s.name));

    let allSkills: Array<{
      name: string;
      platform: string;
      command?: string;
      whitelisted: boolean;
      source?: string;
    }> = [];

    try {
      // Dynamic import — module may not be installed in all configurations
      const mcpConfig: Record<string, unknown> = await import(
        '@panguard-ai/panguard-mcp/config' as string
      );
      const discover = mcpConfig['discoverAllSkills'] as
        | (() => Promise<
            Array<{ name: string; platformId?: string; platform?: string; command?: string }>
          >)
        | undefined;
      if (discover) {
        const discovered = await discover();
        const discoveredNames = new Set(discovered.map((s) => s.name));
        allSkills = discovered.map((s) => ({
          name: s.name,
          platform: s.platformId ?? s.platform ?? 'unknown',
          command: s.command,
          whitelisted: whitelistedNames.has(s.name),
          source: whitelist.find((w) => w.name === s.name)?.source,
        }));
        // Merge whitelist entries that were not found by discovery
        for (const w of whitelist) {
          if (!discoveredNames.has(w.name)) {
            allSkills.push({
              name: w.name,
              platform: 'whitelist-only',
              whitelisted: true,
              source: w.source,
            });
          }
        }
      }
    } catch {
      allSkills = whitelist.map((s) => ({
        name: s.name,
        platform: 'unknown',
        whitelisted: true,
        source: s.source,
      }));
    }

    // If discovery returned nothing but whitelist has entries, merge them in
    if (allSkills.length === 0 && whitelist.length > 0) {
      allSkills = whitelist.map((s) => ({
        name: s.name,
        platform: 'whitelist-only',
        whitelisted: true,
        source: s.source,
      }));
    }

    this.jsonResponse(res, {
      skills: allSkills,
      total: allSkills.length,
      whitelisted: allSkills.filter((s) => s.whitelisted).length,
      tracked: allSkills.filter((s) => !s.whitelisted).length,
    });
  }

  // ---------------------------------------------------------------------------
  // WebSocket helpers
  // ---------------------------------------------------------------------------

  private sendToClient(client: WSClient, event: DashboardEvent): void {
    try {
      if (client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(event));
      }
    } catch {
      this.wsClients.delete(client);
    }
  }

  private broadcast(event: DashboardEvent): void {
    for (const client of this.wsClients) {
      this.sendToClient(client, event);
    }

    if (this.relayClient?.isConnected) {
      this.relayClient.sendEvent(event as unknown as Record<string, unknown>);
    }
  }

  // ---------------------------------------------------------------------------
  // Relay client management
  // ---------------------------------------------------------------------------

  private startRelayClient(config: DashboardRelayOptions): void {
    const relayConfig: RelayClientConfig = {
      managerUrl: config.managerUrl,
      agentId: config.agentId,
      token: config.token,
    };

    this.relayClient = new DashboardRelayClient(relayConfig);

    this.relayClient.on('connected', () => {
      logger.info('Dashboard relay connected to Manager');
    });

    this.relayClient.on('disconnected', () => {
      logger.info('Dashboard relay disconnected from Manager');
    });

    this.relayClient.on('error', (err: Error) => {
      logger.warn(`Dashboard relay error: ${err.message}`);
    });

    this.relayClient.on('message', (msg: Record<string, unknown>) => {
      logger.debug(`Relay received command: ${JSON.stringify(msg)}`);
    });

    this.relayClient.connect();
  }

  getRelayClient(): DashboardRelayClient | null {
    return this.relayClient;
  }
}

// ---------------------------------------------------------------------------
// Dashboard HTML template
// ---------------------------------------------------------------------------

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Panguard Guard Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--sage:#8B9A8E;--s0:#1A1614;--s1:#242220;--s2:#2E2C2A;--bd:#3A3836;--t1:#F5F1E8;--tm:#A09A94;--ok:#2ED573;--warn:#FBBF24;--bad:#EF4444;--glow:0 0 20px rgba(139,154,142,.15);--r:12px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter','Noto Sans TC',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--s0);color:var(--t1);display:flex;height:100vh;overflow:hidden}
.sb{width:220px;background:var(--s1);border-right:1px solid var(--bd);display:flex;flex-direction:column;flex-shrink:0}
.sb-brand{padding:20px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px}
.sb-brand svg{width:28px;height:28px;flex-shrink:0}
.sb-brand span{font-family:'Space Grotesk','Noto Sans TC',sans-serif;font-size:14px;font-weight:700;color:var(--t1);letter-spacing:.5px}
.sb-nav{flex:1;padding:12px 0;overflow-y:auto}
.ni{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;color:var(--tm);font-size:13px;font-weight:500;transition:all .15s;border-left:3px solid transparent}
.ni:hover{background:var(--s2);color:var(--t1)}
.ni.on{color:var(--sage);border-left-color:var(--sage);background:rgba(139,154,142,.08)}
.ni svg{width:16px;height:16px;fill:currentColor;flex-shrink:0}
.sb-ft{padding:16px;border-top:1px solid var(--bd)}
.ws-b{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--tm)}
.ws-d{width:8px;height:8px;border-radius:50%;background:var(--bad)}
.ws-d.on{background:var(--ok)}
.lb{margin-top:8px;background:var(--s2);color:var(--tm);border:1px solid var(--bd);padding:4px 10px;border-radius:20px;cursor:pointer;font-size:11px}
.mn{flex:1;overflow-y:auto;padding:24px 28px}
.pg{display:none}.pg.on{display:block}
.pt{font-family:'Space Grotesk','Noto Sans TC',sans-serif;font-size:20px;font-weight:700;margin-bottom:6px}
.pt em{color:var(--sage);font-style:normal}
.pd{font-size:13px;color:var(--tm);margin-bottom:20px;line-height:1.5}
.cg{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px}
.cd{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:16px 18px;box-shadow:var(--glow);transition:border-color .2s}
.cd:hover{border-color:var(--sage)}
.cl{font-family:'Inter','Noto Sans TC',sans-serif;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.8px;color:var(--tm);margin-bottom:6px}
.cv{font-family:'Space Grotesk','Noto Sans TC',sans-serif;font-size:28px;font-weight:700}
.cv.ok{color:var(--ok)}.cv.w{color:var(--warn)}.cv.sg{color:var(--sage)}
.cv-sm{font-family:'Space Grotesk','Noto Sans TC',sans-serif;font-size:20px;font-weight:700}
.st{font-family:'Space Grotesk','Noto Sans TC',sans-serif;font-size:14px;font-weight:600;color:var(--tm);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
.tl{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);max-height:420px;overflow-y:auto}
.ei{padding:10px 16px;border-bottom:1px solid var(--bd);font-size:12px;font-family:'JetBrains Mono','SF Mono',monospace;display:flex;gap:10px;align-items:flex-start}
.ei:last-child{border-bottom:none}
.ei-t{color:var(--tm);white-space:nowrap;min-width:75px}
.ei-y{font-weight:600;min-width:90px}
.ei-d{color:var(--tm);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ei.malicious{border-left:3px solid var(--bad)}
.ei.suspicious{border-left:3px solid var(--warn)}
.ei.benign{border-left:3px solid var(--ok)}
.tb{width:100%;border-collapse:collapse;background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden}
.tb th{text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--tm);background:var(--s2);border-bottom:1px solid var(--bd)}
.tb td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--bd)}
.tb tr:last-child td{border-bottom:none}
.tb tr:hover td{background:rgba(139,154,142,.04)}
.fs{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:20px;margin-bottom:16px;box-shadow:var(--glow)}
.fs h3{font-size:14px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.fs .desc{font-size:12px;color:var(--tm);margin-bottom:14px;line-height:1.5}
.fr{display:flex;gap:12px;margin-bottom:12px;align-items:center}
.fr label{font-size:12px;color:var(--tm);min-width:90px}
.fr select,.fr input{flex:1;background:var(--s2);border:1px solid var(--bd);color:var(--t1);padding:8px 12px;border-radius:8px;font-size:13px;outline:none}
.fr select:focus,.fr input:focus{border-color:var(--sage)}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:20px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s}
.btn-s{background:var(--sage);color:var(--s0)}.btn-s:hover{filter:brightness(1.1)}
.btn-o{background:transparent;border:1px solid var(--bd);color:var(--tm)}.btn-o:hover{border-color:var(--sage);color:var(--sage)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%}
.dot-ok{background:var(--ok)}.dot-w{background:var(--warn)}.dot-bad{background:var(--bad)}.dot-off{background:var(--tm)}
.toast{position:fixed;bottom:24px;right:24px;background:var(--s1);border:1px solid var(--sage);border-radius:var(--r);padding:12px 20px;font-size:13px;color:var(--sage);box-shadow:var(--glow);z-index:999;opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
.gs{display:flex;gap:16px;padding:16px 0;border-bottom:1px solid var(--bd)}
.gs:last-child{border-bottom:none}
.sn{width:32px;height:32px;border-radius:50%;background:var(--s2);color:var(--tm);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.sn.done{background:var(--sage);color:var(--s0)}
.sb-body{flex:1}
.sb-title{font-size:14px;font-weight:600;margin-bottom:4px}
.sb-desc{font-size:12px;color:var(--tm);margin-bottom:6px;line-height:1.5}
.sb-cmd{font-family:'JetBrains Mono','SF Mono',monospace;font-size:12px;background:var(--s2);padding:6px 10px;border-radius:6px;color:var(--sage);display:inline-block}
.sb-link{font-size:12px;color:var(--sage);margin-top:4px;display:block}
.flt{display:flex;gap:8px;margin-bottom:14px}
.fb{padding:5px 14px;border-radius:20px;border:1px solid var(--bd);background:transparent;color:var(--tm);font-size:12px;cursor:pointer}
.fb.on{border-color:var(--sage);color:var(--sage);background:rgba(139,154,142,.1)}
.empty{text-align:center;padding:40px 20px;color:var(--tm);font-size:13px}
.prov-card{background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
.prov-card .prov-name{font-size:13px;font-weight:600}
.prov-card .prov-link{font-size:11px;color:var(--sage);text-decoration:none}
.toggle{position:relative;width:44px;height:24px;background:var(--bd);border-radius:12px;cursor:pointer;transition:background .2s}
.toggle.on{background:var(--sage)}
.toggle::after{content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:var(--t1);transition:transform .2s}
.toggle.on::after{transform:translateX(20px)}
.info-box{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:16px 20px;margin-bottom:16px;font-size:12px;color:var(--tm);line-height:1.7}
.info-box strong{color:var(--t1);font-weight:600}
.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600}
.badge-ok{background:rgba(46,213,115,.15);color:var(--ok)}
.badge-w{background:rgba(251,191,36,.15);color:var(--warn)}
.badge-off{background:rgba(160,154,148,.15);color:var(--tm)}
.spin{display:inline-block;width:16px;height:16px;border:2px solid var(--bd);border-top-color:var(--sage);border-radius:50%;animation:sp .6s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.divider{border:none;border-top:1px solid var(--bd);margin:20px 0}
@media(max-width:768px){.sb{width:56px}.sb-brand span,.ni span,.sb-ft{display:none}.ni{justify-content:center;padding:12px}.sb-brand{justify-content:center;padding:16px 8px}.mn{padding:16px}.cg{grid-template-columns:repeat(2,1fr)}}
.welcome-overlay{position:fixed;inset:0;background:var(--s0);z-index:1000;display:flex;align-items:center;justify-content:center;opacity:1;transition:opacity .6s ease}
.welcome-overlay.hide{opacity:0;pointer-events:none}
.welcome-box{text-align:center;max-width:520px;padding:40px;animation:fadeUp .8s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.welcome-box svg{width:80px;height:80px;margin-bottom:24px}
.welcome-box h1{font-family:'Space Grotesk','Noto Sans TC',sans-serif;font-size:28px;font-weight:700;margin-bottom:8px;color:var(--t1)}
.welcome-box h1 span{color:var(--sage)}
.welcome-box p{font-size:14px;color:var(--tm);line-height:1.7;margin-bottom:28px}
.welcome-box .wc-steps{text-align:left;margin-bottom:32px}
.welcome-box .wc-step{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;opacity:0;animation:fadeUp .5s ease forwards}
.welcome-box .wc-step:nth-child(1){animation-delay:.3s}
.welcome-box .wc-step:nth-child(2){animation-delay:.5s}
.welcome-box .wc-step:nth-child(3){animation-delay:.7s}
.welcome-box .wc-step:nth-child(4){animation-delay:.9s}
.wc-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:700}
.wc-icon.c1{background:rgba(139,154,142,.15);color:var(--sage)}
.wc-icon.c2{background:rgba(46,213,115,.15);color:var(--ok)}
.wc-icon.c3{background:rgba(251,191,36,.15);color:var(--warn)}
.wc-icon.c4{background:rgba(139,154,142,.15);color:var(--sage)}
.wc-txt h4{font-size:13px;font-weight:600;margin-bottom:2px}
.wc-txt p{font-size:12px;color:var(--tm);margin:0}
.btn-start{padding:12px 36px;border-radius:24px;border:none;background:var(--sage);color:var(--s0);font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;opacity:0;animation:fadeUp .5s ease 1.1s forwards}
.btn-start:hover{filter:brightness(1.1);transform:scale(1.02)}
.init-progress{position:fixed;bottom:0;left:0;right:0;height:3px;background:var(--s2);z-index:1001;overflow:hidden}
.init-bar{height:100%;width:0;background:linear-gradient(90deg,var(--sage),var(--ok));transition:width .4s ease;border-radius:0 2px 2px 0}
/* Protection Status Bar */
.pbar{display:flex;align-items:center;gap:8px;padding:8px 14px;margin-bottom:16px;background:var(--s1);border:1px solid var(--bd);border-radius:8px;font-size:12px;color:var(--tm)}
.pbar .pb-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.pbar .pb-dot.ok{background:var(--ok);box-shadow:0 0 6px rgba(46,213,115,0.4)}
.pbar .pb-dot.bad{background:var(--bad);box-shadow:0 0 6px rgba(239,68,68,0.4)}
.pbar .pb-txt{font-weight:600;color:var(--t1)}
.reassure{text-align:center;padding:24px 20px;color:var(--tm);font-size:13px;line-height:1.7;font-style:italic}
/* Pulse animation for live indicator */
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.live-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 6px rgba(46,213,115,0.5);animation:pulse 2s ease-in-out infinite;display:inline-block;flex-shrink:0}
/* KPI highlight on update */
@keyframes kpi-flash{0%{text-shadow:0 0 12px rgba(139,154,142,0.6)}100%{text-shadow:none}}
.cv.flash{animation:kpi-flash 0.4s ease-out}
/* Layer bar */
.layer-row{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13px}
.layer-label{min-width:140px;color:var(--tm);font-weight:500}
.layer-bar{flex:1;height:6px;background:var(--s2);border-radius:3px;overflow:hidden}
.layer-fill{height:100%;border-radius:3px;transition:width 0.5s}
.layer-fill.on{background:var(--ok);width:100%}
.layer-fill.off{background:var(--bd);width:0%}
.layer-status{font-size:12px;font-weight:600;min-width:90px;text-align:right}
.layer-status.on{color:var(--ok)}
.layer-status.off{color:var(--tm)}
.layer-btn{font-size:11px;padding:3px 10px;border-radius:12px;border:1px solid var(--sage);color:var(--sage);background:transparent;cursor:pointer;transition:all 0.15s}
.layer-btn:hover{background:rgba(139,154,142,0.1)}
/* Activity slide-in */
@keyframes slide-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.ei.new{animation:slide-in 0.3s ease-out}
/* Empty state positive */
.empty-ok{background:rgba(46,213,115,0.06);border:1px solid rgba(46,213,115,0.15);border-radius:var(--r);padding:20px;text-align:center;color:var(--ok);font-size:13px;line-height:1.7}
.empty-ok .sub{color:var(--tm);font-size:12px;margin-top:4px}
/* Rug pull alert */
.rug-alert{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--r);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--bad);display:none}
</style>
</head>
<body>

<div class="welcome-overlay" id="welcome">
<div class="init-progress"><div class="init-bar" id="init-bar"></div></div>
<div class="welcome-box">
<svg viewBox="385 323 1278 1403" fill="none"><path fill="#8B9A8E" d="M 1021.5 830.423 C 1026.54 829.911 1045.81 832.659 1051.64 833.401 C 1072.38 835.99 1093.1 838.746 1113.8 841.667 L 1329.99 871.428 L 1329.95 1306.51 L 1330 1422.21 C 1330.01 1450.54 1332.08 1491.81 1325.18 1518.04 C 1318.79 1541.46 1305.62 1562.47 1287.31 1578.42 C 1269.98 1593.59 1234.62 1610.78 1212.96 1622.97 C 1151.4 1657.6 1087.44 1689.5 1026.42 1725.08 L 1024.58 1725.72 C 1020.72 1724.57 1005.67 1715.74 1001.44 1713.38 C 986.676 1705.08 971.857 1696.88 956.982 1688.79 L 836.342 1623.07 C 818.678 1613.37 800.537 1603.48 783.285 1593.93 C 741.183 1570.62 718.225 1528.6 718.162 1480.8 C 718.14 1463.85 718.093 1446.28 718.119 1429.07 L 718.13 1313.33 L 718.15 871.408 C 819.171 858.462 920.068 841.835 1021.5 830.423 z"/><path fill="#1A1614" d="M 1022.52 931.436 C 1027.43 930.745 1072.31 937.152 1079.51 938.107 C 1129.15 944.531 1178.76 951.264 1228.32 958.306 L 1228.23 1353.88 L 1228.35 1443.73 C 1228.37 1464.29 1233.5 1493.24 1214.51 1505.36 C 1195.74 1517.34 1175.98 1527.71 1156.43 1538.41 C 1112.57 1561.92 1068.87 1585.75 1025.35 1609.89 L 1024.59 1610.05 C 1019.31 1608.51 1009.91 1602.52 1004.79 1599.72 C 950.803 1570.14 896.481 1541.36 842.686 1511.4 C 829.113 1503.85 820.756 1496.4 820.195 1479.81 C 819.565 1461.16 819.816 1442.57 819.824 1423.9 L 819.867 1314.91 L 819.664 958.376 C 837.727 956.927 860.873 952.653 879.255 950.388 C 926.512 944.567 975.292 936.455 1022.52 931.436 z"/><path fill="#8B9A8E" d="M 687.515 577.4 C 696.504 576.451 715.718 579.584 725.68 580.913 L 782.266 588.553 C 853.62 598.25 926.853 607.634 997.939 618.387 L 997.872 779.654 C 966.188 784.487 928.734 789.954 897.039 793.352 L 897.073 705.399 C 831.524 696.853 760.432 685.286 694.176 678.356 C 683.151 677.203 646.195 683.753 632.643 685.485 L 487.112 705.406 C 488.77 841.757 487.098 980.17 487.357 1116.69 L 487.339 1188.98 C 487.213 1243.94 479.328 1246.69 530.666 1273.69 C 574.625 1298.03 623.372 1322.43 666.093 1347.35 C 665.454 1385.26 666.06 1424.82 666.087 1462.87 C 649.609 1452.6 628.321 1441.62 610.88 1432.12 L 500.871 1372.76 C 476.603 1359.56 440.159 1342.09 421.535 1323.57 C 404.11 1306.02 392.433 1283.59 388.055 1259.25 C 384.254 1237.81 385.323 1203.28 385.354 1180.66 L 385.478 1064.48 L 385.312 618.209 C 414.868 615.376 445.833 609.518 475.437 605.863 C 545.54 597.208 617.46 584.737 687.515 577.4 z"/><path fill="#8B9A8E" d="M 1348.89 577.369 C 1360.73 575.936 1415.83 584.528 1431.77 586.589 C 1508.75 596.536 1585.62 608.685 1662.67 618.335 L 1662.73 1028.87 L 1662.69 1154.09 C 1662.67 1223.3 1674.33 1293.75 1609.64 1337.92 C 1596.01 1347.22 1581.75 1354.57 1567.33 1362.44 L 1512.89 1391.87 L 1382 1462.6 C 1383.76 1427.96 1382.35 1382.83 1382.21 1347.24 C 1420 1324.81 1467.93 1301.58 1507.58 1279.5 C 1524.53 1270.36 1558.74 1256.3 1560.1 1235.39 C 1561.42 1215.18 1560.95 1193.69 1560.9 1173.32 L 1560.87 1066.29 L 1560.68 705.345 C 1543.39 703.65 1521.51 700.068 1504.1 697.576 C 1473.23 693.054 1442.33 688.801 1411.39 684.819 C 1399.03 683.204 1369.09 678.563 1357.99 678.482 C 1343.65 678.377 1310.02 683.839 1294.14 685.904 C 1246.36 692.092 1198.63 698.627 1150.95 705.51 C 1151.37 734.567 1151.1 764.255 1151.14 793.361 C 1118.48 789.558 1083.43 784.206 1050.79 779.597 L 1050.69 617.847 L 1348.89 577.369 z"/><path fill="#8B9A8E" d="M 1017.32 323.354 C 1027.15 321.591 1105.66 333.344 1122.51 335.603 C 1166.74 341.267 1210.92 347.328 1255.05 353.786 C 1279.68 357.183 1305.51 360.23 1329.92 364.192 L 1329.98 526.684 C 1296.55 530.372 1261.73 535.721 1228.25 540.29 C 1228.4 510.591 1228.39 480.892 1228.23 451.193 C 1219.27 449.729 1209.61 448.427 1200.57 447.329 C 1144.13 440.467 1086.78 429.864 1030.24 424.572 C 1018.71 422.967 967.642 430.978 952.027 433.125 L 819.579 450.968 C 820.252 479.945 819.726 511.22 819.879 540.382 C 785.991 535.397 752.051 530.778 718.064 526.526 L 717.99 364.358 C 745.543 359.872 774.642 356.332 802.417 352.399 L 1017.32 323.354 z"/></svg>
<h1 data-i18n-wc="wc_title">Welcome to <span>Panguard</span></h1>
<p data-i18n-wc="wc_desc">Your AI-powered security guard is ready. Panguard provides multi-layer threat detection with real-time monitoring, community-driven intelligence, and zero-config protection.</p>
<div class="wc-steps">
<div class="wc-step"><div class="wc-icon c1">1</div><div class="wc-txt"><h4 data-i18n-wc="wc_s1t">Initializing Guard Engine</h4><p data-i18n-wc="wc_s1d">Loading detection rules and security modules...</p></div></div>
<div class="wc-step"><div class="wc-icon c2">2</div><div class="wc-txt"><h4 data-i18n-wc="wc_s2t">Connecting Dashboard</h4><p data-i18n-wc="wc_s2d">Establishing real-time data channels...</p></div></div>
<div class="wc-step"><div class="wc-icon c3">3</div><div class="wc-txt"><h4 data-i18n-wc="wc_s3t">Loading System Status</h4><p data-i18n-wc="wc_s3d">Reading current protection state and metrics...</p></div></div>
<div class="wc-step"><div class="wc-icon c4">4</div><div class="wc-txt"><h4 data-i18n-wc="wc_s4t">Ready</h4><p data-i18n-wc="wc_s4d">All systems initialized. Welcome aboard.</p></div></div>
</div>
<button class="btn-start" id="btn-start" onclick="enterDashboard()" data-i18n-wc="wc_btn">Enter Dashboard</button>
</div>
</div>

<div class="sb">
<div class="sb-brand">
<svg viewBox="385 323 1278 1403" fill="none"><path fill="#8B9A8E" d="M 1021.5 830.423 C 1026.54 829.911 1045.81 832.659 1051.64 833.401 C 1072.38 835.99 1093.1 838.746 1113.8 841.667 L 1329.99 871.428 L 1329.95 1306.51 L 1330 1422.21 C 1330.01 1450.54 1332.08 1491.81 1325.18 1518.04 C 1318.79 1541.46 1305.62 1562.47 1287.31 1578.42 C 1269.98 1593.59 1234.62 1610.78 1212.96 1622.97 C 1151.4 1657.6 1087.44 1689.5 1026.42 1725.08 L 1024.58 1725.72 C 1020.72 1724.57 1005.67 1715.74 1001.44 1713.38 C 986.676 1705.08 971.857 1696.88 956.982 1688.79 L 836.342 1623.07 C 818.678 1613.37 800.537 1603.48 783.285 1593.93 C 741.183 1570.62 718.225 1528.6 718.162 1480.8 C 718.14 1463.85 718.093 1446.28 718.119 1429.07 L 718.13 1313.33 L 718.15 871.408 C 819.171 858.462 920.068 841.835 1021.5 830.423 z"/><path fill="#1A1614" d="M 1022.52 931.436 C 1027.43 930.745 1072.31 937.152 1079.51 938.107 C 1129.15 944.531 1178.76 951.264 1228.32 958.306 L 1228.23 1353.88 L 1228.35 1443.73 C 1228.37 1464.29 1233.5 1493.24 1214.51 1505.36 C 1195.74 1517.34 1175.98 1527.71 1156.43 1538.41 C 1112.57 1561.92 1068.87 1585.75 1025.35 1609.89 L 1024.59 1610.05 C 1019.31 1608.51 1009.91 1602.52 1004.79 1599.72 C 950.803 1570.14 896.481 1541.36 842.686 1511.4 C 829.113 1503.85 820.756 1496.4 820.195 1479.81 C 819.565 1461.16 819.816 1442.57 819.824 1423.9 L 819.867 1314.91 L 819.664 958.376 C 837.727 956.927 860.873 952.653 879.255 950.388 C 926.512 944.567 975.292 936.455 1022.52 931.436 z"/><path fill="#8B9A8E" d="M 687.515 577.4 C 696.504 576.451 715.718 579.584 725.68 580.913 L 782.266 588.553 C 853.62 598.25 926.853 607.634 997.939 618.387 L 997.872 779.654 C 966.188 784.487 928.734 789.954 897.039 793.352 L 897.073 705.399 C 831.524 696.853 760.432 685.286 694.176 678.356 C 683.151 677.203 646.195 683.753 632.643 685.485 L 487.112 705.406 C 488.77 841.757 487.098 980.17 487.357 1116.69 L 487.339 1188.98 C 487.213 1243.94 479.328 1246.69 530.666 1273.69 C 574.625 1298.03 623.372 1322.43 666.093 1347.35 C 665.454 1385.26 666.06 1424.82 666.087 1462.87 C 649.609 1452.6 628.321 1441.62 610.88 1432.12 L 500.871 1372.76 C 476.603 1359.56 440.159 1342.09 421.535 1323.57 C 404.11 1306.02 392.433 1283.59 388.055 1259.25 C 384.254 1237.81 385.323 1203.28 385.354 1180.66 L 385.478 1064.48 L 385.312 618.209 C 414.868 615.376 445.833 609.518 475.437 605.863 C 545.54 597.208 617.46 584.737 687.515 577.4 z"/><path fill="#8B9A8E" d="M 1348.89 577.369 C 1360.73 575.936 1415.83 584.528 1431.77 586.589 C 1508.75 596.536 1585.62 608.685 1662.67 618.335 L 1662.73 1028.87 L 1662.69 1154.09 C 1662.67 1223.3 1674.33 1293.75 1609.64 1337.92 C 1596.01 1347.22 1581.75 1354.57 1567.33 1362.44 L 1512.89 1391.87 L 1382 1462.6 C 1383.76 1427.96 1382.35 1382.83 1382.21 1347.24 C 1420 1324.81 1467.93 1301.58 1507.58 1279.5 C 1524.53 1270.36 1558.74 1256.3 1560.1 1235.39 C 1561.42 1215.18 1560.95 1193.69 1560.9 1173.32 L 1560.87 1066.29 L 1560.68 705.345 C 1543.39 703.65 1521.51 700.068 1504.1 697.576 C 1473.23 693.054 1442.33 688.801 1411.39 684.819 C 1399.03 683.204 1369.09 678.563 1357.99 678.482 C 1343.65 678.377 1310.02 683.839 1294.14 685.904 C 1246.36 692.092 1198.63 698.627 1150.95 705.51 C 1151.37 734.567 1151.1 764.255 1151.14 793.361 C 1118.48 789.558 1083.43 784.206 1050.79 779.597 L 1050.69 617.847 L 1348.89 577.369 z"/><path fill="#8B9A8E" d="M 1017.32 323.354 C 1027.15 321.591 1105.66 333.344 1122.51 335.603 C 1166.74 341.267 1210.92 347.328 1255.05 353.786 C 1279.68 357.183 1305.51 360.23 1329.92 364.192 L 1329.98 526.684 C 1296.55 530.372 1261.73 535.721 1228.25 540.29 C 1228.4 510.591 1228.39 480.892 1228.23 451.193 C 1219.27 449.729 1209.61 448.427 1200.57 447.329 C 1144.13 440.467 1086.78 429.864 1030.24 424.572 C 1018.71 422.967 967.642 430.978 952.027 433.125 L 819.579 450.968 C 820.252 479.945 819.726 511.22 819.879 540.382 C 785.991 535.397 752.051 530.778 718.064 526.526 L 717.99 364.358 C 745.543 359.872 774.642 356.332 802.417 352.399 L 1017.32 323.354 z"/></svg>
<span>PANGUARD AI</span>
</div>
<div class="sb-nav">
<div class="ni on" data-tab="dashboard"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg><span data-i18n="n_db">Dashboard</span></div>
<div class="ni" data-tab="threats"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg><span data-i18n="n_th">Threats</span></div>
<div class="ni" data-tab="rules"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9H8v-2h5v2zm3 4H8v-2h8v2zm-3-8V3.5L18.5 9H13z"/></svg><span data-i18n="n_ru">Rules</span></div>
<div class="ni" data-tab="skills"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 13.17l4.59-4.58L17 10l-6 6z"/></svg><span data-i18n="n_sk">Skills</span></div>
<div class="ni" data-tab="tcloud"><svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg><span data-i18n="n_tc">Threat Cloud</span></div>
<div class="ni" data-tab="settings"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/></svg><span data-i18n="n_st">Settings</span></div>
</div>
<div class="sb-ft">
<div class="ws-b"><div class="ws-d" id="wd"></div><span id="wl">Disconnected</span></div>
<button class="lb" onclick="TL()">EN / ZH</button>
</div>
</div>

<div class="mn">
<div class="pbar" id="pbar">
<div class="pb-dot ok" id="pb-dot"></div>
<span class="pb-txt" id="pb-txt">PROTECTED</span>
<span id="pb-detail">| -- rules active | Last event: --</span>
</div>
<!-- Dashboard (merged Overview + Skills & Trust) -->
<div class="pg on" id="p-dashboard">
<div class="pt" data-i18n="t_db"><em>Dashboard</em></div>

<!-- Protection Status -->
<div id="protection-hero" style="background:linear-gradient(135deg,rgba(139,154,142,0.12),rgba(139,154,142,0.03));border:1px solid var(--bd);border-radius:12px;padding:24px;margin-bottom:20px">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
<div class="live-dot" id="hero-dot"></div>
<div style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;color:var(--ok)" id="hero-status">PROTECTED</div>
</div>
<div class="cg" style="margin-bottom:16px">
<div class="cd"><div class="cl">Rules Active</div><div class="cv sg" id="v-atr">--</div></div>
<div class="cd"><div class="cl">Events Scanned</div><div class="cv ok" id="v-ev">0</div></div>
<div class="cd"><div class="cl">Threats Blocked</div><div class="cv" id="v-th" style="color:var(--sage)">0</div></div>
<div class="cd"><div class="cl">Uptime</div><div class="cv sg" id="v-up">0s</div></div>
</div>
<div style="border-top:1px solid var(--bd);padding-top:14px">
<div class="layer-row">
<span class="layer-label">Layer 1: ATR Rules</span>
<div class="layer-bar"><div class="layer-fill on" id="l1-bar"></div></div>
<span class="layer-status on" id="l1-st">Active</span>
</div>
<div class="layer-row">
<span class="layer-label">Layer 2: Heuristic</span>
<div class="layer-bar"><div class="layer-fill on" id="l2-bar"></div></div>
<span class="layer-status on" id="l2-st">Active</span>
</div>
<div class="layer-row">
<span class="layer-label">Layer 3: AI Analysis</span>
<div class="layer-bar"><div class="layer-fill off" id="l3-bar"></div></div>
<span class="layer-status off" id="l3-st">Not configured</span>
<button class="layer-btn" onclick="nav('settings')" id="l3-btn">Setup</button>
</div>
</div>
</div>

<!-- Runtime Protection Live Feed -->
<div style="display:flex;align-items:center;gap:8px;margin-top:4px;margin-bottom:10px">
<div class="st" style="margin-bottom:0">Runtime Protection</div>
<div class="live-dot" style="width:6px;height:6px"></div>
<span style="font-size:11px;color:var(--tm);font-weight:500">LIVE</span>
</div>
<div id="rt-feed" class="tl" style="max-height:220px;margin-bottom:20px;border:1px solid var(--bd);border-radius:var(--r);background:var(--s1)">
<div class="empty-ok" id="rt-empty" style="border:none;border-radius:0">All tool calls are flowing safely through the proxy.<div class="sub">Blocked calls will appear here instantly.</div></div>
</div>

<!-- Recommended Actions -->
<div id="rec-actions" style="background:linear-gradient(135deg,rgba(251,191,36,0.04),transparent);border:1px solid var(--bd);border-radius:var(--r);padding:16px 20px;margin-bottom:20px;display:none">
<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--warn)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
<span style="font-size:13px;font-weight:600;color:var(--t1)">Recommended Actions</span>
</div>
<div id="rec-list" style="font-size:12px;line-height:2.4"></div>
</div>

<!-- Rug Pull Alert (hidden by default, shown via JS when detected) -->
<div class="rug-alert" id="rug-alert"></div>

<!-- Setup Progress (shown until all steps complete) -->
<div id="setup-progress" style="background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:16px 20px;margin-bottom:20px;display:none">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
<div style="font-size:13px;font-weight:600;color:var(--t1)">Setup Progress</div>
<div style="font-size:12px;color:var(--tm)" id="setup-count">0/5</div>
</div>
<div id="setup-steps" style="font-size:12px;line-height:2;color:var(--tm)"></div>
</div>

<!-- Skills -->
<div class="st" data-i18n="all_skills">All Skills</div>
<div id="isk-loading" class="empty"><span class="spin"></span> Loading skills...</div>
<table class="tb" id="isk-table" style="display:none"><thead><tr><th>#</th><th data-i18n="name">Name</th><th data-i18n="platform">Platform</th><th data-i18n="trust">Status</th></tr></thead><tbody id="isk-tb"></tbody></table>

<!-- Event Timeline -->
<div class="st" style="margin-top:20px" data-i18n="timeline">Recent Activity</div>
<div id="evl-ok" class="empty-ok">All clear. Guard is monitoring your skills in real-time.<div class="sub" id="evl-ok-sub">Last scan: just started</div></div>
<div class="tl" id="evl" style="display:none"></div>
</div>

<!-- Settings (merged AI Setup + Guide) -->
<div class="pg" id="p-settings">
<div class="pt" data-i18n="t_st"><em>Settings</em></div>
<div class="pd" data-i18n="d_ai">Panguard uses a 3-layer detection system. Layer 1 (rules) and Layer 2 (fingerprint & heuristic) are always active with zero config. Layer 3 uses cloud AI for the deepest analysis -- configure your API key below.</div>

<div class="fs">
<h3><span class="dot dot-ok"></span> <span data-i18n="l1">Layer 1: ATR Rules Engine</span></h3>
<div class="desc" data-i18n="l1d">ATR (Agent Threat Rules) detect known threats instantly. Always active, zero configuration needed.</div>
<div style="color:var(--ok);font-size:13px;font-weight:600" data-i18n="active">Active</div>
</div>

<div class="fs">
<h3><span class="dot dot-ok" id="l2d"></span> <span data-i18n="l2">Layer 2: Fingerprint & Heuristic (Local, zero-config)</span></h3>
<div class="desc" data-i18n="l2desc">Behavioral fingerprinting and heuristic analysis that runs locally. Detects suspicious patterns like permission escalation, unusual file access, and skill drift. Always active, no configuration needed.</div>
<div style="color:var(--ok);font-size:13px;font-weight:600" data-i18n="active">Active</div>
<div class="info-box">
<strong>How it works:</strong><br>
&bull; <strong>Skill Fingerprinting</strong> &mdash; tracks each skill's behavior baseline and detects drift<br>
&bull; <strong>Heuristic Analysis</strong> &mdash; flags suspicious patterns (e.g., reading ~/.ssh, injecting prompts, excessive permissions)<br>
&bull; <strong>ATR Pattern Matching</strong> &mdash; 52 Agent Threat Rules detect known AI agent attack vectors<br><br>
<span style="color:var(--ok)">No external dependencies. No API keys. No data leaves your machine.</span>
</div>
</div>

<div class="fs">
<h3><span class="dot" id="l3d"></span> <span data-i18n="l3">Layer 3: Cloud AI (Most powerful analysis)</span></h3>
<div class="desc" data-i18n="l3desc">Cloud models provide the deepest analysis for complex or novel threats. Only used when Layer 1+2 are inconclusive. You need your own API key from the provider.</div>
<div class="fr"><label data-i18n="provider">Provider</label><select id="ai3p"><option value="">-- None --</option><option value="claude">Claude (Anthropic)</option><option value="openai">OpenAI</option><option value="gemini">Gemini (Google)</option><option value="groq">Groq</option><option value="mistral">Mistral</option><option value="deepseek">DeepSeek</option></select></div>
<div class="fr"><label data-i18n="api_key">API Key</label><input id="ai3k" type="password" placeholder="sk-..."></div>
<div class="fr"><label data-i18n="model">Model</label><input id="ai3m" placeholder="claude-sonnet-4-6 / gpt-4o / gemini-2.0-flash"></div>
<div class="fr"><label data-i18n="custom_ep">Custom Endpoint</label><input id="ai3e" placeholder="https://api.example.com/v1 (optional)"></div>
<div style="font-size:11px;color:var(--tm);margin-bottom:10px" data-i18n="ep_note">Use custom endpoint for self-hosted models, API proxies, or enterprise gateways. Leave empty for default provider endpoint.</div>
<div style="font-size:12px;color:var(--tm);margin-bottom:10px" data-i18n="key_note">Get your API key from the provider's website. Keys are stored locally in ~/.panguard-guard/config.json and never sent to Panguard servers.</div>
<div class="prov-card"><div><div class="prov-name">Anthropic (Claude)</div><div style="font-size:11px;color:var(--tm)">Best reasoning, recommended for security analysis</div></div><a class="prov-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Get API Key &rarr;</a></div>
<div class="prov-card"><div><div class="prov-name">OpenAI</div><div style="font-size:11px;color:var(--tm)">GPT-4o, widely supported</div></div><a class="prov-link" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">Get API Key &rarr;</a></div>
<div class="prov-card"><div><div class="prov-name">Google Gemini</div><div style="font-size:11px;color:var(--tm)">Gemini 2.0 Flash, cost-effective</div></div><a class="prov-link" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Get API Key &rarr;</a></div>
<div class="prov-card"><div><div class="prov-name">Groq</div><div style="font-size:11px;color:var(--tm)">Ultra-fast inference, free tier available</div></div><a class="prov-link" href="https://console.groq.com/keys" target="_blank" rel="noopener">Get API Key &rarr;</a></div>
<div class="prov-card"><div><div class="prov-name">Mistral</div><div style="font-size:11px;color:var(--tm)">European AI, strong multilingual</div></div><a class="prov-link" href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener">Get API Key &rarr;</a></div>
<div class="prov-card"><div><div class="prov-name">DeepSeek</div><div style="font-size:11px;color:var(--tm)">Cost-effective reasoning model</div></div><a class="prov-link" href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">Get API Key &rarr;</a></div>
</div>

<div style="display:flex;gap:10px;margin-top:8px">
<button class="btn btn-s" onclick="saveAI()" data-i18n="save">Save Configuration</button>
<button class="btn btn-o" onclick="loadAI()" data-i18n="reload">Reload</button>
</div>
</div>

<!-- Rules -->
<div class="pg" id="p-rules">
<div class="pt" data-i18n="t_ru"><em>Detection Rules</em></div>
<div class="pd" data-i18n="d_ru">Panguard uses a 3-layer rule system to detect threats. Rules sync automatically from Threat Cloud every hour. ATR (Agent Threat Rules) are community-driven rules auto-drafted by AI from real threat patterns.</div>
<div id="ru-loading" class="empty"><span class="spin"></span> Loading rule data...</div>
<div id="ru-content" style="display:none">
<div class="cg">
<div class="cd"><div class="cl">ATR</div><div class="cv sg" id="ru-atr">0</div><div style="font-size:11px;color:var(--tm);margin-top:4px" data-i18n="ru_atr_d">Agent Threat Rules (AI-drafted)</div></div>
</div>
<div style="font-size:12px;color:var(--tm);margin-bottom:20px"><span id="ru-sync"></span> <span data-i18n="ru_auto">Rules sync automatically every hour from Threat Cloud.</span></div>
<div class="st">All Loaded Rules</div>
<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
<input id="ru-search" type="text" placeholder="Search rules by ID, title, or category..." style="flex:1;background:var(--s2);border:1px solid var(--bd);color:var(--t1);padding:8px 14px;border-radius:8px;font-size:13px;outline:none" oninput="filterRules()" onfocus="this.style.borderColor='var(--sage)'" onblur="this.style.borderColor='var(--bd)'">
<span id="ru-search-count" style="font-size:12px;color:var(--tm);white-space:nowrap"></span>
</div>
<div id="ru-table-wrap" style="max-height:400px;overflow-y:auto">
<table class="tb" id="ru-table" style="display:none"><thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Category</th></tr></thead><tbody id="ru-tb"></tbody></table>
<div id="ru-table-loading" class="empty"><span class="spin"></span> Loading rules...</div>
</div>
<hr class="divider">
<div class="st" data-i18n="what_atr">What is ATR?</div>
<div class="info-box">
<strong data-i18n="atr_title">Agent Threat Rules (ATR)</strong><br>
<span data-i18n="atr_desc">ATR rules are automatically drafted by AI when your guard engine detects recurring threat patterns (5+ events from 2+ sources within 6 hours). These draft rules are submitted to Threat Cloud for community review, then distributed to all Panguard users after validation.</span>
</div>
<div class="st" data-i18n="atr_stats">ATR Activity</div>
<div class="cg">
<div class="cd"><div class="cl" data-i18n="atr_matches">ATR Matches</div><div class="cv-sm sg" id="ru-atr-m">0</div></div>
<div class="cd"><div class="cl" data-i18n="atr_drafted">Patterns Drafted</div><div class="cv-sm sg" id="ru-atr-p">0</div></div>
<div class="cd"><div class="cl" data-i18n="atr_submitted">Proposals Submitted</div><div class="cv-sm ok" id="ru-atr-s">0</div></div>
</div>
<div class="fs">
<h3 data-i18n="contrib_title">Your Community Contribution</h3>
<div class="desc" data-i18n="contrib_desc">Every ATR proposal your device submits helps protect the entire Panguard community. Proposals are reviewed and validated before distribution. Contributing is automatic and anonymous.</div>
<div id="contrib-msg" style="font-size:13px;font-weight:600;color:var(--sage)"></div>
</div>
<div class="fs">
<h3 data-i18n="why_contrib">Why Contribute?</h3>
<div class="desc" data-i18n="why_desc">Threat actors evolve constantly. Community-contributed ATR rules create a collective defense network where every participant strengthens the security of all. Your device's unique threat observations may detect patterns unseen by others.</div>
</div>
<hr class="divider">
<div class="st" data-i18n="t_tc">Threat Cloud</div>
<div id="tc-loading-inline" class="empty"><span class="spin"></span> Loading Threat Cloud status...</div>
<div id="tc-content-inline" style="display:none">
<div class="cg">
<div class="cd"><div class="cl" data-i18n="tc_status">Status</div><div class="cv-sm" id="tc-en2">--</div></div>
<div class="cd"><div class="cl" data-i18n="tc_uploaded">Uploaded</div><div class="cv-sm sg" id="tc-up2">0</div></div>
<div class="cd"><div class="cl" data-i18n="tc_received">Rules Received</div><div class="cv-sm sg" id="tc-recv2">0</div></div>
</div>
<div class="fs">
<h3 data-i18n="upload_toggle">Anonymous Upload</h3>
<div class="desc" data-i18n="upload_desc">When enabled, anonymized threat data is uploaded to Threat Cloud. No personal data, file contents, or source code is ever sent.</div>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
<div class="toggle" id="tc-toggle2" onclick="toggleUpload()"></div>
<span id="tc-toggle-label2" style="font-size:13px;font-weight:600">--</span>
</div>
</div>
</div>
</div>
</div>

<!-- Skills -->
<div class="pg" id="p-skills">
<div class="pt" data-i18n="t_sk"><em>Installed Skills</em></div>
<div class="pd" data-i18n="d_sk2">All MCP skills detected across your platforms. Safe skills are auto-whitelisted; risky ones are flagged for review. Run <code style="font-family:'JetBrains Mono',monospace;background:var(--s2);padding:2px 6px;border-radius:4px;font-size:12px">pga audit skill &lt;name&gt;</code> for detailed analysis.</div>
<div class="cg">
<div class="cd"><div class="cl" data-i18n="total">Total Installed</div><div class="cv sg" id="sk-total">--</div></div>
<div class="cd"><div class="cl" data-i18n="wl_count">Whitelisted</div><div class="cv ok" id="sk-wl">--</div></div>
<div class="cd"><div class="cl" data-i18n="tr_count">Unknown / Tracked</div><div class="cv w" id="sk-unk">--</div></div>
<div class="cd"><div class="cl">Blocked</div><div class="cv" style="color:var(--bad)" id="sk-blk">0</div></div>
</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
<div class="st" data-i18n="all_skills" style="margin-bottom:0">All Installed Skills</div>
<button class="btn btn-s" onclick="ldSk2();toast('Refreshing skills...')" style="font-size:12px;padding:6px 16px">Scan Now</button>
</div>
<div id="sk2-loading" class="empty"><span class="spin"></span> Loading skills...</div>
<table class="tb" id="sk2-table" style="display:none"><thead><tr><th>#</th><th data-i18n="name">Name</th><th data-i18n="platform">Platform</th><th>Risk</th><th data-i18n="trust">Status</th><th>Last Audit</th></tr></thead><tbody id="sk2-tb"></tbody></table>
</div>

<!-- Threat Cloud -->
<div class="pg" id="p-tcloud">
<div class="pt" data-i18n="t_tc"><em>Threat Cloud</em></div>
<div class="pd" data-i18n="d_tc">Threat Cloud is Panguard's anonymous threat intelligence sharing network. Your device can optionally upload anonymized threat data to help the community, and receives updated detection rules in return.</div>
<div id="tc-loading" class="empty"><span class="spin"></span> Loading Threat Cloud status...</div>
<div id="tc-content" style="display:none">
<div class="cg">
<div class="cd"><div class="cl" data-i18n="tc_status">Status</div><div class="cv-sm" id="tc-enabled">--</div></div>
<div class="cd"><div class="cl" data-i18n="tc_uploaded">Uploaded</div><div class="cv-sm sg" id="tc-up">0</div></div>
<div class="cd"><div class="cl" data-i18n="tc_received">Rules Received</div><div class="cv-sm sg" id="tc-recv">0</div></div>
<div class="cd"><div class="cl" data-i18n="tc_queue">Queue</div><div class="cv-sm sg" id="tc-q">0</div></div>
</div>
<div class="fs">
<h3 data-i18n="upload_toggle">Anonymous Upload</h3>
<div class="desc" data-i18n="upload_desc">When enabled, anonymized threat data is uploaded to Threat Cloud. No personal data, file contents, or source code is ever sent.</div>
<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
<div class="toggle" id="tc-toggle" onclick="toggleUpload()"></div>
<span id="tc-toggle-label" style="font-size:13px;font-weight:600">--</span>
</div>
</div>
<hr class="divider">
<div class="st" data-i18n="how_upload">How Upload Works</div>
<div class="info-box">
<strong data-i18n="step1">1. Detection</strong> &mdash; <span data-i18n="step1d">Guard engine detects a threat event.</span><br>
<strong data-i18n="step2">2. Anonymization</strong> &mdash; <span data-i18n="step2d">Personal data is stripped. Only anonymized metadata is kept.</span><br>
<strong data-i18n="step3">3. Batching</strong> &mdash; <span data-i18n="step3d">Events are batched (max 50 per upload) to reduce network calls.</span><br>
<strong data-i18n="step4">4. Upload</strong> &mdash; <span data-i18n="step4d">Batch is sent to Threat Cloud via HTTPS with your anonymous client ID.</span><br>
<strong data-i18n="step5">5. Analysis</strong> &mdash; <span data-i18n="step5d">Threat Cloud aggregates patterns and generates new detection rules.</span>
</div>
<div class="st" data-i18n="what_sent">What Data is Sent?</div>
<div class="info-box">
<span data-i18n="sent_fields">Each upload contains only:</span><br>
&bull; <strong>IP address</strong> (<span data-i18n="sf_ip">source of threat, hashed</span>)<br>
&bull; <strong>Threat type</strong> (<span data-i18n="sf_type">category: brute_force, port_scan, etc.</span>)<br>
&bull; <strong>MITRE technique</strong> (<span data-i18n="sf_mitre">ATT&CK technique ID</span>)<br>
&bull; <strong>Confidence / Severity</strong> (<span data-i18n="sf_conf">numeric scores</span>)<br>
&bull; <strong>OS type</strong> (<span data-i18n="sf_os">darwin / linux / win32</span>)<br>
&bull; <strong>Panguard version</strong><br><br>
<strong style="color:var(--ok)" data-i18n="not_sent">NOT sent: file contents, source code, usernames, paths, API keys, personal data.</strong>
</div>
<div class="st" data-i18n="privacy">Privacy</div>
<div class="info-box">
&bull; <span data-i18n="priv1">Client ID is a random UUID, not linked to your identity.</span><br>
&bull; <span data-i18n="priv2">You can disable uploads anytime without affecting protection.</span><br>
&bull; <span data-i18n="priv3">Threat Cloud endpoint is configurable for enterprise or air-gapped setups.</span><br>
&bull; <span data-i18n="priv4">No reverse engineering of your environment is possible from the uploaded data.</span>
</div>
</div>
</div>

<!-- Threats -->
<div class="pg" id="p-threats">
<div class="pt" data-i18n="t_th"><em>Threat Intelligence</em></div>
<div class="pd" data-i18n="d_th">All detected threats are logged here. Malicious events are auto-blocked. Suspicious events may require your attention. Use the filters below to focus on specific threat categories.</div>
<div class="flt">
<button class="fb on" onclick="flt('all')" data-i18n="all">All</button>
<button class="fb" onclick="flt('malicious')" data-i18n="malicious">Malicious</button>
<button class="fb" onclick="flt('suspicious')" data-i18n="suspicious">Suspicious</button>
<button class="fb" onclick="flt('benign')" data-i18n="benign_f">Benign</button>
</div>
<div class="st" data-i18n="tmap">Threat Map</div>
<table class="tb"><thead><tr><th data-i18n="src_ip">Source IP</th><th data-i18n="atk">Attack Type</th><th data-i18n="cnt">Count</th><th data-i18n="last">Last Seen</th></tr></thead><tbody id="th-tb"></tbody></table>
<div class="st" style="margin-top:20px" data-i18n="verdicts">Recent Verdicts</div>
<div class="tl" id="vl"></div>
</div>

<!-- Guide (hidden, merged into Settings) -->
<div class="pg" id="p-guide" style="display:none">
<div class="pt" data-i18n="t_gd"><em>Getting Started</em></div>
<div class="pd" data-i18n="d_gd">Follow these steps to activate full protection. Each step builds on the previous one. Once all steps are complete, Panguard Guard will continuously monitor and protect your system.</div>
<div class="fs">
<div class="gs"><div class="sn done">1</div><div class="sb-body"><div class="sb-title" data-i18n="g1t">Install Panguard</div><div class="sb-desc" data-i18n="g1d">Install the Panguard CLI globally. This provides all commands for scanning, guarding, and managing your security.</div><div class="sb-cmd">npm install -g @panguard-ai/panguard</div></div></div>
<div class="gs"><div class="sn" id="g2n">2</div><div class="sb-body"><div class="sb-title" data-i18n="g2t">Initialize Configuration</div><div class="sb-desc" data-i18n="g2d">Run the interactive setup wizard. It creates your config file, detects your environment, and sets notification preferences.</div><div class="sb-cmd">panguard init</div></div></div>
<div class="gs"><div class="sn" id="g3n">3</div><div class="sb-body"><div class="sb-title" data-i18n="g3t">Setup MCP Integration</div><div class="sb-desc" data-i18n="g3d">Inject Panguard into your AI coding platforms (Claude Code, Cursor, etc.). This enables real-time skill auditing.</div><div class="sb-cmd">npx panguard setup</div></div></div>
<div class="gs"><div class="sn done" id="g4n">4</div><div class="sb-body"><div class="sb-title" data-i18n="g4t">Start Guard Engine</div><div class="sb-desc" data-i18n="g4d">Enable 24/7 real-time protection. The guard engine monitors all activity and auto-responds to threats.</div><div class="sb-cmd">panguard guard start --dashboard</div></div></div>
<div class="gs"><div class="sn" id="g5n">5</div><div class="sb-body"><div class="sb-title" data-i18n="g5t">Configure AI Layers</div><div class="sb-desc" data-i18n="g5d">Layer 2 (fingerprint & heuristic) is already active. Optionally configure Layer 3 (cloud AI) for the deepest threat analysis. Go to the AI Setup tab to add your API key.</div><div class="sb-cmd">Use the "AI Setup" tab above</div><a class="sb-link" href="#" onclick="nav('ai');return false" data-i18n="go_ai">Go to AI Setup &rarr;</a></div></div>
<div class="gs"><div class="sn" id="g6n">6</div><div class="sb-body"><div class="sb-title" data-i18n="g6t">Protection Active!</div><div class="sb-desc" data-i18n="g6d">Once Guard is running, Panguard continuously monitors your system. Check the Overview tab for real-time status, threat detection, and event history.</div><div id="g6-status" style="margin-top:8px;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600"></div></div></div>
<div class="gs" style="margin-top:24px;border-top:1px solid var(--bd);padding-top:16px"><div class="sn" style="background:var(--bad)">7</div><div class="sb-body"><div class="sb-title" data-i18n="g7t">Uninstall Panguard</div><div class="sb-desc" data-i18n="g7d">Remove the system service, delete config files, and uninstall the CLI.</div><div class="sb-cmd">panguard guard uninstall</div><div class="sb-cmd">rm -rf ~/.panguard-guard ~/.panguard</div><div class="sb-cmd">npm uninstall -g @panguard-ai/panguard</div></div></div>
</div>
</div>
</div>

<div class="toast" id="toast"></div>

<script>
var T={
en:{n_db:'Dashboard',n_th:'Threats',n_ru:'Rules',n_sk:'Skills',n_tc:'Threat Cloud',n_st:'Settings',t_sk:'<em>Installed Skills</em>',d_sk2:'All MCP skills detected across your platforms. Safe skills are auto-whitelisted; risky ones are flagged for review.',
t_db:'<em>Dashboard</em>',t_st:'<em>Settings</em>',t_ru:'<em>Detection Rules</em>',t_th:'<em>Threat Intelligence</em>',
sec_score:'Security Score',upgrade_title:'Upgrade Your Protection',upgrade_desc:'Your Guard runs Tier 1-2 (regex only, 62.7% detection). Connect an LLM to unlock Tier 3:',
up1:'Catch attacks in ANY language',up2:'Detect paraphrased injection',up3:'Context-aware: know if "delete all" is real or attack',up4:'New attack types detected automatically',
connect_llm:'Connect LLM',free_options:'Free options: Gemini (free tier) / Ollama (local)',no_threats:'No threats detected. Your agents are running safely.',
d_sk:'Panguard audits every MCP skill installed on your system. Safe skills are auto-whitelisted; risky ones are flagged for your review.',
d_ai:'Panguard uses a 3-layer detection system. Layer 1 (rules) and Layer 2 (fingerprint & heuristic) are always active with zero config. Layer 3 uses cloud AI for the deepest analysis -- configure your API key below.',
d_ru:'Panguard uses a 3-layer rule system to detect threats. Rules sync automatically from Threat Cloud every hour. ATR rules are community-driven, auto-drafted by AI from real threat patterns.',
d_tc:'Threat Cloud is Panguard\\'s anonymous threat intelligence sharing network. Your device can optionally upload anonymized threat data to help the community, and receives updated detection rules in return.',
d_th:'All detected threats are logged here. Malicious events are auto-blocked. Suspicious events may require your attention.',
d_gd:'Follow these steps to activate full protection. Once all steps are complete, Panguard Guard will continuously monitor and protect your system.',
mode:'Mode',events:'Events',threats:'Threats',uptime:'Uptime',learning:'Learning',confidence:'Confidence',memory:'Memory',actions:'Actions',timeline:'Event Timeline',
det_rules:'Detection Rules',skill_sum:'Skill Summary',wl_skills:'Whitelisted',tr_skills:'Tracked',st_fp:'Stable FP',
total:'Total Installed',wl_count:'Whitelisted',tr_count:'Tracked / Unknown',all_skills:'All Installed Skills',whitelist:'Whitelisted Skills',name:'Name',source:'Source',reason:'Reason',date:'Date',platform:'Platform',trust:'Trust Status',
l1:'Layer 1: ATR Rules Engine',l1d:'ATR (Agent Threat Rules) detect known threats instantly. Always active, zero config needed.',active:'Active',
l2:'Layer 2: Fingerprint & Heuristic (Local, zero-config)',l2desc:'Behavioral fingerprinting and heuristic analysis. Detects suspicious patterns like permission escalation, unusual file access, and skill drift. Always active, no config needed.',
l3:'Layer 3: Cloud AI (Most powerful analysis)',l3desc:'Cloud models for the deepest analysis of complex threats. Only used when Layer 1+2 are inconclusive. Requires your own API key.',
provider:'Provider',endpoint:'Endpoint',model:'Model',api_key:'API Key',custom_ep:'Custom Endpoint',ep_note:'Use custom endpoint for self-hosted models, API proxies, or enterprise gateways. Leave empty for default.',key_note:'Keys are stored locally in ~/.panguard-guard/config.json and never sent to Panguard servers.',
save:'Save Configuration',reload:'Reload',
ru_atr_d:'Agent Threat Rules (AI-drafted)',ru_auto:'Rules sync automatically every hour from Threat Cloud.',
what_atr:'What is ATR?',atr_title:'Agent Threat Rules (ATR)',atr_desc:'ATR rules are automatically drafted by AI when your guard engine detects recurring threat patterns (5+ events from 2+ sources within 6 hours). These draft rules are submitted to Threat Cloud for community review, then distributed to all Panguard users after validation.',
atr_stats:'ATR Activity',atr_matches:'ATR Matches',atr_drafted:'Patterns Drafted',atr_submitted:'Proposals Submitted',
contrib_title:'Your Community Contribution',contrib_desc:'Every ATR proposal your device submits helps protect the entire Panguard community. Proposals are reviewed and validated before distribution. Contributing is automatic and anonymous.',
why_contrib:'Why Contribute?',why_desc:'Threat actors evolve constantly. Community-contributed ATR rules create a collective defense network where every participant strengthens the security of all.',
tc_status:'Status',tc_uploaded:'Uploaded',tc_received:'Rules Received',tc_queue:'Queue',
upload_toggle:'Anonymous Upload',upload_desc:'When enabled, anonymized threat data is uploaded to Threat Cloud. No personal data, file contents, or source code is ever sent.',
how_upload:'How Upload Works',what_sent:'What Data is Sent?',sent_fields:'Each upload contains only:',
sf_ip:'source of threat, hashed',sf_type:'category: brute_force, port_scan, etc.',sf_mitre:'ATT&CK technique ID',sf_conf:'numeric scores',sf_os:'darwin / linux / win32',
not_sent:'NOT sent: file contents, source code, usernames, paths, API keys, personal data.',
privacy:'Privacy',priv1:'Client ID is a random UUID, not linked to your identity.',priv2:'You can disable uploads anytime without affecting protection.',priv3:'Threat Cloud endpoint is configurable for enterprise or air-gapped setups.',priv4:'No reverse engineering of your environment is possible from the uploaded data.',
tmap:'Threat Map',verdicts:'Recent Verdicts',src_ip:'Source IP',atk:'Attack Type',cnt:'Count',last:'Last Seen',
all:'All',malicious:'Malicious',suspicious:'Suspicious',benign_f:'Benign',
g1t:'Install Panguard',g1d:'Install the Panguard CLI globally.',g2t:'Initialize Configuration',g2d:'Run the interactive setup wizard.',
g3t:'Setup MCP Integration',g3d:'Inject Panguard into your AI coding platforms.',g4t:'Start Guard Engine',g4d:'Enable 24/7 real-time protection.',
g5t:'Configure AI Layers',g5d:'Layer 2 is already active. Optionally add Layer 3 (cloud AI) for the deepest analysis.',go_ai:'Go to AI Setup &rarr;',
g6t:'Protection Active!',g6d:'Guard is running. Check Overview for real-time status.',
g7t:'Uninstall Panguard',g7d:'Remove the system service, delete config files, and uninstall the CLI.',
wc_title:'Welcome to <span>Panguard</span>',wc_desc:'Your AI-powered security guard is ready. Panguard provides multi-layer threat detection with real-time monitoring, community-driven intelligence, and zero-config protection.',
wc_s1t:'Initializing Guard Engine',wc_s1d:'Loading detection rules and security modules...',
wc_s2t:'Connecting Dashboard',wc_s2d:'Establishing real-time data channels...',
wc_s3t:'Loading System Status',wc_s3d:'Reading current protection state and metrics...',
wc_s4t:'Ready',wc_s4d:'All systems initialized. Welcome aboard.',
wc_btn:'Enter Dashboard'},
zh:{n_db:'\u5100\u8868\u677f',n_th:'\u5a01\u8105\u60c5\u5831',n_ru:'\u5075\u6e2c\u898f\u5247',n_sk:'\u6280\u80fd',n_tc:'\u5a01\u8105\u96f2',n_st:'\u8a2d\u5b9a',t_sk:'<em>\u5df2\u5b89\u88dd\u6280\u80fd</em>',d_sk2:'\u6240\u6709\u5e73\u53f0\u5075\u6e2c\u5230\u7684 MCP skills\u3002\u5b89\u5168\u7684\u81ea\u52d5 whitelist\uff0c\u6709\u98a8\u96aa\u7684\u6a19\u8a18\u5be9\u67e5\u3002',
t_db:'<em>\u5100\u8868\u677f</em>',t_st:'<em>\u8a2d\u5b9a</em>',t_ru:'<em>\u5075\u6e2c\u898f\u5247</em>',t_th:'<em>\u5a01\u8105\u60c5\u5831</em>',
sec_score:'\u5b89\u5168\u5206\u6578',upgrade_title:'\u5347\u7d1a\u4fdd\u8b77',upgrade_desc:'\u60a8\u7684 Guard \u76ee\u524d\u904b\u884c Tier 1-2\uff08\u50c5 regex\uff0c62.7% \u5075\u6e2c\u7387\uff09\u3002\u9023\u63a5 LLM \u89e3\u9396 Tier 3\uff1a',
up1:'\u652f\u63f4\u4efb\u4f55\u8a9e\u8a00\u7684\u653b\u64ca\u5075\u6e2c',up2:'\u5075\u6e2c\u91cd\u65b0\u6392\u5217\u7684\u6ce8\u5165\u653b\u64ca',up3:'\u8a9e\u5883\u611f\u77e5\uff1a\u5224\u65b7\u300c\u522a\u9664\u5168\u90e8\u300d\u662f\u6b63\u5e38\u6307\u4ee4\u9084\u662f\u653b\u64ca',up4:'\u81ea\u52d5\u5075\u6e2c\u65b0\u578b\u653b\u64ca\uff0c\u7121\u9700\u7b49\u5f85\u898f\u5247\u66f4\u65b0',
connect_llm:'\u9023\u63a5 LLM',free_options:'\u514d\u8cbb\u9078\u9805\uff1aGemini\uff08\u514d\u8cbb\u65b9\u6848\uff09/ Ollama\uff08\u672c\u5730\u57f7\u884c\uff09',no_threats:'\u672a\u5075\u6e2c\u5230\u5a01\u8105\u3002\u60a8\u7684 AI \u4ee3\u7406\u6b63\u5b89\u5168\u904b\u884c\u3002',
d_ov:'\u5373\u6642\u7cfb\u7d71\u72c0\u614b\u3002\u6240\u6709\u6307\u6a19\u900f\u904e WebSocket \u81ea\u52d5\u66f4\u65b0\u3002',
d_sk:'Panguard \u6703\u5be9\u8a08\u60a8\u7cfb\u7d71\u4e0a\u5b89\u88dd\u7684\u6bcf\u500b MCP skill\u3002\u5b89\u5168\u7684 skill \u6703\u81ea\u52d5\u52a0\u5165 whitelist\uff0c\u6709\u98a8\u96aa\u7684\u6703\u6a19\u8a18\u4f9b\u60a8\u5be9\u67e5\u3002',
d_ai:'Panguard \u4f7f\u7528\u4e09\u5c64\u5075\u6e2c\u7cfb\u7d71\u3002Layer 1 (Rules) \u548c Layer 2 (Fingerprint & Heuristic) \u59cb\u7d42\u6d3b\u8e8d\uff0c\u96f6\u914d\u7f6e\u3002Layer 3 \u4f7f\u7528 Cloud AI \u9032\u884c\u6700\u6df1\u5ea6\u5206\u6790 -- \u5728\u4e0b\u65b9\u914d\u7f6e API key\u3002',
d_ru:'Panguard \u4f7f\u7528\u4e09\u5c64 rule \u7cfb\u7d71\u5075\u6e2c\u5a01\u8105\u3002Rules \u6bcf\u5c0f\u6642\u81ea\u52d5\u5f9e Threat Cloud \u540c\u6b65\u3002ATR rules \u7531\u793e\u7fa4\u9a45\u52d5\uff0cAI \u81ea\u52d5\u5f9e\u771f\u5be6\u5a01\u8105\u6a21\u5f0f\u8349\u64ec\u3002',
d_tc:'Threat Cloud \u662f Panguard \u7684\u533f\u540d\u5a01\u8105\u60c5\u5831\u5171\u4eab\u7db2\u8def\u3002\u60a8\u7684\u88dd\u7f6e\u53ef\u9078\u64c7\u6027\u4e0a\u50b3\u533f\u540d\u5316\u5a01\u8105\u8cc7\u6599\u4ee5\u5e6b\u52a9\u793e\u7fa4\uff0c\u4e26\u63a5\u6536\u66f4\u65b0\u7684 detection rules\u3002',
d_th:'\u6240\u6709\u5075\u6e2c\u5230\u7684 threats \u90fd\u8a18\u9304\u5728\u6b64\u3002Malicious \u4e8b\u4ef6\u6703\u81ea\u52d5\u5c01\u9396\u3002Suspicious \u4e8b\u4ef6\u53ef\u80fd\u9700\u8981\u60a8\u7684\u6ce8\u610f\u3002',
d_gd:'\u6309\u7167\u4ee5\u4e0b\u6b65\u9a5f\u555f\u7528\u5b8c\u6574\u9632\u8b77\u3002\u5b8c\u6210\u6240\u6709\u6b65\u9a5f\u5f8c\uff0cPanguard Guard \u5c07\u6301\u7e8c\u76e3\u63a7\u4e26\u4fdd\u8b77\u60a8\u7684\u7cfb\u7d71\u3002',
mode:'\u6a21\u5f0f',events:'\u4e8b\u4ef6',threats:'\u5a01\u8105',uptime:'\u904b\u884c\u6642\u9593',learning:'\u5b78\u7fd2\u9032\u5ea6',confidence:'\u4fe1\u5fc3\u5ea6',memory:'\u8a18\u61b6\u9ad4',actions:'\u56de\u61c9\u52d5\u4f5c',timeline:'\u4e8b\u4ef6\u6642\u9593\u7dda',
det_rules:'\u5075\u6e2c\u898f\u5247',skill_sum:'\u6280\u80fd\u6458\u8981',wl_skills:'\u767d\u540d\u55ae',tr_skills:'\u8ffd\u8e64\u4e2d',st_fp:'\u7a69\u5b9a\u6307\u7d0b',
total:'\u5df2\u5b89\u88dd\u7e3d\u6578',wl_count:'\u767d\u540d\u55ae',tr_count:'\u8ffd\u8e64 / \u672a\u77e5',all_skills:'\u6240\u6709\u5df2\u5b89\u88dd\u6280\u80fd',whitelist:'\u767d\u540d\u55ae\u6280\u80fd',name:'\u540d\u7a31',source:'\u4f86\u6e90',reason:'\u539f\u56e0',date:'\u65e5\u671f',platform:'\u5e73\u53f0',trust:'\u4fe1\u4efb\u72c0\u614b',
l1:'Layer 1: ATR Rules Engine',l1d:'ATR (Agent Threat Rules)\uff0c\u5373\u6642\u5075\u6e2c\u5df2\u77e5\u5a01\u8105\u3002\u59cb\u7d42\u6d3b\u8e8d\uff0c\u7121\u9700\u914d\u7f6e\u3002',active:'Active',
l2:'Layer 2: Fingerprint & Heuristic\uff08\u672c\u5730\uff0c\u96f6\u914d\u7f6e\uff09',l2desc:'\u884c\u70ba\u6307\u7d0b\u8207\u555f\u767c\u5f0f\u5206\u6790\u3002\u5075\u6e2c\u53ef\u7591\u6a21\u5f0f\u5982\u6b0a\u9650\u63d0\u5347\u3001\u7570\u5e38\u6a94\u6848\u5b58\u53d6\u3001skill \u884c\u70ba\u504f\u79fb\u3002\u59cb\u7d42\u6d3b\u8e8d\uff0c\u7121\u9700\u914d\u7f6e\u3002',
l3:'Layer 3: Cloud AI\uff08\u6700\u5f37\u5206\u6790\uff09',l3desc:'Cloud model \u63d0\u4f9b\u6700\u6df1\u5165\u7684\u5206\u6790\u3002\u50c5\u5728 Layer 1+2 \u7121\u6cd5\u5224\u5b9a\u6642\u4f7f\u7528\u3002\u9700\u8981\u60a8\u81ea\u5df1\u7684 API key\u3002',
active:'\u5df2\u555f\u7528',provider:'\u63d0\u4f9b\u8005',endpoint:'\u7aef\u9ede',model:'\u6a21\u578b',api_key:'API \u91d1\u9470',custom_ep:'\u81ea\u8a02\u7aef\u9ede',ep_note:'\u7528\u65bc\u81ea\u67b6 model\u3001API proxy \u6216\u4f01\u696d gateway\u3002\u7559\u7a7a\u5373\u4f7f\u7528\u9810\u8a2d endpoint\u3002',key_note:'\u91d1\u9470\u5132\u5b58\u5728\u672c\u6a5f ~/.panguard-guard/config.json\uff0c\u7d55\u4e0d\u6703\u50b3\u9001\u5230 Panguard \u4f3a\u670d\u5668\u3002',
save:'\u5132\u5b58\u914d\u7f6e',reload:'\u91cd\u65b0\u8f09\u5165',
ru_atr_d:'Agent Threat Rules (AI \u8349\u64ec)',ru_auto:'Rules \u6bcf\u5c0f\u6642\u81ea\u52d5\u5f9e Threat Cloud \u540c\u6b65\u3002',
what_atr:'\u4ec0\u9ebc\u662f ATR\uff1f',atr_title:'Agent Threat Rules (ATR)',atr_desc:'ATR rules \u7531 AI \u81ea\u52d5\u8349\u64ec\uff0c\u7576 Guard Engine \u5075\u6e2c\u5230\u91cd\u8907\u5a01\u8105 pattern\uff086 \u5c0f\u6642\u5167 2+ \u4f86\u6e90\u7684 5+ events\uff09\u6642\u89f8\u767c\u3002\u8349\u64ec\u7684 rules \u6703\u63d0\u4ea4\u5230 Threat Cloud \u9032\u884c\u793e\u7fa4\u5be9\u67e5\uff0c\u9a57\u8b49\u5f8c\u5206\u767c\u7d66\u6240\u6709\u7528\u6236\u3002',
atr_stats:'ATR \u6d3b\u52d5',atr_matches:'ATR \u547d\u4e2d',atr_drafted:'\u5df2\u8349\u64ec\u6a21\u5f0f',atr_submitted:'\u5df2\u63d0\u4ea4\u63d0\u6848',
contrib_title:'\u60a8\u7684\u793e\u7fa4\u8ca2\u737b',contrib_desc:'\u60a8\u7684\u88dd\u7f6e\u63d0\u4ea4\u7684\u6bcf\u500b ATR proposal \u90fd\u6709\u52a9\u65bc\u4fdd\u8b77\u6574\u500b Panguard \u793e\u7fa4\u3002Proposals \u5728\u5206\u767c\u524d\u6703\u7d93\u904e\u5be9\u67e5\u548c\u9a57\u8b49\u3002\u8ca2\u737b\u662f\u81ea\u52d5\u4e14\u533f\u540d\u7684\u3002',
why_contrib:'\u70ba\u4ec0\u9ebc\u8ca2\u737b\uff1f',why_desc:'Threat actors \u4e0d\u65b7\u6f14\u8b8a\u3002\u793e\u7fa4\u8ca2\u737b\u7684 ATR rules \u5efa\u7acb\u4e86\u96c6\u9ad4\u9632\u79a6\u7db2\u8def\uff0c\u6bcf\u500b\u53c3\u8207\u8005\u90fd\u589e\u5f37\u4e86\u6240\u6709\u4eba\u7684\u5b89\u5168\u3002',
tc_status:'\u72c0\u614b',tc_uploaded:'\u5df2\u4e0a\u50b3',tc_received:'\u5df2\u63a5\u6536\u898f\u5247',tc_queue:'\u4f47\u5217',
upload_toggle:'\u533f\u540d\u4e0a\u50b3',upload_desc:'\u555f\u7528\u6642\uff0c\u533f\u540d\u5316\u5a01\u8105\u8cc7\u6599\u6703\u4e0a\u50b3\u5230\u5a01\u8105\u96f2\u3002\u7d55\u4e0d\u6703\u50b3\u9001\u500b\u4eba\u8cc7\u6599\u3001\u6a94\u6848\u5167\u5bb9\u6216\u539f\u59cb\u78bc\u3002',
how_upload:'Upload \u904b\u4f5c\u65b9\u5f0f',what_sent:'\u50b3\u9001\u4e86\u4ec0\u9ebc\u8cc7\u6599\uff1f',sent_fields:'\u6bcf\u6b21 upload \u50c5\u5305\u542b\uff1a',
sf_ip:'\u5a01\u8105\u4f86\u6e90\uff0c\u5df2 hash',sf_type:'\u985e\u5225\uff1abrute_force\u3001port_scan \u7b49',sf_mitre:'ATT&CK technique ID',sf_conf:'\u6578\u5b57\u8a55\u5206',sf_os:'darwin / linux / win32',
not_sent:'\u4e0d\u6703\u50b3\u9001\uff1a\u6a94\u6848\u5167\u5bb9\u3001source code\u3001\u4f7f\u7528\u8005\u540d\u7a31\u3001\u8def\u5f91\u3001API key\u3001\u500b\u4eba\u8cc7\u6599\u3002',
privacy:'Privacy',priv1:'Client ID \u662f\u96a8\u6a5f UUID\uff0c\u4e0d\u8207\u60a8\u7684\u8eab\u4efd\u9023\u7d50\u3002',priv2:'\u60a8\u53ef\u4ee5\u96a8\u6642\u505c\u7528 upload\uff0c\u4e0d\u5f71\u97ff\u4fdd\u8b77\u529f\u80fd\u3002',priv3:'Threat Cloud endpoint \u53ef\u914d\u7f6e\uff0c\u9069\u7528\u65bc\u4f01\u696d\u6216 air-gapped \u74b0\u5883\u3002',priv4:'\u7121\u6cd5\u5f9e\u4e0a\u50b3\u7684\u8cc7\u6599\u9006\u5411\u5de5\u7a0b\u60a8\u7684\u74b0\u5883\u3002',
tmap:'\u5a01\u8105\u5730\u5716',verdicts:'\u6700\u8fd1\u5224\u5b9a',src_ip:'\u4f86\u6e90 IP',atk:'\u653b\u64ca\u985e\u578b',cnt:'\u6b21\u6578',last:'\u6700\u5f8c\u51fa\u73fe',
all:'\u5168\u90e8',malicious:'\u60e1\u610f',suspicious:'\u53ef\u7591',benign_f:'\u826f\u6027',
g1t:'\u5b89\u88dd Panguard',g1d:'\u5168\u57df\u5b89\u88dd Panguard CLI\u3002',g2t:'\u521d\u59cb\u5316\u914d\u7f6e',g2d:'\u57f7\u884c interactive setup wizard\u3002',
g3t:'\u8a2d\u5b9a MCP Integration',g3d:'\u5c07 Panguard \u6ce8\u5165\u60a8\u7684 AI \u7de8\u7a0b\u5e73\u53f0\u3002',g4t:'\u555f\u52d5 Guard Engine',g4d:'\u555f\u7528 24/7 \u5373\u6642\u9632\u8b77\u3002',
g5t:'\u914d\u7f6e AI Layers',g5d:'Layer 2 \u5df2\u6d3b\u8e8d\u3002\u53ef\u9078\u914d\u7f6e Layer 3 (Cloud AI) \u9032\u884c\u6700\u6df1\u5ea6\u5206\u6790\u3002',go_ai:'\u524d\u5f80 AI \u8a2d\u5b9a &rarr;',
g6t:'\u9632\u8b77\u5df2\u555f\u7528!',g6d:'Guard \u904b\u884c\u4e2d\u3002\u5728\u7e3d\u89bd\u9801\u67e5\u770b\u5373\u6642\u72c0\u614b\u3002',
g7t:'\u5378\u8f09 Panguard',g7d:'\u79fb\u9664\u7cfb\u7d71\u670d\u52d9\u3001\u522a\u9664\u914d\u7f6e\u6a94\u3001\u5378\u8f09 CLI\u3002',
wc_title:'\u6b61\u8fce\u4f86\u5230 <span>Panguard</span>',wc_desc:'\u60a8\u7684 AI \u5b89\u5168\u5b88\u8b77\u5df2\u5c31\u7dd2\u3002Panguard \u63d0\u4f9b\u591a\u5c64\u5a01\u8105\u5075\u6e2c\u3001\u5373\u6642\u76e3\u63a7\u3001\u793e\u7fa4\u60c5\u5831\u548c\u96f6\u914d\u7f6e\u9632\u8b77\u3002',
wc_s1t:'\u521d\u59cb\u5316 Guard Engine',wc_s1d:'\u8f09\u5165 detection rules \u548c\u5b89\u5168\u6a21\u7d44...',
wc_s2t:'\u9023\u63a5 Dashboard',wc_s2d:'\u5efa\u7acb\u5373\u6642\u8cc7\u6599\u901a\u9053...',
wc_s3t:'\u8f09\u5165\u7cfb\u7d71\u72c0\u614b',wc_s3d:'\u8b80\u53d6\u7576\u524d protection \u72c0\u614b\u548c metrics...',
wc_s4t:'Ready',wc_s4d:'\u6240\u6709\u7cfb\u7d71\u5df2\u521d\u59cb\u5316\u3002\u6b61\u8fce\u4f7f\u7528\u3002',
wc_btn:'\u9032\u5165 Dashboard'}
};
var lang=(function(){try{var s=localStorage.getItem('panguard_lang');if(s==='zh'||s==='en')return s;var n=navigator.language||'';if(n.toLowerCase().indexOf('zh')===0)return 'zh';return 'en'}catch(e){return 'en'}})(),tk='',cf='all';

function TL(){lang=lang==='en'?'zh':'en';try{localStorage.setItem('panguard_lang',lang)}catch(e){}document.querySelectorAll('[data-i18n]').forEach(function(e){var k=e.getAttribute('data-i18n');if(T[lang][k]){if(e.tagName==='INPUT')e.placeholder=T[lang][k];else if(k.indexOf('t_')===0||k.indexOf('d_')===0||k==='go_ai')e.innerHTML=T[lang][k];else e.textContent=T[lang][k]}});document.querySelectorAll('[data-i18n-wc]').forEach(function(e){var k=e.getAttribute('data-i18n-wc');if(T[lang][k]){if(k==='wc_title')e.innerHTML=T[lang][k];else e.textContent=T[lang][k]}});updateG6();}

function nav(t){document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('on')});var tab=document.querySelector('[data-tab="'+t+'"]');if(tab)tab.classList.add('on');document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('on')});var pg=document.getElementById('p-'+t);if(pg){pg.style.display='';pg.classList.add('on')}if(t==='dashboard'){ldSk();ldISk();ldProxyVerdicts();ldRecActions()}if(t==='settings'){loadAI();updG()}if(t==='rules'){ldRules();ldTCloud();ldLoadedRules()}if(t==='threats')ldTh();if(t==='skills')ldSk2();if(t==='tcloud')ldTCloud2()}
document.querySelectorAll('.ni').forEach(function(n){n.addEventListener('click',function(){nav(this.getAttribute('data-tab'))})});

function toast(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2500)}
function fUp(ms){var s=Math.floor(ms/1000);if(s<60)return s+'s';var m=Math.floor(s/60);s%=60;if(m<60)return m+'m '+s+'s';var h=Math.floor(m/60);m%=60;return h+'h '+m+'m'}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}

function gTk(){/* Auth handled via HttpOnly cookie — no JS token needed */}
function af(p,o){o=o||{};o.credentials='same-origin';return fetch(p,o).then(function(r){if(r.status===401){document.getElementById('wl').textContent=lang==='zh'?'Token 無效':'Invalid token';document.getElementById('wd').classList.remove('on')}return r})}

/* WS */
function cWS(){var ws=new WebSocket('ws://'+location.host+'/ws');ws.onopen=function(){document.getElementById('wd').classList.add('on');document.getElementById('wl').textContent=lang==='zh'?'\u5df2\u9023\u7dda':'Connected'};ws.onclose=function(){document.getElementById('wd').classList.remove('on');document.getElementById('wl').textContent=lang==='zh'?'\u5df2\u65b7\u7dda':'Disconnected';setTimeout(cWS,3000)};ws.onmessage=function(e){try{var m=JSON.parse(e.data);if(m.type==='status_update')uS(m.data);if(m.type==='new_verdict'||m.type==='new_event'){aE(m);var ee=document.getElementById('evl-empty');if(ee)ee.style.display='none'}if(m.type==='proxy_verdict'){var feed=document.getElementById('rt-feed');var emp=document.getElementById('rt-empty');if(emp)emp.style.display='none';var pv=m.data||{};var cls=pv.outcome==='deny'?'malicious':'benign';var el=document.createElement('div');el.className='ei new '+cls;var t=pv.ts?pv.ts.split('T')[1].split('.')[0]:'--:--';el.innerHTML='<span class="ei-t">'+t+'</span><span class="ei-y" style="color:'+(pv.outcome==='deny'?'var(--bad)':'var(--ok)')+'">'+esc(pv.outcome||'allow').toUpperCase()+'</span><span class="ei-d">'+esc(pv.tool||'')+(pv.reason?' — '+esc(pv.reason):'')+'</span>';feed.prepend(el);setTimeout(function(){el.classList.remove('new')},400);while(feed.children.length>20)feed.removeChild(feed.lastChild)}}catch(x){}}}

function uS(s){
/* Update KPI cards with flash animation */
function setKPI(id,val){var el=document.getElementById(id);if(!el)return;var old=el.textContent;var nv=String(val);if(old!==nv){el.textContent=nv;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash')}}
setKPI('v-ev',(s.eventsProcessed||0).toLocaleString());
var th=s.threatsDetected||0;setKPI('v-th',th);var te=document.getElementById('v-th');if(te)te.style.color=th>0?'var(--bad)':'var(--sage)';
setKPI('v-up',fUp(s.uptime||0));
if(s.atrRuleCount!==undefined)setKPI('v-atr',s.atrRuleCount);
/* Hero status */
var hs=document.getElementById('hero-status');var hd=document.getElementById('hero-dot');
if(hs){hs.textContent=s.mode==='protection'?'PROTECTED':'LEARNING';hs.style.color=s.mode==='protection'?'var(--ok)':'var(--warn)'}
if(hd){hd.style.background=s.mode==='protection'?'var(--ok)':'var(--warn)'}
/* Layer 3 status (check if AI is configured) */
if(s.hasAI!==undefined){var l3b=document.getElementById('l3-bar');var l3s=document.getElementById('l3-st');var l3btn=document.getElementById('l3-btn');if(s.hasAI){if(l3b)l3b.className='layer-fill on';if(l3s){l3s.textContent='Active';l3s.className='layer-status on'}if(l3btn)l3btn.style.display='none'}else{if(l3b)l3b.className='layer-fill off';if(l3s){l3s.textContent=lang==='zh'?'\u672a\u914d\u7f6e':'Not configured';l3s.className='layer-status off'}if(l3btn)l3btn.style.display=''}}
updPBar(s);
/* Show event log when events arrive, hide empty-ok */
var eok=document.getElementById('evl-ok');var evl=document.getElementById('evl');
if(s.eventsProcessed>0){if(eok)eok.style.display='none';if(evl)evl.style.display=''};
}

function aE(m){var l=document.getElementById('evl');if(l)l.style.display='';var eok=document.getElementById('evl-ok');if(eok)eok.style.display='none';var d=document.createElement('div');var c=(m.data&&m.data.conclusion)||'benign';d.className='ei new '+c;var t=m.timestamp?m.timestamp.split('T')[1].split('.')[0]:'--:--:--';d.innerHTML='<span class="ei-t">'+t+'</span><span class="ei-y">'+esc(m.type||'')+'</span><span class="ei-d">'+esc(JSON.stringify(m.data||{}).slice(0,200))+'</span>';l.prepend(d);setTimeout(function(){d.classList.remove('new')},400);while(l.children.length>50)l.removeChild(l.lastChild)}

/* Skills */
function ldSk(){af('/api/skills').then(function(r){return r.json()}).then(function(d){var tb=document.getElementById('sk-tb');tb.innerHTML='';if(!d.skills||d.skills.length===0){tb.innerHTML='<tr><td colspan="5" class="empty">'+(lang==='zh'?'\u5c1a\u7121\u6280\u80fd\u8cc7\u6599':'No skills data')+'</td></tr>';return}d.skills.forEach(function(s,i){var tr=document.createElement('tr');tr.innerHTML='<td>'+(i+1)+'</td><td>'+esc(s.name||'')+'</td><td>'+esc(s.source||'--')+'</td><td style="color:var(--tm);font-size:12px">'+esc(s.reason||'--')+'</td><td style="color:var(--tm);font-size:12px">'+(s.addedAt?new Date(s.addedAt).toLocaleDateString():'--')+'</td>';tb.appendChild(tr)})}).catch(function(){})}

/* AI */
function loadAI(){af('/api/ai-config').then(function(r){return r.json()}).then(function(d){var ai=d.ai||{};var p=ai.provider||'';var locals=['ollama','lmstudio'];if(locals.indexOf(p)!==-1){document.getElementById('l2d').className='dot dot-ok'}else{document.getElementById('l2d').className='dot dot-off'}var clouds=['claude','openai','gemini','groq','mistral','deepseek'];if(clouds.indexOf(p)!==-1){document.getElementById('ai3p').value=p;document.getElementById('ai3k').value=ai.apiKey?'********':'';document.getElementById('ai3m').value=ai.model||'';document.getElementById('ai3e').value=ai.endpoint||'';document.getElementById('l3d').className='dot dot-ok'}else{document.getElementById('l3d').className='dot dot-off';document.getElementById('ai3e').value=''}}).catch(function(){})}

function saveAI(){var l3=document.getElementById('ai3p').value;var b={};if(l3){b.provider=l3;b.model=document.getElementById('ai3m').value||undefined;var k=document.getElementById('ai3k').value;if(k&&k.indexOf('*')===-1)b.apiKey=k;var ce=document.getElementById('ai3e').value;if(ce)b.endpoint=ce}af('/api/ai-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json()}).then(function(d){if(d.success)toast(lang==='zh'?'\u5132\u5b58\u6210\u529f':'Configuration saved');else toast(d.error||'Error');loadAI()}).catch(function(){toast('Network error')})}

/* Skills page */
function ldSk2(){af('/api/skills').then(function(r){return r.json()}).then(function(d){var tb=document.getElementById('sk2-tb');var tbl=document.getElementById('sk2-table');var ld=document.getElementById('sk2-loading');if(!d.skills||d.skills.length===0){if(ld)ld.innerHTML='<span style="color:var(--tm)">'+(lang==='zh'?'尚無技能資料':'No skills detected. Install MCP skills and run pga up.')+'</span>';return}if(ld)ld.style.display='none';if(tbl)tbl.style.display='';tb.innerHTML='';var wl=0,unk=0,blk=0;d.skills.forEach(function(s,i){var st=s.status||'unknown';if(st==='whitelisted')wl++;else if(st==='blocked')blk++;else unk++;var stColor=st==='whitelisted'?'var(--ok)':st==='blocked'?'var(--bad)':'var(--warn)';var tr=document.createElement('tr');tr.innerHTML='<td>'+(i+1)+'</td><td>'+esc(s.name||'')+'</td><td>'+esc(s.platform||s.source||'--')+'</td><td>'+(s.riskScore!=null?'<span style="color:'+(s.riskScore>60?'var(--bad)':s.riskScore>30?'var(--warn)':'var(--ok)')+'">'+s.riskScore+'/100</span>':'--')+'</td><td><span style="color:'+stColor+'">'+esc(st)+'</span></td><td style="color:var(--tm);font-size:12px">'+(s.lastAudit?new Date(s.lastAudit).toLocaleDateString():(s.addedAt?new Date(s.addedAt).toLocaleDateString():'--'))+'</td>';tb.appendChild(tr)});document.getElementById('sk-total').textContent=d.skills.length;document.getElementById('sk-wl').textContent=wl;document.getElementById('sk-unk').textContent=unk;document.getElementById('sk-blk').textContent=blk}).catch(function(){})}

/* Threat Cloud page loader */
function ldTCloud2(){af('/api/threat-cloud').then(function(r){return r.json()}).then(function(d){var ld=document.getElementById('tc-loading');var ct=document.getElementById('tc-content');if(ld)ld.style.display='none';if(ct)ct.style.display='';document.getElementById('tc-enabled').textContent=d.enabled?'Connected':'Disconnected';document.getElementById('tc-enabled').style.color=d.enabled?'var(--ok)':'var(--bad)';document.getElementById('tc-up').textContent=d.totalUploaded||0;document.getElementById('tc-recv').textContent=d.totalRulesReceived||0;document.getElementById('tc-q').textContent=d.queueSize||0;var tg=document.getElementById('tc-toggle');var tl=document.getElementById('tc-toggle-label');if(d.uploadEnabled){if(tg)tg.classList.add('on');if(tl){tl.textContent=lang==='zh'?'\u5df2\u555f\u7528':'Enabled';tl.style.color='var(--ok)'}}else{if(tg)tg.classList.remove('on');if(tl){tl.textContent=lang==='zh'?'\u5df2\u505c\u7528':'Disabled';tl.style.color='var(--tm)'}}}).catch(function(){document.getElementById('tc-loading').innerHTML='<span style="color:var(--bad)">Failed to load Threat Cloud status</span>'})}

/* Threats */
function ldTh(){af('/api/threat-map').then(function(r){return r.json()}).then(function(t){var tb=document.getElementById('th-tb');tb.innerHTML='';if(!t||t.length===0){tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--ok);font-size:13px">'+(lang==='zh'?'<strong>All clear.</strong> \u672a\u5075\u6e2c\u5230\u5a01\u8105\u3002\u9019\u662f\u597d\u4e8b\u3002':'<strong>All clear.</strong> No threats detected yet. This is good.')+'</td></tr>';return}t.forEach(function(x){var tr=document.createElement('tr');tr.innerHTML='<td>'+esc(x.sourceIP||'')+'</td><td>'+esc(x.attackType||'')+'</td><td>'+esc(String(x.count||0))+'</td><td style="color:var(--tm);font-size:12px">'+esc(x.lastSeen||'--')+'</td>';tb.appendChild(tr)})}).catch(function(){});
af('/api/verdicts').then(function(r){return r.json()}).then(function(v){var l=document.getElementById('vl');l.innerHTML='';if(!v||v.length===0){l.innerHTML='<div class="empty">'+(lang==='zh'?'\u7121\u5224\u6c7a\u8cc7\u6599':'No verdict data')+'</div>';return}v.slice().reverse().forEach(function(x){if(cf!=='all'&&x.conclusion!==cf)return;var d=document.createElement('div');d.className='ei '+(x.conclusion||'benign');d.innerHTML='<span class="ei-y" style="color:'+(x.conclusion==='malicious'?'var(--bad)':x.conclusion==='suspicious'?'var(--warn)':'var(--ok)')+'">'+esc(x.conclusion||'')+'</span><span class="ei-d">'+esc(x.category||'')+' - '+esc((x.details||'').slice(0,150))+'</span>';l.appendChild(d)})}).catch(function(){})}

function flt(f){cf=f;document.querySelectorAll('.fb').forEach(function(b){b.classList.remove('on')});event.target.classList.add('on');ldTh()}

/* Guide */
function updG(){af('/api/status').then(function(r){return r.json()}).then(function(s){document.getElementById('g4n').classList.add('done');if(s.mode==='protection'){document.getElementById('g2n').classList.add('done');document.getElementById('g3n').classList.add('done')}updateG6()}).catch(function(){});af('/api/ai-config').then(function(r){return r.json()}).then(function(d){if(d.ai&&d.ai.provider)document.getElementById('g5n').classList.add('done')}).catch(function(){})}

function updateG6(){var el=document.getElementById('g6-status');var gn=document.getElementById('g6n');var hs=document.getElementById('hero-status');var mode=hs?hs.textContent.toLowerCase():'';if(mode.indexOf('protected')!==-1||mode.indexOf('learning')!==-1){gn.classList.add('done');el.style.background='rgba(46,213,115,.1)';el.style.color='var(--ok)';el.textContent=lang==='zh'?'\u9632\u8b77\u5df2\u555f\u52d5 - Guard \u904b\u884c\u4e2d':'Protection Active - Guard is running'}else{el.style.background='rgba(239,68,68,.1)';el.style.color='var(--bad)';el.textContent=lang==='zh'?'\u5c1a\u672a\u555f\u52d5 - \u8acb\u57f7\u884c\u6b65\u9a5f 4':'Not started - complete step 4'}}

/* Installed Skills */
function ldISk(){af('/api/installed-skills').then(function(r){return r.json()}).then(function(d){document.getElementById('isk-loading').style.display='none';document.getElementById('isk-table').style.display='';var tb=document.getElementById('isk-tb');tb.innerHTML='';if(!d.skills||d.skills.length===0){tb.innerHTML='<tr><td colspan="4" class="empty">'+(lang==='zh'?'\u672a\u627e\u5230\u6280\u80fd':'No skills found')+'</td></tr>';return}d.skills.sort(function(a,b){return a.whitelisted===b.whitelisted?0:a.whitelisted?1:-1});d.skills.forEach(function(s,i){var tr=document.createElement('tr');var st=s.whitelisted?'<span class="badge badge-ok">'+(lang==='zh'?'\u5b89\u5168':'Safe')+'</span>':'<span class="badge badge-w">'+(lang==='zh'?'\u8ffd\u8e64\u4e2d':'Tracked')+'</span>';tr.innerHTML='<td>'+(i+1)+'</td><td>'+esc(s.name||'')+'</td><td style="color:var(--tm);font-size:12px">'+esc(s.platform||'--')+'</td><td>'+st+'</td>';tb.appendChild(tr)})}).catch(function(){document.getElementById('isk-loading').innerHTML='<span style="color:var(--bad)">Failed to load skills</span>'})}
function ldSecScore(){af('/api/status').then(function(r){return r.json()}).then(function(d){var hasL3=d.config&&d.config.layer3&&d.config.layer3.provider;var base=hasL3?85:70;var evBonus=Math.min((d.eventCount||0)/10000,10);var thPenalty=Math.min((d.threatCount||0)*5,20);var score=Math.max(0,Math.min(100,Math.round(base+evBonus-thPenalty)));document.getElementById('sec-num').textContent=score;document.getElementById('sec-bar').style.width=score+'%';document.getElementById('sec-bar').style.background=score>=80?'var(--ok)':score>=50?'#dfb317':'var(--bad)';document.getElementById('sec-tier').textContent=hasL3?'Tier 1-3 (Regex + Heuristic + LLM)':'Tier 1-2 (Regex + Heuristic)';document.getElementById('sec-tier').style.color=hasL3?'var(--ok)':'#dfb317';var cta=document.getElementById('llm-cta');if(cta)cta.style.display=hasL3?'none':'block'}).catch(function(){})}

/* Rules */
function ldRules(){af('/api/rules').then(function(r){return r.json()}).then(function(d){document.getElementById('ru-loading').style.display='none';document.getElementById('ru-content').style.display='';document.getElementById('ru-atr').textContent=d.atr||0;document.getElementById('v-atr').textContent=d.atr||0;document.getElementById('ru-atr-m').textContent=d.atrMatchCount||0;document.getElementById('ru-atr-p').textContent=d.atrDrafterPatterns||0;document.getElementById('ru-atr-s').textContent=d.atrDrafterSubmitted||0;var sub=d.atrDrafterSubmitted||0;var cm=document.getElementById('contrib-msg');if(sub>0){cm.textContent=lang==='zh'?'\u60a8\u7684\u88dd\u7f6e\u5df2\u5411\u793e\u7fa4\u8ca2\u737b '+sub+' \u500b ATR \u63d0\u6848':'Your device has contributed '+sub+' ATR proposal(s) to the community'}else{cm.textContent=lang==='zh'?'\u5c1a\u7121\u8ca2\u737b\u3002\u5b88\u8b77\u5f15\u64ce\u6301\u7e8c\u904b\u884c\u5f8c\u6703\u81ea\u52d5\u751f\u6210':'No contributions yet. ATR proposals will be auto-generated as the guard engine runs.'}var sync=d.lastSync?new Date(d.lastSync).toLocaleString():'--';document.getElementById('ru-sync').textContent=lang==='zh'?'\u4e0a\u6b21\u540c\u6b65: '+sync:'Last sync: '+sync}).catch(function(){document.getElementById('ru-loading').innerHTML='<span style="color:var(--bad)">Failed to load rules</span>'})}

/* Threat Cloud */
function ldTCloud(){af('/api/threat-cloud').then(function(r){return r.json()}).then(function(d){document.getElementById('tc-loading').style.display='none';document.getElementById('tc-content').style.display='';var en=document.getElementById('tc-enabled');en.textContent=d.enabled?(lang==='zh'?'\u5df2\u555f\u7528':'Enabled'):(lang==='zh'?'\u672a\u555f\u7528':'Disabled');en.className='cv-sm '+(d.enabled?'ok':'w');document.getElementById('tc-up').textContent=d.totalUploaded||0;document.getElementById('tc-recv').textContent=d.totalRulesReceived||0;document.getElementById('tc-q').textContent=d.queueSize||0;var tog=document.getElementById('tc-toggle');var tl=document.getElementById('tc-toggle-label');if(d.uploadEnabled){tog.classList.add('on');tl.textContent=lang==='zh'?'\u5df2\u555f\u7528':'Enabled';tl.style.color='var(--ok)'}else{tog.classList.remove('on');tl.textContent=lang==='zh'?'\u5df2\u505c\u7528':'Disabled';tl.style.color='var(--tm)'}}).catch(function(){document.getElementById('tc-loading').innerHTML='<span style="color:var(--bad)">Failed to load Threat Cloud status</span>'})}

/* Loaded Rules table */
var allRules=[];
function ldLoadedRules(){af('/api/loaded-rules').then(function(r){return r.json()}).then(function(d){allRules=d.rules||[];document.getElementById('ru-table-loading').style.display='none';if(allRules.length>0){document.getElementById('ru-table').style.display='';renderRules(allRules);var ct=document.getElementById('ru-search-count');if(ct)ct.textContent=allRules.length+' rules'}else{document.getElementById('ru-table-loading').innerHTML='<span style="color:var(--tm)">No rule files found locally.</span>'}}).catch(function(){document.getElementById('ru-table-loading').innerHTML='<span style="color:var(--bad)">Failed to load rules</span>'})}
function renderRules(rules){var tb=document.getElementById('ru-tb');tb.innerHTML='';rules.forEach(function(r){var sevColor=r.severity==='critical'?'var(--bad)':r.severity==='high'?'var(--warn)':r.severity==='medium'?'var(--sage)':'var(--tm)';var tr=document.createElement('tr');tr.innerHTML='<td style="font-family:JetBrains Mono,monospace;font-size:11px;white-space:nowrap">'+esc(r.id)+'</td><td>'+esc(r.title)+'</td><td><span style="color:'+sevColor+';font-weight:600;font-size:12px">'+esc(r.severity)+'</span></td><td style="color:var(--tm);font-size:12px">'+esc(r.category)+'</td>';tb.appendChild(tr)})}
function filterRules(){var q=(document.getElementById('ru-search').value||'').toLowerCase();var ct=document.getElementById('ru-search-count');if(!q){renderRules(allRules);if(ct)ct.textContent=allRules.length+' rules';return}var f=allRules.filter(function(r){return(r.id+' '+r.title+' '+r.category+' '+r.severity).toLowerCase().indexOf(q)!==-1});renderRules(f);if(ct)ct.textContent=f.length+'/'+allRules.length}

/* Runtime Protection feed */
function ldProxyVerdicts(){af('/api/proxy-verdicts').then(function(r){return r.json()}).then(function(d){if(!d.verdicts||d.verdicts.length===0)return;document.getElementById('rt-empty').style.display='none';var feed=document.getElementById('rt-feed');feed.innerHTML='';d.verdicts.slice(0,20).forEach(function(v){var cls=v.outcome==='deny'?'malicious':v.outcome==='ask'?'suspicious':'benign';var el=document.createElement('div');el.className='ei '+cls;var t=v.ts?v.ts.split('T')[1].split('.')[0]:'--:--';el.innerHTML='<span class="ei-t">'+t+'</span><span class="ei-y" style="color:'+(v.outcome==='deny'?'var(--bad)':'var(--ok)')+'">'+esc(v.outcome||'allow').toUpperCase()+'</span><span class="ei-d">'+esc(v.tool||'')+(v.reason?' — '+esc(v.reason):'')+'</span>';feed.appendChild(el)})}).catch(function(){})}

/* Recommended Actions */
function ldRecActions(){
var acts=[];
af('/api/proxy-verdicts').then(function(r){return r.json()}).then(function(d){var denies=(d.verdicts||[]).filter(function(v){return v.outcome==='deny'});if(denies.length>0)acts.push('<span style="color:var(--bad);font-weight:600">[!!]</span> '+denies.length+' tool call(s) blocked by proxy <span style="color:var(--sage);cursor:pointer" onclick="nav(\\'threats\\')">[View]</span>');return af('/api/installed-skills')}).then(function(r){return r.json()}).then(function(d){var unk=(d.skills||[]).filter(function(s){return!s.whitelisted});if(unk.length>0)acts.push('<span style="color:var(--warn);font-weight:600">[!]</span> '+unk.length+' unscanned skill(s) <span style="color:var(--sage);cursor:pointer" onclick="nav(\\'skills\\')">[Scan Now]</span>');return af('/api/ai-config')}).then(function(r){return r.json()}).then(function(d){if(!d.ai||!d.ai.provider)acts.push('<span style="color:var(--tm)">[i]</span> Layer 3 AI unlocks deeper detection <span style="color:var(--sage);cursor:pointer" onclick="nav(\\'settings\\')">[Setup]</span>');return af('/api/threat-cloud')}).then(function(r){return r.json()}).then(function(d){if(!d.enabled||!d.uploadEnabled)acts.push('<span style="color:var(--tm)">[i]</span> Threat Cloud strengthens community defense <span style="color:var(--sage);cursor:pointer" onclick="nav(\\'tcloud\\')">[Enable]</span>');var box=document.getElementById('rec-actions');var list=document.getElementById('rec-list');if(acts.length>0){box.style.display='';list.innerHTML=acts.join('<br>')}else{box.style.display='none'}}).catch(function(){})}

function toggleUpload(){var tog=document.getElementById('tc-toggle');var isOn=tog.classList.contains('on');af('/api/threat-cloud',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadEnabled:!isOn})}).then(function(r){return r.json()}).then(function(d){if(d.success){toast(lang==='zh'?'\u5132\u5b58\u6210\u529f':'Configuration saved');ldTCloud()}else toast(d.error||'Error')}).catch(function(){toast('Network error')})}


/* Protection bar update */
function updPBar(s){
var dot=document.getElementById('pb-dot');
var txt=document.getElementById('pb-txt');
var det=document.getElementById('pb-detail');
if(!dot||!txt||!det)return;
var running=s.mode==='protection'||s.mode==='learning';
dot.className='pb-dot '+(running?'ok':'bad');
txt.textContent=running?'PROTECTED':'INACTIVE';
var rules=(s.atrRuleCount||0);
var lastEv=s.eventsProcessed>0?fUp(s.uptime||0)+' uptime':'--';
det.textContent='| '+(s.eventsProcessed||0)+' events | '+rules+' rules active | Uptime: '+lastEv;
}
gTk();
function enterDashboard(){
localStorage.setItem('panguard_welcomed','1');
document.getElementById('welcome').classList.add('hide');
setTimeout(function(){document.getElementById('welcome').style.display='none';nav('dashboard');showFirstVisitToast()},600);
}
function showFirstVisitToast(){
var t=document.getElementById('toast');
t.innerHTML='<span style="color:var(--ok);font-weight:700">Your AI agents are now protected</span>';
t.classList.add('show');setTimeout(function(){t.classList.remove('show')},4000);
}
function loadInitData(){af('/api/status').then(function(r){return r.json()}).then(uS).catch(function(){});af('/api/rules').then(function(r){return r.json()}).then(function(d){if(d.atr!==undefined)document.getElementById('v-atr').textContent=d.atr}).catch(function(){});ldProxyVerdicts();ldRecActions()}
(function(){
var bar=document.getElementById('init-bar');
// Always connect WebSocket immediately, regardless of welcome state
cWS();loadInitData();
// Apply persisted/detected language on load (TL toggles, so apply directly)
if(lang==='zh'){document.querySelectorAll('[data-i18n]').forEach(function(e){var k=e.getAttribute('data-i18n');if(T.zh[k]){if(e.tagName==='INPUT')e.placeholder=T.zh[k];else if(k.indexOf('t_')===0||k.indexOf('d_')===0||k==='go_ai')e.innerHTML=T.zh[k];else e.textContent=T.zh[k]}});document.querySelectorAll('[data-i18n-wc]').forEach(function(e){var k=e.getAttribute('data-i18n-wc');if(T.zh[k]){if(k==='wc_title')e.innerHTML=T.zh[k];else e.textContent=T.zh[k]}});}
var welcomed=localStorage.getItem('panguard_welcomed');
if(welcomed){document.getElementById('welcome').style.display='none';nav('dashboard');return}
bar.style.width='10%';
var steps=document.querySelectorAll('.wc-step .wc-icon');
// Step 1: load rules (real API)
af('/api/rules').then(function(r){return r.json()}).then(function(d){bar.style.width='30%';if(steps[0])steps[0].classList.add('done');var p=steps[0]&&steps[0].nextElementSibling;if(p){var h=p.querySelector('h4');if(h)h.textContent=(d.atr||0)+' ATR rules loaded'}}).catch(function(){bar.style.width='30%'});
// Step 2: WS connects (handled by cWS onopen)
setTimeout(function(){bar.style.width='50%';if(steps[1])steps[1].classList.add('done')},1200);
// Step 3: load status (real API)
af('/api/status').then(function(r){return r.json()}).then(function(d){bar.style.width='75%';if(steps[2])steps[2].classList.add('done');var p=steps[2]&&steps[2].nextElementSibling;if(p){var h=p.querySelector('h4');if(h)h.textContent=(d.mode==='protection'?'Protected':'Active')+' - '+(d.eventsProcessed||0)+' events'}}).catch(function(){bar.style.width='75%'});
// Step 4: ready
setTimeout(function(){bar.style.width='100%';if(steps[3])steps[3].classList.add('done')},2400);
})();
</script>
</body>
</html>`;
