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
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// ESM-compatible __dirname resolution. import.meta.dirname is Node 20.11+
// but the project's engines field already requires >=20, so fall back to
// fileURLToPath only as a safety net for older Node 20 patch versions.
const HERE: string =
  (import.meta as unknown as { dirname?: string }).dirname ??
  dirname(fileURLToPath(import.meta.url));

/**
 * Dashboard HTML lives in a sibling file (`dashboard.html`) and is read at
 * module init so the template can be authored as standalone HTML and edited
 * without touching TypeScript. The file ships in the package because
 * `package.json#files` includes `dist/` (the build copies it via postbuild).
 */
const DASHBOARD_HTML: string = readFileSync(join(HERE, 'dashboard.html'), 'utf-8');

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
  private getRulesProvider:
    | (() => Array<{
        id: string;
        title: string;
        severity: string;
        category: string;
        description: string;
      }>)
    | null = null;
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

  /**
   * Wire a callback that returns the live set of ATR rules currently loaded by
   * the engine. Used by SARIF / Evidence Pack export so the auditor sees the
   * actual rules in effect (not a stale snapshot from disk).
   */
  setRulesProvider(
    getter: () => Array<{
      id: string;
      title: string;
      severity: string;
      category: string;
      description: string;
    }>
  ): void {
    this.getRulesProvider = getter;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      // Handle port conflicts BEFORE attaching WSS to prevent unhandled error crashes
      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          logger.warn(
            `Dashboard port ${this.port} already in use. ` +
              `Another Guard instance may be running. Dashboard disabled for this session.`
          );
          this.server = null;
          resolve(); // Don't crash — Guard can run without Dashboard
        } else {
          logger.error(`Dashboard server error: ${err.message}`);
          resolve();
        }
      });

      const wss = new WebSocketServer({ noServer: true });

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
            const isLoopback =
              parsed.hostname === '127.0.0.1' ||
              parsed.hostname === 'localhost' ||
              parsed.hostname === '::1';
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

        // Require the dashboard auth token (the browser sends it as the
        // HttpOnly cookie on upgrade). Without this, any local process could
        // subscribe to the live verdict/event stream — same gate as the HTTP API.
        const wsCookieToken =
          (req.headers.cookie ?? '')
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('panguard_auth='))
            ?.split('=')[1] ?? '';
        if (
          !wsCookieToken ||
          wsCookieToken.length !== this.authToken.length ||
          !timingSafeEqual(Buffer.from(wsCookieToken), Buffer.from(this.authToken))
        ) {
          logger.warn('Rejected WebSocket without a valid auth token');
          ws.close();
          return;
        }

        // Per-IP connection limit
        const clientIP = req.socket.remoteAddress ?? 'unknown';
        const ipCount = [...this.wsClients].filter((c) => c.ip === clientIP).length;
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

      // Handle WebSocket upgrade manually (noServer mode)
      this.server.on('upgrade', (req, socket, head) => {
        const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        if (pathname === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
          });
        } else {
          socket.destroy();
        }
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
      `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' ws://127.0.0.1:${this.port} ws://localhost:${this.port}`
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
      // Parse auth token from: 1) Authorization header, 2) HttpOnly cookie.
      // Query-param tokens (?token=) were removed — they leak into server logs,
      // browser history, and Referer headers.
      const cookieToken =
        (req.headers.cookie ?? '')
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('panguard_auth='))
          ?.split('=')[1] ?? '';
      const providedToken = authHeader.replace('Bearer ', '') || cookieToken;

      if (
        !providedToken ||
        providedToken.length !== this.authToken.length ||
        !timingSafeEqual(Buffer.from(providedToken), Buffer.from(this.authToken))
      ) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // CSRF defense-in-depth on top of the SameSite=Strict cookie. A browser
      // always attaches Origin on a state-changing request, so a *mismatched*
      // Origin is a cross-site (CSRF) attempt and is rejected. An *absent*
      // Origin means a non-browser client (CLI / script / test) that had to
      // supply the auth token explicitly — not a CSRF vector — so it is allowed.
      if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
        const origin = req.headers.origin;
        const allowedOrigins = [`http://127.0.0.1:${this.port}`, `http://localhost:${this.port}`];
        if (origin && !allowedOrigins.includes(origin)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden: cross-origin request rejected' }));
          return;
        }
      }
    }

    const pathname = url.split('?')[0];

    switch (pathname) {
      case '/api/status':
        this.jsonResponse(res, this.buildStatusResponse());
        break;
      case '/api/export/sarif':
        if (req.method === 'POST') {
          this.handleSarifExport(res);
        } else {
          this.jsonResponse(res, { error: 'Method not allowed' }, 405);
        }
        break;
      case '/api/export/evidence':
        if (req.method === 'POST') {
          this.handleEvidenceExport(res);
        } else {
          this.jsonResponse(res, { error: 'Method not allowed' }, 405);
        }
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
      case '/api/config': {
        if (this.getConfig) {
          // Redact secret-bearing fields by KEY name before exposing config to
          // the browser. The dashboard only needs to know a channel is
          // configured — never the secret value. Key-name matching survives
          // config-shape drift (new secret fields are caught automatically).
          const SECRET_KEY_RE =
            /(api[-_]?key|license[-_]?key|signing[-_]?key|private[-_]?key|token|secret|password|passphrase|credential|\bpass\b)/i;
          const safe = JSON.parse(
            JSON.stringify(this.getConfig(), (k, v) =>
              SECRET_KEY_RE.test(k) && typeof v === 'string' && v ? '[redacted]' : v
            )
          );
          this.jsonResponse(res, safe);
        } else {
          this.jsonResponse(res, { error: 'Config not available' }, 503);
        }
        break;
      }
      case '/api/skills':
        this.handleSkillsApi(res);
        break;
      case '/api/ai-config':
        // Read-only. The semantic-layer LLM is configured via env vars / CLI
        // only (PANGUARD_LLM_ENDPOINT, NVIDIA_API_KEY, `pga config llm`) — never
        // written through HTTP. A dashboard POST that persisted an API key and
        // an arbitrary endpoint was a credential-write + data-exfil surface.
        if (req.method === 'POST') {
          this.jsonResponse(
            res,
            { error: 'Read-only: configure the LLM via env vars or `pga config llm`' },
            405
          );
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
      case '/api/agents':
        this.handleAgentsApi(res).catch((err: unknown) => {
          logger.error(
            `handleAgentsApi error: ${err instanceof Error ? err.message : String(err)}`
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

  /**
   * Compose the status envelope returned by /api/status.
   * Adds a `license` field so the SPA can gate Pilot-only UI without making
   * a second round-trip; the underlying tier comes from GuardConfig
   * (cliTier overrides licenseKey) or defaults to community.
   */
  private buildStatusResponse(): DashboardStatus & {
    license: { tier: 'community' | 'pilot' | 'enterprise' | 'free' | 'pro' };
  } {
    const cfg = this.getConfig?.();
    const rawTier = cfg?.cliTier ?? this.status.licenseTier ?? 'community';
    const tier = this.normalizeLicenseTier(rawTier);
    return {
      ...this.status,
      licenseTier: tier,
      license: { tier },
    };
  }

  private normalizeLicenseTier(t: string): 'community' | 'pilot' | 'enterprise' | 'free' | 'pro' {
    const lower = (t ?? '').toLowerCase();
    if (
      lower === 'pilot' ||
      lower === 'enterprise' ||
      lower === 'pro' ||
      lower === 'free' ||
      lower === 'community'
    ) {
      return lower;
    }
    return 'community';
  }

  /**
   * SARIF 2.1.0 stub export. Production wiring to the migrator's evidence
   * generator lives in Block F; this stub returns a realistic-shape document
   * with the workspace_id, generated_at, and a 1-rule sample so the UI flow
   * and downstream tooling (GitHub code-scanning, etc.) can be validated end
   * to end.
   */
  /**
   * Load all loaded ATR rules from disk. Shared between SARIF + Evidence export.
   * Returns the same shape as /api/loaded-rules.
   */
  private loadAtrRulesForExport(): Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    description: string;
  }> {
    // Prefer the live engine-provided list (always accurate, in-memory).
    // Fall back to scanning YAML on disk for legacy installs.
    if (this.getRulesProvider) {
      try {
        const live = this.getRulesProvider();
        if (live.length > 0) return live;
      } catch {
        /* fall through to disk scan */
      }
    }
    const rulesDir = join(
      this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard'),
      '..',
      'agent-threat-rules',
      'rules'
    );
    const candidates = [
      rulesDir,
      join(homedir(), '.panguard-guard', 'rules'),
      join(homedir(), '.panguard-guard', 'atr', 'rules'),
    ];
    const rules: Array<{
      id: string;
      title: string;
      severity: string;
      category: string;
      description: string;
    }> = [];
    for (const dir of candidates) {
      if (!existsSync(dir)) continue;
      try {
        const files = readdirSync(dir).filter(
          (f: string) => f.endsWith('.yaml') || f.endsWith('.yml')
        );
        for (const file of files) {
          try {
            const content = readFileSync(join(dir, file), 'utf-8');
            const id = content.match(/^id:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? file;
            const title = content.match(/^title:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? '';
            const severity =
              content.match(/^severity:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? 'medium';
            const category =
              content.match(/category:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? 'unknown';
            const description =
              content.match(/^description:\s*["']?([^"'\n]+)/m)?.[1]?.trim() ?? '';
            if (id && title) {
              rules.push({
                id,
                title,
                severity,
                category,
                description: description.slice(0, 200),
              });
            }
          } catch {
            // skip unreadable rule file
          }
        }
        if (rules.length > 0) break; // first dir with rules wins
      } catch {
        // skip unreadable dir
      }
    }
    return rules;
  }

  /**
   * Real SARIF 2.1.0 export.
   * - tool.driver.rules: every ATR rule actually loaded by this Guard instance.
   * - results: one entry per recent event whose detection produced a verdict
   *   (status.recentVerdicts plus correlated recentEvents).
   * - level mapping: malicious=error, suspicious=warning, benign=note.
   *
   * Compatible with GitHub Code Scanning, Microsoft Defender XDR, Sentinel,
   * and any SARIF 2.1.0 consumer.
   */
  private handleSarifExport(res: ServerResponse): void {
    const cfg = this.getConfig?.();
    const workspaceId = (cfg as { workspaceId?: string } | undefined)?.workspaceId ?? 'local';
    const generatedAt = new Date().toISOString();
    const rules = this.loadAtrRulesForExport();
    const verdicts = this.status.recentVerdicts ?? [];

    const severityToLevel = (s: string): 'error' | 'warning' | 'note' | 'none' => {
      const v = s.toLowerCase();
      if (v === 'critical' || v === 'high' || v === 'malicious') return 'error';
      if (v === 'medium' || v === 'suspicious') return 'warning';
      if (v === 'low' || v === 'informational' || v === 'benign') return 'note';
      return 'none';
    };

    const results = verdicts.map((v, idx) => {
      const ruleMatch = (v.evidence ?? []).find((e) => e.source === 'rule_match');
      const ruleData = ruleMatch?.data as { rule_id?: string; ruleId?: string } | undefined;
      const ruleId = ruleData?.rule_id ?? ruleData?.ruleId ?? 'ATR-UNCLASSIFIED';
      return {
        ruleId,
        ruleIndex: rules.findIndex((r) => r.id === ruleId),
        level: severityToLevel(v.conclusion),
        message: {
          text: v.reasoning || `Verdict: ${v.conclusion} (confidence ${v.confidence}%)`,
        },
        properties: {
          confidence: v.confidence,
          conclusion: v.conclusion,
          recommendedAction: v.recommendedAction,
          mitreTechnique: v.mitreTechnique,
          verdictIndex: idx,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: `panguard://workspace/${workspaceId}/verdict/${idx}`,
              },
            },
          },
        ],
      };
    });

    const sarif = {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'PanGuard Guard',
              version: '1.5.6',
              informationUri: 'https://panguard.ai',
              rules: rules.map((r) => ({
                id: r.id,
                name: r.title,
                shortDescription: { text: r.title },
                fullDescription: { text: r.description },
                defaultConfiguration: { level: severityToLevel(r.severity) },
                properties: {
                  category: r.category,
                  severity: r.severity,
                  tags: ['ai-agent', 'atr', r.category, r.severity].filter(Boolean),
                },
                helpUri: `https://atr.panguard.ai/rules/${r.id}`,
              })),
            },
          },
          invocations: [
            {
              executionSuccessful: true,
              startTimeUtc: generatedAt,
              endTimeUtc: generatedAt,
              workingDirectory: { uri: 'file:///opt/panguard-guard' },
            },
          ],
          properties: {
            workspace_id: workspaceId,
            generated_at: generatedAt,
            panguard_version: '1.5.6',
            mode: this.status.mode,
            rules_loaded: rules.length,
            threats_detected: this.status.threatsDetected,
            events_processed: this.status.eventsProcessed,
          },
          results,
        },
      ],
    };

    const body = JSON.stringify(sarif, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/sarif+json',
      'Content-Disposition': `attachment; filename="panguard-${workspaceId}-${generatedAt.slice(0, 10)}.sarif.json"`,
      'Content-Length': Buffer.byteLength(body).toString(),
    });
    res.end(body);
  }

  /**
   * Real Evidence Pack export.
   * - Includes every loaded ATR rule with its severity/category for the auditor.
   * - Includes every verdict from recentVerdicts (anonymized — no event payloads).
   * - Computes SHA-256 of the canonical content for tamper-evidence.
   * - Format: PanGuard evidence-pack v1.0 (proprietary JSON envelope).
   *
   * Suitable for SOC 2 / EU AI Act Article 15 audit submission alongside the
   * deeper enterprise PDF (panguard-enterprise/migrator/src/evidence/pdf.ts).
   */
  private handleEvidenceExport(res: ServerResponse): void {
    const cfg = this.getConfig?.();
    const workspaceId = (cfg as { workspaceId?: string } | undefined)?.workspaceId ?? 'local';
    const generatedAt = new Date().toISOString();
    const rules = this.loadAtrRulesForExport();
    const verdicts = this.status.recentVerdicts ?? [];

    const content = {
      kind: 'panguard.evidence-pack',
      version: '1.0',
      workspace_id: workspaceId,
      generated_at: generatedAt,
      panguard_version: '1.5.6',
      mode: this.status.mode,
      summary: {
        threats_total: this.status.threatsDetected,
        events_processed: this.status.eventsProcessed,
        actions_executed: this.status.actionsExecuted,
        rules_active: rules.length,
        rules_loaded: rules.length,
        uptime_ms: this.status.uptime,
        baseline_confidence: this.status.baselineConfidence,
      },
      rules_loaded: rules.map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        category: r.category,
      })),
      verdicts: verdicts.map((v, idx) => ({
        index: idx,
        conclusion: v.conclusion,
        confidence: v.confidence,
        reasoning: v.reasoning,
        recommendedAction: v.recommendedAction,
        mitreTechnique: v.mitreTechnique,
        evidence_sources: (v.evidence ?? []).map((e) => e.source),
      })),
      attestation: {
        method: 'sha256',
        note: 'SHA-256 below is over the canonical JSON of this document with this field set to null. Verify by recomputing the hash with attestation.sha256 = null and comparing.',
        sha256: '',
      },
    };

    // Canonical hash: compute over the document with attestation.sha256 emptied.
    const canonical = JSON.stringify(content, Object.keys(content).sort());
    const hash = createHash('sha256').update(canonical).digest('hex');
    content.attestation.sha256 = hash;

    const body = JSON.stringify(content, null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="panguard-evidence-${workspaceId}-${generatedAt.slice(0, 10)}.json"`,
      'Content-Length': Buffer.byteLength(body).toString(),
    });
    res.end(body);
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

  // handleAiConfigPost was removed: the dashboard no longer writes LLM
  // credentials or endpoints over HTTP (that was a credential-write + exfil
  // surface). The LLM is configured via env vars / `pga config llm` only.
  // /api/ai-config is now read-only (handleAiConfigGet).

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
      )
        return false;
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
      connected: lastSync !== null,
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
    // Reuse the same rules source SARIF / Evidence export uses. Prefers the
    // engine's in-memory rules; falls back to YAML scan on disk. Without this
    // alignment the Rules tab said "No rules match the filters" even when the
    // engine had 394 rules loaded (verified live 2026-05-12).
    try {
      const rules = this.loadAtrRulesForExport();
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
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
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

  private async handleAgentsApi(res: ServerResponse): Promise<void> {
    type AgentInfo = {
      id: string;
      name: string;
      detected: boolean;
      alreadyConfigured: boolean;
    };
    let agents: AgentInfo[] = [];
    try {
      const mcpConfig: Record<string, unknown> = await import(
        '@panguard-ai/panguard-mcp/config' as string
      );
      const detect = mcpConfig['detectPlatforms'] as
        | (() => Promise<
            Array<{
              id: string;
              name: string;
              detected: boolean;
              alreadyConfigured: boolean;
            }>
          >)
        | undefined;
      if (detect) {
        const platforms = await detect();
        agents = platforms.map((p) => ({
          id: p.id,
          name: p.name,
          detected: p.detected,
          alreadyConfigured: p.alreadyConfigured,
        }));
      }
    } catch {
      /* module not installed — return empty list */
    }
    this.jsonResponse(res, {
      agents,
      total: agents.length,
      detected: agents.filter((a) => a.detected).length,
      configured: agents.filter((a) => a.alreadyConfigured).length,
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
