# Threat Cloud — Backup & Restore Runbook

Threat Cloud stores all threat-intel state in a single SQLite file at
`/data/threat-cloud.db` inside the container. Litestream continuously
replicates the WAL of that file to an S3-compatible bucket (Cloudflare R2,
AWS S3, Backblaze B2). This runbook covers verification, normal recovery,
manual recovery, and the corruption response.

Retention policy (defined in `litestream.yml`):

- 7 days of WAL frames (`retention: 168h`)
- Hourly snapshots (`snapshot-interval: 1h`)
- Checksum validation every 12 hours (`validation-interval: 12h`)

RPO is bounded by the WAL flush cadence — Litestream flushes every few
seconds under load, so worst-case data loss on a crash is single-digit
seconds.

---

## 1. Verify Litestream is replicating

Litestream logs to stdout and is captured by Railway's log stream.

1. Railway dashboard -> TC service -> Logs.
2. Within ~30 seconds of cold start, expect a line containing
   `replica started`.
3. Periodically expect lines containing `write snapshot` (hourly) and
   `validate` (every 12h).

Red flags:

- `cannot list buckets` / `403 Forbidden` -> credentials wrong or bucket
  policy missing.
- `no such host` -> endpoint URL wrong.
- No `replica started` line within the first minute -> the env vars are
  unset and Litestream is silently a no-op. Check Variables tab.

Quick CLI check (run from a one-off Railway shell):

```
litestream snapshots -config /etc/litestream.yml /data/threat-cloud.db
```

If you see snapshot rows, replication is working. If the command exits
with `no replicas configured`, the env vars never reached the process.

---

## 2. Normal recovery — fresh container, restore from S3

If the Railway volume is wiped (volume deletion, region migration, or a
clean redeploy on a new mount) the container restarts with an empty
`/data`. The entrypoint script handles this automatically:

```
[entrypoint] No local DB found at /data/threat-cloud.db, attempting restore from Litestream...
[entrypoint] Launching Litestream + Threat Cloud...
```

No human action required. The DB is restored from the latest snapshot +
replayed WAL before the TC server starts.

If the entrypoint logs `No replica found, starting fresh` and you DID
expect replicas to exist, stop the container immediately and investigate
before any writes overwrite the recovery window. The most likely cause
is the env vars pointing at the wrong bucket/region.

---

## 3. Manual recovery — restore to a different path, inspect, then swap

For one-off recovery (e.g. point-in-time investigation, comparing against
the live DB) restore into a side path and swap manually:

1. Open a one-off shell on the TC service in Railway (or `docker compose
exec panguard sh` locally).
2. Restore the latest snapshot to a scratch path:
   ```
   litestream restore -o /tmp/restored.db /data/threat-cloud.db
   ```
3. Inspect or compare:
   ```
   sqlite3 /tmp/restored.db ".tables"
   sqlite3 /tmp/restored.db "SELECT COUNT(*) FROM rule_verdicts;"
   ```
4. To restore to a specific timestamp instead of the latest:
   ```
   litestream restore -o /tmp/restored.db -timestamp 2026-05-12T03:00:00Z /data/threat-cloud.db
   ```
5. Swap into place. Stop the service first so the WAL is clean:
   ```
   # Railway: hit "Stop" on the service
   mv /data/threat-cloud.db /data/threat-cloud.db.bak
   mv /tmp/restored.db /data/threat-cloud.db
   # Railway: hit "Restart"
   ```

The entrypoint will see the file already exists, skip restore, and
Litestream will resume replication from the new state.

---

## 4. Corruption response

Symptoms: TC service crash-loops with `SQLITE_CORRUPT` or
`database disk image is malformed` in the logs.

1. Stop the TC service immediately. Do not let it restart-loop — every
   crash can pollute the WAL further.
2. From a one-off shell, list available snapshots:
   ```
   litestream snapshots -config /etc/litestream.yml /data/threat-cloud.db
   ```
3. Pick the most recent snapshot BEFORE the corruption timestamp and
   restore to a scratch path (see Section 3, step 4).
4. Run `PRAGMA integrity_check;` on the restored DB:
   ```
   sqlite3 /tmp/restored.db "PRAGMA integrity_check;"
   ```
   Must print `ok`. If it doesn't, walk back one more snapshot.
5. Swap the good snapshot into place (Section 3, step 5).
6. Restart the service. Confirm `replica started` reappears in the logs.
7. File a post-mortem — corruption on a wrapped SQLite usually points at
   a kernel/disk fault on the host, not at the app. Move the service to
   a different volume if it recurs.

---

## 5. What to do if Litestream itself is the problem

If Litestream starts crashing (rare — it's been stable for years), the
DB is unaffected on the local volume. Disable the wrapper temporarily by
overriding the entrypoint:

```
# Railway: TC service -> Settings -> Start Command override
node /app/node_modules/@panguard-ai/threat-cloud/dist/cli.js serve --port 3000 --host 0.0.0.0 --db /data/threat-cloud.db
```

The service runs without replication while you investigate. Remove the
override to re-enable Litestream.

---

## 6. Bucket hygiene

Litestream cleans up old snapshots and WAL frames automatically based on
the `retention` setting. Do NOT enable bucket-level lifecycle rules on
the `threat-cloud-db/` path — they will fight Litestream's own
retention logic and may delete frames it still needs.

If you must enable versioning on the bucket, set a TTL of at least 14
days on non-current versions so Litestream's 7-day retention window is
fully covered.
