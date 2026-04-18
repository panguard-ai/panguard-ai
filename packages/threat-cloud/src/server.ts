/**
 * Threat Cloud HTTP API Server
 * 威脅雲 HTTP API 伺服器
 *
 * Endpoints:
 * - POST /api/threats                Upload anonymized threat data (single or batch)
 * - GET  /api/rules                  Fetch rules (optional ?since= filter)
 * - POST /api/rules                  Publish a new community rule
 * - GET  /api/stats                  Get threat statistics
 * - POST /api/atr-proposals          Submit or confirm ATR rule proposal
 * - POST /api/atr-feedback           Submit feedback on ATR rule
 * - POST /api/rule-feedback          Submit rule feedback with auto-quarantine
 * - POST /api/skill-threats          Submit skill threat from audit
 * - GET  /api/atr-rules              Fetch confirmed ATR rules (?since= filter)
 * - GET  /api/feeds/ip-blocklist     IP blocklist feed (text/plain, ?minReputation=)
 * - GET  /api/feeds/domain-blocklist Domain blocklist feed (text/plain, ?minReputation=)
 * - GET  /api/skill-blacklist        Community skill blacklist (aggregated threats)
 * - POST /api/analyze-skills         Submit scan results for server-side LLM analysis
 * - GET  /api/audit-log             Admin audit log (paginated, admin-only)
 * - POST /api/telemetry              Record anonymous telemetry event from CLI
 * - POST /api/scan-events           Report scan event from any source (bulk/CLI/web)
 * - GET  /api/metrics               Aggregated metrics across all sources (public, cached 60s)
 * - GET  /api/version               Build/deploy info: version, commit, uptime (public, cached 30s)
 * - GET  /api/badge/:author/:skill   ATR Scanned SVG badge for a skill
 * - GET  /api/badge/stats            Badge statistics (JSON)
 * - GET  /health                     Health check
 *
 * @module @panguard-ai/threat-cloud/server
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';

// Read package.json version (for /api/version endpoint, deploy verification)
const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };
const TC_VERSION: string = _pkg.version;

// Server-process startup timestamp for uptime reporting in /api/version.
// This is module-scoped so it captures the actual import-time of the process,
// not the time the first request is handled.
const SERVER_START_TIME: Date = new Date();
import { ThreatCloudDB } from './database.js';
import { createBadgeRouter, type BadgeRouter } from './badge-api.js';
import { LLMReviewer } from './llm-reviewer.js';
import { getAdminHTML } from './admin-dashboard.js';
import {
  tryValidateInput,
  ThreatDataSchema,
  RulePublishSchema,
  ATRProposalSchema,
  ATRFeedbackSchema,
  SkillThreatSchema,
  SkillWhitelistItemSchema,
} from '@panguard-ai/core';
import { z } from 'zod';
import type {
  ServerConfig,
  AnonymizedThreatData,
  ThreatCloudRule,
  ATRProposal,
  SkillThreatSubmission,
  ScanEvent,
} from './types.js';

/** Structured JSON logger for threat-cloud */
const log = {
  info: (msg: string, extra?: Record<string, unknown>) => {
    process.stdout.write(
      JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg, ...extra }) + '\n'
    );
  },
  error: (msg: string, err?: unknown, extra?: Record<string, unknown>) => {
    process.stderr.write(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        msg,
        error: err instanceof Error ? err.message : String(err),
        ...extra,
      }) + '\n'
    );
  },
};

/** Rate limiter state / 速率限制狀態 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Threat Cloud API Server
 * 威脅雲 API 伺服器
 */
export class ThreatCloudServer {
  private server: ReturnType<typeof createServer> | null = null;
  private readonly db: ThreatCloudDB;
  private readonly config: ServerConfig;
  private readonly llmReviewer: LLMReviewer | null;
  private readonly badgeRouter: BadgeRouter;
  private promotionTimer: ReturnType<typeof setInterval> | null = null;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private registrationRateLimits: Map<string, { count: number; resetAt: number }> = new Map();
  private rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null;
  private statsCache: { data: unknown; expiresAt: number } | null = null;

  /** Promotion interval: 2 minutes / 推廣間隔：2 分鐘 */
  private static readonly PROMOTION_INTERVAL_MS = 2 * 60 * 1000;
  /** Stats cache TTL: 60 seconds */
  private static readonly STATS_CACHE_TTL_MS = 60_000;

  constructor(config: ServerConfig) {
    this.config = config;
    this.db = new ThreatCloudDB(config.dbPath);
    this.llmReviewer = config.anthropicApiKey
      ? new LLMReviewer(config.anthropicApiKey, this.db)
      : null;

    // Badge API: reads ecosystem-report.csv from ATR data directory
    const badgeCsvPath =
      process.env['ATR_ECOSYSTEM_CSV'] ??
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        '..',
        '..',
        'agent-threat-rules',
        'data',
        'clawhub-scan',
        'ecosystem-report.csv'
      );
    this.badgeRouter = createBadgeRouter(badgeCsvPath);
  }

  /** Start the server / 啟動伺服器 */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        void this.handleRequest(req, res);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        log.info(`Server started on ${this.config.host}:${this.config.port}`);
        if (this.llmReviewer) {
          log.info('LLM reviewer enabled for ATR proposal review');
        }
        // Auto-seed/update rules from bundled config/ on every startup
        const stats = this.db.getStats();
        try {
          const seeded = this.seedFromBundled();
          if (seeded > 0) {
            log.info(`Rules synced: ${seeded} upserted (was ${stats.totalRules})`);
          } else {
            log.info(`Database: ${stats.totalRules} rules, ${stats.totalThreats} threats`);
          }
        } catch (err) {
          log.error('Rule seeding failed', err);
          log.info(`Database: ${stats.totalRules} rules, ${stats.totalThreats} threats`);
        }

        // Backfill classification for existing unclassified rules (one-time on startup)
        try {
          const backfilled = this.db.backfillClassification();
          if (backfilled > 0) {
            log.info(`Backfilled classification for ${backfilled} rules`);
          }
        } catch (err) {
          log.error('Classification backfill failed', err);
        }

        // Start promotion + review cron (every 15 minutes)
        this.promotionTimer = setInterval(() => {
          try {
            // Step 1: Move confirmed proposals to canary staging
            const toCanary = this.db.promoteConfirmedProposals();
            if (toCanary > 0) {
              log.info(`Promotion cycle: ${toCanary} proposal(s) moved to canary staging`);
            }

            // Step 1b: Promote canary rules that survived 24hr observation
            const canaryResult = this.db.promoteCanaryRules();
            if (canaryResult.promoted > 0 || canaryResult.quarantined > 0) {
              log.info(
                `Canary cycle: ${canaryResult.promoted} promoted, ${canaryResult.quarantined} quarantined`
              );
            }

            // Step 2: Retry LLM review for proposals that haven't been reviewed yet
            if (this.llmReviewer?.isAvailable()) {
              void this.retryPendingReviews().catch((err) => {
                log.error('Review retry failed', err);
              });
            }

            // Step 3: Purge expired verdict cache entries
            const purged = this.db.purgeExpiredVerdictCache();
            if (purged > 0) {
              log.info(`Verdict cache: purged ${purged} expired entries`);
            }
          } catch (err) {
            log.error('Promotion cycle failed', err);
          }
        }, ThreatCloudServer.PROMOTION_INTERVAL_MS);

        // Rate limiter cleanup (every 60s, purge expired entries) + telemetry aggregation
        this.rateLimitCleanupTimer = setInterval(() => {
          const now = Date.now();
          for (const [ip, entry] of this.rateLimits) {
            if (now > entry.resetAt) this.rateLimits.delete(ip);
          }
          for (const [ip, entry] of this.registrationRateLimits) {
            if (now > entry.resetAt) this.registrationRateLimits.delete(ip);
          }
          // Aggregate old telemetry events into hourly buckets
          try {
            const cleaned = this.db.cleanupTelemetryEvents();
            if (cleaned > 0) {
              log.info(`Telemetry cleanup: aggregated and deleted ${cleaned} raw events`);
            }
          } catch (err) {
            log.error('Telemetry cleanup failed', err);
          }
        }, 60_000);

        resolve();
      });
    });
  }

  /** Stop the server / 停止伺服器 */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.promotionTimer) {
        clearInterval(this.promotionTimer);
        this.promotionTimer = null;
      }
      if (this.rateLimitCleanupTimer) {
        clearInterval(this.rateLimitCleanupTimer);
        this.rateLimitCleanupTimer = null;
      }
      this.db.close();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const startTime = Date.now();
    const requestId = randomUUID();

    // Security headers + request ID
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Request-Id', requestId);

    const clientIP = req.socket.remoteAddress ?? 'unknown';

    // Rate limiting
    if (!this.checkRateLimit(clientIP)) {
      this.sendJson(res, 429, { ok: false, error: 'Rate limit exceeded', request_id: requestId });
      log.info('request', {
        method: req.method,
        path: req.url,
        status: 429,
        duration_ms: Date.now() - startTime,
        client_ip: clientIP,
        request_id: requestId,
      });
      return;
    }

    // API key verification (skip for health check)
    const url = req.url ?? '/';
    const rawPathname = url.split('?')[0] ?? '/';

    // API versioning: strip /v1 prefix for backward compatibility
    const pathname = rawPathname.startsWith('/v1/')
      ? rawPathname.slice(3)
      : rawPathname === '/v1'
        ? '/'
        : rawPathname;

    // Public endpoints that don't require API key authentication.
    // Read-only data endpoints are public. Write endpoints require auth.
    // GET /api/rules is public so Guard can pull open-source ATR rules without a key.
    const publicPaths = new Set(['/health', '/api/stats', '/api/metrics', '/api/clients/register']);
    const isPublicRead =
      publicPaths.has(pathname) || (pathname === '/api/rules' && req.method === 'GET');
    // Track the role that authenticated this request so route handlers can
    // enforce scope (e.g. L5 partner endpoints only accept role=partner|admin).
    let authRole: 'admin' | 'static' | 'client-guard' | 'client-partner' | 'anonymous' = 'anonymous';
    if (!isPublicRead && this.config.apiKeyRequired) {
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.replace('Bearer ', '');
      const isValidApiKey = this.config.apiKeys.includes(token);
      const isAdminKey = this.config.adminApiKey ? token === this.config.adminApiKey : false;
      let clientKeyInfo: { clientId: string; role: string } | null = null;
      if (!isValidApiKey && !isAdminKey && token.length > 0) {
        clientKeyInfo = this.db.getClientKeyInfo(token);
        if (clientKeyInfo) this.db.validateClientKey(token); // bump last_used_at
      }
      if (!isValidApiKey && !isAdminKey && !clientKeyInfo) {
        this.sendJson(res, 401, { ok: false, error: 'Invalid API key', request_id: requestId });
        log.info('request', {
          method: req.method,
          path: rawPathname,
          status: 401,
          duration_ms: Date.now() - startTime,
          client_ip: clientIP,
          request_id: requestId,
        });
        return;
      }
      authRole = isAdminKey
        ? 'admin'
        : isValidApiKey
          ? 'static'
          : clientKeyInfo?.role === 'partner'
            ? 'client-partner'
            : 'client-guard';
    }

    // L5 partner-sync: /api/atr-rules/live is role-gated. Only admin or
    // partner-tier client keys can reach it. Guard auto-provisioned keys
    // are scoped to telemetry upload only; they must NOT be able to exfiltrate
    // TC crystallization data.
    if (pathname === '/api/atr-rules/live' && req.method === 'GET') {
      if (authRole !== 'admin' && authRole !== 'static' && authRole !== 'client-partner') {
        this.sendJson(res, 403, {
          ok: false,
          error: 'Partner key required for L5 live-sync endpoint',
          docs: 'https://agentthreatrule.org/partner-sync',
          request_id: requestId,
        });
        log.info('request', {
          method: req.method,
          path: rawPathname,
          status: 403,
          duration_ms: Date.now() - startTime,
          client_ip: clientIP,
          request_id: requestId,
        });
        return;
      }
    }

    // CORS — restrict to known origins
    const allowedOrigins = (
      process.env['CORS_ALLOWED_ORIGINS'] ??
      'https://panguard.ai,https://www.panguard.ai,https://tc.panguard.ai,https://get.panguard.ai,https://docs.panguard.ai'
    ).split(',');
    const origin = req.headers.origin ?? '';
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      log.info('request', {
        method: 'OPTIONS',
        path: rawPathname,
        status: 204,
        duration_ms: Date.now() - startTime,
        client_ip: clientIP,
        request_id: requestId,
      });
      return;
    }

    // Store requestId on response for sendJson to include
    (res as ServerResponse & { _requestId?: string })._requestId = requestId;

    try {
      switch (pathname) {
        case '/health':
          this.sendJson(res, 200, {
            ok: true,
            data: {
              status: 'healthy',
              uptime: process.uptime(),
              schemaVersion: this.db.getSchemaVersion(),
            },
          });
          break;

        case '/admin':
          this.serveAdminDashboard(req, res);
          break;

        case '/api/threats':
          if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            this.handleGetThreats(url, res);
          } else if (req.method === 'POST') {
            await this.handlePostThreat(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/atr-rules/live':
          // L5 runtime sync — public, cacheable, partner-facing alias of /api/rules
          // scoped to confirmed ATR rules only (source IN atr, atr-community).
          // Accepts ?since=<ISO> for incremental pulls; responds with ETag +
          // Last-Modified so partners can cheap-poll every N minutes.
          if (req.method === 'GET') {
            const u = new URL(url, `http://localhost:${this.config.port}`);
            if (!u.searchParams.has('source')) {
              u.searchParams.set('source', 'atr');
            }
            this.handleGetRules(u.pathname + '?' + u.searchParams.toString(), res, req);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/rules':
          if (req.method === 'GET') {
            this.handleGetRules(url, res, req);
          } else if (req.method === 'POST') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, {
                ok: false,
                error: 'Admin API key required for rule publishing',
              });
              break;
            }
            await this.handlePostRule(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/rules/sync':
          // Admin-only: ATR repo CI syncs rules via admin key
          if (req.method === 'POST') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required for rule sync' });
              break;
            }
            await this.handleSyncATRRules(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/rules/by-source':
          // Admin-only: DELETE /api/rules/by-source?source=yara to purge rules by source
          if (req.method === 'DELETE') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            await this.handleDeleteRulesBySource(url, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/rules/bulk-delete':
          // Admin-only: POST /api/rules/bulk-delete { ruleIds: [...] }
          if (req.method === 'POST') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            await this.handleBulkDeleteRules(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/stats':
          if (req.method === 'GET') {
            this.handleGetStats(res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/atr-proposals':
          if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            this.handleGetATRProposals(url, res);
          } else if (req.method === 'POST') {
            await this.handlePostATRProposal(req, res);
          } else if (req.method === 'PATCH') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            await this.handlePatchATRProposal(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/atr-feedback':
          if (req.method === 'POST') {
            await this.handlePostATRFeedback(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/rule-feedback':
          if (req.method === 'POST') {
            await this.handlePostRuleFeedback(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/clients/register':
          if (req.method === 'POST') {
            await this.handleClientRegister(req, res, clientIP);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/admin/client-keys':
          if (!this.checkAdminAuth(req)) {
            this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
            break;
          }
          if (req.method === 'GET') {
            const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
            const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
            const offset = Math.max(0, parseInt(params.get('offset') ?? '0', 10));
            this.sendJson(res, 200, { ok: true, data: this.db.listClientKeys(limit, offset) });
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/admin/client-keys/revoke':
          if (!this.checkAdminAuth(req)) {
            this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
            break;
          }
          if (req.method === 'POST') {
            await this.handleClientKeyRevoke(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/admin/partner-keys':
          // L5 partner provisioning. Admin-only. Issues a partner-tier
          // client key that can access /api/atr-rules/live. Raw key is
          // returned exactly once — the caller must store it.
          if (!this.checkAdminAuth(req)) {
            this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
            break;
          }
          if (req.method === 'POST') {
            await this.handlePartnerKeyIssue(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/skill-threats':
          if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            this.handleGetSkillThreats(url, res);
          } else if (req.method === 'POST') {
            await this.handlePostSkillThreat(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/atr-rules':
          if (req.method === 'GET') {
            this.handleGetATRRules(url, res, req);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/feeds/ip-blocklist':
          if (req.method === 'GET') {
            this.handleGetIPBlocklist(url, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/feeds/domain-blocklist':
          if (req.method === 'GET') {
            this.handleGetDomainBlocklist(url, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/skill-whitelist':
          if (req.method === 'GET') {
            this.handleGetSkillWhitelist(url, res);
          } else if (req.method === 'POST') {
            await this.handlePostSkillWhitelist(req, res);
          } else if (req.method === 'DELETE') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            await this.handleDeleteSkillWhitelist(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/skill-whitelist/all':
          if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            const allEntries = this.db.getAllWhitelistEntries();
            this.sendJson(res, 200, { ok: true, data: allEntries });
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/skill-blacklist':
          if (req.method === 'GET') {
            this.handleGetSkillBlacklist(url, res);
          } else if (req.method === 'POST') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            await this.handlePostSkillBlacklist(req, res);
          } else if (req.method === 'DELETE') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            await this.handleDeleteSkillBlacklist(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/analyze-skills':
          if (req.method === 'POST') {
            await this.handleAnalyzeSkills(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/audit-log':
          if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            this.handleGetAuditLog(url, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/scan-events':
          if (req.method === 'POST') {
            await this.handlePostScanEvent(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/metrics':
          if (req.method === 'GET') {
            this.handleGetMetrics(res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/version':
          if (req.method === 'GET') {
            this.handleGetVersion(res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/contributors':
          if (req.method === 'GET') {
            this.handleGetContributors(res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/telemetry':
          if (req.method === 'POST') {
            await this.handlePostTelemetry(req, res);
          } else if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            const telemetryStats = this.db.getTelemetryStats();
            this.sendJson(res, 200, { ok: true, data: telemetryStats });
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/usage':
          if (req.method === 'POST') {
            await this.handlePostUsageEvent(req, res);
          } else if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            const stats = this.db.getUsageStats();
            this.sendJson(res, 200, { ok: true, data: stats });
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/activations':
          if (req.method === 'POST') {
            const body = await this.readBody(req);
            const data = JSON.parse(body) as {
              clientId?: string;
              platform?: string;
              osType?: string;
              panguardVersion?: string;
              nodeVersion?: string;
            };
            if (!data.clientId) {
              this.sendJson(res, 400, { ok: false, error: 'clientId required' });
              break;
            }
            this.db.recordActivation({
              clientId: data.clientId,
              platform: data.platform ?? 'unknown',
              osType: data.osType ?? 'unknown',
              panguardVersion: data.panguardVersion ?? 'unknown',
              nodeVersion: data.nodeVersion ?? 'unknown',
            });
            this.sendJson(res, 200, { ok: true });
          } else if (req.method === 'GET') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            const activationStats = this.db.getActivationStats();
            this.sendJson(res, 200, { ok: true, data: activationStats });
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        // ─── Org / Device / Policy endpoints (Threat Model #1, #6) ───

        case '/api/devices/heartbeat':
          // Requires API key (enforced by general auth gate above).
          // Guard sends periodic heartbeats with device metadata.
          if (req.method === 'POST') {
            await this.handleDeviceHeartbeat(req, res);
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/admin/reset-rules':
          if (req.method === 'POST') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            const deleted = this.db.clearAllRules();
            log.info(`Admin reset: cleared ${deleted} rules and proposals`);
            this.sendJson(res, 200, {
              ok: true,
              data: { deleted, message: 'All rules and proposals cleared. Re-seed required.' },
            });
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        case '/api/admin/reseed':
          if (req.method === 'POST') {
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            const seeded = this.seedFromBundled();
            log.info(`Admin reseed: ${seeded} rules upserted from bundled config`);
            this.sendJson(res, 200, {
              ok: true,
              data: { seeded, message: `${seeded} rules upserted (new + updated)` },
            });
          } else {
            this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
          }
          break;

        default: {
          // Org fleet/policy routes with path params
          // Threat Model: Fleet view (#6), Policy engine (#1, #6)
          const orgDevicesMatch = pathname.match(/^\/api\/orgs\/([^/]+)\/devices$/);
          if (orgDevicesMatch) {
            const orgId = decodeURIComponent(orgDevicesMatch[1]!);
            if (req.method === 'GET') {
              if (!this.checkAdminAuth(req)) {
                this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
                break;
              }
              const devices = this.db.getDevicesByOrg(orgId);
              const count = this.db.getDeviceCount(orgId);
              this.sendJson(res, 200, { ok: true, data: { devices, total: count } });
            } else {
              this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
            }
            break;
          }

          const orgPoliciesMatch = pathname.match(/^\/api\/orgs\/([^/]+)\/policies$/);
          if (orgPoliciesMatch) {
            const orgId = decodeURIComponent(orgPoliciesMatch[1]!);
            if (!this.checkAdminAuth(req)) {
              this.sendJson(res, 403, { ok: false, error: 'Admin API key required' });
              break;
            }
            if (req.method === 'GET') {
              const policies = this.db.getOrgPolicies(orgId);
              this.sendJson(res, 200, { ok: true, data: policies });
            } else if (req.method === 'POST') {
              const body = await this.readBody(req);
              const data = JSON.parse(body) as { category?: string; action?: string };
              if (!data.category || !data.action || !['allow', 'block'].includes(data.action)) {
                this.sendJson(res, 400, {
                  ok: false,
                  error: 'category and action (allow|block) required',
                });
                break;
              }
              this.db.setOrgPolicy(orgId, data.category, data.action as 'allow' | 'block');
              this.sendJson(res, 200, { ok: true });
            } else if (req.method === 'DELETE') {
              const body = await this.readBody(req);
              const data = JSON.parse(body) as { category?: string };
              if (!data.category) {
                this.sendJson(res, 400, { ok: false, error: 'category required' });
                break;
              }
              const deleted = this.db.deleteOrgPolicy(orgId, data.category);
              this.sendJson(res, 200, { ok: true, deleted });
            } else {
              this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
            }
            break;
          }

          // Badge API handles /api/badge/* paths with dynamic segments
          if (this.badgeRouter.handleRequest(pathname, req.method ?? 'GET', res)) {
            break;
          }
          this.sendJson(res, 404, { ok: false, error: 'Not found' });
        }
      }
    } catch (err) {
      log.error('Request failed', err, { request_id: requestId, path: rawPathname });
      this.sendJson(res, 500, { ok: false, error: 'Internal server error', request_id: requestId });
    }

    // Request logging
    log.info('request', {
      method: req.method,
      path: rawPathname,
      status: res.statusCode,
      duration_ms: Date.now() - startTime,
      client_ip: clientIP,
      request_id: requestId,
    });
  }

  /** POST /api/telemetry - Record anonymous telemetry event from CLI */
  private async handlePostTelemetry(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const data = JSON.parse(body) as {
        event?: string;
        platform?: string;
        skillCount?: number;
        findingCount?: number;
        severity?: string;
        ts?: string;
      };

      const eventType = data.event ?? 'unknown';
      const allowedEvents = [
        'scan_local',
        'scan_local_json',
        'scan_remote',
        'scan_remote_json',
        'guard_audit',
        'guard_start',
        'skill_install',
        'skill_audit',
      ];
      if (!allowedEvents.includes(eventType)) {
        this.sendJson(res, 400, {
          ok: false,
          error: `Unknown event. Allowed: ${allowedEvents.join(', ')}`,
        });
        return;
      }

      this.db.recordTelemetryEvent({
        eventType,
        platform: data.platform ?? 'unknown',
        skillCount: data.skillCount ?? 0,
        findingCount: data.findingCount ?? 0,
        severity: data.severity ?? 'LOW',
      });

      this.sendJson(res, 200, { ok: true, data: { recorded: true } });
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid request body' });
    }
  }

  /** POST /api/usage - Record usage event (scan, cli_install, etc.) */
  private async handlePostUsageEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const data = JSON.parse(body) as {
        event_type?: string;
        source?: string;
        metadata?: Record<string, unknown>;
      };
      const eventType = data.event_type ?? 'unknown';
      const source = data.source ?? 'unknown';

      // Only allow known event types
      const allowed = ['scan', 'cli_install', 'cli_setup', 'cli_scan', 'guard_start', 'page_view'];
      if (!allowed.includes(eventType)) {
        this.sendJson(res, 400, {
          ok: false,
          error: `Unknown event_type. Allowed: ${allowed.join(', ')}`,
        });
        return;
      }

      this.db.recordUsageEvent(eventType, source, data.metadata);
      this.sendJson(res, 200, { ok: true, data: { recorded: true } });
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid request body' });
    }
  }

  /** POST /api/threats - Upload anonymized threat data (single or batch) */
  private async handlePostThreat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }

    // Support both single object and batch { events: [...] } format
    const rawObj = raw as Record<string, unknown>;
    const rawEvents: unknown[] =
      'events' in rawObj && Array.isArray(rawObj['events']) ? rawObj['events'] : [raw];

    const validated: AnonymizedThreatData[] = [];
    for (const event of rawEvents) {
      const result = tryValidateInput(ThreatDataSchema, event);
      if (!result.ok) {
        this.sendJson(res, 400, { ok: false, error: result.error });
        return;
      }
      const mutable = { ...result.data };
      mutable.attackSourceIP = this.anonymizeIP(mutable.attackSourceIP);
      validated.push(mutable as unknown as AnonymizedThreatData);
    }

    for (const data of validated) {
      this.db.insertThreat(data);
    }

    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction(
      'client',
      'threat.submit',
      'threat',
      undefined,
      { count: validated.length },
      clientIP
    );

    this.sendJson(res, 201, {
      ok: true,
      data: { message: 'Threat data received', count: validated.length },
    });
  }

  /** GET /api/rules?since=<ISO>&category=<cat>&severity=<sev>&source=<src> */
  private handleGetRules(url: string, res: ServerResponse, req?: IncomingMessage): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const since = params.get('since');
    const filters = {
      category: params.get('category') ?? undefined,
      severity: params.get('severity') ?? undefined,
      source: params.get('source') ?? undefined,
    };

    // Cache for 1 hour — rules rarely change, let CDN absorb traffic
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    const rules = since
      ? this.db.getRulesSince(since, filters)
      : this.db.getAllRules(5000, filters);
    const ruleList = Array.isArray(rules) ? rules : [];

    // L5 runtime sync support: ETag + Last-Modified so partners can cheap-poll.
    // ETag = hash of (count + latest publishedAt) — cheap and changes when content does.
    // Last-Modified = max(publishedAt) in result set.
    let latestPublishedAt = '';
    for (const r of ruleList) {
      const p = typeof r.publishedAt === 'string' ? r.publishedAt : '';
      if (p > latestPublishedAt) latestPublishedAt = p;
    }
    const etag = `W/"${ruleList.length}-${latestPublishedAt}"`;
    res.setHeader('ETag', etag);
    if (latestPublishedAt) {
      try {
        res.setHeader('Last-Modified', new Date(latestPublishedAt).toUTCString());
      } catch {
        /* ignore malformed date */
      }
    }

    const ifNoneMatch = req?.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      res.writeHead(304);
      res.end();
      return;
    }

    this.sendJson(res, 200, { ok: true, data: ruleList, meta: { total: ruleList.length, etag } });
  }

  /** POST /api/rules - Publish rules (single or batch) */
  private async handlePostRule(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }

    // Support both single object and batch { rules: [...] } format
    const rawObj = raw as Record<string, unknown>;
    const rawRules: unknown[] =
      'rules' in rawObj && Array.isArray(rawObj['rules']) ? rawObj['rules'] : [raw];

    const now = new Date().toISOString();
    let count = 0;
    for (const rawRule of rawRules) {
      const result = tryValidateInput(RulePublishSchema, rawRule);
      if (!result.ok) continue;
      const ruleData = {
        ...result.data,
        publishedAt: result.data.publishedAt || now,
      } as unknown as ThreatCloudRule;
      this.db.upsertRule(ruleData);
      count++;
    }

    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction('admin', 'rule.create', 'rule', undefined, { count }, clientIP);

    this.sendJson(res, 201, { ok: true, data: { message: `${count} rule(s) published`, count } });
  }

  /**
   * POST /api/rules/sync — Admin-only endpoint for ATR repo CI to sync rules.
   * Requires admin API key. Only accepts source='atr' (community rules use POST /api/rules).
   * Body: { rules: [{ ruleId, ruleContent, source }] }. Max 200 per request.
   */
  private async handleSyncATRRules(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }

    const rawObj = raw as Record<string, unknown>;
    const rawRules: unknown[] =
      'rules' in rawObj && Array.isArray(rawObj['rules']) ? rawObj['rules'] : [raw];

    if (rawRules.length > 200) {
      this.sendJson(res, 400, { ok: false, error: 'Maximum 200 rules per sync request' });
      return;
    }

    const now = new Date().toISOString();
    let count = 0;
    let skipped = 0;
    for (const rawRule of rawRules) {
      const result = tryValidateInput(RulePublishSchema, rawRule);
      if (!result.ok) {
        skipped++;
        continue;
      }
      // Only allow source='atr' — community rules require admin key
      if (result.data.source !== 'atr') {
        skipped++;
        continue;
      }
      const ruleData = {
        ...result.data,
        publishedAt: result.data.publishedAt || now,
      } as unknown as ThreatCloudRule;
      this.db.upsertRule(ruleData);
      count++;
    }

    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction('system', 'rule.sync', 'rule', undefined, { count, skipped }, clientIP);

    this.sendJson(res, 200, {
      ok: true,
      data: { message: `${count} rule(s) synced, ${skipped} skipped`, count, skipped },
    });
  }

  /** POST /api/rules/bulk-delete — Admin-only delete by rule IDs */
  private async handleBulkDeleteRules(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }
    const rawObj = raw as Record<string, unknown>;
    const ruleIds = rawObj['ruleIds'];
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      this.sendJson(res, 400, { ok: false, error: 'Missing or empty ruleIds array' });
      return;
    }
    if (ruleIds.length > 500) {
      this.sendJson(res, 400, { ok: false, error: 'Maximum 500 rule IDs per request' });
      return;
    }
    const count = this.db.deleteRulesByIds(ruleIds as string[]);
    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction(
      'admin',
      'rule.bulk-delete',
      'rule',
      undefined,
      { count, requested: ruleIds.length },
      clientIP
    );
    this.sendJson(res, 200, { ok: true, data: { message: `Deleted ${count} rule(s)`, count } });
  }

  /** DELETE /api/rules/by-source?source=yara — Admin-only bulk purge */
  /** POST /api/devices/heartbeat — Guard sends periodic device metadata */
  private async handleDeviceHeartbeat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body) as Record<string, unknown>;
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }
    const deviceId = typeof data['deviceId'] === 'string' ? data['deviceId'].slice(0, 128) : '';
    const orgId = typeof data['orgId'] === 'string' ? data['orgId'].slice(0, 128) : '';
    if (!deviceId || !orgId) {
      this.sendJson(res, 400, { ok: false, error: 'deviceId and orgId required' });
      return;
    }
    // Auto-create org if it doesn't exist (first device creates the org)
    if (!this.db.getOrg(orgId)) {
      this.db.createOrg(orgId, orgId);
    }
    this.db.upsertDevice({
      deviceId,
      orgId,
      hostname: typeof data['hostname'] === 'string' ? data['hostname'].slice(0, 256) : undefined,
      osType: typeof data['osType'] === 'string' ? data['osType'].slice(0, 64) : undefined,
      agentCount: typeof data['agentCount'] === 'number' ? data['agentCount'] : undefined,
      guardVersion:
        typeof data['guardVersion'] === 'string' ? data['guardVersion'].slice(0, 32) : undefined,
    });
    this.sendJson(res, 200, { ok: true });
  }

  private async handleDeleteRulesBySource(url: string, res: ServerResponse): Promise<void> {
    const params = new URLSearchParams(url.split('?')[1] ?? '');
    const source = params.get('source');
    if (!source) {
      this.sendJson(res, 400, { ok: false, error: 'Missing ?source= parameter' });
      return;
    }
    // Safety: refuse to delete ATR rules via this endpoint
    if (source === 'atr' || source === 'atr-community') {
      this.sendJson(res, 400, { ok: false, error: 'Cannot purge ATR rules via this endpoint' });
      return;
    }
    const count = this.db.deleteRulesBySource(source);
    this.sendJson(res, 200, {
      ok: true,
      data: { message: `Deleted ${count} ${source} rule(s)`, count },
    });
  }

  /** GET /api/stats (cached 60s) */
  private handleGetStats(res: ServerResponse): void {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    const now = Date.now();
    if (this.statsCache && now < this.statsCache.expiresAt) {
      this.sendJson(res, 200, { ok: true, data: this.statsCache.data });
      return;
    }
    const stats = this.db.getStats();
    this.statsCache = { data: stats, expiresAt: now + ThreatCloudServer.STATS_CACHE_TTL_MS };
    this.sendJson(res, 200, { ok: true, data: stats });
  }

  /** GET /api/threats?page=1&limit=50 (admin-only, paginated) */
  private handleGetThreats(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;
    const threats = this.db.getThreats(limit, offset);
    const total = this.db.getThreatCount();
    this.sendJson(res, 200, {
      ok: true,
      data: threats,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  }

  /** GET /api/atr-proposals?status=pending (admin-only) */
  private handleGetATRProposals(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const status = params.get('status') ?? undefined;
    const proposals = this.db.getATRProposals(status);
    this.sendJson(res, 200, { ok: true, data: proposals });
  }

  /** GET /api/skill-threats?limit=50 (admin-only) */
  private handleGetSkillThreats(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const limit = Math.min(500, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
    const threats = this.db.getSkillThreats(limit);
    this.sendJson(res, 200, { ok: true, data: threats });
  }

  /** POST /api/atr-proposals - Submit or confirm an ATR rule proposal */
  private async handlePostATRProposal(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const data = await this.parseAndValidate(req, res, ATRProposalSchema);
    if (!data) return;

    const clientId = (req.headers['x-panguard-client-id'] as string) ?? undefined;

    const { patternHash, ruleContent } = data;

    // Check if a proposal with the same patternHash already exists
    const existing = this.db.getATRProposalByHash(patternHash);

    if (existing) {
      // Same client_id: idempotent, no double-counting
      if (clientId && existing.client_id === clientId) {
        this.sendJson(res, 200, {
          ok: true,
          data: {
            message: 'Already submitted',
            patternHash,
            confirmations: existing.confirmations,
          },
        });
        return;
      }
      // Different client_id: increment confirmation counter
      this.db.confirmATRProposal(patternHash);
      const updatedConfirmations = existing.confirmations + 1;
      this.sendJson(res, 200, {
        ok: true,
        data: { message: 'Proposal confirmed', patternHash, confirmations: updatedConfirmations },
      });
    } else {
      const proposal = {
        ...data,
        clientId,
      } as unknown as ATRProposal;
      this.db.insertATRProposal(proposal);

      // Fire-and-forget LLM review on first submission only
      if (this.llmReviewer?.isAvailable()) {
        void this.llmReviewer.reviewProposal(patternHash, ruleContent).catch((err) => {
          log.error(`LLM review failed for ${patternHash}`, err);
        });
      }

      this.sendJson(res, 201, {
        ok: true,
        data: { message: 'Proposal submitted', patternHash },
      });
    }
  }

  /** POST /api/atr-feedback - Submit feedback on an ATR rule */
  private async handlePostATRFeedback(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const data = await this.parseAndValidate(req, res, ATRFeedbackSchema);
    if (!data) return;

    const clientId = (req.headers['x-panguard-client-id'] as string) ?? undefined;
    this.db.insertATRFeedback(data.ruleId, data.isTruePositive, clientId);
    this.sendJson(res, 201, { ok: true, data: { message: 'Feedback received' } });
  }

  /** POST /api/rule-feedback - Submit negative feedback on a canary/active rule, auto-quarantine at threshold */
  private async handlePostRuleFeedback(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }

    const schema = z.object({
      ruleId: z.string().min(1),
      isTruePositive: z.boolean(),
    });
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      this.sendJson(res, 400, { ok: false, error: parsed.error.message });
      return;
    }

    const clientId = (req.headers['x-panguard-client-id'] as string) ?? undefined;
    this.db.insertATRFeedback(parsed.data.ruleId, parsed.data.isTruePositive, clientId);

    // Auto-quarantine canary rules with > 3 negative reports
    if (!parsed.data.isTruePositive) {
      const negCount = this.db.getNegativeFeedbackCount(parsed.data.ruleId);
      if (negCount >= 3) {
        this.db.quarantineProposal(parsed.data.ruleId);
        log.info(`Rule ${parsed.data.ruleId} auto-quarantined after ${negCount} negative reports`);
        this.sendJson(res, 201, {
          ok: true,
          data: { message: 'Feedback received, rule quarantined', quarantined: true },
        });
        return;
      }
    }

    this.sendJson(res, 201, {
      ok: true,
      data: { message: 'Feedback received', quarantined: false },
    });
  }

  /** POST /api/skill-threats - Submit skill threat from audit */
  /** POST /api/clients/register — auto-provision client API key */
  private async handleClientRegister(
    req: IncomingMessage,
    res: ServerResponse,
    clientIP: string
  ): Promise<void> {
    // Rate limit: 10 registrations per hour per IP
    const entry = this.registrationRateLimits.get(clientIP);
    const now = Date.now();
    if (entry && now < entry.resetAt) {
      if (entry.count >= 10) {
        this.sendJson(res, 429, {
          ok: false,
          error: 'Registration rate limit exceeded. Try again later.',
        });
        return;
      }
      entry.count++;
    } else {
      this.registrationRateLimits.set(clientIP, { count: 1, resetAt: now + 3_600_000 });
    }

    const body = await this.readBody(req);
    if (!body) {
      this.sendJson(res, 400, { ok: false, error: 'Request body required' });
      return;
    }
    let parsed: { clientId?: string };
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return;
    }
    const clientId = parsed.clientId;
    if (!clientId || typeof clientId !== 'string' || clientId.length < 8 || clientId.length > 128) {
      this.sendJson(res, 400, { ok: false, error: 'clientId must be a string (8-128 chars)' });
      return;
    }

    const result = this.db.registerClientKey(clientId, clientIP);

    this.db.audit.logAction(
      'system',
      'client_key.register',
      'client_key',
      clientId,
      { ip: clientIP },
      clientIP
    );

    this.sendJson(res, 201, { ok: true, data: { clientKey: result.clientKey } });
  }

  /** POST /api/admin/client-keys/revoke — revoke client keys */
  private async handleClientKeyRevoke(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    if (!body) {
      this.sendJson(res, 400, { ok: false, error: 'Request body required' });
      return;
    }
    let parsed: { clientId?: string };
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return;
    }
    if (!parsed.clientId || typeof parsed.clientId !== 'string') {
      this.sendJson(res, 400, { ok: false, error: 'clientId required' });
      return;
    }

    const revoked = this.db.revokeClientKey(parsed.clientId);
    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction(
      'admin',
      'client_key.revoke',
      'client_key',
      parsed.clientId,
      { revokedCount: revoked },
      clientIP
    );

    this.sendJson(res, 200, { ok: true, data: { revoked } });
  }

  /**
   * Admin-only: issue a partner-tier client key for L5 live-sync access.
   * Body: { partnerName: string, issuedBy?: string }
   * Returns raw key once — never retrievable again.
   */
  private async handlePartnerKeyIssue(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    if (!body) {
      this.sendJson(res, 400, { ok: false, error: 'Request body required' });
      return;
    }
    let parsed: { partnerName?: string; issuedBy?: string };
    try {
      parsed = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return;
    }
    const partnerName = typeof parsed.partnerName === 'string' ? parsed.partnerName.trim() : '';
    // Slug-like validation — no spaces, no colons (we already use `partner:` prefix internally)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(partnerName)) {
      this.sendJson(res, 400, {
        ok: false,
        error: 'partnerName must be 2-64 chars, alphanumeric + dash/underscore only',
      });
      return;
    }
    const issuedBy = typeof parsed.issuedBy === 'string' ? parsed.issuedBy.slice(0, 64) : 'admin';

    const { clientKey } = this.db.registerPartnerKey(partnerName, issuedBy);
    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction(
      'admin',
      'partner_key.issue',
      'client_key',
      `partner:${partnerName}`,
      { issuedBy },
      clientIP
    );

    // The key is returned exactly once. The caller MUST store it.
    this.sendJson(res, 201, {
      ok: true,
      data: {
        partnerName,
        clientId: `partner:${partnerName}`,
        clientKey,
        note: 'Store this key now. It will not be retrievable again. Use as `Authorization: Bearer <key>` header on /api/atr-rules/live.',
      },
    });
  }

  private async handlePostSkillThreat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const data = await this.parseAndValidate(req, res, SkillThreatSchema);
    if (!data) return;

    const clientId = (req.headers['x-panguard-client-id'] as string) ?? undefined;
    const submission: SkillThreatSubmission = {
      ...(data as unknown as SkillThreatSubmission),
      clientId,
    };
    this.db.insertSkillThreat(submission);

    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction(
      'client',
      'skill_threat.submit',
      'skill_threat',
      submission.skillHash,
      { skillName: submission.skillName, riskScore: submission.riskScore },
      clientIP
    );

    // Flywheel bridge: auto-generate ATR proposal when a skill accumulates
    // 3+ independent reports with HIGH/CRITICAL risk
    void this.maybeGenerateATRFromSkillThreats(submission.skillName).catch((err) => {
      log.error(
        `Flywheel bridge failed for ${submission.skillName}: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    this.sendJson(res, 201, { ok: true, data: { message: 'Skill threat received' } });
  }

  /**
   * Bridge skill_threats → atr_proposals when consensus is reached.
   * When 3+ independent reports exist for a skill with HIGH/CRITICAL risk,
   * auto-scaffold an ATR proposal from the aggregated findings.
   */
  private async maybeGenerateATRFromSkillThreats(skillName: string): Promise<void> {
    const agg = this.db.getSkillThreatAggregation(skillName);

    // Need 3+ reports and HIGH/CRITICAL consensus
    if (agg.reportCount < 3) return;
    if (agg.maxRiskLevel !== 'HIGH' && agg.maxRiskLevel !== 'CRITICAL') return;
    if (agg.findings.length === 0) return;

    // Check if we already generated a proposal for this skill
    const { createHash } = await import('node:crypto');
    const patternHash = createHash('sha256')
      .update(`tc-bridge:${skillName}:${agg.findings.join(';')}`)
      .digest('hex')
      .slice(0, 16);

    if (this.db.hasATRProposal(patternHash)) return;

    // Fetch actual ATR rule detection patterns that triggered on this skill.
    // This is the key input for LLM: real regex patterns, not just finding titles.
    const triggeredRules =
      agg.atrRuleIds.length > 0 ? this.db.getRuleContentByIds(agg.atrRuleIds) : [];

    // Extract detection sections from rule YAML for LLM context
    const detectionPatterns = triggeredRules.map((r) => {
      // Extract detection block from YAML
      const detMatch = r.ruleContent.match(/detection:[\s\S]*?(?=\n[a-z]|\n---|$)/);
      const titleMatch = r.ruleContent.match(/title:\s*['"]?([^'"\n]+)/);
      return {
        ruleId: r.ruleId,
        title: titleMatch?.[1]?.trim() ?? r.ruleId,
        detection: detMatch?.[0]?.trim() ?? '(detection not parseable)',
      };
    });

    if (this.llmReviewer?.isAvailable() && detectionPatterns.length > 0) {
      // Build rich context: actual attack patterns, not just finding titles
      const patternContext = detectionPatterns
        .map((p) => `### ${p.ruleId}: ${p.title}\n${p.detection}`)
        .join('\n\n');

      const toolDescriptions = [
        {
          name: skillName,
          description: `This skill was flagged ${agg.reportCount} times (avg risk: ${Math.round(agg.avgRiskScore)}) by ${agg.atrRuleIds.length} distinct ATR rules.\n\nTriggered rules and their detection patterns:\n\n${patternContext}\n\nFinding titles: ${agg.findings.join('; ')}`,
        },
      ];

      log.info(
        `Flywheel bridge: LLM generating ATR proposal for ${skillName} ` +
          `(${agg.reportCount} reports, ${agg.atrRuleIds.length} ATR rules: ${agg.atrRuleIds.join(', ')})`
      );

      void this.llmReviewer
        .analyzeSkills([{ package: skillName, tools: toolDescriptions }])
        .catch((err) => {
          log.error(
            `LLM analysis for skill bridge failed: ${err instanceof Error ? err.message : String(err)}`
          );
        });
    } else if (this.llmReviewer?.isAvailable()) {
      // LLM available but no rule patterns — pass findings as-is (legacy path)
      const toolDescriptions = agg.findings.map((f, i) => ({
        name: `finding_${i}`,
        description: f,
      }));

      log.info(
        `Flywheel bridge: LLM generating ATR proposal for ${skillName} (${agg.reportCount} reports, no rule context)`
      );

      void this.llmReviewer
        .analyzeSkills([{ package: skillName, tools: toolDescriptions }])
        .catch((err) => {
          log.error(
            `LLM analysis for skill bridge failed: ${err instanceof Error ? err.message : String(err)}`
          );
        });
    } else {
      // No LLM — add to blacklist directly, don't generate garbage rules
      log.info(
        `Flywheel bridge: no LLM available, skipping rule generation for ${skillName} ` +
          `(${agg.reportCount} reports, avg risk ${Math.round(agg.avgRiskScore)}). ` +
          `Skill is already blacklisted via threat reports.`
      );
    }
  }

  /** GET /api/atr-rules?since=<ISO> - Fetch promoted ATR rules (+ canary for 10% of clients) */
  private handleGetATRRules(url: string, res: ServerResponse, req?: IncomingMessage): void {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const since = params.get('since') ?? undefined;
    const rules = this.db.getConfirmedATRRules(since);
    const ruleList = Array.isArray(rules) ? rules : [];

    // Include canary rules for ~10% of clients based on client ID hash
    let includeCanary = false;
    if (req) {
      const clientId = req.headers['x-panguard-client-id'] as string | undefined;
      if (clientId) {
        const hash = clientId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        includeCanary = hash % 10 === 0;
      }
    }

    if (includeCanary) {
      const canaryRules = this.db.getCanaryATRRules();
      ruleList.push(...canaryRules);
    }

    this.sendJson(res, 200, {
      ok: true,
      data: ruleList,
      meta: { total: ruleList.length, includesCanary: includeCanary },
    });
  }

  /** GET /api/feeds/ip-blocklist?minReputation=70 - IP blocklist feed (plain text) */
  private handleGetIPBlocklist(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const minReputation = Number(params.get('minReputation') ?? '70');

    const ips = this.db.getIPBlocklist(minReputation);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800');
    res.writeHead(200);
    res.end(ips.join('\n'));
  }

  /** GET /api/feeds/domain-blocklist?minReputation=70 - Domain blocklist feed (plain text) */
  private handleGetDomainBlocklist(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const minReputation = Number(params.get('minReputation') ?? '70');

    const domains = this.db.getDomainBlocklist(minReputation);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800');
    res.writeHead(200);
    res.end(domains.join('\n'));
  }

  /** POST /api/skill-whitelist - Report a safe skill (audit passed) */
  private async handlePostSkillWhitelist(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }

    const rawObj = raw as Record<string, unknown>;
    const skills =
      'skills' in rawObj && Array.isArray(rawObj['skills'])
        ? (rawObj['skills'] as unknown[])
        : [raw];

    let count = 0;
    for (const skill of skills) {
      const result = SkillWhitelistItemSchema.safeParse(skill);
      if (!result.success) continue;
      this.db.reportSafeSkill(result.data.skillName, result.data.fingerprintHash);
      count++;
    }

    this.sendJson(res, 201, { ok: true, data: { message: `${count} skill(s) reported`, count } });
  }

  /** GET /api/skill-whitelist?since=ISO — Fetch community-confirmed safe skills (incremental) */
  private handleGetSkillWhitelist(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const since = params.get('since') ?? undefined;
    const whitelist = this.db.getSkillWhitelist(since);
    this.sendJson(res, 200, { ok: true, data: whitelist });
  }

  /**
   * GET /api/skill-blacklist?minReports=3&minAvgRisk=70
   * Fetch community skill blacklist (aggregated from skill threat reports)
   * 取得社群技能黑名單（從技能威脅回報聚合）
   */
  private handleGetSkillBlacklist(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const minReports = Number(params.get('minReports') ?? '3');
    const minAvgRisk = Number(params.get('minAvgRisk') ?? '70');
    const since = params.get('since') ?? undefined;

    // Shorter cache for incremental queries
    res.setHeader(
      'Cache-Control',
      since ? 'public, max-age=60' : 'public, max-age=1800, s-maxage=1800'
    );
    const blacklist = this.db.getSkillBlacklist(minReports, minAvgRisk, since);
    this.sendJson(res, 200, { ok: true, data: blacklist });
  }

  /** PATCH /api/atr-proposals - Admin approve/reject a proposal */
  private async handlePatchATRProposal(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const data = JSON.parse(body);
    const { patternHash, action } = data;

    if (!patternHash || !action) {
      this.sendJson(res, 400, { ok: false, error: 'patternHash and action required' });
      return;
    }

    if (action === 'approve') {
      const ok = this.db.approveATRProposal(patternHash);
      this.sendJson(res, ok ? 200 : 404, {
        ok,
        data: { message: ok ? 'Proposal approved and promoted' : 'Proposal not found' },
      });
    } else if (action === 'reject') {
      this.db.rejectATRProposal(patternHash);
      this.sendJson(res, 200, { ok: true, data: { message: 'Proposal rejected' } });
    } else {
      this.sendJson(res, 400, { ok: false, error: 'action must be approve or reject' });
    }
  }

  /** DELETE /api/skill-whitelist - Admin remove a skill from whitelist */
  private async handleDeleteSkillWhitelist(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    const data = JSON.parse(body);
    const { skillName } = data;
    if (!skillName) {
      this.sendJson(res, 400, { ok: false, error: 'skillName required' });
      return;
    }
    const ok = this.db.removeFromWhitelist(skillName);
    this.sendJson(res, ok ? 200 : 404, {
      ok,
      data: { message: ok ? 'Removed from whitelist' : 'Not found' },
    });
  }

  /** POST /api/skill-blacklist - Admin add a skill to blacklist */
  private async handlePostSkillBlacklist(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const data = JSON.parse(body);

    // Support bulk upload: { skills: [{ skillName, reason }] }
    if (Array.isArray(data.skills)) {
      let added = 0;
      for (const entry of data.skills) {
        if (entry.skillName) {
          this.db.addToBlacklist(entry.skillName, entry.reason || 'Bulk admin block');
          added++;
        }
      }
      this.sendJson(res, 201, { ok: true, data: { added, total: data.skills.length } });
      return;
    }

    // Single skill upload
    const { skillName, reason } = data;
    if (!skillName) {
      this.sendJson(res, 400, { ok: false, error: 'skillName required' });
      return;
    }
    this.db.addToBlacklist(skillName, reason || 'Admin manual block');
    this.sendJson(res, 201, { ok: true, data: { message: 'Added to blacklist' } });
  }

  /** DELETE /api/skill-blacklist - Admin remove a skill from blacklist */
  private async handleDeleteSkillBlacklist(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    const data = JSON.parse(body);
    const { skillHash } = data;
    if (!skillHash) {
      this.sendJson(res, 400, { ok: false, error: 'skillHash required' });
      return;
    }
    const ok = this.db.removeFromBlacklist(skillHash);
    this.sendJson(res, ok ? 200 : 404, {
      ok,
      data: { message: ok ? 'Removed from blacklist' : 'Not found' },
    });
  }

  /**
   * POST /api/analyze-skills - Submit scan results for server-side LLM analysis
   * 提交掃描結果讓伺服器端 LLM 分析語義威脅並自動產出 ATR proposals
   *
   * Body: { skills: [{ package: string, tools: [{ name, description }] }] }
   * Response: { ok: true, data: { analyzed, proposalsCreated, results } }
   */
  private async handleAnalyzeSkills(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const AnalyzeSkillsSchema = z.object({
      skills: z
        .array(
          z.object({
            package: z.string().min(1),
            tools: z.array(
              z.object({
                name: z.string().min(1),
                description: z.string(),
              })
            ),
          })
        )
        .min(1, 'skills array must not be empty')
        .max(10, 'Maximum 10 skills per request'),
    });

    const data = await this.parseAndValidate(req, res, AnalyzeSkillsSchema);
    if (!data) return;

    const { createHash } = await import('node:crypto');
    const skills = data.skills;

    // Compute content hash for each skill (deterministic: sorted tools, null-byte separated)
    const computeHash = (
      tools: ReadonlyArray<{ readonly name: string; readonly description: string }>
    ): string => {
      const canonical = [...tools]
        .map((t) => `${t.name}\n${t.description}`)
        .sort()
        .join('\0');
      return createHash('sha256').update(canonical).digest('hex');
    };

    type PerSkillResult = {
      readonly package: string;
      readonly threatsFound: boolean;
      readonly proposalCount: number;
      readonly patternHashes: readonly string[];
      readonly status: string;
      readonly cached: boolean;
      readonly rugPullDetected: boolean;
      readonly errorReason?: string;
    };

    const allResults: PerSkillResult[] = [];
    const uncachedSkills: Array<{
      package: string;
      tools: Array<{ name: string; description: string }>;
    }> = [];
    const uncachedMeta: Array<{
      contentHash: string;
      rugPull: boolean;
      previousVerdict: string | null;
    }> = [];

    log.info(`Analyzing ${skills.length} skills (checking cache + rug pull)`, {
      packages: skills.map((s) => s.package),
    });

    for (const skill of skills) {
      const contentHash = computeHash(skill.tools);
      let rugPullDetected = false;

      // ── Rug pull check: has this skill's content changed? ──
      const previousHash = this.db.getLatestSkillHash(skill.package);
      // Save old verdict BEFORE marking superseded (getLatestSkillHash won't find it after)
      const previousVerdict = previousHash?.scanVerdict ?? null;
      if (previousHash && previousHash.contentHash !== contentHash) {
        rugPullDetected = true;
        this.db.markSkillHashSuperseded(skill.package, previousHash.contentHash, contentHash);
        log.info(`[RUG PULL] Candidate: ${skill.package} hash changed`, {
          oldHash: previousHash.contentHash.slice(0, 12),
          newHash: contentHash.slice(0, 12),
        });
      }

      // ── Verdict cache check (skip if rug pull — force rescan) ──
      if (!rugPullDetected) {
        const cached = this.db.getVerdictCache(contentHash);
        if (cached) {
          let verdict: {
            threatsFound: boolean;
            proposalCount: number;
            patternHashes: string[];
            status: string;
          };
          try {
            verdict = JSON.parse(cached.verdict);
          } catch {
            // Corrupted cache entry — invalidate and fall through to LLM scan
            this.db.invalidateVerdictCache(contentHash);
            uncachedSkills.push(skill);
            uncachedMeta.push({ contentHash, rugPull: false, previousVerdict: null });
            continue;
          }
          allResults.push({
            package: skill.package,
            threatsFound: verdict.threatsFound,
            proposalCount: verdict.proposalCount,
            patternHashes: verdict.patternHashes,
            status: verdict.status,
            cached: true,
            rugPullDetected: false,
          });
          // Update last_seen in hash history
          this.db.recordSkillHash({ skillName: skill.package, contentHash });
          continue;
        }
      }

      // Cache miss or rug pull — needs LLM analysis
      uncachedSkills.push(skill);
      uncachedMeta.push({ contentHash, rugPull: rugPullDetected, previousVerdict });
    }

    // ── Run LLM analysis on uncached skills ──
    let proposalsCreated = 0;

    if (uncachedSkills.length > 0) {
      if (!this.llmReviewer?.isAvailable()) {
        // No LLM but we can still return cached results + record hashes
        for (let i = 0; i < uncachedSkills.length; i++) {
          const skill = uncachedSkills[i]!;
          const meta = uncachedMeta[i]!;
          this.db.recordSkillHash({
            skillName: skill.package,
            contentHash: meta.contentHash,
            rugPullFlag: meta.rugPull,
          });
          allResults.push({
            package: skill.package,
            threatsFound: false,
            proposalCount: 0,
            patternHashes: [],
            status: 'skipped_no_llm',
            cached: false,
            rugPullDetected: meta.rugPull,
          });
        }
      } else {
        const llmResults = await this.llmReviewer.analyzeSkills(uncachedSkills);

        for (let i = 0; i < llmResults.length; i++) {
          const r = llmResults[i]!;
          const meta = uncachedMeta[i]!;
          const verdictData = {
            threatsFound: r.threatsFound,
            proposalCount: r.proposals.length,
            patternHashes: r.proposals.map((p) => p.patternHash),
            status: r.status,
          };

          // Store in verdict cache
          this.db.insertVerdictCache({
            contentHash: meta.contentHash,
            skillName: r.package,
            verdict: JSON.stringify(verdictData),
          });

          // Record hash history
          this.db.recordSkillHash({
            skillName: r.package,
            contentHash: meta.contentHash,
            scanVerdict: JSON.stringify(verdictData),
            rugPullFlag: meta.rugPull,
          });

          // Rug pull HIGH alert: old was clean, new has threats
          if (meta.rugPull && r.threatsFound) {
            let prevClean = true;
            if (meta.previousVerdict) {
              try {
                prevClean = !(JSON.parse(meta.previousVerdict) as { threatsFound: boolean })
                  .threatsFound;
              } catch {
                /* treat as clean if unparseable */
              }
            }
            if (prevClean) {
              log.info(`[RUG PULL CONFIRMED] ${r.package} went from clean to malicious`, {
                contentHash: meta.contentHash.slice(0, 12),
              });
            }
          }

          proposalsCreated += r.proposals.length;
          allResults.push({
            package: r.package,
            threatsFound: r.threatsFound,
            proposalCount: r.proposals.length,
            patternHashes: r.proposals.map((p) => p.patternHash),
            status: r.status,
            cached: false,
            rugPullDetected: meta.rugPull,
            ...(r.errorReason ? { errorReason: r.errorReason } : {}),
          });
        }
      }
    }

    const cachedCount = allResults.filter((r) => r.cached).length;
    const rugPullCount = allResults.filter((r) => r.rugPullDetected).length;
    log.info(
      `Analysis complete: ${allResults.length} skills (${cachedCount} cached, ${rugPullCount} rug pull, ${proposalsCreated} proposals)`
    );

    this.sendJson(res, 200, {
      ok: true,
      data: {
        analyzed: allResults.length,
        proposalsCreated,
        cachedCount,
        rugPullCount,
        results: allResults,
      },
    });
  }

  /** GET /api/audit-log?page=1&limit=50 (admin-only) */
  private handleGetAuditLog(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;
    const entries = this.db.audit.getAuditLog(limit, offset);
    const total = this.db.audit.getAuditLogCount();
    this.sendJson(res, 200, {
      ok: true,
      data: entries,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  }

  /**
   * Retry LLM review for pending proposals without a verdict.
   * Called by the promotion cron every 15 minutes.
   * Rate-limited to 5 reviews per cycle to avoid API overload.
   */
  private async retryPendingReviews(): Promise<void> {
    const unreviewed = this.db.getUnreviewedProposals(5);
    if (unreviewed.length === 0) return;

    log.info(`Retrying LLM review for ${unreviewed.length} proposal(s)`);

    for (const p of unreviewed) {
      try {
        await this.llmReviewer!.reviewProposal(p.patternHash, p.ruleContent);
        // Add 2s delay between reviews to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        log.error(`Review retry failed for ${p.patternHash}`, err);
        break; // Stop retrying if we hit errors (likely rate limit)
      }
    }
  }

  /** POST /api/scan-events - Report a scan event from any source */
  private async handlePostScanEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ScanEventSchema = z.object({
      source: z.enum(['bulk-pipeline', 'cli-user', 'web-scanner']),
      skillsScanned: z.number().int().min(0),
      findingsCount: z.number().int().min(0),
      confirmedMalicious: z.number().int().min(0).default(0),
      highlySuspicious: z.number().int().min(0).default(0),
      generalSuspicious: z.number().int().min(0).default(0),
      cleanCount: z.number().int().min(0).default(0),
      deviceHash: z.string().optional(),
    });

    const data = await this.parseAndValidate(req, res, ScanEventSchema);
    if (!data) return;

    this.db.insertScanEvent(data as ScanEvent);

    const clientIP = req.socket.remoteAddress ?? 'unknown';
    this.db.audit.logAction(
      'client',
      'scan_event.submit',
      'scan_event',
      undefined,
      { source: data.source, skillsScanned: data.skillsScanned },
      clientIP
    );

    this.sendJson(res, 201, { ok: true, data: { message: 'Scan event recorded' } });
  }

  /** GET /api/metrics - Aggregated metrics across all sources (public, cached 60s) */
  private async handleGetMetrics(res: ServerResponse): Promise<void> {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    let metrics;
    try {
      metrics = this.db.getAggregatedMetrics();
    } catch (err) {
      log.error('getAggregatedMetrics failed', err);
      this.sendJson(res, 500, { ok: false, error: 'metrics query failed' });
      return;
    }

    // Fetch npm downloads (cached in statsCache to avoid hammering npm API)
    let npmDownloads = 0;
    try {
      const npmRes = await fetch(
        'https://api.npmjs.org/downloads/point/last-month/@panguard-ai/panguard',
        { signal: AbortSignal.timeout(3000) }
      );
      if (npmRes.ok) {
        const npmData = (await npmRes.json()) as { downloads?: number };
        npmDownloads = npmData.downloads ?? 0;
      }
    } catch {
      // npm API unreachable — use 0
    }

    this.sendJson(res, 200, {
      ok: true,
      data: { ...metrics, npmDownloads },
    });
  }

  /**
   * GET /api/version — public deploy verification endpoint.
   *
   * Reports the package version, server start time, uptime, Node version,
   * and (if running on Railway) the Railway deployment metadata. The
   * commit SHA is read from `RAILWAY_GIT_COMMIT_SHA` if Railway sets it,
   * or `APP_COMMIT_SHA` if the build pipeline injects it manually.
   *
   * Used by external tooling and CI to verify which commit is actually
   * running in production. Without this endpoint, deploy verification
   * relied on inspecting Railway's dashboard, which is not scriptable.
   *
   * Public, no auth, no rate-limit. Cached for 30 seconds.
   */
  private handleGetVersion(res: ServerResponse): void {
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - SERVER_START_TIME.getTime()) / 1000);
    this.sendJson(res, 200, {
      ok: true,
      data: {
        version: TC_VERSION,
        commit: process.env['RAILWAY_GIT_COMMIT_SHA'] ?? process.env['APP_COMMIT_SHA'] ?? 'unknown',
        deploymentId: process.env['RAILWAY_DEPLOYMENT_ID'] ?? 'unknown',
        environment:
          process.env['RAILWAY_ENVIRONMENT_NAME'] ?? process.env['NODE_ENV'] ?? 'unknown',
        startedAt: SERVER_START_TIME.toISOString(),
        uptimeSeconds,
        nodeVersion: process.version,
      },
    });
  }

  /** GET /api/contributors - Public leaderboard (hashed IDs, no PII) */
  private handleGetContributors(res: ServerResponse): void {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    const contributors = this.db.getContributorLeaderboard(20);
    this.sendJson(res, 200, { ok: true, data: contributors });
  }

  /** Anonymize IP by zeroing last octet / 匿名化 IP */
  private anonymizeIP(ip: string): string {
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = '0';
        return parts.join('.');
      }
    }
    // IPv6: truncate last segment
    if (ip.includes(':')) {
      const parts = ip.split(':');
      parts[parts.length - 1] = '0';
      return parts.join(':');
    }
    return ip;
  }

  /** Serve admin dashboard HTML -- requires admin auth via query param or header */
  private serveAdminDashboard(_req: IncomingMessage, res: ServerResponse): void {
    // Admin HTML is safe to serve publicly — it contains no sensitive data.
    // Authentication happens client-side: the login form collects the API key,
    // which is then sent as Authorization header on every API call.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.writeHead(200);
    res.end(getAdminHTML());
  }

  /** Check admin API key for write-protected endpoints / 檢查管理員 API 金鑰 */
  private checkAdminAuth(req: IncomingMessage): boolean {
    if (!this.config.adminApiKey) {
      // No admin key configured — only allow from loopback addresses
      const remoteAddr = req.socket.remoteAddress ?? '';
      const isLoopback =
        remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr === '::ffff:127.0.0.1';
      if (!isLoopback) {
        log.info(
          `Admin access denied: no TC_ADMIN_API_KEY configured and request from non-loopback address`,
          { remoteAddr }
        );
      }
      return isLoopback;
    }
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace('Bearer ', '');
    // Use timing-safe comparison to prevent timing attacks
    if (token.length !== this.config.adminApiKey.length) return false;
    return timingSafeEqual(
      Buffer.from(token, 'utf-8'),
      Buffer.from(this.config.adminApiKey, 'utf-8')
    );
  }

  /** Rate limit check / 速率限制檢查 */
  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(ip);
    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    entry.count++;
    return entry.count <= this.config.rateLimitPerMinute;
  }

  /**
   * Parse JSON body and validate against a Zod schema.
   * Returns validated data or null (sends 400 on failure).
   */
  private async parseAndValidate<T>(
    req: IncomingMessage,
    res: ServerResponse,
    schema: z.ZodSchema<T>
  ): Promise<T | null> {
    const body = await this.readBody(req);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      this.sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return null;
    }
    const result = tryValidateInput(schema, raw);
    if (!result.ok) {
      this.sendJson(res, 400, { ok: false, error: result.error });
      return null;
    }
    return result.data;
  }

  /** Read request body with size limit / 讀取請求主體（含大小限制） */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const MAX_BODY = 5_242_880; // 5MB (reasonable limit for JSON payloads)

      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY) {
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      req.on('error', reject);
    });
  }

  /** Send JSON response / 發送 JSON 回應 */
  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    const requestId = (res as ServerResponse & { _requestId?: string })._requestId;
    const payload =
      typeof data === 'object' && data !== null
        ? { ...(data as Record<string, unknown>), request_id: requestId }
        : data;
    res.writeHead(status);
    res.end(JSON.stringify(payload));
  }

  /**
   * Seed rules from bundled config/ directory on first startup.
   * Looks for config/ in cwd, relative to this file, or common Docker paths.
   */
  private seedFromBundled(): number {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      join(process.cwd(), 'config'),
      join(__dirname, '..', '..', '..', 'config'), // monorepo: packages/threat-cloud/dist -> config
      join(__dirname, '..', '..', '..', '..', 'config'), // deeper nesting
      '/app/config', // Docker standard
    ];
    const configDir = candidates.find((d) => {
      try {
        return statSync(d).isDirectory();
      } catch {
        return false;
      }
    });

    if (!configDir) {
      log.info(`No config/ directory found (searched: ${candidates.join(', ')})`);
      return 0;
    }

    log.info(`Using config directory: ${configDir}`);
    const now = new Date().toISOString();
    let seeded = 0;

    const collectFiles = (dir: string, extensions: string[]): string[] => {
      const results: string[] = [];
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath, extensions));
          } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
            results.push(fullPath);
          }
        }
      } catch (err: unknown) {
        log.error(`Cannot read directory ${dir}`, err);
      }
      return results;
    };

    // ATR rules
    const atrCandidates = [
      join(process.cwd(), 'node_modules', 'agent-threat-rules', 'rules'),
      join(__dirname, '..', '..', 'atr', 'rules'),
      join(__dirname, '..', '..', '..', 'packages', 'atr', 'rules'),
    ];
    const atrDir = atrCandidates.find((d) => {
      try {
        return statSync(d).isDirectory();
      } catch {
        return false;
      }
    });
    if (atrDir) {
      try {
        const files = collectFiles(atrDir, ['.yaml', '.yml']);
        for (const file of files) {
          const content = readFileSync(file, 'utf-8');
          const ruleId = `atr:${relative(atrDir, file).replace(/\//g, ':')}`;
          this.db.upsertRule({ ruleId, ruleContent: content, publishedAt: now, source: 'atr' });
          seeded++;
        }
        log.info(`  ATR: ${files.length} files`);
      } catch (err: unknown) {
        log.error('ATR seeding failed', err);
      }
    }

    return seeded;
  }
}
