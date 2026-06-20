#!/usr/bin/env node
// Thin wrapper: delegates to @panguard-ai/panguard CLI
const { join, dirname } = require('path');
const { pathToFileURL } = require('url');
const { createRequire } = require('module');

// resolve the installed @panguard-ai/panguard package directory
const r = createRequire(__filename);
let pkgDir;
try {
  // package.json is always resolvable regardless of ESM/CJS
  const pkgJson = r.resolve('@panguard-ai/panguard/package.json');
  pkgDir = dirname(pkgJson);
} catch {
  console.error('Error: @panguard-ai/panguard is not installed.');
  console.error('Run: npm install -g @panguard-ai/panguard');
  process.exit(1);
}

// Convert to a file:// URL before import(). Windows paths (C:\...) are not
// valid ESM specifiers, so a raw path crashes with ERR_UNSUPPORTED_ESM_URL_SCHEME.
const cli = join(pkgDir, 'dist', 'cli', 'index.js');
import(pathToFileURL(cli).href).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
