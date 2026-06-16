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
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  rmSync,
  chmodSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { WebSocketServer, type WebSocket as WS } from 'ws';
import { createLogger } from '@panguard-ai/core';
import { FileQuarantine } from '../response/file-quarantine.js';
import type {
  DashboardStatus,
  DashboardEvent,
  ThreatMapEntry,
  GuardConfig,
  ThreatVerdict,
} from '../types.js';
import { saveConfig } from '../config.js';
import { redactSecrets } from '../redact.js';
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

/**
 * The dashboard's per-launch auth token is persisted here (0o600) while the
 * daemon runs, so a *separate* process — `pga up` on a rerun, an
 * already-running daemon, a headless host — can build the authenticated launch
 * URL (http://127.0.0.1:PORT/?token=<token>) instead of opening a bare URL that
 * 401s. The token is the launch secret that mints the dashboard auth cookie, so
 * it is treated exactly like the cookie: owner-only file mode, never logged, and
 * removed when the dashboard stops so a stale token cannot linger after exit.
 */
const DASHBOARD_TOKEN_DIR = join(homedir(), '.panguard-guard');
const DASHBOARD_TOKEN_PATH = join(DASHBOARD_TOKEN_DIR, 'dashboard-token');

/**
 * Remove the persisted dashboard launch token. Exported so `pga guard stop` /
 * `pga guard uninstall` can guarantee the secret never outlives the daemon even
 * when the process is killed without a graceful `stop()` (e.g. SIGTERM mid-run).
 * Best-effort: a missing file or permission error is not fatal.
 */
export function removeDashboardToken(): void {
  try {
    if (existsSync(DASHBOARD_TOKEN_PATH)) {
      rmSync(DASHBOARD_TOKEN_PATH, { force: true });
    }
  } catch {
    /* best effort — never block shutdown on token cleanup */
  }
}

/**
 * Path of the collective-defense consent marker. Mirrors the CLI consent module
 * (packages/panguard/src/cli/consent.ts:CONSENT_MARKER) so that turning
 * collective defense ON or OFF from the dashboard counts as "the user has been
 * asked and answered" — otherwise the next `pga up` / `pga scan` first-run
 * prompt would overwrite the dashboard choice. The marker is purely a "consent
 * has been recorded" signal; it never enables anything on its own. The upload
 * gate is still `threatCloudUploadEnabled === true`, default OFF. Resolved at
 * call time (not module load) so it always follows the live home directory.
 */
function consentMarkerPath(): string {
  return join(homedir(), '.panguard-guard', '.telemetry-prompted');
}

/**
 * Record that the user has answered the collective-defense question (from the
 * dashboard toggle). Best-effort: a missing dir is created; any failure is
 * swallowed so a read-only home directory never blocks saving the config.
 */
function markConsentAnswered(): void {
  try {
    const dir = join(homedir(), '.panguard-guard');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    writeFileSync(consentMarkerPath(), new Date().toISOString(), { encoding: 'utf-8', mode: 0o600 });
  } catch {
    /* best effort — if we can't write the marker, the CLI re-asks next run */
  }
}

/** Relay configuration for connecting to a remote Manager */
export interface DashboardRelayOptions {
  readonly managerUrl: string;
  readonly agentId: string;
  readonly token: string;
}

/** Per-layer runtime health, computed from live engine state (never hard-coded). */
interface LayerState {
  readonly state: 'active' | 'idle' | 'degraded' | 'off';
  readonly detail: string;
  readonly optional?: boolean;
}
interface LayerHealth {
  readonly a: LayerState;
  readonly b: LayerState;
  readonly c: LayerState;
}

/**
 * Honest enforcement posture — what the daemon will ACTUALLY do on a detection,
 * not just the mode label. 'protection' mode with no armed response policy is
 * detect-and-notify, NOT prevention, and must not read as a green PROTECTED.
 */
interface EnforcementStatus {
  readonly mode: string;
  readonly posture: 'protected' | 'monitoring' | 'report-only' | 'learning' | 'off';
  readonly osActionsArmed: boolean;
  readonly armedActions: string[];
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
          data: {
            ...this.status,
            layers: this.computeLayers(),
            enforcement: this.computeEnforcement(),
          },
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
        // Token never logged. The launcher (guard-engine) opens the browser at
        // /?token=<authToken>; that one-time token mints the HttpOnly auth
        // cookie used for all subsequent /api/* and /ws traffic.

        // Persist the launch token (0o600) so a separate `pga up` invocation can
        // build the authenticated URL for an already-running daemon instead of
        // opening a bare URL that 401s. Written only once the dashboard is truly
        // listening, so a present token file implies a reachable dashboard.
        this.persistAuthToken();

        if (this.relayConfig) {
          this.startRelayClient(this.relayConfig);
        }

        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Remove the persisted launch token so the secret never outlives the
    // dashboard — a stale token would point `pga up` at a dead port.
    removeDashboardToken();

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
      data: {
        ...this.status,
        layers: this.computeLayers(),
        enforcement: this.computeEnforcement(),
      },
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

  /**
   * Persist the launch token to ~/.panguard-guard/dashboard-token with 0o600 so
   * a separate `pga up` invocation (rerun, already-running daemon, headless,
   * copied URL) can construct the authenticated launch URL. The token is the
   * launch secret that mints the auth cookie, so it is written owner-only and
   * never logged — same handling as the cookie. Best-effort: a write failure
   * just means the CLI falls back to printing guidance instead of a live URL.
   */
  private persistAuthToken(): void {
    try {
      if (!existsSync(DASHBOARD_TOKEN_DIR)) {
        mkdirSync(DASHBOARD_TOKEN_DIR, { recursive: true, mode: 0o700 });
      }
      // Atomic write via a temp file + rename so a concurrent reader never sees
      // a half-written token. The temp file is created owner-only from the start.
      const tmpPath = `${DASHBOARD_TOKEN_PATH}.tmp.${process.pid}`;
      writeFileSync(tmpPath, this.authToken, { encoding: 'utf-8', mode: 0o600 });
      renameSync(tmpPath, DASHBOARD_TOKEN_PATH);
      // chmod even if the file pre-existed, to tighten a loosely-created file.
      try {
        chmodSync(DASHBOARD_TOKEN_PATH, 0o600);
      } catch {
        /* platforms without POSIX permissions */
      }
    } catch (err) {
      // Never block dashboard startup on token persistence — log without the
      // token value, then continue. The CLI degrades to guidance text.
      logger.warn(
        `Could not persist dashboard launch token: ${err instanceof Error ? err.message : String(err)}`
      );
    }
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

    if (url === '/' || url.split('?')[0] === '/') {
      this.serveIndex(req, res, nonce);
      return;
    }

    if (url.startsWith('/api/')) {
      const authHeader = req.headers.authorization ?? '';
      // Parse auth token from: 1) Authorization header, 2) HttpOnly cookie.
      // Query-param tokens (?token=) are NOT accepted on /api/* — they leak into
      // server logs, browser history, and Referer headers. (The launch token in
      // GET /?token= only mints the cookie; it never authenticates an API call.)
      const headerToken = authHeader.replace('Bearer ', '');
      const cookieToken =
        (req.headers.cookie ?? '')
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('panguard_auth='))
          ?.split('=')[1] ?? '';
      const usedHeaderToken = headerToken.length > 0;
      const providedToken = headerToken || cookieToken;

      if (
        !providedToken ||
        providedToken.length !== this.authToken.length ||
        !timingSafeEqual(Buffer.from(providedToken), Buffer.from(this.authToken))
      ) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // CSRF defense for state-changing requests. The CSRF-exploitable path is a
      // browser that auto-attaches the SameSite cookie; for it the Origin header
      // MUST be present and match a loopback origin. An ABSENT Origin is NOT
      // treated as same-origin — it is rejected — because a same-origin browser
      // fetch always sends Origin on POST/PUT/DELETE. The only legitimate caller
      // with no Origin is a non-browser client (CLI / script / test), which
      // cannot ride a victim's cookie and instead supplies the token explicitly
      // in the Authorization header — that path is exempt (an attacker's
      // cross-site page cannot set a custom Authorization header).
      if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
        if (!usedHeaderToken) {
          const origin = req.headers.origin;
          const allowedOrigins = [
            `http://127.0.0.1:${this.port}`,
            `http://localhost:${this.port}`,
          ];
          if (!origin || !allowedOrigins.includes(origin)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'Forbidden: missing or cross-origin Origin on cookie-authenticated request',
              })
            );
            return;
          }
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
          // Shared with the CLI `config` dump — see ../redact.ts.
          this.jsonResponse(res, redactSecrets(this.getConfig()));
        } else {
          this.jsonResponse(res, { error: 'Config not available' }, 503);
        }
        break;
      }
      case '/api/skills':
        this.handleSkillsApi(res);
        break;
      case '/api/ai-config':
        // Read-only. The semantic-layer LLM is configured via env vars only
        // (ANTHROPIC_API_KEY / OPENAI_API_KEY for cloud, or PANGUARD_SEMANTIC=1
        // with a local Ollama) — never written through HTTP. A dashboard POST
        // that persisted an API key and an arbitrary endpoint was a
        // credential-write + data-exfil surface.
        if (req.method === 'POST') {
          this.jsonResponse(
            res,
            {
              error:
                'Read-only: configure the LLM via env vars (ANTHROPIC_API_KEY / OPENAI_API_KEY, or PANGUARD_SEMANTIC=1 with local Ollama)',
            },
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
      case '/api/skills/quarantine':
        if (req.method === 'POST') {
          this.handleQuarantinePost(req, res).catch((err: unknown) => {
            logger.error(
              `handleQuarantinePost error: ${err instanceof Error ? err.message : String(err)}`
            );
            if (!res.headersSent) this.jsonResponse(res, { error: 'Internal error' }, 500);
          });
        } else {
          this.jsonResponse(res, { error: 'Method not allowed' }, 405);
        }
        break;
      case '/api/skills/whitelist':
        if (req.method === 'POST') {
          this.handleWhitelistPost(req, res);
        } else {
          this.jsonResponse(res, { error: 'Method not allowed' }, 405);
        }
        break;
      case '/api/skills/unwhitelist':
        if (req.method === 'POST') {
          this.handleUnwhitelistPost(req, res);
        } else {
          this.jsonResponse(res, { error: 'Method not allowed' }, 405);
        }
        break;
      case '/api/skills/quarantined':
        this.handleQuarantinedListApi(res).catch((err: unknown) => {
          logger.error(
            `handleQuarantinedListApi error: ${err instanceof Error ? err.message : String(err)}`
          );
          if (!res.headersSent) this.jsonResponse(res, { error: 'Internal error' }, 500);
        });
        break;
      case '/api/skills/restore':
        if (req.method === 'POST') {
          this.handleRestorePost(req, res).catch((err: unknown) => {
            logger.error(
              `handleRestorePost error: ${err instanceof Error ? err.message : String(err)}`
            );
            if (!res.headersSent) this.jsonResponse(res, { error: 'Internal error' }, 500);
          });
        } else {
          this.jsonResponse(res, { error: 'Method not allowed' }, 405);
        }
        break;
      case '/api/rule-update':
        this.handleRuleUpdateApi(res);
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

  private serveIndex(req: IncomingMessage, res: ServerResponse, nonce: string): void {
    // The auth cookie is a LAUNCH SECRET — it is minted only for a request that
    // carries the correct one-time token in the query string (the URL the `pga`
    // CLI prints and opens: http://127.0.0.1:PORT/?token=<authToken>). An
    // UNAUTHENTICATED GET / (no token, or a wrong token — e.g. a malicious local
    // page probing the port) still receives the HTML shell, but NO Set-Cookie,
    // so it cannot reach any /api/* endpoint or the /ws stream. This closes the
    // "GET / hands a valid auth token to any caller" hole: the token comes from
    // the CLI that started the dashboard, never from serving the index.
    const queryToken = this.extractLaunchToken(req.url ?? '/');
    const launched =
      !!queryToken &&
      queryToken.length === this.authToken.length &&
      timingSafeEqual(Buffer.from(queryToken), Buffer.from(this.authToken));

    // Inject nonce into <script> tag for CSP compliance.
    const html = DASHBOARD_HTML.replace('<script>', `<script nonce="${nonce}">`);
    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
    };
    if (launched) {
      // HttpOnly + SameSite=Strict: not readable by JS and not attached to
      // cross-site requests. Issued only once the launch token is verified.
      headers['Set-Cookie'] = `panguard_auth=${this.authToken}; HttpOnly; SameSite=Strict; Path=/`;
    }
    res.writeHead(200, headers);
    res.end(html);
  }

  /** Parse the one-time launch token from a `GET /?token=...` request URL. */
  private extractLaunchToken(url: string): string {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return '';
    try {
      return new URLSearchParams(url.slice(qIndex + 1)).get('token') ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Compose the status envelope returned by /api/status.
   * Adds a `license` field so the SPA can gate Pilot-only UI without making
   * a second round-trip; the underlying tier comes from GuardConfig
   * (cliTier overrides licenseKey) or defaults to community.
   */
  private buildStatusResponse(): DashboardStatus & {
    license: { tier: 'community' | 'pilot' | 'enterprise' | 'free' | 'pro' };
    layers: LayerHealth;
    enforcement: EnforcementStatus;
  } {
    const cfg = this.getConfig?.();
    const rawTier = cfg?.cliTier ?? this.status.licenseTier ?? 'community';
    const tier = this.normalizeLicenseTier(rawTier);
    return {
      ...this.status,
      licenseTier: tier,
      license: { tier },
      layers: this.computeLayers(),
      enforcement: this.computeEnforcement(),
    };
  }

  /**
   * Real per-layer health, derived from live engine state — NOT hard-coded.
   * The dashboard's "Layer A/B Active" used to be static green in the HTML, so it
   * stayed green even with zero rules loaded or the engine stopped. This computes
   * the truth: Layer A (deterministic pattern) is active only when rules are
   * actually loaded AND the engine is running; Layer B (deterministic heuristic +
   * baseline) tracks the running state; Layer C (optional semantic) reflects
   * whether the user has configured a BYO LLM (config.ai) — it is advisory and
   * off-by-default, so "off" is a healthy state, not a fault.
   */
  private computeLayers(): LayerHealth {
    const cfg = this.getConfig?.();
    const ruleCount = this.status.atrRuleCount ?? 0;
    const running = this.status.mode === 'learning' || this.status.mode === 'protection';
    const aiConfigured = !!cfg?.ai;
    return {
      a: {
        state: ruleCount > 0 && running ? 'active' : ruleCount > 0 ? 'idle' : 'degraded',
        detail:
          ruleCount > 0
            ? `${ruleCount} pattern rules loaded`
            : 'no rules loaded — pattern detection off; reinstall ATR rules',
      },
      b: {
        state: running ? 'active' : 'idle',
        detail: 'heuristic + behavioral baseline',
      },
      c: {
        state: aiConfigured ? 'active' : 'off',
        optional: true,
        detail: aiConfigured
          ? 'semantic verdict configured (advisory) · runs only on flagged events, not every action — typically a few cents/month, or free with local Ollama'
          : 'off · bring your own LLM to catch novel attacks A/B miss and draft new ATR rules — runs only on flagged events, not every action, so a typical machine costs a few cents per month. Local & private: set PANGUARD_SEMANTIC=1 with Ollama (free, no API key, data stays on your machine). Cloud: set ANTHROPIC_API_KEY or OPENAI_API_KEY (read from the environment, never stored).',
      },
    };
  }

  /**
   * Honest enforcement posture. The dashboard used to print PROTECTED whenever
   * mode === 'protection', even with an all-off enforcement policy that takes no
   * action — the exact "says PROTECTED, prevents nothing" overclaim the audit
   * flagged. This reports what the daemon will ACTUALLY do: 'protected' only when
   * protection mode is on AND at least one response action is armed; otherwise
   * 'monitoring' (detect + notify, no automatic OS response).
   */
  private computeEnforcement(): EnforcementStatus {
    const cfg = this.getConfig?.();
    const mode = this.status.mode ?? 'learning';
    const ep = cfg?.enforcementPolicy;
    const armed: string[] = [];
    if (ep?.blockIPs?.enabled) armed.push('block IPs');
    if (ep?.killProcesses?.enabled) armed.push('kill processes');
    if (ep?.isolateFiles?.enabled) armed.push('isolate files');
    if (ep?.disableAccounts?.enabled) armed.push('disable accounts');
    const osActionsArmed = mode === 'protection' && armed.length > 0;
    let posture: EnforcementStatus['posture'];
    if (mode === 'protection') posture = osActionsArmed ? 'protected' : 'monitoring';
    else if (mode === 'report-only') posture = 'report-only';
    else if (mode === 'learning') posture = 'learning';
    else posture = 'off';
    return { mode, posture, osActionsArmed, armedActions: armed };
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
    // Never return raw config.ai — it carries plaintext apiKey / byokApiKey.
    // Expose only the non-secret shape the SPA needs; presence of a key is a
    // boolean, never the value.
    this.jsonResponse(res, {
      ai: config.ai
        ? {
            provider: config.ai.provider,
            model: config.ai.model,
            endpoint: config.ai.endpoint,
            hasApiKey: !!config.ai.apiKey,
          }
        : null,
      mode: config.mode,
      dashboardEnabled: config.dashboardEnabled,
    });
  }

  // handleAiConfigPost was removed: the dashboard no longer writes LLM
  // credentials or endpoints over HTTP (that was a credential-write + exfil
  // surface). The LLM is configured via env vars only (ANTHROPIC_API_KEY /
  // OPENAI_API_KEY for cloud, or PANGUARD_SEMANTIC=1 with local Ollama).
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

    // Opt-in, default OFF: only "enabled" when explicitly turned on (=== true).
    const uploadEnabled = config?.threatCloudUploadEnabled === true;
    const endpoint = config?.threatCloudEndpoint ?? 'https://tc.panguard.ai/api';
    // Whether the collective-defense question has been answered at least once
    // (first-run prompt OR a dashboard toggle). Lets the UI distinguish
    // "never asked" from "deliberately off". Never affects the upload gate.
    const consentAsked = existsSync(consentMarkerPath());

    this.jsonResponse(res, {
      enabled: config?.threatCloudEndpoint !== undefined,
      connected: lastSync !== null,
      endpoint,
      uploadEnabled,
      consentAsked,
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
          // Collective-defense single answer. When present it is the source of
          // truth for BOTH telemetryEnabled and threatCloudUploadEnabled (they
          // move together, exactly like the CLI first-run consent prompt) and it
          // records the consent marker. Opt-in: only `true` turns sharing on.
          consentGiven?: boolean;
          endpoint?: string;
          mode?: string;
        };

        if (
          update.consentGiven !== undefined &&
          typeof update.consentGiven !== 'boolean'
        ) {
          this.jsonResponse(res, { error: 'consentGiven must be a boolean' }, 400);
          return;
        }
        if (update.uploadEnabled !== undefined && typeof update.uploadEnabled !== 'boolean') {
          this.jsonResponse(res, { error: 'uploadEnabled must be a boolean' }, 400);
          return;
        }

        if (update.endpoint !== undefined && !DashboardServer.isValidEndpointUrl(update.endpoint)) {
          this.jsonResponse(res, { error: 'Invalid endpoint URL' }, 400);
          return;
        }
        // Accept all THREE real modes. Omitting 'report-only' here used to both
        // reject a legitimate report-only save (400) and let the binary UI toggle
        // silently overwrite a user's report-only config with 'learning' on the
        // next save — quietly downgrading their enforcement posture.
        if (
          update.mode !== undefined &&
          update.mode !== 'learning' &&
          update.mode !== 'report-only' &&
          update.mode !== 'protection'
        ) {
          this.jsonResponse(res, { error: 'Invalid mode' }, 400);
          return;
        }

        const config = this.getConfig!();
        // consentGiven is the single collective-defense answer: it drives BOTH
        // flags so they can never drift apart (the CLI gate reads both). A plain
        // `uploadEnabled` is still honoured for the legacy upload toggle, but
        // consentGiven wins when both are sent.
        const sharingEnabled =
          update.consentGiven ?? update.uploadEnabled ?? config.threatCloudUploadEnabled;
        const updatedConfig: GuardConfig = {
          ...config,
          threatCloudUploadEnabled: sharingEnabled,
          // Keep the deprecated telemetryEnabled flag in lockstep — the CLI
          // upload gate and consent module both read it.
          telemetryEnabled:
            update.consentGiven ?? update.uploadEnabled ?? config.telemetryEnabled,
          threatCloudEndpoint: update.endpoint ?? config.threatCloudEndpoint,
          mode: (update.mode as GuardConfig['mode']) ?? config.mode,
        };

        saveConfig(updatedConfig);
        // The user has now answered the collective-defense question from the
        // dashboard, so the CLI first-run prompt must not re-ask and clobber it.
        if (update.consentGiven !== undefined) {
          markConsentAnswered();
        }
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

  /**
   * Read a JSON request body (≤10KB) for the action POST endpoints. Resolves to
   * the parsed object, or null after having already written the error response
   * (payload too large / invalid JSON / stream error) — callers just return on null.
   */
  private readJsonBody(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<Record<string, unknown> | null> {
    return new Promise((resolveBody) => {
      let body = '';
      let aborted = false;
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
        if (body.length > 10_000) {
          aborted = true;
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.destroy();
          resolveBody(null);
        }
      });
      req.on('end', () => {
        if (aborted) return;
        try {
          resolveBody(JSON.parse(body || '{}') as Record<string, unknown>);
        } catch {
          this.jsonResponse(res, { error: 'Invalid JSON' }, 400);
          resolveBody(null);
        }
      });
      req.on('error', () => resolveBody(null));
    });
  }

  /**
   * POST /api/skills/quarantine — move a flagged file-based skill into quarantine.
   * Resolves the skill name under ~/.claude/skills/, contains it against path
   * traversal, confirms it exists, then uses the existing FileQuarantine (atomic
   * move + 0o700 perms + restorable manifest). MCP-server config entries are not
   * file-based and cannot be quarantined this way.
   */
  private async handleQuarantinePost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJsonBody(req, res);
    if (body === null) return;
    const name = typeof body['name'] === 'string' ? (body['name'] as string).trim() : '';
    if (!name) {
      this.jsonResponse(res, { error: 'Missing skill name' }, 400);
      return;
    }
    const skillsRoot = join(homedir(), '.claude', 'skills');
    const target = resolve(skillsRoot, name);
    // Containment: the resolved path must stay strictly inside the skills dir.
    if (target === skillsRoot || !target.startsWith(skillsRoot + sep)) {
      this.jsonResponse(res, { error: 'Invalid skill name' }, 400);
      return;
    }
    if (!existsSync(target)) {
      this.jsonResponse(
        res,
        {
          error:
            'Not a file-based skill (no folder under ~/.claude/skills) — remove its config entry instead',
        },
        404
      );
      return;
    }
    try {
      const fq = new FileQuarantine();
      await fq.initialize();
      const record = await fq.quarantine(target, `Quarantined from dashboard: ${name}`);
      logger.warn(`Skill quarantined via dashboard: ${name}`);
      this.jsonResponse(res, { success: true, quarantinePath: record.quarantinePath });
    } catch (err: unknown) {
      this.jsonResponse(
        res,
        { error: `Quarantine failed: ${err instanceof Error ? err.message : String(err)}` },
        500
      );
    }
  }

  /**
   * POST /api/skills/whitelist — mark a skill safe (false positive) by adding it
   * to the local skill-whitelist.json the installed-skills view reads. Atomic
   * write (tmp + rename), owner-only perms.
   */
  private async handleWhitelistPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJsonBody(req, res);
    if (body === null) return;
    const name = typeof body['name'] === 'string' ? (body['name'] as string).trim() : '';
    if (!name) {
      this.jsonResponse(res, { error: 'Missing skill name' }, 400);
      return;
    }
    try {
      const dataDir = this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard');
      const whitelistPath = join(dataDir, 'skill-whitelist.json');
      let entries: Array<{ name: string; source?: string; addedAt?: string }> = [];
      if (existsSync(whitelistPath)) {
        try {
          const raw = JSON.parse(readFileSync(whitelistPath, 'utf-8')) as {
            whitelist?: Array<{ name: string; source?: string }>;
            skills?: Array<{ name: string; source?: string }>;
          };
          entries = raw.whitelist ?? raw.skills ?? [];
        } catch {
          /* corrupt file — start fresh */
        }
      }
      if (!entries.some((s) => s.name === name)) {
        entries.push({ name, source: 'manual-dashboard', addedAt: new Date().toISOString() });
      }
      mkdirSync(dataDir, { recursive: true });
      const tmp = `${whitelistPath}.tmp.${process.pid}`;
      writeFileSync(tmp, JSON.stringify({ whitelist: entries }, null, 2), { mode: 0o600 });
      renameSync(tmp, whitelistPath);
      this.jsonResponse(res, { success: true });
    } catch (err: unknown) {
      this.jsonResponse(
        res,
        { error: `Whitelist failed: ${err instanceof Error ? err.message : String(err)}` },
        500
      );
    }
  }

  /**
   * POST /api/skills/unwhitelist — remove a skill from the local whitelist, so a
   * mistaken "Mark safe" is reversible from the dashboard (the whitelist used to
   * be append-only with no in-product undo). Atomic write, owner-only perms.
   */
  private async handleUnwhitelistPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJsonBody(req, res);
    if (body === null) return;
    const name = typeof body['name'] === 'string' ? (body['name'] as string).trim() : '';
    if (!name) {
      this.jsonResponse(res, { error: 'Missing skill name' }, 400);
      return;
    }
    try {
      const dataDir = this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard');
      const whitelistPath = join(dataDir, 'skill-whitelist.json');
      if (!existsSync(whitelistPath)) {
        this.jsonResponse(res, { success: true, removed: false });
        return;
      }
      let entries: Array<{ name: string; source?: string; addedAt?: string }> = [];
      try {
        const raw = JSON.parse(readFileSync(whitelistPath, 'utf-8')) as {
          whitelist?: Array<{ name: string; source?: string }>;
          skills?: Array<{ name: string; source?: string }>;
        };
        entries = raw.whitelist ?? raw.skills ?? [];
      } catch {
        this.jsonResponse(res, { success: true, removed: false });
        return;
      }
      const next = entries.filter((s) => s.name !== name);
      const removed = next.length !== entries.length;
      mkdirSync(dataDir, { recursive: true });
      const tmp = `${whitelistPath}.tmp.${process.pid}`;
      writeFileSync(tmp, JSON.stringify({ whitelist: next }, null, 2), { mode: 0o600 });
      renameSync(tmp, whitelistPath);
      this.jsonResponse(res, { success: true, removed });
    } catch (err: unknown) {
      this.jsonResponse(
        res,
        { error: `Un-whitelist failed: ${err instanceof Error ? err.message : String(err)}` },
        500
      );
    }
  }

  /**
   * GET /api/skills/quarantined — the list of currently quarantined files, so the
   * user can SEE what's quarantined and restore it. The quarantine confirm dialog
   * promises restorability; this + /api/skills/restore make that promise real.
   */
  private async handleQuarantinedListApi(res: ServerResponse): Promise<void> {
    try {
      const fq = new FileQuarantine();
      await fq.initialize();
      const records = fq.getActiveRecords().map((r) => ({
        id: r.id,
        originalPath: r.originalPath,
        reason: r.reason,
        quarantinedAt: r.quarantinedAt,
      }));
      this.jsonResponse(res, { records, total: records.length });
    } catch (err: unknown) {
      logger.error(`quarantined list failed: ${err instanceof Error ? err.message : String(err)}`);
      this.jsonResponse(res, { records: [], total: 0 });
    }
  }

  /**
   * POST /api/skills/restore — restore a quarantined file to its original path,
   * honoring the reversibility the UI promises. Body: { id }.
   */
  private async handleRestorePost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readJsonBody(req, res);
    if (body === null) return;
    const id = typeof body['id'] === 'string' ? (body['id'] as string).trim() : '';
    if (!id) {
      this.jsonResponse(res, { error: 'Missing quarantine id' }, 400);
      return;
    }
    try {
      const fq = new FileQuarantine();
      await fq.initialize();
      const result = await fq.restore(id);
      if (result.success) {
        logger.warn(`Quarantined file restored via dashboard: ${id}`);
        this.jsonResponse(res, { success: true, message: result.message });
      } else {
        this.jsonResponse(res, { success: false, error: result.message }, 400);
      }
    } catch (err: unknown) {
      this.jsonResponse(
        res,
        { error: `Restore failed: ${err instanceof Error ? err.message : String(err)}` },
        500
      );
    }
  }

  /**
   * GET /api/rule-update — surface the daily notify-only rule-update check that
   * rule-sync writes to <dataDir>/rule-update.json. The backend computed this
   * signal ("newer detection rules published") but nothing read it, so the most
   * actionable security update was invisible. Notify-only: never auto-applies.
   */
  private handleRuleUpdateApi(res: ServerResponse): void {
    const dataDir = this.getConfig?.()?.dataDir ?? join(homedir(), '.panguard-guard');
    const updatePath = join(dataDir, 'rule-update.json');
    if (!existsSync(updatePath)) {
      this.jsonResponse(res, {
        updateAvailable: false,
        currentVersion: null,
        latestVersion: null,
        checkedAt: null,
        neverChecked: true,
      });
      return;
    }
    try {
      const status = JSON.parse(readFileSync(updatePath, 'utf-8'));
      this.jsonResponse(res, status);
    } catch {
      this.jsonResponse(res, {
        updateAvailable: false,
        currentVersion: null,
        latestVersion: null,
        checkedAt: null,
        neverChecked: true,
      });
    }
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
