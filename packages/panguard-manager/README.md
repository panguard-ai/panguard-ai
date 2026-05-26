# @panguard-ai/panguard-manager

Self-hosted fleet aggregator for PanGuard Guard endpoints. Runs in your own infrastructure (on-prem, VPC, or airgap), receives relay events from every Guard you deploy, and exposes a single dashboard that aggregates state across the entire fleet. Designed for multi-endpoint Pilot and Enterprise customers who need one pane of glass instead of SSH-ing into each machine.

## What it is

PanGuard Manager is a single Node 22 process that:

- Authenticates operators (admin / viewer roles) against a SQLite-backed credential store with scrypt password hashing and short-lived HttpOnly cookie sessions.
- Issues one-time enrollment tokens that gate `POST /api/agents/register`, so a Guard can only join the fleet with prior authorisation.
- Accepts relay events, threat verdicts, and status snapshots from each Guard's `DashboardRelayClient`; both the live in-memory aggregate AND a persistent SQLite log are kept in lockstep.
- Survives a restart with full state — events from before the bounce reappear in the dashboard as soon as the process is back up.
- Serves the same sage-themed PanGuard dashboard, with a fleet-aware Overview, Agents page, Threats page, Events page, and an admin-only Enrollment page.

A single `manager.db` SQLite file holds everything (agents, operators, sessions, enrollment tokens, agent_events). No external database, no Redis, no message broker. WAL mode keeps the relay hot path lock-free.

## Quickstart

```bash
# 1. Initialise: bootstraps an admin operator + prints credentials ONCE.
panguard-manager init --data-dir ~/.panguard-manager
#   ==================================================
#   INITIAL ADMIN CREDENTIALS — STORE THESE NOW
#   --------------------------------------------------
#   username: admin
#   password: <random 24-char base64url>
#   ==================================================

# 2. Serve.
panguard-manager serve --data-dir ~/.panguard-manager --port 8090

# 3. Open http://<host>:8090/ — you'll be redirected to /login.
#    Sign in as admin with the password from step 1.

# 4. From the Enrollment tab, click "+ Issue new token", set a description
#    and TTL (default 24h), and copy the plaintext token shown ONCE.

# 5. On the host where the Guard runs, register with the token:
curl -X POST http://<host>:8090/api/agents/register \
  -H 'Content-Type: application/json' \
  -H 'X-Enrollment-Token: <token from step 4>' \
  -d '{"hostname":"web-01","os_type":"linux","panguard_version":"1.5.6","machine_id":"'"$(cat /etc/machine-id)"'"}'
# → { "ok": true, "data": { "agent_id": "agent_…", "token": "…" } }

# 6. Configure the Guard with the manager URL + agent credentials:
export PANGUARD_RELAY_URL=http://<host>:8090
export PANGUARD_AGENT_ID=<agent_id from step 5>
export PANGUARD_RELAY_TOKEN=<token from step 5>
panguard-guard run
```

The Guard's `DashboardRelayClient` opens a WebSocket upstream to the Manager and forwards every dashboard event in real time. Token validation happens server-side on every relay call.

## Operator role model

| Role     | Sees agents | Revokes agents | Issues / revokes enrollment tokens |
|----------|:----------:|:--------------:|:---------------------------------:|
| `admin`  | yes        | yes            | yes                               |
| `viewer` | yes        | no             | no                                |

The bootstrap operator created by `init` is always `admin`. To add more operators today, use the programmatic API (`OperatorStore.createOperator`) — a CLI subcommand is planned.

## CLI commands

```
panguard-manager init           [--data-dir DIR] [--admin-username USERNAME]
panguard-manager serve          [--port 8090] [--host 0.0.0.0] [--data-dir DIR]
panguard-manager agents list    [--data-dir DIR]
panguard-manager enroll-token issue
                                [--ttl-hours 24] [--description STR] [--data-dir DIR]
panguard-manager enroll-token list  [--data-dir DIR]
```

`init` is idempotent: re-running it does not re-issue the admin password. The SQLite migrations apply automatically on every `serve`.

If you are upgrading from a pre-SQLite Manager, an `agents.json` sitting beside `manager.db` is auto-imported on first boot and archived to `agents.json.migrated.<timestamp>` so already-deployed Guards keep authenticating without reconfiguration.

## API surface

All responses use the standard PanGuard envelope `{ ok, data?, error?, request_id }`. Times are ISO 8601 UTC.

### Open (no operator auth)

| Method | Path             | Auth          | Purpose                                    |
| ------ | ---------------- | ------------- | ------------------------------------------ |
| GET    | `/healthz`       | —             | Liveness probe.                            |
| GET    | `/login`         | —             | Operator login form.                       |
| POST   | `/api/auth/login`  | —           | Sign in. Returns `Set-Cookie: pgm_session`.|
| POST   | `/api/auth/logout` | session     | Revoke current session, clear cookie.      |
| GET    | `/api/auth/me`   | session       | Return the signed-in operator.             |

### Agent relay (bearer-token auth, per-agent)

| Method | Path                    | Auth                   | Purpose                                      |
| ------ | ----------------------- | ---------------------- | -------------------------------------------- |
| POST   | `/api/agents/register`  | `X-Enrollment-Token`   | Claim a one-time token, return `agent_id` + relay bearer. |
| POST   | `/api/relay/event`      | `Bearer <agent token>` | Ingest one relay payload (event / verdict / status). |

### Operator-gated (session cookie)

| Method | Path                                          | Min role | Purpose                                  |
| ------ | --------------------------------------------- | -------- | ---------------------------------------- |
| GET    | `/`                                           | viewer   | Dashboard HTML (302 to `/login` if no session). |
| GET    | `/api/status`                                 | viewer   | Aggregated KPIs (`agents_online/total`, `threats_24h`, …). |
| GET    | `/api/agents`                                 | viewer   | List every known agent with snapshot.    |
| GET    | `/api/agents/:id`                             | viewer   | Drill-down snapshot for one agent.       |
| POST   | `/api/agents/:id/revoke`                      | admin    | Mark an agent as revoked.                |
| POST   | `/api/enrollment-tokens`                      | admin    | Issue a new enrollment token. Plaintext is in the response — store nothing server-side. |
| GET    | `/api/enrollment-tokens`                      | admin    | List every issued token (audit). Plaintext is never returned; only the SHA256 `token_hash` for revoke. |
| POST   | `/api/enrollment-tokens/:tokenHash/revoke`    | admin    | Revoke an issued token by its hash.      |
| WS     | `/ws`                                         | viewer   | Live fanout of every relay event.        |

## Architecture

```
                  +---------------------------+
                  |  Browser (operator)       |
                  |  cookie: pgm_session      |
                  +-------------+-------------+
                                |
                         HTTP + WS (gated)
                                |
                                v
+------------+    POST /register +X-Enrollment-Token   +----------+
| Guard host | -------------------------------------> |          |
+------------+                                        |          |
+------------+    POST /relay/event +Bearer agent-tok | manager  |
| Guard host | -------------------------------------> |  (8090)  |
+------------+                                        |          |
+------------+                                        |          |
| Guard host | -------------------------------------> |          |
+------------+                                        +----+-----+
                                                           |
                                                           v
                                                    manager.db
                                                  (single SQLite)
```

A single SQLite file holds:

- `agents` — registered Guards (agent_id, hostname, OS, version, relay token, revoked flag).
- `operators` + `operator_sessions` — dashboard credentials (scrypt-hashed passwords, sha256-hashed session tokens) and live sessions.
- `enrollment_tokens` — one-time tokens that gate `/api/agents/register`; plaintext is sha256-hashed at rest.
- `agent_events` — every relayed event / verdict / status, kept for 30 days by default (configurable). Indexed for fast 24h threat counting.
- `schema_version` — applied migrations tracking.

## Security posture

| Concern                               | Mitigation                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Open admin surface                    | All admin endpoints require a session cookie; revoke / enrollment-issue require `admin` role. |
| WebSocket subscription                | `/ws` upgrade is rejected without a valid session cookie.                                    |
| Brute-force / username enumeration    | scrypt KDF runs even on unknown usernames so timing is constant.                             |
| Replay against a leaked `manager.db`  | Operator session tokens and enrollment tokens are stored as sha256 hashes — the DB has no plaintext to replay. Agent relay tokens remain plaintext at rest (parity with the legacy JSON registry); rotating them is a follow-up. |
| Open agent registration               | `/api/agents/register` requires an `X-Enrollment-Token` issued by an admin; consume is atomic via conditional UPDATE so two concurrent registers cannot both claim the same token. |
| Last-admin lockout                    | `setDisabled` refuses to disable the last active admin.                                      |
| World-readable on-disk credentials    | `manager.db` and the WAL/SHM auxiliary files are forced to mode `0600` on every open.        |
| Resource exhaustion                   | Per-IP HTTP rate limit (240 req / 60s window); WebSocket client cap (50); request body cap (64 KB). |

## Performance (steady-state read path)

Measured on a 2024 M-class laptop using the `tests/perf-smoke.test.ts` harness, seeded with 10,000 active agents and 50,000 `agent_events` rows (~10.6 MB on-disk DB):

| Endpoint                 | p50      | p99      |
| ------------------------ | -------- | -------- |
| `GET /api/status`        | ~5 ms    | ~17 ms   |
| `GET /api/agents`        | ~16 ms   | ~34 ms   |
| `GET /api/agents/:id`    | ~0.2 ms  | ~0.3 ms  |

To re-run locally:

```bash
PANGUARD_PERF=1 pnpm --filter @panguard-ai/panguard-manager test --run tests/perf-smoke.test.ts
```

Override via env: `PANGUARD_PERF_AGENTS` (default 10000), `PANGUARD_PERF_EVENTS` (5), `PANGUARD_PERF_LIST_BUDGET` (500ms ceiling), `PANGUARD_PERF_DETAIL_BUDGET` (100ms ceiling).

## Deploy

Build the container image from the monorepo root (the Dockerfile sits in this package but the build context is the repo root):

```bash
docker build -f packages/panguard-manager/Dockerfile -t panguard-manager:0.1.0 .
```

Run it with a mounted volume for the SQLite file:

```bash
docker run -d \
  --name panguard-manager \
  -p 8090:8090 \
  -v /var/lib/panguard-manager:/data \
  panguard-manager:0.1.0
```

The dashboard is reachable at `http://<host>:8090/`. **Run `panguard-manager init` inside the container the first time** to bootstrap the admin operator and print the password — it is shown only once.

### Airgap deployment

The container image is a single self-contained tarball — no internet access is needed at runtime. Save and ship it like so:

```bash
docker save panguard-manager:0.1.0 | gzip > panguard-manager-0.1.0.tar.gz
# copy to airgapped host
gunzip < panguard-manager-0.1.0.tar.gz | docker load
```

Once `panguard-manager` is running, every Guard reaches it over a normal HTTP / HTTPS upstream — the Guards do not need outbound internet either.

## Limitations (today)

- Agent relay tokens remain plaintext in `manager.db`. The session and enrollment tokens are already hashed at rest; rotating the agent tokens to a hash-at-rest scheme will require a Guard-side config update and is tracked as a follow-up.
- Pagination is not yet implemented for `/api/agents`. With 10k agents the response is ~5 MB; the perf smoke shows the server can serve it in ~30 ms p99 but the browser still has to parse it.
- Adding additional operators today goes through the programmatic API; a `panguard-manager operator create` CLI subcommand is planned.
- Multi-tenancy: one Manager instance = one fleet. Splitting tenants requires running separate instances.
