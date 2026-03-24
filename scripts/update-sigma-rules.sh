#!/usr/bin/env bash
# Download Sigma community detection rules for Guard
# These are bundled into the Docker image at build time.

set -euo pipefail

DEST_DIR="${1:-/app/bundled-rules/sigma-rules/community}"
SIGMA_REPO="https://github.com/SigmaHQ/sigma/archive/refs/heads/master.tar.gz"

mkdir -p "$DEST_DIR"

echo "Downloading Sigma community rules..."
curl -fsSL "$SIGMA_REPO" | tar xz --strip-components=2 -C "$DEST_DIR" "sigma-master/rules" 2>/dev/null || {
  echo "WARNING: Could not download Sigma rules. Using bundled rules only."
  exit 0
}

echo "Sigma rules updated: $(find "$DEST_DIR" -name '*.yml' | wc -l | tr -d ' ') rules"
