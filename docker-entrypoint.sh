#!/bin/sh
# Threat Cloud entrypoint — wraps the TC server with Litestream so that:
#   1. On cold start with no local DB, restore the latest snapshot from S3.
#   2. While running, Litestream tails the WAL and streams it to S3.
#   3. On SIGTERM, Litestream flushes the WAL before letting the child exit.
#
# If LITESTREAM_S3_* vars are not set, Litestream will fail to start and the
# service will exit. This is intentional in production — silent backup
# failure on a customer-data DB is worse than an obvious deploy error.
set -e

DB_PATH="/data/threat-cloud.db"

if [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] No local DB found at $DB_PATH, attempting restore from Litestream..."
  litestream restore -if-replica-exists "$DB_PATH" \
    || echo "[entrypoint] No replica found, starting fresh."
else
  echo "[entrypoint] Local DB present at $DB_PATH, skipping restore."
fi

echo "[entrypoint] Launching Litestream + Threat Cloud..."
exec litestream replicate \
  -exec "node /app/node_modules/@panguard-ai/threat-cloud/dist/cli.js serve --port 3000 --host 0.0.0.0 --db ${DB_PATH}"
