#!/usr/bin/env node
/**
 * fix-next-cjs-launcher.mjs — postbuild patch for Vercel + Next.js 16 +
 * ESM-flavored package.json combo.
 *
 * Why: packages/website/package.json declares `"type": "module"` so source
 * files and dev scripts that use top-level `import` / `import.meta.url`
 * (e.g. scripts/generate-llms-full.ts) work without being renamed to .mjs.
 *
 * But Vercel's serverless launcher (___next_launcher.cjs) is CommonJS and
 * calls `require('.../api/health/route.js')` at cold start. CommonJS
 * `require()` of a .js file under a `"type": "module"` package throws
 * ERR_REQUIRE_ESM — which is exactly what was making every panguard.ai
 * route return 500 on Vercel runtime (2026-05-27).
 *
 * Fix: drop a `.next/server/package.json` with `"type": "commonjs"` after
 * `next build`. Node's package-scope resolution walks up from each route.js
 * and picks the nearest package.json — so .next/server/** routes are
 * treated as CJS without changing the outer package's type. Source
 * compilation, dev scripts, and Next's own ESM internals are unaffected.
 *
 * See:
 *   - https://nodejs.org/api/packages.html#determining-module-system
 *   - https://github.com/vercel/next.js/discussions/<TBD on Next 16 ESM>
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const targets = ['.next/server', '.next/standalone/packages/website/.next/server'];
const overlay = JSON.stringify({ type: 'commonjs' });

for (const dir of targets) {
  if (!existsSync(dir)) continue;
  const pkgPath = join(dir, 'package.json');
  writeFileSync(pkgPath, overlay + '\n');
  // eslint-disable-next-line no-console
  console.log(`[fix-next-cjs-launcher] wrote ${pkgPath}`);
}
