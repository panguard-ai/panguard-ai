/**
 * panguard serve - Unified HTTP server gateway
 *
 * Serves auth API, admin API, admin dashboard UI, and health check.
 * Route handling is delegated to focused sub-modules:
 *   serve-core.ts  -- middleware, health, static files, rule seeding
 *   serve-auth.ts  -- auth, waitlist, usage routes
 *   serve-admin.ts -- admin dashboard + manager proxy routes
 *   serve-tc.ts    -- Threat Cloud API routes
 *   serve-types.ts -- shared types and utilities
 */

import { Command } from 'commander';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { c, banner } from '@panguard-ai/core';
import { PANGUARD_VERSION } from '../../index.js';
import {
  AuthDB,
  createAuthHandlers,
  sendExpirationWarningEmail,
  initErrorTracking,
  captureRequestError,
  ManagerProxy,
} from '@panguard-ai/panguard-auth';
import type {
  AuthRouteConfig,
  EmailConfig,
  GoogleOAuthConfig,
  GoogleSheetsConfig,
} from '@panguard-ai/panguard-auth';
// Dynamic import — manager is an optional dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ManagerConfig = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ManagerServer: (new (config: ManagerConfig) => any) | null = null;
let DEFAULT_MANAGER_CONFIG: ManagerConfig = {};
try {
  const mod = await import('@panguard-ai/manager' as string);
  ManagerServer = mod.ManagerServer;
  DEFAULT_MANAGER_CONFIG = mod.DEFAULT_MANAGER_CONFIG;
} catch {
  // manager is optional — serve command will work without it
}

import type { ThreatCloudDBInstance, LLMReviewerInstance, RouteContext } from './serve-types.js';
import { sendJson } from './serve-types.js';
import { applyMiddleware, handleCoreRoutes, seedRulesFromBundled } from './serve-core.js';
import { handleAuthRoutes } from './serve-auth.js';
import { handleAdminRoutes } from './serve-admin.js';
import { handleTCRoutes } from './serve-tc.js';

export function serveCommand(): Command {
  return new Command('serve')
    .description('Start unified HTTP server / 啟動統一 HTTP 伺服器')
    .option('--port <port>', 'Port number', '3000')
    .option('--host <host>', 'Host to bind', '127.0.0.1')
    .option('--db <path>', 'Database path', join(homedir(), '.panguard', 'auth.db'))
    .option('--manager-port <port>', 'Manager server port / Manager 伺服器埠', '8443')
    .action(async (options: { port: string; host: string; db: string; managerPort: string }) => {
      const port = parseInt(options.port, 10);
      const host = options.host;

      console.log(banner(PANGUARD_VERSION));
      console.log(`  ${c.sage('Panguard Serve')} - Unified Server Gateway`);
      console.log('');

      // Startup environment validation
      const isProd = process.env['NODE_ENV'] === 'production';
      const errors: string[] = [];
      const warnings: string[] = [];

      // Critical in production
      if (isProd && !process.env['PANGUARD_BASE_URL']) {
        errors.push('PANGUARD_BASE_URL not set in production — OAuth and email links will break');
      }
      if (isProd && !process.env['CORS_ALLOWED_ORIGINS']) {
        errors.push(
          'CORS_ALLOWED_ORIGINS not set in production — API will reject cross-origin requests'
        );
      }

      // Warnings (non-fatal)
      if (!process.env['PANGUARD_BASE_URL']) {
        warnings.push('PANGUARD_BASE_URL not set — OAuth callbacks will use localhost');
      }
      if (!process.env['GOOGLE_CLIENT_ID']) {
        warnings.push('GOOGLE_CLIENT_ID not set — Google OAuth login disabled');
      }
      if (!process.env['RESEND_API_KEY'] && !process.env['SMTP_HOST']) {
        warnings.push(
          'No email config (RESEND_API_KEY or SMTP_HOST) — password reset and waitlist emails disabled'
        );
      }
      if (!process.env['SENTRY_DSN']) {
        warnings.push('SENTRY_DSN not set — error tracking disabled');
      }
      if (isProd && !process.env['MANAGER_AUTH_TOKEN']) {
        errors.push(
          'MANAGER_AUTH_TOKEN not set in production — Manager API would allow unauthenticated access'
        );
      }
      if (!isProd && !process.env['MANAGER_AUTH_TOKEN']) {
        warnings.push(
          'MANAGER_AUTH_TOKEN not set — Manager API allows unauthenticated access (OK for dev)'
        );
      }
      if (!process.env['TC_API_KEY']) {
        warnings.push(
          'TC_API_KEY not set — Threat Cloud write API disabled in production, open in dev'
        );
      }

      if (errors.length > 0) {
        console.error(`  ${c.critical('FATAL — Missing required environment variables:')}`);
        for (const e of errors) {
          console.error(`    ${c.critical('x')} ${e}`);
        }
        console.error('');
        console.error(`  Set the variables above and restart. Aborting.`);
        process.exit(1);
      }

      if (warnings.length > 0) {
        console.log(`  ${c.caution('Environment warnings:')}`);
        for (const w of warnings) {
          console.log(`    ${c.dim('-')} ${w}`);
        }
        console.log('');
      }

      // Initialize error tracking (Sentry if configured, console fallback)
      await initErrorTracking();

      // Initialize database
      const db = new AuthDB(options.db);

      // Initialize Threat Cloud database (optional -- graceful if unavailable)
      let threatDb: ThreatCloudDBInstance = null;
      try {
        const tcMod = '@panguard-ai/threat-cloud';
        const tc = await import(/* webpackIgnore: true */ tcMod);
        const threatDbPath = join(dirname(options.db), 'threat-cloud.db');
        threatDb = new tc.ThreatCloudDB(threatDbPath);
        console.log(`  ${c.safe('Threat Cloud DB')} initialized at ${c.dim(threatDbPath)}`);

        // Auto-seed rules on first startup if rules table is empty
        const stats = threatDb.getStats();
        if (stats.totalRules === 0) {
          console.log(`  ${c.sage('Seeding rules...')} (first startup detected)`);
          const seeded = await seedRulesFromBundled(threatDb);
          console.log(`  ${c.safe(`Seeded ${seeded} rules`)} into Threat Cloud DB`);
        } else {
          console.log(
            `  ${c.dim(`Threat Cloud: ${stats.totalRules} rules, ${stats.totalThreats} threats`)}`
          );
        }
        console.log('');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  [ERROR] Threat Cloud initialization failed: ${msg}`);
        if (err instanceof Error && err.stack) {
          console.error(`  ${err.stack}`);
        }
        console.log(`  ${c.dim('Threat Cloud API routes disabled due to error above')}`);
        console.log('');
      }

      // Initialize LLM Reviewer for ATR proposals (optional -- needs ANTHROPIC_API_KEY)
      let llmReviewer: LLMReviewerInstance = null;
      if (threatDb && process.env['ANTHROPIC_API_KEY']) {
        try {
          const tcMod = '@panguard-ai/threat-cloud';
          const tc = await import(/* webpackIgnore: true */ tcMod);
          llmReviewer = new tc.LLMReviewer(process.env['ANTHROPIC_API_KEY'], threatDb);
          console.log(`  ${c.safe('LLM Reviewer')} enabled for ATR proposal review`);
        } catch {
          console.log(`  ${c.dim('LLM Reviewer not available')}`);
        }
      }

      // Promotion cron: every 15 minutes, promote confirmed + LLM-approved proposals to rules
      let promotionTimer: ReturnType<typeof setInterval> | null = null;
      if (threatDb) {
        promotionTimer = setInterval(
          () => {
            try {
              const promoted = threatDb.promoteConfirmedProposals();
              if (promoted > 0) {
                console.log(`  [Promotion] ${promoted} proposal(s) promoted to rules`);
              }
            } catch (err: unknown) {
              console.error(
                `  [Promotion] Error: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          },
          15 * 60 * 1000
        );
      }

      // Periodic database backup (every 6 hours)
      let backupTimer: ReturnType<typeof setInterval> | null = null;
      if (threatDb) {
        try {
          const tcMod2 = '@panguard-ai/threat-cloud';
          const tc2 = await import(/* webpackIgnore: true */ tcMod2);
          const backupDir = join(dirname(options.db), 'backups');
          const threatBackup = new tc2.BackupManager(
            join(dirname(options.db), 'threat-cloud.db'),
            backupDir,
            7
          );
          const authBackup = new tc2.BackupManager(options.db, backupDir, 7);

          const runBackups = () => {
            try {
              const r1 = threatBackup.backup();
              const r2 = authBackup.backup();
              console.log(
                `  [Backup] threat-cloud.db (${tc2.BackupManager.formatSize(r1.sizeBytes)}), auth.db (${tc2.BackupManager.formatSize(r2.sizeBytes)})`
              );
            } catch (err: unknown) {
              console.error(
                `  [Backup] Failed: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          };

          // Initial backup on startup
          runBackups();

          // Every 6 hours
          backupTimer = setInterval(runBackups, 6 * 60 * 60 * 1000);
          if (backupTimer.unref) backupTimer.unref();
        } catch {
          console.log(`  ${c.dim('Backup manager not available — auto-backups disabled')}`);
        }
      }

      // Build config from environment
      // Prefer Resend API when RESEND_API_KEY is set; fall back to raw SMTP
      const emailConfig: EmailConfig | undefined = process.env['RESEND_API_KEY']
        ? {
            apiKey: process.env['RESEND_API_KEY'],
            from:
              process.env['RESEND_FROM'] ??
              process.env['SMTP_FROM'] ??
              'Panguard AI <noreply@panguard.ai>',
          }
        : process.env['SMTP_HOST']
          ? {
              host: process.env['SMTP_HOST'],
              port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
              secure: process.env['SMTP_SECURE'] === 'true',
              from: process.env['SMTP_FROM'] ?? 'noreply@panguard.ai',
              auth: {
                user: process.env['SMTP_USER'] ?? '',
                pass: process.env['SMTP_PASS'] ?? '',
              },
            }
          : undefined;

      const google: GoogleOAuthConfig | undefined = process.env['GOOGLE_CLIENT_ID']
        ? {
            clientId: process.env['GOOGLE_CLIENT_ID'],
            clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
            redirectUri:
              process.env['GOOGLE_REDIRECT_URI'] ??
              `http://${host}:${port}/api/auth/google/callback`,
          }
        : undefined;

      const sheets: GoogleSheetsConfig | undefined = process.env['GOOGLE_SHEETS_ID']
        ? {
            spreadsheetId: process.env['GOOGLE_SHEETS_ID'],
            serviceAccountEmail: process.env['GOOGLE_SHEETS_SA_EMAIL'] ?? '',
            privateKey: process.env['GOOGLE_SHEETS_PRIVATE_KEY'] ?? '',
          }
        : undefined;

      const baseUrl = process.env['PANGUARD_BASE_URL'] ?? `http://${host}:${port}`;

      const authConfig: AuthRouteConfig = {
        db,
        smtp: emailConfig,
        baseUrl,
        google,
        sheets,
      };
      const handlers = createAuthHandlers(authConfig);

      // Initialize Manager proxy for agent/event admin API routes
      const managerProxy = new ManagerProxy(
        process.env['MANAGER_URL'],
        process.env['MANAGER_AUTH_TOKEN']
      );

      // Resolve admin static directory
      const thisDir = dirname(fileURLToPath(import.meta.url));
      const adminDirs = [
        join(process.cwd(), 'packages', 'admin'),
        join(thisDir, '..', '..', '..', '..', 'admin'),
      ];
      const adminDir = adminDirs.find((d) => existsSync(d));

      // Build shared route context (immutable after creation)
      const routeCtx: RouteContext = {
        handlers,
        db,
        adminDir,
        managerProxy,
        threatDb,
        llmReviewer,
      };

      const server = createServer((req, res) => {
        void handleRequest(req, res, routeCtx);
      });

      // Build Manager config from environment
      const managerPort = parseInt(options.managerPort, 10);
      const managerConfig: ManagerConfig = {
        ...DEFAULT_MANAGER_CONFIG,
        port: managerPort,
        authToken: process.env['MANAGER_AUTH_TOKEN'] ?? '',
      };
      if (!ManagerServer) {
        console.error('  Manager module not installed. Run: npm install @panguard-ai/manager');
        process.exitCode = 1;
        return;
      }
      const managerServer = new ManagerServer(managerConfig);

      server.listen(port, host, () => {
        console.log(`  ${c.safe('Server started')} on ${c.bold(`http://${host}:${port}`)}`);
        console.log('');
        console.log(`  Routes:`);
        console.log(`    ${c.dim('/api/auth/*')}     Auth API`);
        console.log(`    ${c.dim('/api/admin/*')}    Admin API`);
        console.log(`    ${c.dim('/api/usage/*')}    Usage & Quota API`);
        if (adminDir) {
          console.log(`    ${c.dim('/admin')}          Admin Dashboard`);
        } else {
          console.log(
            `    ${c.dim('/admin')}          ${c.caution('Not found')} (packages/admin/ missing)`
          );
        }
        console.log(`    ${c.dim('/docs/api')}        API Documentation (Swagger UI)`);
        console.log(`    ${c.dim('/openapi.json')}    OpenAPI 3.0 Spec`);
        console.log(`    ${c.dim('/health')}         Health check`);
        console.log(`    ${c.dim('/api/manager/*')}  Manager API (port ${managerPort})`);
        if (threatDb) {
          console.log(`    ${c.dim('/api/threats')}     Threat Cloud API (POST)`);
          console.log(`    ${c.dim('/api/rules')}       Rule Distribution (GET/POST)`);
          console.log(`    ${c.dim('/api/stats')}       Threat Statistics (GET)`);
        }
        console.log('');
        console.log(`  Services:`);
        console.log(
          `    Email:   ${emailConfig ? ('apiKey' in emailConfig ? c.safe('Resend API') : c.safe('SMTP')) : c.caution('Not configured')}`
        );
        console.log(`    OAuth:   ${google ? c.safe('Google') : c.dim('Not configured')}`);
        console.log(`    Sheets:  ${sheets ? c.safe('Google Sheets') : c.dim('Not configured')}`);
        console.log(
          `    Manager: ${c.safe(`port ${managerPort}`)}${process.env['MANAGER_AUTH_TOKEN'] ? '' : c.dim(' (no auth)')}`
        );
        console.log('');

        // Start Manager server after auth server is listening
        managerServer
          .start()
          .then(() => {
            console.log(
              `  ${c.safe('Manager server started')} on ${c.bold(`http://${host}:${managerPort}`)}`
            );
            console.log('');
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            console.log(`  ${c.caution('Manager server failed to start:')} ${message}`);
            console.log(`  ${c.dim('Auth server continues running without Manager')}`);
            console.log('');
          });
      });

      // Subscription lifecycle: check expired plans hourly
      const runPlanCheck = () => {
        const expired = db.checkExpiredPlans();
        if (expired.length > 0) {
          console.log(`  [Plan] Downgraded ${expired.length} expired plan(s) to community tier`);
        }

        // Send warning emails for plans expiring in 3 days
        if (emailConfig) {
          const expiring = db.getExpiringPlans(3);
          for (const user of expiring) {
            sendExpirationWarningEmail(
              emailConfig,
              user.email,
              user.name,
              user.tier,
              user.planExpiresAt,
              baseUrl
            ).catch(() => {
              // Best-effort email delivery
            });
          }
          if (expiring.length > 0) {
            console.log(`  [Plan] Sent ${expiring.length} expiration warning email(s)`);
          }
        }
      };

      // Run immediately on startup, then every hour
      runPlanCheck();
      const planCheckTimer = setInterval(runPlanCheck, 60 * 60 * 1000);
      if (planCheckTimer.unref) planCheckTimer.unref();

      // Graceful shutdown
      const shutdown = () => {
        console.log('\n  Shutting down...');
        clearInterval(planCheckTimer);
        if (backupTimer) clearInterval(backupTimer);
        if (promotionTimer) clearInterval(promotionTimer);
        managerServer.stop().catch(() => {});
        server.close(() => {
          db.close();
          if (threatDb) threatDb.close();
          process.exit(0);
        });
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });
}

// ── Request Router ─────────────────────────────────────────────

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const url = req.url ?? '/';
  const pathname = url.split('?')[0] ?? '/';

  // Apply security headers and CORS; handle OPTIONS preflight
  if (applyMiddleware(req, res)) return;

  try {
    // Core routes: health, OpenAPI, static files
    if (handleCoreRoutes(req, res, pathname, ctx.db, ctx.threatDb, ctx.adminDir)) return;

    // Threat Cloud API routes (rate-limited, auth-gated)
    if (await handleTCRoutes(req, res, url, pathname, ctx)) return;

    // Auth, waitlist, and usage routes
    if (await handleAuthRoutes(req, res, url, pathname, ctx)) return;

    // Admin and Manager proxy routes
    if (await handleAdminRoutes(req, res, url, pathname, ctx)) return;

    sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    captureRequestError(err, req.method ?? 'UNKNOWN', pathname);
    sendJson(res, 500, { ok: false, error: 'Internal server error' });
  }
}
