#!/usr/bin/env bash
# release.sh — One-command release for PanGuard
#
# Usage: ./scripts/release.sh [patch|minor|major]
#   Default: patch (1.4.2 → 1.4.3)
#
# What it does:
#   1. Bumps version in all package.json files that need it
#   2. Updates pnpm-lock.yaml
#   3. Builds all packages
#   4. Commits + tags + pushes
#   5. CI auto-builds binaries + creates GitHub Release
#   6. Publishes to npm
#
# Prerequisites:
#   - Clean working tree (no uncommitted changes)
#   - npm logged in (npm whoami)
#   - gh CLI authenticated

set -euo pipefail

BUMP_TYPE="${1:-patch}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ── Preflight checks ────────────────────────────────────
echo "Preflight checks..."

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree is dirty. Commit or stash changes first."
  exit 1
fi

npm whoami >/dev/null 2>&1 || { echo "ERROR: Not logged in to npm. Run: npm login"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "ERROR: Not logged in to gh. Run: gh auth login"; exit 1; }

# ── Read current version ─────────────────────────────────
CURRENT=$(node -e "console.log(require('./packages/panguard/package.json').version)")
echo "Current version: $CURRENT"

# ── Calculate new version ────────────────────────────────
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "ERROR: Invalid bump type '$BUMP_TYPE'. Use patch|minor|major."; exit 1 ;;
esac
NEW="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW"

# ── Bump versions ────────────────────────────────────────
echo "Bumping versions..."

# Core packages that should match the release version
PACKAGES=(
  "packages/panguard/package.json"
  "packages/panguard-guard/package.json"
  "packages/panguard-skill-auditor/package.json"
  "packages/scan-core/package.json"
)

for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg" ]; then
    node -e "
      const fs = require('fs');
      const p = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
      p.version = '$NEW';
      fs.writeFileSync('$pkg', JSON.stringify(p, null, 2) + '\n');
    "
    echo "  $pkg → $NEW"
  fi
done

# Update stats.ts
sed -i '' "s/cliVersion: '[^']*'/cliVersion: '$NEW'/" packages/website/src/lib/stats.ts
echo "  stats.ts → $NEW"

# ── Build + lockfile ─────────────────────────────────────
echo "Updating lockfile..."
pnpm install --no-frozen-lockfile 2>&1 | tail -1

echo "Building..."
pnpm build 2>&1 | tail -1

# ── Commit + tag + push ─────────────────────────────────
echo "Committing..."
git add -A
git commit -m "release: v$NEW"
git tag "v$NEW"
git push origin main
git push origin "v$NEW"

echo ""
echo "==================================="
echo "  Release v$NEW pushed!"
echo "==================================="
echo ""
echo "CI will now:"
echo "  1. Build binaries for 4 platforms"
echo "  2. Create GitHub Release"
echo "  3. Users can install via:"
echo "     curl -fsSL https://get.panguard.ai | bash"
echo ""
echo "To also publish to npm:"
echo "  cd packages/panguard && npm publish --access public"
echo ""
