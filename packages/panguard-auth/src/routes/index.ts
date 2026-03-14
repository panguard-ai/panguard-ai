/**
 * Auth route handler factory.
 * Creates all route handlers bound to a shared context (db, config, rate limiters, flow maps).
 * @module @panguard-ai/panguard-auth/routes
 */

import { ensureSheetHeaders } from '../google-sheets.js';
import { RateLimiter } from '../rate-limiter.js';
import type { AuthRouteConfig, RouteContext } from './shared.js';
import { createAuthRoutes } from './auth.js';
import { createOAuthRoutes } from './oauth.js';
import { createTotpRoutes } from './totp.js';
import { createAdminRoutes } from './admin.js';
import { createWaitlistRoutes } from './waitlist.js';
import { createUsageRoutes } from './usage.js';

export type { AuthRouteConfig } from './shared.js';

/**
 * Create all auth route handlers bound to a database instance.
 */
export function createAuthHandlers(config: AuthRouteConfig) {
  const { db } = config;

  // Rate limiters
  const loginLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10 });
  const registerLimiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 });
  const resetLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 });
  const waitlistLimiter = new RateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 });

  // Pending OAuth flows: state -> { codeVerifier, createdAt }
  const pendingOAuthFlows = new Map<
    string,
    { codeVerifier: string; createdAt: number; cliState?: string; cliCallback?: string }
  >();
  // Pending CLI auth flows: state -> { callbackUrl, createdAt }
  const pendingCliFlows = new Map<string, { callbackUrl: string; createdAt: number }>();
  // One-time OAuth exchange codes: code -> { sessionToken, expiresAt, createdAt }
  const oauthExchangeCodes = new Map<
    string,
    { sessionToken: string; expiresAt: string; createdAt: number }
  >();

  // Cleanup stale flows every 5 minutes
  const oauthCleanupTimer = setInterval(
    () => {
      const cutoff = Date.now() - 10 * 60 * 1000; // 10 min TTL
      for (const [state, flow] of pendingOAuthFlows) {
        if (flow.createdAt < cutoff) pendingOAuthFlows.delete(state);
      }
      for (const [state, flow] of pendingCliFlows) {
        if (flow.createdAt < cutoff) pendingCliFlows.delete(state);
      }
      const codeCutoff = Date.now() - 5 * 60 * 1000; // 5 min TTL for exchange codes
      for (const [code, data] of oauthExchangeCodes) {
        if (data.createdAt < codeCutoff) oauthExchangeCodes.delete(code);
      }
    },
    5 * 60 * 1000
  );
  if (oauthCleanupTimer.unref) oauthCleanupTimer.unref();

  const ctx: RouteContext = {
    db,
    config,
    loginLimiter,
    registerLimiter,
    resetLimiter,
    waitlistLimiter,
    pendingOAuthFlows,
    pendingCliFlows,
    oauthExchangeCodes,
  };

  // Init Google Sheets headers (best-effort, non-blocking)
  if (config.sheets) {
    ensureSheetHeaders(config.sheets).catch(() => {
      // Best-effort header initialization
    });
  }

  // Compose all handlers from sub-modules
  const authHandlers = createAuthRoutes(ctx);
  const oauthHandlers = createOAuthRoutes(ctx);
  const totpHandlers = createTotpRoutes(ctx);
  const adminHandlers = createAdminRoutes(ctx);
  const waitlistHandlers = createWaitlistRoutes(ctx);
  const usageHandlers = createUsageRoutes(ctx);

  return {
    // Waitlist
    handleWaitlistJoin: waitlistHandlers.handleWaitlistJoin,
    handleWaitlistVerify: waitlistHandlers.handleWaitlistVerify,
    handleWaitlistStats: waitlistHandlers.handleWaitlistStats,
    handleWaitlistList: waitlistHandlers.handleWaitlistList,
    // Auth
    handleRegister: authHandlers.handleRegister,
    handleLogin: authHandlers.handleLogin,
    handleLogout: authHandlers.handleLogout,
    handleMe: authHandlers.handleMe,
    handleForgotPassword: authHandlers.handleForgotPassword,
    handleResetPassword: authHandlers.handleResetPassword,
    // OAuth / CLI
    handleGoogleAuth: oauthHandlers.handleGoogleAuth,
    handleGoogleCallback: oauthHandlers.handleGoogleCallback,
    handleOAuthExchange: oauthHandlers.handleOAuthExchange,
    handleCliAuth: oauthHandlers.handleCliAuth,
    handleCliExchange: oauthHandlers.handleCliExchange,
    // Admin
    handleAdminUsers: adminHandlers.handleAdminUsers,
    handleAdminUpdateTier: adminHandlers.handleAdminUpdateTier,
    handleAdminUpdateRole: adminHandlers.handleAdminUpdateRole,
    handleAdminStats: adminHandlers.handleAdminStats,
    handleAdminWaitlistApprove: waitlistHandlers.handleAdminWaitlistApprove,
    handleAdminWaitlistReject: waitlistHandlers.handleAdminWaitlistReject,
    handleAdminDashboard: adminHandlers.handleAdminDashboard,
    handleAdminUsersSearch: adminHandlers.handleAdminUsersSearch,
    handleAdminSessions: adminHandlers.handleAdminSessions,
    handleAdminSessionRevoke: adminHandlers.handleAdminSessionRevoke,
    handleAdminActivity: adminHandlers.handleAdminActivity,
    handleAdminAuditLog: adminHandlers.handleAdminAuditLog,
    handleAdminAuditActions: adminHandlers.handleAdminAuditActions,
    handleAdminUsageOverview: adminHandlers.handleAdminUsageOverview,
    handleAdminUsageUser: adminHandlers.handleAdminUsageUser,
    handleAdminUserDetail: adminHandlers.handleAdminUserDetail,
    handleAdminUserSuspend: adminHandlers.handleAdminUserSuspend,
    handleAdminBulkAction: adminHandlers.handleAdminBulkAction,
    // GDPR
    handleDeleteAccount: authHandlers.handleDeleteAccount,
    handleExportData: authHandlers.handleExportData,
    // TOTP (2FA)
    handleTotpSetup: totpHandlers.handleTotpSetup,
    handleTotpVerify: totpHandlers.handleTotpVerify,
    handleTotpDisable: totpHandlers.handleTotpDisable,
    handleTotpStatus: totpHandlers.handleTotpStatus,
    // Usage / Quota
    handleUsageSummary: usageHandlers.handleUsageSummary,
    handleUsageLimits: usageHandlers.handleUsageLimits,
    handleUsageCheck: usageHandlers.handleUsageCheck,
    handleUsageRecord: usageHandlers.handleUsageRecord,
  };
}
