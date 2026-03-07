#!/bin/sh
# Ensure mounted volumes are writable by panguard user
# Railway volumes mount as root, overriding Dockerfile chown
chown -R panguard:panguard /data /backups 2>/dev/null || true

DB_PATH="${TC_DB_PATH:-/data/threat-cloud.db}"
AUTO_SEED="${TC_AUTO_SEED:-true}"

# Auto-seed on first deployment (if DB doesn't exist or is nearly empty)
if [ "$AUTO_SEED" = "true" ]; then
  DB_SIZE=0
  if [ -f "$DB_PATH" ]; then
    DB_SIZE=$(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null || echo 0)
  fi

  if [ "$DB_SIZE" -lt 100000 ]; then
    echo "[entrypoint] First deployment detected - seeding threat intelligence data..."
    su-exec panguard npx tsx scripts/seed.ts --db "$DB_PATH" --feeds all || \
      echo "[entrypoint] Seed failed (non-fatal), continuing startup..."
  fi
fi

exec su-exec panguard node dist/cli.js \
  --port "${TC_PORT:-8080}" \
  --host "${TC_HOST:-0.0.0.0}" \
  --db "$DB_PATH" \
  --backup-dir "${TC_BACKUP_DIR:-/backups}"
