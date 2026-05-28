#!/usr/bin/env node
/**
 * fix-next-cjs-launcher.mjs — postbuild patch for Vercel + Next.js 16 +
 * ESM-flavored package.json combo.
 *
 * The runtime problem: packages/website/package.json declares "type": "module"
 * so the source tree and dev scripts that use top-level `import` /
 * `import.meta.url` (e.g. scripts/generate-llms-full.mts) work without per-file
 * extension hacks. But Vercel's Next.js launcher (___next_launcher.cjs) is
 * CommonJS and `require()`s the compiled route files at
 * `/var/task/packages/website/.next/server/app/api/.../route.js`. CommonJS
 * require() of a .js whose nearest parent package.json says "type": "module"
 * throws ERR_REQUIRE_ESM — even though the compiled output is pure CJS code
 * (`require(...)`, `module.exports`). The classifier is the package.json type
 * field, not the syntax in the file.
 *
 * Strategies tried and discarded:
 *   1. Single `.next/server/package.json` with {"type":"commonjs"} — Vercel's
 *      function bundler strips it from the deployed bundle.
 *   2. Recursive overrides in every directory under `.next/server/` — also
 *      stripped (verified 2026-05-28 via runtime logs after deploy
 *      `evp2foo0p`: same ERR_REQUIRE_ESM walking up to packages/website/
 *      package.json).
 *   3. Flipping the source package.json to "type": "commonjs" — breaks
 *      next build because src/ files, tailwind.config.ts, middleware.ts,
 *      navigation.ts all use ESM syntax (Turbopack reports the mismatch).
 *
 * Current strategy (2026-05-29 v2): rewrite packages/website/package.json
 * IN PLACE after `next build` finishes. This is the file Vercel packages
 * into the function bundle at /var/task/packages/website/package.json — the
 * very file Node walks up to find. By the time the rewrite runs:
 *   - next build has already parsed source ESM (no longer cares about type)
 *   - .next/server/route.js files are pure CJS (require / module.exports)
 *   - flipping type → "commonjs" makes Node load them as CJS at runtime
 *
 * The original source file is committed with "type": "module" so local dev
 * and the prebuild script still work. Vercel deploys the post-rewrite copy.
 *
 * Bundle impact: a single ~10-byte edit to one file.
 *
 * See:
 *   - https://nodejs.org/api/packages.html#determining-module-system
 *
 * @module fix-next-cjs-launcher
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_PATH = resolve(HERE, '..', 'package.json');

// Local devs run `pnpm build` to inspect the output, then run dev/test
// commands against the same checkout. Rewriting their package.json would
// dirty their git state and break the next `next build` (Turbopack errors on
// ESM source files under a "commonjs" type). Only flip on Vercel / CI where
// the artifact is consumed immediately and discarded.
const ON_DEPLOY = !!process.env.VERCEL || !!process.env.CI;
if (!ON_DEPLOY) {
  // eslint-disable-next-line no-console
  console.log(
    '[fix-next-cjs-launcher] not on Vercel/CI — skipping package.json type rewrite ' +
      '(local dev safe; force with VERCEL=1 or CI=1)'
  );
  process.exit(0);
}

if (!existsSync(PKG_PATH)) {
  // eslint-disable-next-line no-console
  console.warn(`[fix-next-cjs-launcher] ${PKG_PATH} not found — skipped`);
  process.exit(0);
}

const original = readFileSync(PKG_PATH, 'utf8');
const pkg = JSON.parse(original);

if (pkg.type === 'commonjs') {
  // eslint-disable-next-line no-console
  console.log('[fix-next-cjs-launcher] package.json already type: commonjs — noop');
  process.exit(0);
}

const before = pkg.type ?? '(unset)';
pkg.type = 'commonjs';

// Preserve trailing newline if present so the file matches prettier/editorconfig.
const trailingNewline = original.endsWith('\n') ? '\n' : '';
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + trailingNewline);

// eslint-disable-next-line no-console
console.log(
  `[fix-next-cjs-launcher] rewrote ${PKG_PATH}: type "${before}" → "commonjs"`
);
