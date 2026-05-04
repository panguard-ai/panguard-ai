#!/usr/bin/env bash
# Regenerate the migrator sample evidence pack served at panguard.ai/migrator/sample-pack/
#
# Inputs:
#   $MIGRATOR_REPO  — path to panguard-enterprise checkout (default: ~/Downloads/panguard-enterprise)
#
# Output: 6 artifacts + MANIFEST.txt rewritten in
#   packages/website/public/migrator/sample-pack/
#
# Run from any directory; the script resolves the website public path
# relative to itself.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBSITE_DIR="$(dirname "$SCRIPT_DIR")"
PUBLIC_DIR="$WEBSITE_DIR/public/migrator/sample-pack"
MIGRATOR_REPO="${MIGRATOR_REPO:-$HOME/Downloads/panguard-enterprise}"
WORKDIR="$(mktemp -d)"

trap 'rm -rf "$WORKDIR"' EXIT

if [ ! -d "$MIGRATOR_REPO/packages/migrator/dist" ]; then
  echo "Building migrator first..."
  (cd "$MIGRATOR_REPO" && pnpm --filter @panguard/migrator build)
fi

echo "Running migrate-pro on 50 SigmaHQ fixtures..."
node "$MIGRATOR_REPO/packages/migrator/dist/cli/migrate-pro.js" \
  --input "$MIGRATOR_REPO/packages/migrator/tests/fixtures/sigma" \
  --output "$WORKDIR" \
  --evidence "$WORKDIR/eu-pack" \
  --demo \
  --enrich \
  --customer-id "DEMO-CORP-EU" \
  --audit-period "2026-Q2"

mkdir -p "$PUBLIC_DIR"

echo "Copying artifacts to $PUBLIC_DIR..."
cp "$WORKDIR/eu-pack.html" "$WORKDIR/eu-pack.json" "$WORKDIR/eu-pack.md" "$PUBLIC_DIR/"
cp "$WORKDIR/activation-demo.json" "$WORKDIR/activation-demo.md" "$PUBLIC_DIR/"

echo "Building atr-rules-sample.zip..."
(cd "$WORKDIR" && zip -q -r "$PUBLIC_DIR/atr-rules-sample.zip" *.yaml)

echo "Regenerating MANIFEST.txt..."
(cd "$PUBLIC_DIR" && shasum -a 256 *.html *.json *.md *.zip | grep -v VERIFY > MANIFEST.txt)

echo ""
echo "MANIFEST.txt:"
cat "$PUBLIC_DIR/MANIFEST.txt"
echo ""
echo "Verify with:"
echo "  cd $PUBLIC_DIR && shasum -a 256 -c MANIFEST.txt"
