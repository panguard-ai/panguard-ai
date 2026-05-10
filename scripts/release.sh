#!/usr/bin/env bash
# release.sh — One-command release for PanGuard
#
# Usage: ./scripts/release.sh [patch|minor|major]
#   Default: patch (1.4.16 → 1.4.17)
#
# What it does:
#   1. Runs preflight checks (clean tree, npm auth, tests pass)
#   2. Bumps version in ALL publishable package.json files
#   3. Builds all packages
#   4. Runs tests
#   5. Publishes all packages to npm (in dependency order)
#   6. Commits + tags + pushes
#   7. CI auto-builds binaries + creates GitHub Release
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
echo ""
echo "=== PREFLIGHT CHECKS ==="
echo ""

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree is dirty. Commit or stash changes first."
  exit 1
fi
echo "  [OK] Clean working tree"

npm whoami >/dev/null 2>&1 || { echo "ERROR: Not logged in to npm. Run: npm login"; exit 1; }
echo "  [OK] npm authenticated as $(npm whoami)"

gh auth status >/dev/null 2>&1 || { echo "ERROR: Not logged in to gh. Run: gh auth login"; exit 1; }
echo "  [OK] gh authenticated"

# ── Read current version (from main CLI package) ────────
CURRENT=$(node -e "console.log(require('./packages/panguard/package.json').version)")
echo "  Current version: $CURRENT"

# ── Calculate new version ────────────────────────────────
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "ERROR: Invalid bump type '$BUMP_TYPE'. Use patch|minor|major."; exit 1 ;;
esac
NEW="$MAJOR.$MINOR.$PATCH"
echo "  New version: $NEW"
echo ""

# ── Bump ALL publishable packages ────────────────────────
echo "=== BUMPING VERSIONS ==="
echo ""

# All packages that get published to npm
PACKAGES=(
  "packages/core/package.json"
  "packages/atr/package.json"
  "packages/scan-core/package.json"
  "packages/panguard-scan/package.json"
  "packages/panguard-chat/package.json"
  "packages/panguard-report/package.json"
  "packages/panguard-web/package.json"
  "packages/panguard-trap/package.json"
  "packages/panguard-mcp-proxy/package.json"
  "packages/threat-cloud/package.json"
  "packages/panguard-skill-auditor/package.json"
  "packages/panguard-mcp/package.json"
  "packages/panguard-guard/package.json"
  "packages/migrator-community/package.json"
  "packages/panguard/package.json"
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

# Also bump security-hardening
if [ -f "security-hardening/package.json" ]; then
  node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('security-hardening/package.json', 'utf8'));
    p.version = '$NEW';
    fs.writeFileSync('security-hardening/package.json', JSON.stringify(p, null, 2) + '\n');
  "
  echo "  security-hardening/package.json → $NEW"
fi

# Update website stats.ts
if [ -f "packages/website/src/lib/stats.ts" ]; then
  sed -i '' "s/cliVersion: '[^']*'/cliVersion: '$NEW'/" packages/website/src/lib/stats.ts
  echo "  website stats.ts → $NEW"
fi

echo ""

# ── Build ────────────────────────────────────────────────
echo "=== BUILD ==="
echo ""
pnpm install --no-frozen-lockfile 2>&1 | tail -1
pnpm build 2>&1 | tail -3
echo ""

# ── Test ─────────────────────────────────────────────────
echo "=== TESTS ==="
echo ""
pnpm test 2>&1 | tail -5
echo ""

# ── Publish to npm (in dependency order) ─────────────────
echo "=== PUBLISH TO NPM ==="
echo ""

# Order matters: dependencies first, then dependents
PUBLISH_ORDER=(
  "packages/core"
  "packages/atr"
  "packages/scan-core"
  "packages/panguard-scan"
  "packages/panguard-chat"
  "packages/panguard-report"
  "packages/panguard-web"
  "packages/panguard-trap"
  "packages/panguard-mcp-proxy"
  "packages/threat-cloud"
  "packages/panguard-skill-auditor"
  "packages/panguard-mcp"
  "packages/panguard-guard"
  "packages/migrator-community"
  "packages/panguard"
)

FAILED=()
for pkg_dir in "${PUBLISH_ORDER[@]}"; do
  if [ -d "$pkg_dir" ]; then
    pkg_name=$(node -p "require('./$pkg_dir/package.json').name")
    if pnpm publish --filter "$pkg_name" --access public --no-git-checks 2>&1 | tail -1; then
      echo "  [OK] $pkg_name@$NEW"
    else
      echo "  [!!] $pkg_name FAILED"
      FAILED+=("$pkg_name")
    fi
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "WARNING: These packages failed to publish:"
  printf '  - %s\n' "${FAILED[@]}"
  echo ""
  read -p "Continue with git commit anyway? [y/N] " -n 1 -r
  echo ""
  [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# Also publish security-hardening if it exists
if [ -d "security-hardening" ]; then
  cd security-hardening
  pnpm publish --access public --no-git-checks 2>&1 | tail -1 && echo "  [OK] @panguard-ai/security-hardening@$NEW" || echo "  [!!] security-hardening FAILED"
  cd "$ROOT"
fi

echo ""

# ── Commit + tag + push ──────────────────────────────────
echo "=== GIT RELEASE ==="
echo ""
git add -A
git commit -m "release: v$NEW"
git tag "v$NEW"
git push origin main
git push origin "v$NEW"

echo ""
echo "======================================="
echo "  Release v$NEW complete!"
echo "======================================="
echo ""
echo "  npm: all packages published at v$NEW"
echo "  git: tagged v$NEW, pushed to main"
echo "  CI:  building binaries + GitHub Release"
echo ""
echo "  Install: npm install -g panguard"
echo "  Or:      curl -fsSL https://get.panguard.ai | bash"
echo ""
