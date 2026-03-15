/**
 * Admin and Manager proxy route handlers for panguard serve.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteContext } from './serve-types.js';
import { sendJson } from './serve-types.js';

/**
 * Handle admin API routes (/api/admin/*, /api/manager/*).
 * Returns true if the route was handled, false otherwise.
 */
export async function handleAdminRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  pathname: string,
  ctx: RouteContext
): Promise<boolean> {
  const { handlers, managerProxy, threatDb } = ctx;

  // ── Admin API routes ─────────────────────────────────────────

  if (pathname === '/api/admin/dashboard') {
    handlers.handleAdminDashboard(req, res);
    return true;
  }
  if (pathname === '/api/admin/users/search') {
    handlers.handleAdminUsersSearch(req, res);
    return true;
  }
  if (pathname === '/api/admin/users') {
    handlers.handleAdminUsers(req, res);
    return true;
  }
  if (pathname === '/api/admin/stats') {
    handlers.handleAdminStats(req, res);
    return true;
  }
  if (pathname === '/api/admin/sessions') {
    if (req.method === 'GET') {
      handlers.handleAdminSessions(req, res);
    } else {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    }
    return true;
  }
  if (pathname === '/api/admin/activity') {
    handlers.handleAdminActivity(req, res);
    return true;
  }
  if (pathname === '/api/admin/audit/actions') {
    handlers.handleAdminAuditActions(req, res);
    return true;
  }
  if (pathname === '/api/admin/audit') {
    handlers.handleAdminAuditLog(req, res);
    return true;
  }
  if (pathname === '/api/admin/usage') {
    handlers.handleAdminUsageOverview(req, res);
    return true;
  }
  if (pathname === '/api/admin/users/bulk-action') {
    await handlers.handleAdminBulkAction(req, res);
    return true;
  }

  // /api/admin/sessions/:id (DELETE)
  const sessionRevokeMatch = pathname.match(/^\/api\/admin\/sessions\/(\d+)$/);
  if (sessionRevokeMatch) {
    handlers.handleAdminSessionRevoke(req, res, sessionRevokeMatch[1]!);
    return true;
  }

  // /api/admin/users/:id/tier
  const tierMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/tier$/);
  if (tierMatch) {
    await handlers.handleAdminUpdateTier(req, res, tierMatch[1]!);
    return true;
  }

  // /api/admin/users/:id/role
  const roleMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/role$/);
  if (roleMatch) {
    await handlers.handleAdminUpdateRole(req, res, roleMatch[1]!);
    return true;
  }

  // /api/admin/waitlist/:id/approve
  const approveMatch = pathname.match(/^\/api\/admin\/waitlist\/(\d+)\/approve$/);
  if (approveMatch) {
    await handlers.handleAdminWaitlistApprove(req, res, approveMatch[1]!);
    return true;
  }

  // /api/admin/waitlist/:id/reject
  const rejectMatch = pathname.match(/^\/api\/admin\/waitlist\/(\d+)\/reject$/);
  if (rejectMatch) {
    await handlers.handleAdminWaitlistReject(req, res, rejectMatch[1]!);
    return true;
  }

  // /api/admin/users/:id/suspend
  const suspendMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/suspend$/);
  if (suspendMatch) {
    await handlers.handleAdminUserSuspend(req, res, suspendMatch[1]!);
    return true;
  }

  // /api/admin/usage/:userId
  const usageUserMatch = pathname.match(/^\/api\/admin\/usage\/(\d+)$/);
  if (usageUserMatch) {
    handlers.handleAdminUsageUser(req, res, usageUserMatch[1]!);
    return true;
  }

  // /api/admin/users/:id (GET -- user detail)
  const userDetailMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (userDetailMatch && req.method === 'GET') {
    handlers.handleAdminUserDetail(req, res, userDetailMatch[1]!);
    return true;
  }

  // /api/admin/settings (GET -- environment config status)
  if (pathname === '/api/admin/settings' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      data: {
        oauth: {
          google: !!process.env['GOOGLE_CLIENT_ID'],
        },
        email: {
          resend: !!process.env['RESEND_API_KEY'],
          smtp: !!process.env['SMTP_HOST'],
        },
        security: {
          totpEnabled: true,
        },
        threatCloud: {
          endpoint: process.env['THREAT_CLOUD_ENDPOINT'] || null,
          apiKey: !!process.env['TC_API_KEY'],
        },
        notifications: {
          telegram: !!process.env['TELEGRAM_BOT_TOKEN'],
          slack: !!process.env['SLACK_WEBHOOK_URL'],
          email: !!process.env['RESEND_API_KEY'] || !!process.env['SMTP_HOST'],
        },
        manager: {
          key: !!process.env['PANGUARD_MANAGER_KEY'],
          corsOrigins: process.env['MANAGER_CORS_ORIGINS'] || '',
        },
      },
    });
    return true;
  }

  // Detailed health (admin-only) -- includes memory, services, threat stats
  if (pathname === '/api/admin/health' && req.method === 'GET') {
    const mem = process.memoryUsage();
    const services = {
      email: !!(process.env['RESEND_API_KEY'] || process.env['SMTP_HOST']),
      oauth: !!process.env['GOOGLE_CLIENT_ID'],
      errorTracking: !!process.env['SENTRY_DSN'],
      threatCloud: !!threatDb,
      tcApiKey: !!process.env['TC_API_KEY'],
    };
    let threatStats = null;
    if (threatDb) {
      try {
        const s = threatDb.getStats();
        threatStats = { rules: s.totalRules, threats: s.totalThreats };
      } catch {
        /* ignore */
      }
    }
    sendJson(res, 200, {
      ok: true,
      data: {
        status: 'healthy',
        version: process.env['npm_package_version'] ?? '0.0.0',
        uptime: Math.round(process.uptime()),
        db: 'connected',
        threatStats,
        memory: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        },
        services,
      },
    });
    return true;
  }

  // ── Manager Proxy Routes ─────────────────────────────────────

  if (pathname === '/api/manager/api/overview' && req.method === 'GET') {
    const result = await managerProxy.getOverview();
    if (result.ok) {
      sendJson(res, 200, result.data);
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  if (pathname === '/api/manager/api/agents' && req.method === 'GET') {
    const result = await managerProxy.getAgents();
    if (result.ok) {
      sendJson(res, 200, result.data);
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  const managerAgentMatch = pathname.match(/^\/api\/manager\/api\/agents\/([^/]+)$/);
  if (managerAgentMatch && req.method === 'GET') {
    const result = await managerProxy.getAgent(managerAgentMatch[1]!);
    if (result.ok) {
      sendJson(res, 200, result.data);
    } else {
      const status = result.error === 'Manager service unavailable' ? 503 : 404;
      sendJson(res, status, { ok: false, error: result.error });
    }
    return true;
  }

  if (pathname === '/api/manager/api/events' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const limit = parseInt(urlObj.searchParams.get('limit') ?? '50', 10) || 50;
    const offset = parseInt(urlObj.searchParams.get('offset') ?? '0', 10) || 0;
    const since = urlObj.searchParams.get('since') ?? undefined;

    const result = await managerProxy.getEvents({ limit, offset, since });
    if (result.ok) {
      sendJson(res, 200, result.data);
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  if (pathname === '/api/manager/api/threats/summary' && req.method === 'GET') {
    const result = await managerProxy.getThreatSummary();
    if (result.ok) {
      sendJson(res, 200, result.data);
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  if (pathname === '/api/manager/api/threats' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const since = urlObj.searchParams.get('since') ?? undefined;

    const result = await managerProxy.getEvents({ since });
    if (result.ok) {
      sendJson(res, 200, result.data);
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  // ── Additional Admin Proxy Routes (without /api/manager prefix) ──

  if (pathname === '/api/admin/agents' && req.method === 'GET') {
    const result = await managerProxy.getAgents();
    if (result.ok) {
      sendJson(res, 200, { ok: true, data: result.data });
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  const adminAgentMatch = pathname.match(/^\/api\/admin\/agents\/([^/]+)$/);
  if (adminAgentMatch && req.method === 'GET') {
    const result = await managerProxy.getAgent(adminAgentMatch[1]!);
    if (result.ok) {
      sendJson(res, 200, { ok: true, data: result.data });
    } else {
      const status = result.error === 'Manager service unavailable' ? 503 : 404;
      sendJson(res, status, { ok: false, error: result.error });
    }
    return true;
  }

  if (pathname === '/api/admin/events' && req.method === 'GET') {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const limit = parseInt(urlObj.searchParams.get('limit') ?? '50', 10) || 50;
    const offset = parseInt(urlObj.searchParams.get('offset') ?? '0', 10) || 0;
    const since = urlObj.searchParams.get('since') ?? undefined;

    const result = await managerProxy.getEvents({ limit, offset, since });
    if (result.ok) {
      sendJson(res, 200, { ok: true, data: result.data });
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  if (pathname === '/api/admin/threats' && req.method === 'GET') {
    const result = await managerProxy.getThreatSummary();
    if (result.ok) {
      sendJson(res, 200, { ok: true, data: result.data });
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  if (pathname === '/api/admin/overview' && req.method === 'GET') {
    const result = await managerProxy.getOverview();
    if (result.ok) {
      sendJson(res, 200, { ok: true, data: result.data });
    } else {
      sendJson(res, 503, { ok: false, error: result.error });
    }
    return true;
  }

  return false;
}
