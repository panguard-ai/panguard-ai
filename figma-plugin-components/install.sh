#!/bin/bash
# ============================================================
# Panguard AI Components - Figma Plugin Installer
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/manifest.json"
FIGMA_URL="https://www.figma.com/design/cs19iL8Jh0JIAq1LcXXdCg"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: manifest.json not found"
  exit 1
fi

echo ""
echo "================================================"
echo "  Panguard AI - Components Plugin Installer"
echo "================================================"
echo ""

echo "$MANIFEST" | pbcopy
echo "[OK] Manifest path copied to clipboard:"
echo "     $MANIFEST"
echo ""

echo "[OK] Opening Figma file in browser..."
open "$FIGMA_URL"
echo ""

echo "================================================"
echo "  NEXT STEPS:"
echo "================================================"
echo ""
echo "  1. Menu > Plugins > Development"
echo "     > Import plugin from manifest..."
echo ""
echo "  2. Cmd+V to paste path, select manifest.json"
echo ""
echo "  3. Menu > Plugins > Development"
echo "     > Panguard AI Components"
echo ""
echo "================================================"
echo "  COMPONENTS (7 total, 67 variants):"
echo "================================================"
echo ""
echo "  1. Button              48 variants"
echo "  2. Status Badge         5 variants"
echo "  3. Card                 3 variants"
echo "  4. Input Field          4 variants"
echo "  5. Notification Toast   4 variants"
echo "  6. Nav Bar              1 component"
echo "  7. KPI Card             3 variants"
echo ""
echo "================================================"
echo ""
