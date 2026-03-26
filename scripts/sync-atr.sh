#!/bin/bash
# sync-atr.sh — Sync ATR rules from agent-threat-rules repo to panguard-ai monorepo
#
# Usage: ./scripts/sync-atr.sh [path-to-agent-threat-rules]
#
# This ensures packages/atr/rules/ stays in sync with the ATR source repo.
# Run after adding/modifying rules in agent-threat-rules.

set -euo pipefail

ATR_REPO="${1:-$HOME/Downloads/agent-threat-rules}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/packages/atr/rules"
COMPILED_JSON="$(cd "$(dirname "$0")/.." && pwd)/packages/website/src/lib/atr-rules-compiled.json"

if [ ! -d "$ATR_REPO/rules" ]; then
  echo "ERROR: ATR repo not found at $ATR_REPO/rules"
  echo "Usage: $0 [path-to-agent-threat-rules]"
  exit 1
fi

# Count source rules
SRC_COUNT=$(find "$ATR_REPO/rules" -name "*.yaml" | wc -l | tr -d ' ')
echo "Source: $ATR_REPO/rules ($SRC_COUNT rules)"

# Sync
rsync -av --delete "$ATR_REPO/rules/" "$DEST/"
DEST_COUNT=$(find "$DEST" -name "*.yaml" | wc -l | tr -d ' ')
echo "Destination: $DEST ($DEST_COUNT rules)"

# Verify count matches
if [ "$SRC_COUNT" != "$DEST_COUNT" ]; then
  echo "ERROR: Rule count mismatch! Source=$SRC_COUNT Dest=$DEST_COUNT"
  exit 1
fi

# Recompile for website
COMPILE_SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/scripts/compile-atr-rules.mjs"
if [ -f "$COMPILE_SCRIPT" ]; then
  echo "Recompiling ATR rules for website..."
  node "$COMPILE_SCRIPT"
  COMPILED_COUNT=$(python3 -c "import json; print(len(json.load(open('$COMPILED_JSON'))))" 2>/dev/null || echo "?")
  echo "Compiled: $COMPILED_JSON ($COMPILED_COUNT rules)"
else
  echo "WARNING: compile-atr-rules.mjs not found, skipping website compilation"
fi

echo ""
echo "Sync complete: $DEST_COUNT rules"
echo "Remember to:"
echo "  1. Bump packages/panguard-skill-auditor/package.json version if ATR version changed"
echo "  2. Run 'pnpm build' to rebuild all packages"
echo "  3. Run 'npm publish' for updated packages"
