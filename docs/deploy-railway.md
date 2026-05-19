# Threat Cloud on Railway

This guide covers wiring Litestream-backed Threat Cloud onto Railway.
The Dockerfile is the deployment unit — Railway builds it and runs the
container with a mounted volume at `/data`.

For background on the backup design and recovery procedures see
`docs/runbook/tc-restore.md`.

---

## Prerequisites

1. A Railway project with the TC service already deployed.
2. An S3-compatible bucket. Recommended in priority order:
   - Cloudflare R2 (no egress fees, custom domain for endpoint).
   - Backblaze B2 (cheapest at-rest, charges for egress).
   - AWS S3 (most familiar, costliest).
3. An access key / secret key pair scoped to ONLY that bucket. Do not
   reuse a key with broader permissions.

---

## Step 1 — Provision the bucket

Cloudflare R2 example (replicate the pattern on your provider of choice):

1. Cloudflare dashboard -> R2 -> Create bucket -> name it
   `panguard-tc-backup-prod`.
2. R2 -> Manage API Tokens -> Create token. Scope: `Object Read & Write`,
   limit to just this bucket.
3. Copy the four values shown after creation:
   - `Access Key ID`
   - `Secret Access Key`
   - `Endpoint for S3 clients` (looks like
     `https://<account-id>.r2.cloudflarestorage.com`)
   - The region is always `auto` for R2.

Backblaze B2: identical flow, region is `us-west-002` (or wherever you
provisioned), endpoint is `https://s3.us-west-002.backblazeb2.com`.

---

## Step 2 — Wire env vars in Railway

Railway dashboard -> TC service -> Variables. Add all five:

```
LITESTREAM_S3_ENDPOINT          = https://<account-id>.r2.cloudflarestorage.com
LITESTREAM_S3_BUCKET            = panguard-tc-backup-prod
LITESTREAM_S3_REGION            = auto                # (R2) or us-east-1 / etc.
LITESTREAM_S3_ACCESS_KEY_ID     = <from step 1>
LITESTREAM_S3_SECRET_ACCESS_KEY = <from step 1>
```

If you miss any of these, Litestream fails fast on the next container
start and the TC service will not come up. That is intentional —
silent backup failure on customer data is worse than an obvious deploy
error.

---

## Step 3 — Confirm the persistent volume

Railway dashboard -> TC service -> Settings -> Storage.

1. Confirm a volume is mounted at `/data`.
2. Confirm the size is at least 5 GB. Current TC DB is well under 1 GB
   but the WAL during heavy ingestion can spike.
3. If no volume is mounted, create one now — DO NOT redeploy without it,
   because a fresh ephemeral `/data` will trigger the cold-restore path
   on every restart.

---

## Step 4 — Redeploy and watch logs

1. Trigger a new deploy (push to the tracked branch or click "Deploy").
2. Watch the build — confirm the `Litestream binary` step downloads
   `litestream-v0.3.13-linux-amd64.tar.gz` and the sha256 matches.
3. Once the container starts, within ~30s the logs should show:
   ```
   [entrypoint] Local DB present at /data/threat-cloud.db, skipping restore.
   [entrypoint] Launching Litestream + Threat Cloud...
   ... replica started ...
   ```
4. After one hour, look for `write snapshot` in the logs. That confirms
   the first hourly snapshot has been pushed to the bucket.

---

## Step 5 — Verify the bucket

Open the R2 / B2 console for the bucket and confirm you see a
`threat-cloud-db/` prefix populated with `generations/` underneath. If
the prefix is empty after the second hour, Litestream is not actually
writing — re-check the credentials.

---

## Step 6 — Cold-recovery smoke test (do this once before paying customers)

The single most important test before taking real customer data:

1. Deploy a SECOND Railway service from the same Dockerfile, pointed at
   the same bucket, with a separate `/data` volume.
2. Confirm the entrypoint logs `No local DB found ... attempting restore
   from Litestream...` followed by `Launching Litestream + Threat
   Cloud...`.
3. Hit the second service's `/health` endpoint and confirm the DB came
   back with non-zero row counts:
   ```
   sqlite3 /data/threat-cloud.db "SELECT COUNT(*) FROM rule_verdicts;"
   ```
4. Tear down the smoke-test service. The bucket is untouched.

If cold-restore works on a parallel service, you are safe to lose the
production volume and recover from S3 alone.

---

## Common failure modes

- Env vars unset on Railway -> Litestream silently no-ops in older
  versions, fast-exits in newer. Either way, no replication. Check
  Variables tab.
- Endpoint URL missing the `https://` scheme -> connection refused.
- Bucket name typo'd between Railway vars and the actual bucket ->
  `404 NoSuchBucket`. Bucket names are case-sensitive on R2.
- Region mismatch (e.g. set to `us-east-1` for an R2 bucket) -> request
  signing fails with 403. Use `auto` for R2.
- Volume not mounted at `/data` -> every restart fully restores from S3,
  burning bandwidth and slowing cold starts.
