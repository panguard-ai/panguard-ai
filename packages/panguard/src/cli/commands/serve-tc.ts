/**
 * Threat Cloud route handlers for panguard serve.
 * Uses centralized Zod schemas from @panguard-ai/core for input validation.
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
import {
  tryValidateInput,
  ClientIdSchema,
  ISODateSchema,
  PaginationLimitSchema,
  ReputationSchema,
  ThreatDataSchema,
  RulePublishSchema,
  ATRProposalSchema,
  ATRFeedbackSchema,
  SkillThreatSchema,
  SkillWhitelistItemSchema,
} from '@panguard-ai/core';
import type { z } from 'zod';

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
 * Parse JSON body and validate against a Zod schema.
 * Sends 400 response on failure and returns null.
 */
async function parseAndValidate<T>(
  req: IncomingMessage,
  res: ServerResponse,
  schema: z.ZodSchema<T>
): Promise<T | null> {
  const body = await readRequestBody(req);
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
    return null;
  }
  const result = tryValidateInput(schema, raw);
  if (!result.ok) {
    sendJson(res, 400, { ok: false, error: result.error });
    return null;
  }
  return result.data;
}

/**
 * Extract and validate the x-panguard-client-id header.
 * Returns the client ID string or null if invalid/missing.
 */
function extractClientId(req: IncomingMessage): string | null {
  const raw = req.headers['x-panguard-client-id'];
  if (typeof raw !== 'string') return null;
  const result = ClientIdSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Parse URL search params with standard helpers.
 */
function parseUrl(url: string, host: string | undefined): URL {
  return new URL(url, `http://${host ?? 'localhost'}`);
}

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
    const data = await parseAndValidate(req, res, ThreatDataSchema);
    if (!data) return true;

    // Anonymize IP (zero last octet)
    const mutableData: Record<string, unknown> = { ...data };
    const ip = data.attackSourceIP;
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = '0';
        mutableData['attackSourceIP'] = parts.join('.');
      }
    }
    threatDb.insertThreat(mutableData);
    sendJson(res, 201, { ok: true, data: { message: 'Threat data received' } });
    return true;
  }

  // GET /api/rules - Fetch rules (optional ?since= filter, paginated)
  if (pathname === '/api/rules' && req.method === 'GET') {
    const urlObj = parseUrl(url, req.headers.host);
    const rawSince = urlObj.searchParams.get('since');
    if (rawSince) {
      const sinceResult = ISODateSchema.safeParse(rawSince);
      if (!sinceResult.success) {
        sendJson(res, 400, { ok: false, error: 'Invalid since parameter: must be ISO 8601' });
        return true;
      }
    }
    const limit = PaginationLimitSchema.parse(urlObj.searchParams.get('limit') ?? '1000');
    const rules = rawSince ? threatDb.getRulesSince(rawSince) : threatDb.getAllRules(limit);
    sendJson(res, 200, { ok: true, data: rules });
    return true;
  }

  // POST /api/rules - Publish a new community rule
  if (pathname === '/api/rules' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const rule = await parseAndValidate(req, res, RulePublishSchema);
    if (!rule) return true;

    const ruleData: Record<string, unknown> = {
      ...rule,
      publishedAt: rule.publishedAt || new Date().toISOString(),
    };
    threatDb.upsertRule(ruleData);
    sendJson(res, 201, { ok: true, data: { message: 'Rule published', ruleId: rule.ruleId } });
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
    const proposal = await parseAndValidate(req, res, ATRProposalSchema);
    if (!proposal) return true;

    const clientId = extractClientId(req);
    const proposalData: Record<string, unknown> = { ...proposal, clientId };
    const pHash = proposal.patternHash;

    // Check if this pattern already has a proposal - if so, increment confirmation
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
      threatDb.insertATRProposal(proposalData);
      // Fire-and-forget LLM review on first submission
      if (llmReviewer?.isAvailable()) {
        void llmReviewer.reviewProposal(pHash, proposal.ruleContent).catch((err: unknown) => {
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
    const urlObj = parseUrl(url, req.headers.host);
    const status = urlObj.searchParams.get('status') ?? undefined;
    const proposals = threatDb.getATRProposals(status);
    sendJson(res, 200, { ok: true, data: proposals });
    return true;
  }

  // POST /api/atr-feedback - Report ATR rule match feedback
  if (pathname === '/api/atr-feedback' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const feedback = await parseAndValidate(req, res, ATRFeedbackSchema);
    if (!feedback) return true;

    const cid = extractClientId(req);
    threatDb.insertATRFeedback(feedback.ruleId, feedback.isTruePositive, cid);
    sendJson(res, 201, { ok: true, data: { message: 'Feedback recorded' } });
    return true;
  }

  // POST /api/skill-threats - Submit skill audit result
  if (pathname === '/api/skill-threats' && req.method === 'POST') {
    if (!requireTCWriteAuth(req, res)) return true;
    if (!requireJsonContentType(req, res)) return true;
    const submission = await parseAndValidate(req, res, SkillThreatSchema);
    if (!submission) return true;

    const cid = extractClientId(req);
    const submissionData: Record<string, unknown> = { ...submission, clientId: cid };
    threatDb.insertSkillThreat(submissionData);
    sendJson(res, 201, { ok: true, data: { message: 'Skill threat recorded' } });
    return true;
  }

  // GET /api/skill-threats - List skill threats (admin-only)
  if (pathname === '/api/skill-threats' && req.method === 'GET') {
    if (!requireTCAdminAuth(req, res, db)) return true;
    const urlObj = parseUrl(url, req.headers.host);
    const limit = PaginationLimitSchema.parse(urlObj.searchParams.get('limit') ?? '50');
    const threats = threatDb.getSkillThreats(Math.min(limit, 500));
    sendJson(res, 200, { ok: true, data: threats });
    return true;
  }

  // GET /api/atr-rules - Fetch confirmed ATR rules (for Guard sync)
  if (pathname === '/api/atr-rules' && req.method === 'GET') {
    const urlObj = parseUrl(url, req.headers.host);
    const since = urlObj.searchParams.get('since') ?? undefined;
    const rules = threatDb.getConfirmedATRRules(since);
    sendJson(res, 200, { ok: true, data: rules });
    return true;
  }

  // GET /api/yara-rules - Fetch YARA rules (for Guard sync)
  if (pathname === '/api/yara-rules' && req.method === 'GET') {
    const urlObj = parseUrl(url, req.headers.host);
    const since = urlObj.searchParams.get('since') ?? undefined;
    const rules = threatDb.getRulesBySource('yara', since);
    sendJson(res, 200, { ok: true, data: rules });
    return true;
  }

  // GET /api/feeds/ip-blocklist - IP blocklist feed (plain text)
  if (pathname === '/api/feeds/ip-blocklist' && req.method === 'GET') {
    const urlObj = parseUrl(url, req.headers.host);
    const minReputation = ReputationSchema.parse(urlObj.searchParams.get('minReputation') ?? '70');
    const ips = threatDb.getIPBlocklist(minReputation);
    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(200);
    res.end(ips.join('\n'));
    return true;
  }

  // GET /api/feeds/domain-blocklist - Domain blocklist feed (plain text)
  if (pathname === '/api/feeds/domain-blocklist' && req.method === 'GET') {
    const urlObj = parseUrl(url, req.headers.host);
    const minReputation = ReputationSchema.parse(urlObj.searchParams.get('minReputation') ?? '70');
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
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
      return true;
    }

    const data = raw as Record<string, unknown>;
    const skills =
      'skills' in data && Array.isArray(data['skills']) ? (data['skills'] as unknown[]) : [data];

    let count = 0;
    for (const skill of skills) {
      const result = SkillWhitelistItemSchema.safeParse(skill);
      if (!result.success) continue;
      threatDb.reportSafeSkill(result.data.skillName, result.data.fingerprintHash);
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
