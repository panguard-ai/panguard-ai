# @panguard-ai/panguard-manager

Self-hosted fleet aggregator for PanGuard Guard endpoints. Runs in your own infrastructure (on-prem, VPC, or airgap), receives relay events from every Guard you deploy, and exposes a single dashboard that aggregates state across the entire fleet. Designed for multi-endpoint Pilot and Enterprise customers who need one pane of glass instead of SSH-ing into each machine.

## What it is

PanGuard Manager is a Node 22 HTTP + WebSocket server that:

- registers Guard agents over `POST /api/agents/register` and issues a bearer token per agent
- accepts relayed `SecurityEvent` and `ThreatVerdict` payloads from each Guard's `DashboardRelayClient`
- aggregates state in memory (events, threat counters, last-seen) keyed by `agent_id`
- persists the agent registry to a single JSON file (`agents.json`) — no database, no external dependencies
- serves the same sage-themed PanGuard dashboard, with a fleet-aware Overview, Agents page, Threats page, and Events page

## Deploy

Build the container image from the monorepo root (the Dockerfile sits in this package but the build context is the repo root):

```bash
docker build -f packages/panguard-manager/Dockerfile -t panguard-manager:0.1.0 .
```

Run it with a mounted volume for the registry:

```bash
docker run -d \
  --name panguard-manager \
  -p 8090:8090 \
  -v /var/lib/panguard-manager:/data \
  panguard-manager:0.1.0
```

The dashboard is now reachable on `http://<host>:8090/`.

### Airgap deployment

The container image is a single self-contained tarball — no internet access is needed at runtime. Save and ship it like so:

```bash
docker save panguard-manager:0.1.0 | gzip > panguard-manager-0.1.0.tar.gz
# copy to airgapped host
gunzip < panguard-manager-0.1.0.tar.gz | docker load
```

Once `panguard-manager` is running, every Guard reaches it over a normal HTTPS upstream — the Guards do not need outbound internet either.

## Configure each Guard to relay

Each PanGuard Guard knows how to relay events upstream via the `DashboardRelayClient`. Point a Guard at the Manager with two environment variables and one register call:

1. Register the Guard once (the Manager returns an `agent_id` and a `token`):

   ```bash
   curl -X POST https://manager.customer.com/api/agents/register \
     -H 'Content-Type: application/json' \
     -d '{"hostname":"web-01","os_type":"linux","panguard_version":"1.5.6","machine_id":"$(cat /etc/machine-id)"}'
   # → { "ok": true, "data": { "agent_id": "agent_…", "token": "…" } }
   ```

2. Configure the Guard with the manager URL and the registration token:

   ```bash
   export PANGUARD_RELAY_URL=https://manager.customer.com
   export PANGUARD_RELAY_TOKEN=<token from step 1>
   export PANGUARD_AGENT_ID=<agent_id from step 1>
   panguard-guard run
   ```

The Guard's `DashboardRelayClient` opens a WebSocket up to the Manager and forwards every dashboard event in real time. Token validation happens server-side on every relay call.

## CLI commands

```
panguard-manager serve [--port 8090] [--host 0.0.0.0] [--data-dir ~/.panguard-manager]
panguard-manager init  [--data-dir ~/.panguard-manager]
panguard-manager agents list [--data-dir ~/.panguard-manager]
```

`init` creates the data directory, an empty `agents.json`, and a minimal `config.json`. `agents list` prints the registered agents (including any that have been revoked).

## API surface (all responses use the standard PanGuard envelope `{ ok, data?, error?, request_id }`)

| Method | Path                     | Auth             | Purpose                                             |
| ------ | ------------------------ | ---------------- | --------------------------------------------------- |
| GET    | `/healthz`               | -                | Liveness probe                                      |
| GET    | `/`                      | -                | Fleet dashboard HTML                                |
| GET    | `/api/status`            | -                | Aggregated KPIs (`agents_online/total`, …)          |
| GET    | `/api/agents`            | -                | List every known agent with snapshot                |
| GET    | `/api/agents/:id`        | -                | Drill-down snapshot for one agent                   |
| POST   | `/api/agents/register`   | -                | Register a new Guard, returns `{ agent_id, token }` |
| POST   | `/api/agents/:id/revoke` | -                | Mark an agent as revoked                            |
| POST   | `/api/relay/event`       | `Bearer <token>` | Ingest a relay event from a Guard                   |
| WS     | `/ws`                    | -                | Live fanout of every relay event                    |

## Architecture

```
+----------------+        WebSocket relay         +-----------------+
|  Guard (host1) | -----------------------------> |                 |
+----------------+                                |                 |
+----------------+                                |                 |
|  Guard (host2) | -----------------------------> |  panguard-      |
+----------------+   POST /api/relay/event        |  manager        |
+----------------+                                |  (8090)         |
|  Guard (host3) | -----------------------------> |                 |
+----------------+                                |                 |
                                                  +--------+--------+
                                                           |
                                                           v
                                                   Browser dashboard
                                                       (WS fanout)
```

## Limitations (today)

- State is held in memory and rebuilt on restart from `agents.json` (registry survives, events do not). For long-term retention pair the Manager with the Threat Cloud upload pipeline.
- Manager-to-Guard configuration push is not yet exposed (read-only fleet view).
- No multi-tenancy: one Manager instance = one fleet.
