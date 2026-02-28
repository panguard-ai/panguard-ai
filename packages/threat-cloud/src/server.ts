/**
 * Threat Cloud HTTP API Server
 * 威脅雲 HTTP API 伺服器
 *
 * Endpoints:
 * - POST /api/threats      Upload anonymized threat data
 * - POST /api/trap-intel   Upload trap intelligence data
 * - GET  /api/rules        Fetch rules (optional ?since= filter)
 * - POST /api/rules        Publish a new community rule
 * - GET  /api/stats        Get threat statistics
 * - GET  /api/iocs         Search/list IoCs
 * - GET  /api/iocs/:value  Lookup single IoC
 * - GET  /health           Health check
 *
 * @module @panguard-ai/threat-cloud/server
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { ThreatCloudDB } from './database.js';
import { IoCStore } from './ioc-store.js';
import { CorrelationEngine } from './correlation-engine.js';
import { QueryHandlers } from './query-handlers.js';
import { FeedDistributor } from './feed-distributor.js';
import { Scheduler } from './scheduler.js';
import type {
  ServerConfig,
  AnonymizedThreatData,
  ThreatCloudRule,
  TrapIntelligencePayload,
  IoCType,
  IoCStatus,
} from './types.js';

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
  private readonly iocStore: IoCStore;
  private readonly correlation: CorrelationEngine;
  private readonly queryHandlers: QueryHandlers;
  private readonly feedDistributor: FeedDistributor;
  private readonly scheduler: Scheduler;
  private readonly config: ServerConfig;
  private rateLimits: Map<string, RateLimitEntry> = new Map();

  constructor(config: ServerConfig) {
    this.config = config;
    this.db = new ThreatCloudDB(config.dbPath);
    const rawDb = this.db.getDB();
    this.iocStore = new IoCStore(rawDb);
    this.correlation = new CorrelationEngine(rawDb);
    this.queryHandlers = new QueryHandlers(rawDb);
    this.feedDistributor = new FeedDistributor(rawDb);
    this.scheduler = new Scheduler(rawDb);
  }

  /** Start the server / 啟動伺服器 */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        void this.handleRequest(req, res);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`Threat Cloud server started on ${this.config.host}:${this.config.port}`);
        this.scheduler.start();
        resolve();
      });
    });
  }

  /** Stop the server / 停止伺服器 */
  async stop(): Promise<void> {
    this.scheduler.stop();
    return new Promise((resolve) => {
      this.db.close();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /** Expose DB for testing / 暴露 DB 供測試使用 */
  getDB(): ThreatCloudDB {
    return this.db;
  }

  /** Expose IoC store for testing / 暴露 IoCStore 供測試使用 */
  getIoCStore(): IoCStore {
    return this.iocStore;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Type', 'application/json');

    const clientIP = req.socket.remoteAddress ?? 'unknown';

    // Rate limiting
    if (!this.checkRateLimit(clientIP)) {
      this.sendJson(res, 429, { ok: false, error: 'Rate limit exceeded' });
      return;
    }

    // API key verification (skip for health check)
    const url = req.url ?? '/';
    const pathname = url.split('?')[0] ?? '/';

    if (pathname !== '/health' && this.config.apiKeyRequired) {
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.replace('Bearer ', '');
      if (!this.config.apiKeys.includes(token)) {
        this.sendJson(res, 401, { ok: false, error: 'Invalid API key' });
        return;
      }
    }

    // CORS
    const allowedOrigins = (
      process.env['CORS_ALLOWED_ORIGINS'] ?? 'https://panguard.ai,https://www.panguard.ai'
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
      return;
    }

    try {
      // Route matching
      if (pathname === '/health') {
        this.sendJson(res, 200, {
          ok: true,
          data: { status: 'healthy', uptime: process.uptime() },
        });
        return;
      }

      if (pathname === '/api/threats' && req.method === 'POST') {
        await this.handlePostThreat(req, res);
        return;
      }

      if (pathname === '/api/trap-intel' && req.method === 'POST') {
        await this.handlePostTrapIntel(req, res);
        return;
      }

      if (pathname === '/api/rules') {
        if (req.method === 'GET') {
          this.handleGetRules(url, res);
        } else if (req.method === 'POST') {
          await this.handlePostRule(req, res);
        } else {
          this.sendJson(res, 405, { ok: false, error: 'Method not allowed' });
        }
        return;
      }

      if (pathname === '/api/stats' && req.method === 'GET') {
        this.handleGetStats(res);
        return;
      }

      // GET /api/iocs or GET /api/iocs/:value
      if (pathname === '/api/iocs' && req.method === 'GET') {
        this.handleSearchIoCs(url, res);
        return;
      }

      // /api/iocs/xxx path param routing
      if (pathname.startsWith('/api/iocs/') && req.method === 'GET') {
        const value = decodeURIComponent(pathname.slice('/api/iocs/'.length));
        this.handleLookupIoC(url, value, res);
        return;
      }

      // Campaign endpoints
      if (pathname === '/api/campaigns/stats' && req.method === 'GET') {
        this.handleCampaignStats(res);
        return;
      }
      if (pathname === '/api/campaigns' && req.method === 'GET') {
        this.handleListCampaigns(url, res);
        return;
      }
      if (pathname.startsWith('/api/campaigns/') && req.method === 'GET') {
        const id = decodeURIComponent(pathname.slice('/api/campaigns/'.length));
        this.handleGetCampaign(id, res);
        return;
      }

      // Query endpoints
      if (pathname === '/api/query/timeseries' && req.method === 'GET') {
        this.handleTimeSeries(url, res);
        return;
      }
      if (pathname === '/api/query/geo' && req.method === 'GET') {
        this.handleGeoDistribution(url, res);
        return;
      }
      if (pathname === '/api/query/trends' && req.method === 'GET') {
        this.handleTrends(url, res);
        return;
      }
      if (pathname === '/api/query/mitre-heatmap' && req.method === 'GET') {
        this.handleMitreHeatmap(url, res);
        return;
      }

      // Feed endpoints
      if (pathname === '/api/feeds/ip-blocklist' && req.method === 'GET') {
        this.handleIPBlocklist(url, res);
        return;
      }
      if (pathname === '/api/feeds/domain-blocklist' && req.method === 'GET') {
        this.handleDomainBlocklist(url, res);
        return;
      }
      if (pathname === '/api/feeds/iocs' && req.method === 'GET') {
        this.handleIoCFeed(url, res);
        return;
      }
      if (pathname === '/api/feeds/agent-update' && req.method === 'GET') {
        this.handleAgentUpdate(url, res);
        return;
      }

      this.sendJson(res, 404, { ok: false, error: 'Not found' });
    } catch (err) {
      console.error('Request error:', err);
      this.sendJson(res, 500, { ok: false, error: 'Internal server error' });
    }
  }

  // -------------------------------------------------------------------------
  // POST /api/threats - Upload anonymized threat data (enhanced: also creates IoC)
  // -------------------------------------------------------------------------
  private async handlePostThreat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const data = JSON.parse(body) as AnonymizedThreatData;

    if (
      !data.attackSourceIP ||
      !data.attackType ||
      !data.mitreTechnique ||
      !data.sigmaRuleMatched ||
      !data.timestamp ||
      !data.region
    ) {
      this.sendJson(res, 400, {
        ok: false,
        error:
          'Missing required fields: attackSourceIP, attackType, mitreTechnique, sigmaRuleMatched, timestamp, region',
      });
      return;
    }

    // Anonymize IP
    data.attackSourceIP = this.anonymizeIP(data.attackSourceIP);

    // Insert into legacy threats table (backward compat)
    this.db.insertThreat(data);

    // Insert into enriched_threats
    const enriched = ThreatCloudDB.guardToEnriched(data);
    const enrichedId = this.db.insertEnrichedThreat(enriched);

    // Extract IP as IoC
    if (data.attackSourceIP && data.attackSourceIP !== 'unknown') {
      this.iocStore.upsertIoC({
        type: 'ip',
        value: data.attackSourceIP,
        threatType: data.attackType,
        source: 'guard',
        confidence: 50,
        tags: [data.mitreTechnique],
      });
    }

    this.sendJson(res, 201, {
      ok: true,
      data: {
        message: 'Threat data received',
        enrichedId: enrichedId ?? 'duplicate',
      },
    });
  }

  // -------------------------------------------------------------------------
  // POST /api/trap-intel - Upload trap intelligence
  // -------------------------------------------------------------------------
  private async handlePostTrapIntel(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const parsed = JSON.parse(body) as TrapIntelligencePayload | TrapIntelligencePayload[];
    const items = Array.isArray(parsed) ? parsed : [parsed];

    let accepted = 0;
    let duplicates = 0;

    for (const data of items) {
      // Validate required fields
      if (!data.sourceIP || !data.attackType || !data.timestamp || !data.mitreTechniques) {
        continue;
      }

      // Anonymize IP
      data.sourceIP = this.anonymizeIP(data.sourceIP);

      // Convert and insert enriched threat
      const enriched = ThreatCloudDB.trapToEnriched(data);
      const enrichedId = this.db.insertEnrichedThreat(enriched);

      if (enrichedId !== null) {
        accepted++;

        // Insert trap credentials
        if (data.topCredentials && data.topCredentials.length > 0) {
          this.db.insertTrapCredentials(enrichedId, data.topCredentials);
        }

        // Extract IP as IoC
        if (data.sourceIP && data.sourceIP !== 'unknown') {
          const techniques = data.mitreTechniques ?? [];
          this.iocStore.upsertIoC({
            type: 'ip',
            value: data.sourceIP,
            threatType: data.attackType,
            source: 'trap',
            confidence: 60,
            tags: techniques,
            metadata: {
              serviceType: data.serviceType,
              skillLevel: data.skillLevel,
              intent: data.intent,
            },
          });
        }
      } else {
        duplicates++;
      }
    }

    this.sendJson(res, 201, {
      ok: true,
      data: { message: 'Trap intelligence received', accepted, duplicates },
    });
  }

  // -------------------------------------------------------------------------
  // GET /api/iocs - Search IoCs
  // -------------------------------------------------------------------------
  private handleSearchIoCs(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;

    const result = this.iocStore.searchIoCs(
      {
        type: (params.get('type') as IoCType) || undefined,
        source: params.get('source') || undefined,
        minReputation: params.get('minReputation') ? Number(params.get('minReputation')) : undefined,
        status: (params.get('status') as IoCStatus) || undefined,
        since: params.get('since') || undefined,
        search: params.get('search') || undefined,
      },
      {
        page: Number(params.get('page') ?? '1'),
        limit: Number(params.get('limit') ?? '50'),
      }
    );

    this.sendJson(res, 200, { ok: true, data: result });
  }

  // -------------------------------------------------------------------------
  // GET /api/iocs/:value - Lookup single IoC
  // -------------------------------------------------------------------------
  private handleLookupIoC(url: string, value: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const typeParam = params.get('type') as IoCType | null;
    const type = typeParam ?? this.iocStore.detectType(value);

    const result = this.iocStore.lookupIoCWithContext(
      type,
      value,
      (ip) => this.db.countRelatedThreats(ip)
    );

    this.sendJson(res, 200, { ok: true, data: result });
  }

  // -------------------------------------------------------------------------
  // Existing handlers / 既有處理器
  // -------------------------------------------------------------------------

  /** GET /api/rules?since=<ISO timestamp> */
  private handleGetRules(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const since = params.get('since');
    const rules = since ? this.db.getRulesSince(since) : this.db.getAllRules();
    this.sendJson(res, 200, rules);
  }

  /** POST /api/rules */
  private async handlePostRule(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const rule = JSON.parse(body) as ThreatCloudRule;

    if (!rule.ruleId || !rule.ruleContent || !rule.source) {
      this.sendJson(res, 400, {
        ok: false,
        error: 'Missing required fields: ruleId, ruleContent, source',
      });
      return;
    }

    rule.publishedAt = rule.publishedAt || new Date().toISOString();
    this.db.upsertRule(rule);
    this.sendJson(res, 201, { ok: true, data: { message: 'Rule published', ruleId: rule.ruleId } });
  }

  /** GET /api/stats (enhanced) */
  private handleGetStats(res: ServerResponse): void {
    const stats = this.queryHandlers.getEnhancedStats();
    this.sendJson(res, 200, { ok: true, data: stats });
  }

  // -------------------------------------------------------------------------
  // Campaign handlers / Campaign 處理器
  // -------------------------------------------------------------------------

  private handleListCampaigns(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const result = this.correlation.listCampaigns(
      {
        page: Number(params.get('page') ?? '1'),
        limit: Number(params.get('limit') ?? '20'),
      },
      params.get('status') || undefined
    );
    this.sendJson(res, 200, { ok: true, data: result });
  }

  private handleCampaignStats(res: ServerResponse): void {
    const stats = this.correlation.getCampaignStats();
    this.sendJson(res, 200, { ok: true, data: stats });
  }

  private handleGetCampaign(id: string, res: ServerResponse): void {
    const campaign = this.correlation.getCampaign(id);
    if (!campaign) {
      this.sendJson(res, 404, { ok: false, error: 'Campaign not found' });
      return;
    }
    const events = this.correlation.getCampaignEvents(id);
    this.sendJson(res, 200, { ok: true, data: { campaign, events } });
  }

  // -------------------------------------------------------------------------
  // Query handlers / 查詢處理器
  // -------------------------------------------------------------------------

  private handleTimeSeries(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const granularity = (params.get('granularity') as 'hour' | 'day' | 'week') || 'day';
    const result = this.queryHandlers.getTimeSeries(
      granularity,
      params.get('since') || undefined,
      params.get('attackType') || undefined
    );
    this.sendJson(res, 200, { ok: true, data: result });
  }

  private handleGeoDistribution(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const result = this.queryHandlers.getGeoDistribution(params.get('since') || undefined);
    this.sendJson(res, 200, { ok: true, data: result });
  }

  private handleTrends(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const periodDays = Number(params.get('periodDays') ?? '7');
    const result = this.queryHandlers.getTrends(periodDays);
    this.sendJson(res, 200, { ok: true, data: result });
  }

  private handleMitreHeatmap(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const result = this.queryHandlers.getMitreHeatmap(params.get('since') || undefined);
    this.sendJson(res, 200, { ok: true, data: result });
  }

  // -------------------------------------------------------------------------
  // Feed handlers / Feed 處理器
  // -------------------------------------------------------------------------

  private handleIPBlocklist(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const minRep = Number(params.get('minReputation') ?? '70');
    const blocklist = this.feedDistributor.getIPBlocklist(minRep);
    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(200);
    res.end(blocklist);
  }

  private handleDomainBlocklist(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const minRep = Number(params.get('minReputation') ?? '70');
    const blocklist = this.feedDistributor.getDomainBlocklist(minRep);
    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(200);
    res.end(blocklist);
  }

  private handleIoCFeed(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const result = this.feedDistributor.getIoCFeed(
      Number(params.get('minReputation') ?? '50'),
      Number(params.get('limit') ?? '1000'),
      params.get('since') || undefined
    );
    this.sendJson(res, 200, { ok: true, data: result });
  }

  private handleAgentUpdate(url: string, res: ServerResponse): void {
    const params = new URL(url, `http://localhost:${this.config.port}`).searchParams;
    const result = this.feedDistributor.getAgentUpdate(params.get('since') || undefined);
    this.sendJson(res, 200, { ok: true, data: result });
  }

  // -------------------------------------------------------------------------
  // Utility methods / 工具方法
  // -------------------------------------------------------------------------

  /** Anonymize IP by zeroing last octet / 匿名化 IP */
  private anonymizeIP(ip: string): string {
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = '0';
        return parts.join('.');
      }
    }
    if (ip.includes(':')) {
      const parts = ip.split(':');
      parts[parts.length - 1] = '0';
      return parts.join(':');
    }
    return ip;
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

  /** Read request body with size limit / 讀取請求主體 */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const MAX_BODY = 1_048_576; // 1MB

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
    res.writeHead(status);
    res.end(JSON.stringify(data));
  }
}
