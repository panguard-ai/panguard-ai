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
 * Original strategy: drop a single `.next/server/package.json` with
 * `{"type":"commonjs"}` and rely on Node's package-scope walk. That worked
 * in `next build` locally but did NOT survive Vercel's serverless function
 * packaging — the override at `.next/server/` got stripped from the
 * `/var/task/packages/website/.next/server/` deploy bundle, so the runtime
 * walked all the way up to the outer `packages/website/package.json` and
 * found `"type": "module"` again.
 *
 * Current strategy (2026-05-29): walk every directory under .next/server/
 * and drop a `{"type":"commonjs"}` override in EACH. Even if Vercel strips
 * the top-level one during bundling, the per-route overrides land inside
 * the function's own file tree (route.js sits in the same folder as its
 * own override) and Node finds them on the very first step of the walk.
 *
 * Bundle bloat: each override is ~20 bytes. With ~300 route directories
 * the total is ~6 KB across the whole `.next/server/` tree — negligible.
 *
 * See:
 *   - https://nodejs.org/api/packages.html#determining-module-system
 *   - https://github.com/vercel/next.js/discussions/<TBD on Next 16 ESM>
 *
 * @module fix-next-cjs-launcher
 */

import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OVERLAY = JSON.stringify({ type: 'commonjs' });
const ROOTS = ['.next/server', '.next/standalone/packages/website/.next/server'];

/** Recursively walk a directory and drop a package.json override in each. */
function dropOverrides(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const pkgPath = join(dir, 'package.json');
  writeFileSync(pkgPath, OVERLAY + '\n');
  count += 1;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return count;
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      count += dropOverrides(full);
    }
  }
  return count;
}

let total = 0;
for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  const n = dropOverrides(root);
  total += n;
  // eslint-disable-next-line no-console
  console.log(`[fix-next-cjs-launcher] wrote ${n} package.json overrides under ${root}`);
}

if (total === 0) {
  // eslint-disable-next-line no-console
  console.warn(
    '[fix-next-cjs-launcher] no .next/server/ directory found — skipped (was `next build` run?)'
  );
}
