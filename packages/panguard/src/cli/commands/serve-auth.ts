/**
 * Auth, waitlist, and usage route handlers for panguard serve.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RouteContext } from './serve-types.js';

/**
 * Handle auth API routes (/api/auth/*, /api/waitlist/*, /api/usage/*).
 * Returns true if the route was handled, false otherwise.
 */
export async function handleAuthRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  pathname: string,
  ctx: RouteContext
): Promise<boolean> {
  const { handlers } = ctx;

  // ── Auth API routes ──────────────────────────────────────────

  if (pathname === '/api/auth/register') {
    await handlers.handleRegister(req, res);
    return true;
  }
  if (pathname === '/api/auth/login') {
    await handlers.handleLogin(req, res);
    return true;
  }
  if (pathname === '/api/auth/logout') {
    handlers.handleLogout(req, res);
    return true;
  }
  if (pathname === '/api/auth/me') {
    handlers.handleMe(req, res);
    return true;
  }
  if (pathname === '/api/auth/delete-account') {
    await handlers.handleDeleteAccount(req, res);
    return true;
  }
  if (pathname === '/api/auth/export-data') {
    handlers.handleExportData(req, res);
    return true;
  }
  if (pathname === '/api/auth/totp/setup') {
    handlers.handleTotpSetup(req, res);
    return true;
  }
  if (pathname === '/api/auth/totp/verify') {
    await handlers.handleTotpVerify(req, res);
    return true;
  }
  if (pathname === '/api/auth/totp/disable') {
    await handlers.handleTotpDisable(req, res);
    return true;
  }
  if (pathname === '/api/auth/totp/status') {
    handlers.handleTotpStatus(req, res);
    return true;
  }
  if (pathname === '/api/auth/forgot-password') {
    await handlers.handleForgotPassword(req, res);
    return true;
  }
  if (pathname === '/api/auth/reset-password') {
    await handlers.handleResetPassword(req, res);
    return true;
  }
  if (pathname === '/api/auth/google') {
    handlers.handleGoogleAuth(req, res);
    return true;
  }
  if (pathname.startsWith('/api/auth/google/callback')) {
    const urlObj = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
    const code = urlObj.searchParams.get('code') ?? '';
    const state = urlObj.searchParams.get('state');
    await handlers.handleGoogleCallback(req, res, code, state);
    return true;
  }
  if (pathname === '/api/auth/oauth/exchange') {
    await handlers.handleOAuthExchange(req, res);
    return true;
  }
  if (pathname === '/api/auth/cli') {
    handlers.handleCliAuth(req, res);
    return true;
  }
  if (pathname === '/api/auth/cli/exchange') {
    await handlers.handleCliExchange(req, res);
    return true;
  }

  // ── Waitlist API routes ──────────────────────────────────────

  if (pathname === '/api/waitlist/join') {
    await handlers.handleWaitlistJoin(req, res);
    return true;
  }
  if (pathname.startsWith('/api/waitlist/verify/')) {
    const token = pathname.split('/api/waitlist/verify/')[1];
    handlers.handleWaitlistVerify(req, res, token ?? '');
    return true;
  }
  if (pathname === '/api/waitlist/stats') {
    handlers.handleWaitlistStats(req, res);
    return true;
  }
  if (pathname === '/api/waitlist/list') {
    handlers.handleWaitlistList(req, res);
    return true;
  }

  // ── Usage / Quota API routes ─────────────────────────────────

  if (pathname === '/api/usage') {
    handlers.handleUsageSummary(req, res);
    return true;
  }
  if (pathname === '/api/usage/limits') {
    handlers.handleUsageLimits(req, res);
    return true;
  }
  if (pathname === '/api/usage/check') {
    await handlers.handleUsageCheck(req, res);
    return true;
  }
  if (pathname === '/api/usage/record') {
    await handlers.handleUsageRecord(req, res);
    return true;
  }

  return false;
}
