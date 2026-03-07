# Phase 2 Friction Report (User-First)

Date: 2026-03-03
Workspace: `/Users/user/Downloads/panguard-ai`
Tester: Codex (command-level simulation)

## Executive Summary
- CLI baseline is runnable (`v0.2.6`) and command surface is rich.
- Two P0 frictions block first-time onboarding in restricted environments: local callback listen `EPERM` and local scan `uv_uptime EPERM` hard-fail.
- Web/CLI OAuth flow is partially wired but inconsistent with backend canonical routes (`/api/auth/cli`, `/api/auth/cli/exchange`).
- API base URL defaults are inconsistent between CLI and web, creating environment drift risk.
- Remote scan flow works and produces clear machine-readable + human-readable output.

## Persona A: Individual Developer Journey

| Step | Expected | Actual | Friction | Severity | Fix |
|---|---|---|---|---|---|
| Check install | CLI available | `node ... --version` => `0.2.6` | None | P2 | Keep |
| Login help | Understand login options | `login --help` clear | None | P2 | Keep |
| Login (`--no-browser`, fresh HOME) | Print URL and wait for callback | Fails with `listen EPERM: operation not permitted 127.0.0.1` | Requires local HTTP listen even in restricted/headless context | P0 | Add device-code mode or poll-based exchange without local listener |
| Quick scan | First value in <= 60s | `scan --quick` fails: `uv_uptime EPERM` | Full scan aborts on one permission error | P0 | Degrade gracefully: skip restricted probes, continue with partial result + warning |
| Guard start | Start daemon or actionable guidance | Fails: `EPERM ... panguard-guard.pid` | Permission failure message is raw; no fallback path | P1 | Add explicit remediation paths (`--data-dir`, non-daemon mode, permission fix hints) |
| Doctor | Diagnose setup gaps | Gives clear pass/warn/fail and fix commands | Good UX | P2 | Keep and surface `doctor` earlier in onboarding |

## Persona B: SMB / IT Admin Journey (single machine simulation)

| Step | Expected | Actual | Friction | Severity | Fix |
|---|---|---|---|---|---|
| whoami (`--json`, fresh HOME) | Not authenticated status | `{"authenticated":false}` | None | P2 | Keep |
| Access paid features unauth | Clear plan + upgrade path | Shows generic auth-required box | Does not show "why this plan" context before auth | P1 | Distinguish `not logged in` vs `logged in but insufficient tier`; include feature/tier requirement |
| report/trap/manager discoverability | Admin can map capabilities | `--help` outputs are clear | None | P2 | Keep |
| Multi-endpoint workflow | Standardized rollout path | Not explicit in CLI flow | Missing guided multi-device onboarding | P1 | Add `panguard quickstart team` wizard and checklist export |

## Persona C: Website Owner Journey (Remote Scan)

| Step | Expected | Actual | Friction | Severity | Fix |
|---|---|---|---|---|---|
| Remote scan JSON | Actionable machine-readable report | Works: risk score, findings, remediation | Good | P2 | Keep |
| Remote scan human output | Executive-readable summary + next action | Works and saves file | Grade + risk can be confusing without baseline | P1 | Add "Top 3 actions in priority order" and confidence/source notes |
| Save report for sharing | Durable artifact | `/tmp/panguard-persona-c-remote.json` created | None | P2 | Add markdown/brief export option for non-technical stakeholders |

## Top 10 Frictions
1. P0: `panguard login --no-browser` still depends on local callback server; fails in restricted env (`listen EPERM`).
2. P0: `panguard scan --quick` hard-fails on `uv_uptime EPERM` instead of partial scan.
3. P1: Guard startup writes PID under home path and fails with raw `EPERM` without guided fallback.
4. P1: Web login CLI callback path uses direct query (`cli_callback`) rather than backend exchange as source of truth.
5. P1: Google OAuth path does not clearly preserve/complete CLI flow context.
6. P1: API base URL defaults diverge (CLI `https://panguard.ai` vs web `https://api.panguard.ai`).
7. P1: Unauthenticated access to paid commands shows generic auth prompt, not feature/tier requirement context.
8. P1: Remote scan report lacks prioritized "do this first" section for non-security owners.
9. P2: Onboarding does not enforce/provide a 5-step progress model (signup -> login -> scan -> guard -> notify).
10. P2: Team rollout (SMB multi-endpoint) lacks guided workflow command.

## Priority Plan

### This Week
- Fix P0 login mode: add non-listener auth mode (device code / exchange polling).
- Fix P0 scan resilience: permission-denied checks become warnings, not fatal.
- Align CLI login with `/api/auth/cli` and `/api/auth/cli/exchange`.
- Normalize API base URL strategy and document env patterns.

### Next Week
- Improve guard startup UX and fallback paths.
- Add onboarding progress state model in web dashboard.
- Add "Top 3 actions" section to remote scan outputs.
- Add SMB/team quickstart wizard.

## Suggested KPIs
- `time_to_first_scan_seconds`
- `first_scan_success_rate`
- `scan_partial_success_rate`
- `time_to_guard_running_seconds`
- `oauth_cli_completion_rate`

## Web/OAuth Flow Consistency Review
- CLI login currently constructs `/login?cli_state=...&cli_callback=...` directly: `packages/panguard/src/cli/commands/login.ts:78`.
- Backend provides canonical CLI routes: `packages/panguard-auth/src/routes/oauth.ts:124` (`/api/auth/cli`) and `:159` (`/api/auth/cli/exchange`).
- Web login form expects `cli_state` + `cli_callback` and redirects directly to localhost callback: `packages/website/src/app/[locale]/login/LoginForm.tsx:32-75`.
- Web auth base URL default is `https://api.panguard.ai`: `packages/website/src/lib/auth.tsx:6`.
- CLI auth default is `https://panguard.ai`: `packages/panguard/src/cli/commands/login.ts:26`.

Conclusion: canonical backend CLI exchange routes exist but are not yet the single source of truth in end-to-end UX.

## Commands Run (key)
- `node -v`
- `pnpm -v`
- `node packages/panguard/dist/cli/index.js --version`
- `node packages/panguard/dist/cli/index.js --help`
- `node packages/panguard/dist/cli/index.js doctor --lang en`
- `node packages/panguard/dist/cli/index.js login --help`
- `HOME=/tmp/panguard-fresh-home node packages/panguard/dist/cli/index.js login --no-browser --lang en`
- `node packages/panguard/dist/cli/index.js scan --quick --lang en`
- `node packages/panguard/dist/cli/index.js scan --quick --json`
- `node packages/panguard/dist/cli/index.js guard start`
- `HOME=/tmp/panguard-fresh-home node packages/panguard/dist/cli/index.js report generate --framework soc2`
- `HOME=/tmp/panguard-fresh-home node packages/panguard/dist/cli/index.js trap start`
- `HOME=/tmp/panguard-fresh-home node packages/panguard/dist/cli/index.js scan --target example.com --json`
- `node packages/panguard/dist/cli/index.js scan --target example.com --json`
- `node packages/panguard/dist/cli/index.js scan --target example.com --save /tmp/panguard-persona-c-remote.json`

## Environment Constraints During Test
- Restricted runtime prevented local listener bind in one path (`listen EPERM`).
- Restricted runtime caused local scan probe failure (`uv_uptime EPERM`).
- Browser-interactive OAuth callback could not be fully completed in this command-only run.
