#!/usr/bin/env node
// CJS bootstrap for Windows compatibility.
// Windows paths (C:\...) are not valid ESM specifiers.
// This wrapper converts the path to a file:// URL before import().
const { join } = require('path');
const { pathToFileURL } = require('url');

const pkgDir = join(__dirname, '..');
const cli = pathToFileURL(join(pkgDir, 'dist', 'cli', 'index.js')).href;

import(cli).catch((err) => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
