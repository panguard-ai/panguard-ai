#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Panguard AI — SQLite Database Backup
#
# Usage:
#   ./scripts/backup-db.sh                    # default: ~/.panguard/auth.db
#   ./scripts/backup-db.sh /data/auth.db      # custom DB path
#   BACKUP_DIR=/mnt/backup RETENTION=14 ./scripts/backup-db.sh
#
# Cron example (daily at 3 AM):
#   0 3 * * * /opt/panguard/scripts/backup-db.sh /data/auth.db
# ──────────────────────────────────────────────────────────

set -euo pipefail

DB_PATH="${1:-${PANGUARD_AUTH_DB:-$HOME/.panguard/auth.db}}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$DB_PATH")/backups}"
RETENTION="${RETENTION:-7}"  # days to keep backups
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/auth-$TIMESTAMP.db"

# Validate source
if [ ! -f "$DB_PATH" ]; then
  echo "[backup] ERROR: Database not found at $DB_PATH"
  exit 1
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Use SQLite .backup for a safe, consistent copy (handles WAL mode)
if command -v sqlite3 &>/dev/null; then
  sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
else
  # Fallback: copy with WAL checkpoint first
  if [ -f "${DB_PATH}-wal" ]; then
    echo "[backup] WARNING: sqlite3 not found, copying files directly (WAL may not be flushed)"
  fi
  cp "$DB_PATH" "$BACKUP_FILE"
  [ -f "${DB_PATH}-wal" ] && cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal"
  [ -f "${DB_PATH}-shm" ] && cp "${DB_PATH}-shm" "${BACKUP_FILE}-shm"
fi

# Verify backup integrity
if command -v sqlite3 &>/dev/null; then
  INTEGRITY=$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" 2>&1)
  if [ "$INTEGRITY" != "ok" ]; then
    echo "[backup] ERROR: Backup integrity check failed: $INTEGRITY"
    rm -f "$BACKUP_FILE"
    exit 1
  fi
fi

# Compress
if command -v gzip &>/dev/null; then
  gzip "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gz"
fi

# Report
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[backup] OK: $BACKUP_FILE ($SIZE)"

# Prune old backups
DELETED=0
if [ "$RETENTION" -gt 0 ]; then
  while IFS= read -r -d '' old; do
    rm -f "$old"
    DELETED=$((DELETED + 1))
  done < <(find "$BACKUP_DIR" -name "auth-*.db*" -mtime +"$RETENTION" -print0 2>/dev/null || true)
fi

if [ "$DELETED" -gt 0 ]; then
  echo "[backup] Pruned $DELETED backup(s) older than $RETENTION days"
fi
