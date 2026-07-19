#!/usr/bin/env bash
# Publish the unscoped brand-name `panguard` in lockstep with @panguard-ai/panguard.
#
# The canonical package is packages/panguard-cli (name: `panguard`). It owns the
# bin entries and depends on the scoped package for the implementation.
#
# It must NOT be derived from @panguard-ai/panguard. This script used to repackage
# that tarball, which shipped a broken panguard@1.8.25: the scoped package had its
# `bin` removed in 1.8.23 so the two could not both claim the panguard/pga names
# (npm fails such an install with EEXIST). A package built from it installs no
# executable, while npm still reports the publish as a success.
#
# release.sh publishes packages/panguard-cli as the last entry of PUBLISH_ORDER,
# so a normal release needs nothing from here. Use this only to repair a release
# where that step failed after the scoped packages had already gone out.
#
#   Usage: scripts/publish-unscoped.sh [version]   (default: the manifest version)
set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")/.." && pwd)/packages/panguard-cli"
[ -d "$PKG_DIR" ] || { echo "ERROR: $PKG_DIR not found"; exit 1; }
VERSION="${1:-$(node -p "require('$PKG_DIR/package.json').version")}"

# Guard the exact failure this script once caused: never ship a binless panguard.
node -e "
  const p = require('$PKG_DIR/package.json');
  const bin = p.bin || {};
  if (p.name !== 'panguard' || !bin.panguard || !bin.pga) {
    console.error('ERROR: packages/panguard-cli is not the canonical binned package.');
    console.error('       name=' + p.name + ' bin=' + JSON.stringify(bin));
    process.exit(1);
  }
"

node -e "
  const fs = require('fs');
  const f = '$PKG_DIR/package.json';
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (p.version !== '$VERSION') {
    p.version = '$VERSION';
    fs.writeFileSync(f, JSON.stringify(p, null, 2) + '\n');
    console.log('  packages/panguard-cli -> $VERSION');
  }
"

cd "$PKG_DIR"

npm publish --access public
echo "Published unscoped panguard@${VERSION}"
