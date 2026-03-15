/**
 * Threat Cloud route handlers for panguard serve.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteContext } from './serve-types.js';
import {
  sendJson,
  readRequestBody,
  requireTCWriteAuth,
  requireTCAdminAuth,
  requireJsonContentType,
  checkTCRateLimit,
} from './serve-types.js';

/** Threat Cloud rate-limited endpoint paths */
const TC_RATE_LIMITED_PATHS = new Set([
  '/api/threats',
  '/api/rules',
  '/api/stats',
  '/api/atr-proposals',
  '/api/atr-feedback',
  '/api/skill-threats',
  '/api/atr-rules',
  '/api/yara-rules',
  '/api/feeds/ip-blocklist',
  '/api/feeds/domain-blocklist',
]);

/**
 * Handle Threat Cloud API routes (/api/threats, /api/rules, /api/stats, etc.).
 * Returns true if the route was handled, false otherwise.
 */
export async function handleTCRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  pathname: string,
  ctx: RouteContext
): Promise<boolean> {
  const { threatDb, llmReviewer, db } = ctx;

  // Only handle TC paths when threatDb is available and path is a TC endpoint
  if (!threatDb || !pathname.startsWith('/api/')) return false;

  // Rate limiting for known TC endpoints
  if (TC_RATE_LIMITED_PATHS.has(pathname)) {
    const clientIP = req.socket.remoteAddress ?? 'unknown';
    if (!checkTCRateLimit(clientIP)) {
      sendJson(res, 429, { ok: false, error: 'Rate limit exceeded. Try again later.' });
      return true;
    }
  }

  // POST /api/threats - Upload anonymized threat data
  if (pathname === '/api/threats' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const body = await readRequestBody(req);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return true;
    }
    if (
      !data['attackSourceIP'] ||
      !data['attackType'] ||
      !data['mitreTechnique'] ||
      !data['sigmaRuleMatched'] ||
      !data['timestamp'] ||
      !data['region']
    ) {
      sendJson(res, 400, { ok: false, error: 'Missing required fields' });
      return true;
    }
    // Anonymize IP (zero last octet)
    const ip = String(data['attackSourceIP']);
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = '0';
        data['attackSourceIP'] = parts.join('.');
      }
    }
    threatDb.insertThreat(data);
    sendJson(res, 201, { ok: true, data: { message: 'Threat data received' } });
    return true;
  }

  // GET /api/rules - Fetch rules (optional ?since= filter, paginated)
  if (pathname === '/api/rules' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const since = urlObj.searchParams.get('since');
    // Validate since parameter format (ISO 8601)
    if (since && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(since)) {
      sendJson(res, 400, { ok: false, error: 'Invalid since parameter: must be ISO 8601' });
      return true;
    }
    const rawLimit = parseInt(urlObj.searchParams.get('limit') ?? '1000', 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 1000 : Math.min(rawLimit, 5000);
    const rules = since ? threatDb.getRulesSince(since) : threatDb.getAllRules(limit);
    sendJson(res, 200, { ok: true, data: rules });
    return true;
  }

  // POST /api/rules - Publish a new community rule
  if (pathname === '/api/rules' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const body = await readRequestBody(req);
    let rule: Record<string, unknown>;
    try {
      rule = JSON.parse(body) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return true;
    }
    if (!rule['ruleId'] || !rule['ruleContent'] || !rule['source']) {
      sendJson(res, 400, {
        ok: false,
        error: 'Missing required fields: ruleId, ruleContent, source',
      });
      return true;
    }
    // Field-level size limits
    if (String(rule['ruleContent']).length > 65_536) {
      sendJson(res, 400, { ok: false, error: 'ruleContent exceeds maximum size of 64KB' });
      return true;
    }
    if (String(rule['ruleId']).length > 256) {
      sendJson(res, 400, { ok: false, error: 'ruleId exceeds maximum length of 256' });
      return true;
    }
    rule['publishedAt'] = rule['publishedAt'] || new Date().toISOString();
    threatDb.upsertRule(rule);
    sendJson(res, 201, { ok: true, data: { message: 'Rule published', ruleId: rule['ruleId'] } });
    return true;
  }

  // GET /api/stats - Threat statistics
  if (pathname === '/api/stats' && req.method === 'GET') {
    const stats = threatDb.getStats();
    sendJson(res, 200, { ok: true, data: stats });
    return true;
  }

  // POST /api/atr-proposals - Submit ATR rule proposal
  if (pathname === '/api/atr-proposals' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const body = await readRequestBody(req);
    let proposal: Record<string, unknown>;
    try {
      proposal = JSON.parse(body) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return true;
    }
    if (
      !proposal['patternHash'] ||
      !proposal['ruleContent'] ||
      !proposal['llmProvider'] ||
      !proposal['llmModel'] ||
      !proposal['selfReviewVerdict']
    ) {
      sendJson(res, 400, { ok: false, error: 'Missing required fields' });
      return true;
    }
    // Validate and sanitize client ID
    const rawClientId = req.headers['x-panguard-client-id'];
    const clientId =
      typeof rawClientId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(rawClientId)
        ? rawClientId
        : null;
    proposal['clientId'] = clientId;

    // Check if this pattern already has a proposal - if so, increment confirmation
    const pHash = String(proposal['patternHash']);
    const existing = threatDb
      .getATRProposals()
      .find((p: Record<string, unknown>) => p['pattern_hash'] === pHash);
    if (existing) {
      threatDb.confirmATRProposal(pHash);
      sendJson(res, 200, {
        ok: true,
        data: { message: 'Confirmation recorded', patternHash: pHash },
      });
    } else {
      threatDb.insertATRProposal(proposal);
      // Fire-and-forget LLM review on first submission
      if (llmReviewer?.isAvailable()) {
        void llmReviewer
          .reviewProposal(pHash, String(proposal['ruleContent']))
          .catch((err: unknown) => {
            console.error(`LLM review error for ${pHash}:`, err);
          });
      }
      sendJson(res, 201, {
        ok: true,
        data: { message: 'Proposal submitted', patternHash: pHash },
      });
    }
    return true;
  }

  // GET /api/atr-proposals - List proposals (admin-only)
  if (pathname === '/api/atr-proposals' && req.method === 'GET') {
    if (!requireTCAdminAuth(req, res, db)) return true;
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const status = urlObj.searchParams.get('status') ?? undefined;
    const proposals = threatDb.getATRProposals(status);
    sendJson(res, 200, { ok: true, data: proposals });
    return true;
  }

  // POST /api/atr-feedback - Report ATR rule match feedback
  if (pathname === '/api/atr-feedback' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const body = await readRequestBody(req);
    let feedback: Record<string, unknown>;
    try {
      feedback = JSON.parse(body) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return true;
    }
    if (!feedback['ruleId'] || typeof feedback['isTruePositive'] !== 'boolean') {
      sendJson(res, 400, {
        ok: false,
        error: 'Missing or invalid fields: ruleId (string), isTruePositive (boolean)',
      });
      return true;
    }
    const rawCid = req.headers['x-panguard-client-id'];
    const cid =
      typeof rawCid === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(rawCid) ? rawCid : null;
    threatDb.insertATRFeedback(
      String(feedback['ruleId']),
      feedback['isTruePositive'] as boolean,
      cid
    );
    sendJson(res, 201, { ok: true, data: { message: 'Feedback recorded' } });
    return true;
  }

  // POST /api/skill-threats - Submit skill audit result
  if (pathname === '/api/skill-threats' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const body = await readRequestBody(req);
    let submission: Record<string, unknown>;
    try {
      submission = JSON.parse(body) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return true;
    }
    const VALID_RISK_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    if (!submission['skillHash'] || !submission['skillName']) {
      sendJson(res, 400, { ok: false, error: 'Missing required fields: skillHash, skillName' });
      return true;
    }
    const riskScore = submission['riskScore'];
    if (
      typeof riskScore !== 'number' ||
      !isFinite(riskScore) ||
      riskScore < 0 ||
      riskScore > 100
    ) {
      sendJson(res, 400, { ok: false, error: 'riskScore must be a number between 0 and 100' });
      return true;
    }
    if (!VALID_RISK_LEVELS.has(String(submission['riskLevel']))) {
      sendJson(res, 400, {
        ok: false,
        error: 'riskLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL',
      });
      return true;
    }
    const rawCid2 = req.headers['x-panguard-client-id'];
    submission['clientId'] =
      typeof rawCid2 === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(rawCid2) ? rawCid2 : null;
    threatDb.insertSkillThreat(submission);
    sendJson(res, 201, { ok: true, data: { message: 'Skill threat recorded' } });
    return true;
  }

  // GET /api/skill-threats - List skill threats (admin-only)
  if (pathname === '/api/skill-threats' && req.method === 'GET') {
    if (!requireTCAdminAuth(req, res, db)) return true;
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const rawLimit = parseInt(urlObj.searchParams.get('limit') ?? '50', 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 500);
    const threats = threatDb.getSkillThreats(limit);
    sendJson(res, 200, { ok: true, data: threats });
    return true;
  }

  // GET /api/atr-rules - Fetch confirmed ATR rules (for Guard sync)
  if (pathname === '/api/atr-rules' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const since = urlObj.searchParams.get('since') ?? undefined;
    const rules = threatDb.getConfirmedATRRules(since);
    sendJson(res, 200, { ok: true, data: rules });
    return true;
  }

  // GET /api/yara-rules - Fetch YARA rules (for Guard sync)
  if (pathname === '/api/yara-rules' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const since = urlObj.searchParams.get('since') ?? undefined;
    const rules = threatDb.getRulesBySource('yara', since);
    sendJson(res, 200, { ok: true, data: rules });
    return true;
  }

  // GET /api/feeds/ip-blocklist - IP blocklist feed (plain text)
  if (pathname === '/api/feeds/ip-blocklist' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const minReputation = Number(urlObj.searchParams.get('minReputation') ?? '70');
    const ips = threatDb.getIPBlocklist(minReputation);
    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(200);
    res.end(ips.join('\n'));
    return true;
  }

  // GET /api/feeds/domain-blocklist - Domain blocklist feed (plain text)
  if (pathname === '/api/feeds/domain-blocklist' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const minReputation = Number(urlObj.searchParams.get('minReputation') ?? '70');
    const domains = threatDb.getDomainBlocklist(minReputation);
    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(200);
    res.end(domains.join('\n'));
    return true;
  }

  // POST /api/skill-whitelist - Report safe skill (audit passed)
  if (pathname === '/api/skill-whitelist' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const body = await readRequestBody(req);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return true;
    }

    const skills =
      'skills' in data && Array.isArray(data['skills'])
        ? (data['skills'] as Array<Record<string, unknown>>)
        : [data];

    let count = 0;
    for (const skill of skills) {
      const name = skill['skillName'];
      if (!name || typeof name !== 'string') continue;
      threatDb.reportSafeSkill(
        name,
        typeof skill['fingerprintHash'] === 'string' ? skill['fingerprintHash'] : undefined
      );
      count++;
    }
    sendJson(res, 201, { ok: true, data: { message: `${count} skill(s) reported`, count } });
    return true;
  }

  // GET /api/skill-whitelist - Fetch community whitelist
  if (pathname === '/api/skill-whitelist' && req.method === 'GET') {
    const whitelist = threatDb.getSkillWhitelist();
    sendJson(res, 200, { ok: true, data: whitelist });
    return true;
  }

  return false;
}
