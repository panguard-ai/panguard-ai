# PanGuard CLI — Device Code Flow

This document specifies the authentication protocol used by `pga login`,
`pga logout`, and `pga whoami`. It follows
[RFC 8628 (OAuth 2.0 Device Authorization Grant)](https://datatracker.ietf.org/doc/html/rfc8628)
with PanGuard-specific endpoint names.

The same pattern is used by `gh auth login`, `aws sso login`, and Claude
Code's CLI login. Users do not paste API keys — a short user-code is shown in
the terminal and confirmed in a browser session the user already trusts.

## Why device code flow

- No password / API-key paste — phishable surfaces eliminated.
- Works on headless machines (server, container, CI) where spinning up a
  local HTTP callback is inconvenient.
- One short code (`ABCD-1234`) is readable over a shoulder / voice call,
  while the long `device_code` never leaves HTTPS.
- Polling gives the server full control over rate limits and expiry.

## Endpoints

Default server: `https://app.panguard.ai` (override with `--app-url` or
`PANGUARD_APP_URL`). Every endpoint is HTTPS and responds with JSON.

| Endpoint           | Method | Auth header    |
| ------------------ | ------ | -------------- |
| `/api/device/code` | POST   | none           |
| `/api/device/poll` | POST   | none           |
| `/api/auth/revoke` | POST   | Bearer api_key |
| `/api/me`          | GET    | Bearer api_key |

## Flow

```
CLI                         Server                      Browser (user)
 │                             │                              │
 │ POST /api/device/code       │                              │
 ├────────────────────────────>│                              │
 │                             │                              │
 │ 200 {user_code, device_code,│                              │
 │      verification_uri,      │                              │
 │      verification_uri_      │                              │
 │      complete, expires_in,  │                              │
 │      interval}              │                              │
 │<────────────────────────────┤                              │
 │                             │                              │
 │ Print panel with user_code  │                              │
 │ Open browser to             │                              │
 │ verification_uri_complete   │                              │
 │                             │     User signs in, approves  │
 │                             │<─────────────────────────────┤
 │                             │                              │
 │ Poll POST /api/device/poll  │                              │
 │ every `interval` seconds    │                              │
 │                             │                              │
 │ 428 authorization_pending   │                              │
 │ 428 authorization_pending   │                              │
 │ 200 {api_key, workspace,    │                              │
 │      user}                  │                              │
 │<────────────────────────────┤                              │
 │                             │                              │
 │ Write ~/.panguard/auth.json │                              │
 │ (mode 0600)                 │                              │
 │                             │                              │
```

### `POST /api/device/code`

Request:

```json
{ "client_id": "panguard-cli" }
```

Response 200:

```json
{
  "user_code": "ABCD-1234",
  "device_code": "opaque-server-issued-token",
  "verification_uri": "https://app.panguard.ai/device",
  "verification_uri_complete": "https://app.panguard.ai/device?code=ABCD-1234",
  "expires_in": 900,
  "interval": 5
}
```

`interval` is the minimum number of seconds the CLI should wait between
successive `/api/device/poll` calls.

### `POST /api/device/poll`

Request:

```json
{ "device_code": "opaque-server-issued-token" }
```

Possible responses:

| Status | Body                                   | CLI behaviour             |
| ------ | -------------------------------------- | ------------------------- |
| 200    | `{ api_key, workspace, user }`         | success — persist session |
| 428    | `{ "error": "authorization_pending" }` | keep polling              |
| 429    | `{ "error": "slow_down" }`             | `interval += 5` and retry |
| 400    | `{ "error": "expired_token" }`         | fail with clear message   |
| 400    | `{ "error": "access_denied" }`         | fail (user rejected)      |

Success payload shape:

```json
{
  "api_key": "pga_<60 hex chars>",
  "workspace": { "id": "uuid", "slug": "acme", "name": "Acme Corp", "tier": "pilot" },
  "user": { "email": "attila@panguard.ai" }
}
```

### Local session file

Written to `~/.panguard/auth.json` with mode `0600`:

```json
{
  "api_key": "pga_…",
  "workspace_id": "uuid",
  "workspace_slug": "acme",
  "workspace_name": "Acme Corp",
  "tier": "pilot",
  "user_email": "attila@panguard.ai",
  "logged_in_at": "2026-04-22T…Z"
}
```

The parent directory (`~/.panguard/`) is created with mode `0700` if absent.

### `POST /api/auth/revoke`

Called from `pga logout`. Best-effort — a network failure does not block
removal of the local session file.

Request:

```http
POST /api/auth/revoke
Authorization: Bearer <api_key>
Content-Type: application/json

{}
```

### `GET /api/me`

Called from `pga whoami` for fresh tier / usage info.

Response 200:

```json
{
  "user": { "email": "…", "name": "…" },
  "workspace": { "id": "…", "slug": "…", "name": "…" },
  "tier": "pilot",
  "tier_expires_at": "2026-07-22T00:00:00Z",
  "endpoints_count": 12,
  "events_30d": 345
}
```

If the call fails (offline, 5xx, parse error) `pga whoami` still renders the
cached local session and prints a dim `info` note.

## Error handling

- `expires_in` watchdog — the CLI stops polling once
  `now > start + expires_in * 1000`, regardless of server response.
- Every terminal error is printed to stderr with a short actionable sentence.
  Secrets (`api_key`, `device_code`, Authorization header) are never logged.
- `SIGINT` (Ctrl+C) during the poll loop prints `Login cancelled.` and exits
  with code `130`.

## Secrets discipline

- `api_key` is written only to the local auth file and carried in the
  `Authorization` header. It is never echoed to stdout/stderr and never
  included in error messages.
- `device_code` is a one-shot secret; it is held in process memory and
  discarded after the poll loop exits.
- When re-reading the auth file (`loadAuth`), the returned object is frozen
  with `Object.freeze` so downstream code cannot accidentally mutate the
  session state.

## Related modules

- `src/cli/auth-guard.ts` — public API (`loadAuth`, `authHeader`,
  `requireLogin`, `isAuthenticated`, `authConfigPath`).
- `src/cli/device-flow.ts` — pure helpers (`requestDeviceCode`, `pollOnce`,
  `resolveAppUrl`, `openBrowser`). Dependency-free so it can be unit tested
  with `vi.spyOn(globalThis, 'fetch')`.
- `src/cli/commands/{login,logout,whoami}.ts` — commander glue.
