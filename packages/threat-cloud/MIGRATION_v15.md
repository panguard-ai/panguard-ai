# Migration: v15 — Threat-Cloud Sybil Defence + CLI Hardening

This release tightens the trust model around the ATR proposal corpus and
removes argv-visible secrets from the CLI. Several defaults flip from
"permissive" to "fail-closed" — operators MUST review the four items below
before deploying.

## TL;DR

Before upgrading, you must:

1. Set `TC_ADMIN_API_KEY` (env var) — `--admin-api-key` flag becomes a
   deprecation warning now and will be REMOVED after **2026-08-19**.
2. Set `TC_API_KEY_REQUIRED=false` explicitly if you run an unauthenticated
   local-dev server — otherwise auth is on by default.
3. Plan the migration from `/api/clients/register` (anonymous, weight 0
   after grace) to `/api/clients/register-github` (verified, weight 0.5 → 1.0).
4. If you run on Docker: ensure `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`
   are set in your `.env` — `docker compose up` now fails loudly when they are
   missing.

## 1. CLI secret flags are deprecated (not yet removed)

Previously: `--admin-api-key VALUE` and `--anthropic-api-key VALUE` passed
secrets via argv.

Now: both flags still accept their value but emit a `[DEPRECATION WARNING]`
on stderr at startup. Behaviour is unchanged for one release.

After **2026-08-19**: both flags hard-exit with a removal notice.

Why: argv is visible in `ps aux` output to every local user. A malicious
process running as the same OS user can read the admin key directly. This
is how the April-2026 TC admin key leak happened.

Migration:
```diff
- ExecStart=/usr/local/bin/threat-cloud --port 8080 --admin-api-key xxxx
+ Environment="TC_ADMIN_API_KEY=xxxx"
+ ExecStart=/usr/local/bin/threat-cloud --port 8080
```

## 2. `apiKeyRequired` default flips from "production-only" to "always on"

Previously: `apiKeyRequired` was `true` only if `NODE_ENV === 'production'`.
Setups without `NODE_ENV` set ran unauthenticated.

Now: `apiKeyRequired` defaults to `true` regardless of `NODE_ENV`.

To opt out (local development only): set `TC_API_KEY_REQUIRED=false`. A
loud stderr warning is emitted at startup so unintentional opt-outs are
visible.

Migration: register a client key against the running server BEFORE the
upgrade and configure your downstream Guard / Migrator clients to send it
as a Bearer token.

## 3. ATR proposal Sybil defence — vote weighting

Previously: any `/api/clients/register` key could submit AND confirm
proposals. Three confirmations from any source promoted a proposal.

Now: each client key has a `trust_tier`:

| Tier | Origin | Vote weight |
|------|--------|------------|
| `github_verified` | `/api/clients/register-github`, ≥ 30 days old | 1.0 |
| `github_new` | `/api/clients/register-github`, < 30 days | 0.5 |
| `anonymous_legacy` | Pre-v15 registered key, until 2026-08-19 | 0.25 |
| `anonymous` | `/api/clients/register` after v15, OR after grace end | 0.0 |

A proposal promotes when cumulative `confirmation_weight ≥ 3.0`.

### Operational impact (Bug #6 from the audit)

Without this grace window, every in-flight community proposal would have
stalled the moment the operator deployed v15. The 90-day window
(through 2026-08-19) lets `anonymous_legacy` votes count for 0.25 each,
so existing real community contributions still contribute (12 legacy
votes promote a proposal). After 2026-08-19, only github-verified votes
count toward promotion.

### Community migration

Existing community contributors should switch their Guard / Migrator
clients from `/api/clients/register` to `/api/clients/register-github`
during the grace window. The new endpoint accepts a GitHub access token
in the request body and returns a client key bound to the user's numeric
GitHub ID:

```bash
curl -X POST https://tc.example/api/clients/register-github \
  -H 'Content-Type: application/json' \
  -d '{"githubToken":"ghp_..."}'
```

The token is verified server-side against the GitHub REST API and is NOT
stored after the verification call returns.

## 4. Docker MinIO required env vars

`docker-compose.yml` previously defaulted MinIO credentials to
`minioadmin/minioadmin`. Now they use mandatory env expansion:

```yaml
MINIO_ROOT_USER: ${MINIO_ROOT_USER:?MINIO_ROOT_USER required}
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD required}
```

`docker compose up` aborts with a clear error if these are unset.

Migration: copy `.env.docker.example` to `.env.docker` and fill in the
four required values (MinIO root user/password, Litestream S3 access
key/secret).

## 5. Tabular schema changes

Migration v15 runs automatically on first startup and is non-destructive:

| Table | Column | Type | Default |
|-------|--------|------|---------|
| `client_keys` | `github_user_id` | INTEGER | NULL |
| `client_keys` | `github_login` | TEXT | NULL |
| `client_keys` | `trust_tier` | TEXT | `'anonymous'` for new rows; pre-existing rows retagged to `'anonymous_legacy'` |
| `atr_proposals` | `confirmation_weight` | REAL | backfilled to `CAST(confirmations AS REAL)` |
| `github_proposal_submissions` | _new table_ | — | tracks per-user daily proposal cap (10/day default) |

Rollback: the migration is not reversible by `down`. If you need to roll
back, restore from the pre-upgrade SQLite snapshot.

## 6. Branch protection requirement (ATR repo, A-fix dependency)

The ATR `crystallize.yml` workflow now uses `gh pr merge --auto --squash`
to land safety-gate-passing PRs without manual approval. This only takes
effect if the ATR repo has branch protection rules requiring the
`safety-gate` check on `main`.

To activate the auto-merge gate, configure:

- GitHub repo settings → Branches → main branch protection
- Require status checks to pass before merging
- Required: the `Run safety gate on new rules` step from
  `crystallize.yml`

Without this, `gh pr merge --auto` reduces to an immediate merge with no
gating — the safety script still runs but its `fail` result no longer
blocks the merge.
