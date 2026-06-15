# Changelog

All notable changes to Panguard AI will be documented in this file.

## [1.6.1] - 2026-06-15

### Fixed

- **`pga scan` now runs the bundled ruleset.** The scanner used to shell out to
  whatever `atr` binary happened to be on `$PATH` (or `npx agent-threat-rules@latest`),
  so a user with an older global `atr` silently scanned with a stale, smaller rule
  set (e.g. 462 rules from a 3.2.0 global install instead of the 651 PanGuard ships).
  It now resolves and runs the agent-threat-rules CLI bundled with this install.
- **`pga up` scans before it deploys.** The flow injected runtime protection into
  agent configs first and scanned skills afterwards — the opposite of what the
  command described. It now detects platforms, scans installed skills, surfaces
  threats, and only then injects protection and starts Guard.
- **Honest active-rule count.** `pga up` no longer prints a hardcoded `311`
  fallback (referencing a two-year-old bundled version). It reads the real count
  bundled with the install and never reports fewer rules than are actually loaded.
- **English-only Guard dashboard data.** Anomaly-baseline deviation descriptions
  and investigation reasoning were bilingual (English + Chinese) and surfaced into
  the dashboard via verdict evidence. They are now English-only.

## [1.6.0] - 2026-06-15

### Security

- **Installed-footprint hardening.** Removed command-injection vectors in the
  scanner and notifications (`execSync` → `execFileSync` with validated args),
  hardened the Guard dashboard write surface (removed the `ai-config` POST,
  added CSRF Origin checks, token-gated the WebSocket), tightened on-disk file
  permissions (`0o600`/`0o700`), and constrained cloud-rule YAML parsing to a
  safe schema. systemd services now run as the installing user, never root.
- **Threat Cloud contributor hashing fails closed.** `TC_HASH_SECRET` no longer
  falls back to a known default; the server refuses to hash without a real
  secret (documented in `.env.example`).
- **Manager API auth.** `register`/`revoke` now require a pre-shared
  `MANAGER_AUTH_TOKEN`, and the server refuses to bind a non-loopback host
  without one (fail closed).

### Changed

- **ATR rules 3.2.0 → 3.4.0 (462 → 651 rules).** Every component — CLI, Guard,
  scanner, and the website scanner bundle — now runs the current published ATR
  ruleset instead of a four-month-old snapshot.
- **Website honesty pass.** Single-sourced the rule count, unified Garak recall
  to 98%, removed NVIDIA from "adopted by" claims (its garak PR is still open),
  fixed dead GitHub links, reconciled the FAQ with the Pricing page (every
  product feature free; paid = optional services for regulated orgs), and made
  the live rule-stats endpoint return real counts from the deployed bundle.
- **Docker/remote deploys.** `OllamaProvider` now reads `OLLAMA_ENDPOINT` /
  `OLLAMA_HOST`, so a containerised Guard can reach a non-localhost Ollama.

## [1.4.15] - 2026-03-28

### Added

- **Activation tracking.** First `pga up` reports anonymous activation to Threat Cloud (client ID, platform, OS, version). One-time only. Helps us understand how many real users are out there.

### Fixed

- **False positive reduction.** ATR engine now detects markdown code blocks and suppresses matches inside them. Shell commands and file paths in documentation examples no longer trigger CRITICAL/HIGH alerts.
- **ATR-111 backtick pattern narrowed.** Only matches dangerous commands inside backticks, not all inline code.

## [1.3.3] - 2026-03-25

### Added

- **`pga` shortcut command.** Two characters to invoke Panguard from anywhere. Works exactly like `panguard`.
- **`pga up` quick start.** Start protection + dashboard in one command. No more `panguard guard start --dashboard`.
- **First-run auto-detection.** Run `pga` for the first time and setup wizard starts automatically.
- **Guard welcome guide.** First time Guard starts, you see all commands and what Guard does. Shows once.
- **Stealth attack detection.** `<IMPORTANT>` block attacks and silent data exfiltration are now caught as CRITICAL.
- **"What's new" on upgrade.** After updating, first run shows what changed. You're reading it now.

### Fixed

- **Skill Auditor false positives reduced.** Normal skills (weather, github, slack, notion) no longer flagged as MEDIUM/HIGH. Scans now strip code blocks and negation sections before pattern matching.
- **Audit output cleaned up.** No more JSON log lines in non-verbose mode.

### Changed

- **Permission check is context-aware.** Database regex no longer matches "update a page". Credential check distinguishes theft from legitimate handling.
- **Context signals expanded.** Recognizes curl/git/wget as known CLI tools. API integrations get proper reducer. Structured frontmatter check relaxed.
- **Instruction patterns use two-pass matching.** Tool poisoning patterns found only in code blocks are automatically downgraded.

## [1.3.1] - 2026-03-23

### Added

- Zero-interaction install scripts with `--yes` flag
- Platform-aware scan commands and AI skip guidance

### Fixed

- Test updates for new platforms
- pnpm-lock.yaml sync after optionalDependencies change

## [1.3.0] - 2026-03-20

### Added

- Unified scan-core engine shared between CLI and Website
- Context signals framework (boosters + reducers)
- ATR engine integration with 61 rules
- Threat Cloud flywheel (scan -> propose -> confirm -> promote -> distribute)
- Guard 24/7 runtime protection with TUI dashboard
- MCP server for Claude/Cursor integration
- Bilingual support (EN + Traditional Chinese)
