#!/usr/bin/env bash
# Publish the unscoped brand-name `panguard` in lockstep with @panguard-ai/panguard.
#
# npm bins come from the package ITSELF (not from a dependency), so the brand name
# cannot be a thin alias — it must ship the same built CLI. We repackage the
# already-published scoped tarball under the name `panguard` and publish it. Run
# AFTER scripts/release.sh has published the scoped package for this version.
#
#   Usage: scripts/publish-unscoped.sh [version]   (default: scoped npm "latest")
set -euo pipefail

VERSION="${1:-$(npm view @panguard-ai/panguard version)}"
echo "Repackaging @panguard-ai/panguard@${VERSION} -> unscoped panguard@${VERSION}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

npm pack "@panguard-ai/panguard@${VERSION}" >/dev/null
tar -xzf ./*.tgz
cd package

# Rename to the unscoped brand name; bins, deps (already concrete), and dist are
# identical to the scoped package, so `npm i -g panguard` installs the same CLI.
node -e "const fs=require('fs');const p=require('./package.json');p.name='panguard';fs.writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n');"

npm publish --access public
echo "Published unscoped panguard@${VERSION}"
