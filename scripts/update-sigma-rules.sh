#!/usr/bin/env bash
# Update SigmaHQ community rules
# Usage: ./scripts/update-sigma-rules.sh
#
# Clones (or pulls) the SigmaHQ/sigma repository and copies the rules/
# directory into config/sigma-rules/community/, preserving the original
# directory structure (rules/linux/, rules/windows/, rules/cloud/, etc.).
#
# License: SigmaHQ rules use the Detection Rule License (DRL) 1.1,
# which permits free use including commercial use.

set -euo pipefail

REPO_URL="https://github.com/SigmaHQ/sigma.git"
REPO_DIR="/tmp/sigmahq-sigma"
TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)/config/sigma-rules/community"

echo "=== Panguard: Updating SigmaHQ community Sigma rules ==="

# Clone or pull
if [ -d "$REPO_DIR/.git" ]; then
  echo "Pulling latest SigmaHQ/sigma..."
  git -C "$REPO_DIR" pull --ff-only --quiet
else
  echo "Cloning SigmaHQ/sigma..."
  git clone --depth 1 --quiet "$REPO_URL" "$REPO_DIR"
fi

COMMIT_HASH=$(git -C "$REPO_DIR" rev-parse --short HEAD)
COMMIT_DATE=$(git -C "$REPO_DIR" log -1 --format='%ci')

# Clean target and copy rules
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

if [ -d "$REPO_DIR/rules" ]; then
  cp -r "$REPO_DIR/rules/"* "$TARGET_DIR/"
else
  echo "ERROR: rules/ directory not found in SigmaHQ repo"
  exit 1
fi

# Write VERSION file
cat > "$TARGET_DIR/VERSION" <<EOF
source: SigmaHQ/sigma
commit: $COMMIT_HASH
date: $COMMIT_DATE
updated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
license: Detection Rule License (DRL) 1.1
EOF

# Count rules
RULE_COUNT=$(find "$TARGET_DIR" -name "*.yml" -o -name "*.yaml" | wc -l | tr -d ' ')

echo ""
echo "=== SigmaHQ community rules updated ==="
echo "  Commit:     $COMMIT_HASH ($COMMIT_DATE)"
echo "  Rules:      $RULE_COUNT .yml files"
echo "  Target:     $TARGET_DIR"
echo ""
