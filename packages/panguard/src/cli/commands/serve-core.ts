/**
 * Core middleware, health check, static file serving, and rule seeding
 * for panguard serve.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { c } from '@panguard-ai/core';
import { generateOpenApiSpec, generateSwaggerHtml } from '@panguard-ai/panguard-auth';
import type { ThreatCloudDBInstance } from './serve-types.js';
import { sendJson } from './serve-types.js';

// ── Security Headers & CORS Middleware ─────────────────────────

/**
 * Apply security headers and CORS to every response.
 * Returns true if the request was fully handled (OPTIONS preflight).
 */
export function applyMiddleware(req: IncomingMessage, res: ServerResponse): boolean {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
  if (process.env['NODE_ENV'] === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // CORS -- default to same-origin only; set CORS_ALLOWED_ORIGINS to allow cross-origin
  const corsEnv = process.env['CORS_ALLOWED_ORIGINS'] ?? '';
  const allowedOrigins = corsEnv ? corsEnv.split(',').map((o) => o.trim()) : [];
  const origin = req.headers.origin ?? '';
  if (allowedOrigins.includes('*') && process.env['NODE_ENV'] !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}

// ── Core Routes (health, OpenAPI, static) ──────────────────────

/**
 * Handle core routes: /health, /openapi.json, /docs/api, /admin/*.
 * Returns true if the route was handled, false otherwise.
 */
export function handleCoreRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  db: { healthCheck(): void },
  threatDb: ThreatCloudDBInstance,
  adminDir: string | undefined
): boolean {
  // OpenAPI spec (JSON)
  if (pathname === '/openapi.json') {
    const spec = generateOpenApiSpec(
      process.env['PANGUARD_BASE_URL'] ?? `http://${req.headers.host ?? 'localhost'}`
    );
    sendJson(res, 200, spec);
    return true;
  }

  // Swagger UI
  if (pathname === '/docs/api' || pathname === '/docs/api/') {
    const specUrl = '/openapi.json';
    const html = generateSwaggerHtml(specUrl);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return true;
  }

  // Health check (minimal public response -- detailed status behind /api/admin/health)
  if (pathname === '/health') {
    try {
      db.healthCheck();
      sendJson(res, 200, {
        ok: true,
        data: {
          status: 'healthy',
          uptime: Math.round(process.uptime()),
          db: 'connected',
          threatCloud: threatDb ? 'connected' : 'unavailable',
        },
      });
    } catch {
      sendJson(res, 503, {
        ok: false,
        data: { status: 'unhealthy', db: 'disconnected' },
      });
    }
    return true;
  }

  // Admin static files
  if (adminDir && pathname.startsWith('/admin')) {
    serveStaticFile(req, res, adminDir, pathname);
    return true;
  }

  return false;
}

// ── Static File Serving ────────────────────────────────────────

function serveStaticFile(
  _req: IncomingMessage,
  res: ServerResponse,
  adminDir: string,
  pathname: string
): void {
  // Map /admin -> /admin/index.html
  const resolvedAdminDir = resolve(adminDir);
  let filePath: string;
  if (pathname === '/admin' || pathname === '/admin/') {
    filePath = join(resolvedAdminDir, 'index.html');
  } else {
    // Strip /admin prefix and leading slash
    const relativePath = pathname.slice('/admin'.length).replace(/^\//, '');
    filePath = join(resolvedAdminDir, relativePath);

    // If no extension, try .html
    if (!relativePath.includes('.')) {
      filePath = join(resolvedAdminDir, relativePath + '.html');
      if (!existsSync(filePath)) {
        filePath = join(resolvedAdminDir, relativePath, 'index.html');
      }
    }
  }

  // Prevent path traversal: resolved path must be within admin directory
  if (!filePath.startsWith(resolvedAdminDir)) {
    sendJson(res, 403, { ok: false, error: 'Forbidden' });
    return;
  }

  if (!existsSync(filePath)) {
    sendJson(res, 404, { ok: false, error: 'Not found' });
    return;
  }

  const ext = filePath.split('.').pop() ?? '';
  const mimeTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
  };

  const contentType = mimeTypes[ext] ?? 'application/octet-stream';
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
}

// ── Rule Seeding ───────────────────────────────────────────────

/**
 * Seed rules from bundled config/ directory into Threat Cloud DB.
 * Reads Sigma YAML, YARA, and ATR YAML files.
 * Returns count of rules seeded.
 */
export async function seedRulesFromBundled(threatDb: ThreatCloudDBInstance): Promise<number> {
  let seeded = 0;
  const now = new Date().toISOString();

  // Resolve config directory (Docker: /app/config, monorepo: ../../config)
  const configDirs = [
    join(process.cwd(), 'config'),
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', 'config'),
  ];
  const configDir = configDirs.find((d) => {
    try {
      return statSync(d).isDirectory();
    } catch {
      return false;
    }
  });

  if (!configDir) {
    console.log(`  ${c.dim('  No config/ directory found -- skipping rule seeding')}`);
    console.log(`  ${c.dim(`  Searched: ${configDirs.join(', ')}`)}`);
    return 0;
  }

  console.log(`  ${c.dim(`  Using config directory: ${configDir}`)}`);

  /** Recursively collect files matching extensions */
  function collectFiles(dir: string, extensions: string[]): string[] {
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
      console.error(
        `  [WARN] Cannot read directory ${dir}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    return results;
  }

  // 1. Sigma rules (.yml, .yaml)
  const sigmaDir = join(configDir, 'sigma-rules');
  try {
    const sigmaFiles = collectFiles(sigmaDir, ['.yml', '.yaml']);
    for (const file of sigmaFiles) {
      const content = readFileSync(file, 'utf-8');
      const ruleId = `sigma:${relative(sigmaDir, file).replace(/\//g, ':')}`;
      threatDb.upsertRule({ ruleId, ruleContent: content, publishedAt: now, source: 'sigma' });
      seeded++;
    }
    console.log(`  ${c.dim(`  Sigma: ${sigmaFiles.length} files processed`)}`);
  } catch (err: unknown) {
    console.error(
      `  [WARN] Sigma rule seeding failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 2. YARA rules (.yar, .yara)
  const yaraDir = join(configDir, 'yara-rules');
  try {
    const yaraFiles = collectFiles(yaraDir, ['.yar', '.yara']);
    for (const file of yaraFiles) {
      const content = readFileSync(file, 'utf-8');
      // Split multi-rule YARA files
      const ruleMatches = content.match(/rule\s+\w+/g);
      if (ruleMatches && ruleMatches.length > 1) {
        // Multi-rule file: store each rule name as sub-ID
        for (const match of ruleMatches) {
          const ruleName = match.replace('rule ', '');
          const ruleId = `yara:${basename(file, '.yar').replace('.yara', '')}:${ruleName}`;
          threatDb.upsertRule({ ruleId, ruleContent: content, publishedAt: now, source: 'yara' });
          seeded++;
        }
      } else {
        const ruleId = `yara:${relative(yaraDir, file).replace(/\//g, ':')}`;
        threatDb.upsertRule({ ruleId, ruleContent: content, publishedAt: now, source: 'yara' });
        seeded++;
      }
    }
    console.log(`  ${c.dim(`  YARA: ${yaraFiles.length} files processed`)}`);
  } catch (err: unknown) {
    console.error(
      `  [WARN] YARA rule seeding failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 3. ATR rules (.yaml, .yml) from atr package
  const atrDirs = [
    join(process.cwd(), 'node_modules', 'agent-threat-rules', 'rules'),
    join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      '..',
      '..',
      'packages',
      'atr',
      'rules'
    ),
  ];
  const atrDir = atrDirs.find((d) => {
    try {
      return statSync(d).isDirectory();
    } catch {
      return false;
    }
  });
  if (atrDir) {
    try {
      const atrFiles = collectFiles(atrDir, ['.yaml', '.yml']);
      for (const file of atrFiles) {
        const content = readFileSync(file, 'utf-8');
        const ruleId = `atr:${relative(atrDir, file).replace(/\//g, ':')}`;
        threatDb.upsertRule({ ruleId, ruleContent: content, publishedAt: now, source: 'atr' });
        seeded++;
      }
      console.log(`  ${c.dim(`  ATR: ${atrFiles.length} files processed`)}`);
    } catch (err: unknown) {
      console.error(
        `  [WARN] ATR rule seeding failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return seeded;
}
