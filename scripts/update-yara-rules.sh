#!/usr/bin/env bash
# Download YARA community detection rules for Guard
# These are bundled into the Docker image at build time.

set -euo pipefail

DEST_DIR="${1:-/app/bundled-rules/yara-rules/community}"
YARA_REPO="https://github.com/Yara-Rules/rules/archive/refs/heads/master.tar.gz"

mkdir -p "$DEST_DIR"

echo "Downloading YARA community rules..."
curl -fsSL "$YARA_REPO" | tar xz --strip-components=1 -C "$DEST_DIR" 2>/dev/null || {
  echo "WARNING: Could not download YARA rules. Using bundled rules only."
  exit 0
}

echo "YARA rules updated: $(find "$DEST_DIR" -name '*.yar' -o -name '*.yara' | wc -l | tr -d ' ') rules"
