#!/bin/bash
# ============================================================
# Panguard AI Design Tokens - Figma Plugin Installer
# ============================================================
# This script:
# 1. Copies the manifest.json path to clipboard
# 2. Opens the Figma file in your browser
# 3. Prints step-by-step instructions
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/manifest.json"
FIGMA_URL="https://www.figma.com/design/cs19iL8Jh0JIAq1LcXXdCg"

# Verify manifest exists
if [ ! -f "$MANIFEST" ]; then
  echo "ERROR: manifest.json not found at $MANIFEST"
  exit 1
fi

echo ""
echo "================================================"
echo "  Panguard AI - Design Tokens Plugin Installer"
echo "================================================"
echo ""

# Copy manifest path to clipboard (macOS)
echo "$MANIFEST" | pbcopy
echo "[OK] Manifest path copied to clipboard:"
echo "     $MANIFEST"
echo ""

# Open Figma file
echo "[OK] Opening Figma file in browser..."
open "$FIGMA_URL"
echo ""

# Instructions
echo "================================================"
echo "  NEXT STEPS (3 clicks):"
echo "================================================"
echo ""
echo "  1. In Figma, go to:"
echo "     Menu (hamburger) > Plugins > Development"
echo "     > Import plugin from manifest..."
echo ""
echo "  2. Paste the path from clipboard (Cmd+V)"
echo "     or navigate to:"
echo "     $MANIFEST"
echo ""
echo "  3. Run the plugin:"
echo "     Menu > Plugins > Development"
echo "     > Panguard AI Design Tokens"
echo ""
echo "================================================"
echo "  WHAT IT CREATES:"
echo "================================================"
echo ""
echo "  Figma Styles:"
echo "    - 17 Paint Styles (Brand/Semantic/Neutral)"
echo "    - 9 Text Styles (Display -> Code)"
echo "    - 3 Effect Styles (Card/Dropdown/Modal)"
echo ""
echo "  Design Tokens Page:"
echo "    - Color Palette (swatches + hex values)"
echo "    - Typography (live samples + specs)"
echo "    - Spacing Scale (4px -> 96px bars)"
echo "    - Border Radius (4/8/12/16/9999px)"
echo "    - Shadows (Card/Dropdown/Modal demos)"
echo ""
echo "================================================"
echo ""
