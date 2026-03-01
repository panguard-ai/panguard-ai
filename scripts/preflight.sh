#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Panguard AI — Deployment Preflight Check
#
# Validates that the environment is ready for production.
# Run this before or after deploying.
#
# Usage:
#   ./scripts/preflight.sh                      # check local env
#   API_URL=https://api.panguard.ai ./scripts/preflight.sh  # check remote
# ──────────────────────────────────────────────────────────

set -uo pipefail

API_URL="${API_URL:-http://localhost:3000}"
PASS=0
FAIL=0
WARN=0

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  [WARN] $1"; WARN=$((WARN + 1)); }

echo "Panguard AI — Preflight Check"
echo "Target: $API_URL"
echo "──────────────────────────────────────────"

# ── 1. Build Check ─────────────────────────────────────────

echo ""
echo "1. Build"

if pnpm run build --silent >/dev/null 2>&1; then
  pass "All packages build successfully"
else
  fail "Build failed — run 'pnpm run build' for details"
fi

# ── 2. Test Check ──────────────────────────────────────────

echo ""
echo "2. Tests"

if pnpm test --silent >/dev/null 2>&1; then
  pass "All tests pass"
else
  fail "Tests failed — run 'pnpm test' for details"
fi

# ── 3. Environment Variables ───────────────────────────────

echo ""
echo "3. Environment Variables (production required)"

check_env() {
  local var_name=$1
  local description=$2
  local required=${3:-true}

  if [ -n "${!var_name:-}" ]; then
    pass "$var_name is set ($description)"
  elif [ "$required" = "true" ]; then
    fail "$var_name is NOT set ($description)"
  else
    warn "$var_name is NOT set ($description)"
  fi
}

check_env "JWT_SECRET"            "Session signing key"           true
check_env "PANGUARD_BASE_URL"     "Public API URL"                true
check_env "CORS_ALLOWED_ORIGINS"  "Allowed frontend origins"      true
check_env "RESEND_API_KEY"        "Email delivery (Resend)"       false
check_env "GOOGLE_CLIENT_ID"      "Google OAuth"                  false
check_env "GOOGLE_CLIENT_SECRET"  "Google OAuth secret"           false
check_env "SENTRY_DSN"            "Error tracking"                false
check_env "LEMON_SQUEEZY_API_KEY" "Payment processing"            false

# ── 4. Health Endpoint ─────────────────────────────────────

echo ""
echo "4. Health Endpoint"

HEALTH=$(curl -sf --max-time 10 "$API_URL/health" 2>/dev/null || echo "")
if [ -n "$HEALTH" ]; then
  STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")
  DB=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('db','unknown'))" 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "healthy" ] && [ "$DB" = "connected" ]; then
    pass "Health endpoint OK (status=$STATUS, db=$DB)"
  else
    fail "Health endpoint unhealthy (status=$STATUS, db=$DB)"
  fi
else
  warn "Health endpoint unreachable at $API_URL/health (server not running?)"
fi

# ── 5. Security Headers ───────────────────────────────────

echo ""
echo "5. Security Headers"

HEADERS=$(curl -sI --max-time 10 "$API_URL/health" 2>/dev/null || echo "")
if [ -n "$HEADERS" ]; then
  check_header() {
    local header=$1
    if echo "$HEADERS" | grep -qi "$header"; then
      pass "$header present"
    else
      fail "$header missing"
    fi
  }

  check_header "X-Content-Type-Options"
  check_header "X-Frame-Options"
  check_header "Referrer-Policy"

  if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
    pass "HSTS present"
  else
    warn "HSTS not present (expected in production only)"
  fi
else
  warn "Cannot check headers — server not reachable"
fi

# ── 6. Database ────────────────────────────────────────────

echo ""
echo "6. Database"

DB_PATH="${PANGUARD_AUTH_DB:-$HOME/.panguard/auth.db}"
if [ -f "$DB_PATH" ]; then
  pass "Database file exists at $DB_PATH"
  DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
  echo "       Size: $DB_SIZE"

  if command -v sqlite3 &>/dev/null; then
    INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1)
    if [ "$INTEGRITY" = "ok" ]; then
      pass "Database integrity check OK"
    else
      fail "Database integrity check failed: $INTEGRITY"
    fi

    WAL=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>&1)
    if [ "$WAL" = "wal" ]; then
      pass "WAL mode enabled"
    else
      warn "Journal mode is '$WAL' (WAL recommended for concurrent access)"
    fi
  else
    warn "sqlite3 not installed — cannot verify integrity"
  fi
else
  warn "Database not found at $DB_PATH (first run will create it)"
fi

# ── 7. Backup ─────────────────────────────────────────────

echo ""
echo "7. Backup"

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$DB_PATH")/backups}"
if [ -d "$BACKUP_DIR" ]; then
  BACKUP_COUNT=$(find "$BACKUP_DIR" -name "auth-*.db*" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$BACKUP_COUNT" -gt 0 ]; then
    LATEST=$(ls -t "$BACKUP_DIR"/auth-*.db* 2>/dev/null | head -1)
    pass "$BACKUP_COUNT backup(s) found, latest: $(basename "$LATEST")"
  else
    warn "Backup directory exists but no backups found — run scripts/backup-db.sh"
  fi
else
  warn "No backup directory at $BACKUP_DIR — run scripts/backup-db.sh"
fi

# ── Summary ────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════"
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "PREFLIGHT FAILED — fix the issues above before deploying."
  exit 1
else
  echo ""
  echo "PREFLIGHT PASSED — ready for deployment."
  exit 0
fi
