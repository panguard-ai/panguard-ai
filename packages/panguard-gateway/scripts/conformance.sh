#!/usr/bin/env bash
# Official Open Responses conformance for the gateway, against the mock provider.
#
#   bash packages/panguard-gateway/scripts/conformance.sh
#
# 1. Fetches github.com/openresponses/openresponses at the pinned commit (once,
#    into a cache directory) and bundles its SSE parser, response schema and
#    compliance suite with bun, the runtime the official suite is written for.
# 2. Runs the official compliance CLI against a live gateway in front of the
#    mock provider (expect 17/17).
# 3. Runs tests/conformance: the suite again in-process, and every block the
#    gateway emits through the official parser and schemas.
#
# Needs git, bun, npm and network access for the first run.
set -euo pipefail

COMMIT=8907bc3
PKG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$PKG_DIR/../.." && pwd)"
WORK="${OPENRESPONSES_WORKDIR:-${XDG_CACHE_HOME:-$HOME/.cache}/panguard-gateway/openresponses-$COMMIT}"
REPO="$WORK/openresponses"

command -v bun >/dev/null || { echo "bun is required: the official suite runs on bun" >&2; exit 1; }

if [ ! -d "$REPO/.git" ]; then
  mkdir -p "$WORK"
  git clone --quiet https://github.com/openresponses/openresponses.git "$REPO"
fi
git -C "$REPO" checkout --quiet "$COMMIT"

if [ ! -d "$WORK/node_modules/zod" ]; then
  (cd "$WORK" && { [ -f package.json ] || npm init -y >/dev/null; } &&
    npm install --ignore-scripts --no-audit --no-fund zod@3.25.76 >/dev/null)
fi

cat >"$WORK/official-entry.ts" <<EOF
export { parseSSEStream, parseStreamingEventData } from '$REPO/src/lib/sse-parser.ts';
export { responseResourceSchema } from '$REPO/src/generated/kubb/zod/responseResourceSchema.ts';
export { runAllTests } from '$REPO/src/lib/compliance-tests.ts';
EOF
(cd "$WORK" && bun build official-entry.ts --target node --format esm --outfile official.mjs >/dev/null)

# The ATR worker runs compiled JavaScript.
pnpm --dir "$ROOT" --filter "@panguard-ai/panguard-gateway..." run build >/dev/null

LOG="$(mktemp)"
(cd "$PKG_DIR" && exec node --import tsx scripts/local-stack.ts >"$LOG" 2>&1) &
STACK=$!
trap 'kill "$STACK" 2>/dev/null || true; rm -f "$LOG"' EXIT
for _ in $(seq 1 120); do
  grep -q '"gateway"' "$LOG" && break
  sleep 0.25
done
GATEWAY="$(node -e '
  const line = require("fs").readFileSync(process.argv[1], "utf8").split("\n").find((l) => l.includes("\"gateway\""));
  if (!line) { process.stderr.write("gateway did not start\n"); process.exit(1); }
  process.stdout.write(JSON.parse(line).gateway);
' "$LOG")"

echo "== official compliance CLI against $GATEWAY/v1"
(cd "$REPO" && OPENRESPONSES_API_KEY=test bun run bin/compliance-test.ts --base-url "$GATEWAY/v1" --model mock-model)

echo "== blocks through the official parser and schemas"
(cd "$ROOT" && OPENRESPONSES_BUNDLE="$WORK/official.mjs" node_modules/.bin/vitest run packages/panguard-gateway/tests/conformance)
