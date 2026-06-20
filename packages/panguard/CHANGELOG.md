# Changelog

All notable changes to Panguard AI will be documented in this file.

## [1.7.0] - 2026-06-20

GA hardening of the free Community product — the full path from website to
install to activation to real protection, with a security review of the install
package itself. Two adversarial audits (security + product readiness) drove this
release; the items below are the confirmed, fixed, and verified findings.

### Added

- **Guard dashboard 1.7.** New Coverage, Runtime, and Threat Cloud tabs;
  one-click threat actions (quarantine / whitelist / restore); an honest
  three-state Guard mode (Learning / Report-only / Protection); a
  collective-defense opt-in control (off by default); and a redesigned Alert
  Channels page — zero-config by default, with each optional channel shown as a
  copy-paste config line (secrets go in the file, never the dashboard).
- **`pga guard ai`** (alias of `setup-ai`) connects the optional semantic layer
  (Layer C). It auto-detects a local Ollama runtime (free, private, nothing
  leaves the machine) or persists a cloud key encrypted at rest
  (`~/.panguard-guard` is unaffected; the key lives AES-256-GCM-encrypted in
  `~/.panguard/llm.enc`, `0600`) so the reboot-surviving daemon can actually read
  it — a shell environment variable could not. `pga guard ai --remove` turns it
  off. Layer C is advisory and can never auto-block.
- **Multi-platform PreToolUse hooks** across seven agent platforms, and
  `pga hook uninstall --all` / `--platform` to remove them.

### Fixed

- **`pga scan --all` reported known-malicious skills as clean.** The batch path
  read a non-existent `findings` field from the ATR JSON, so every skill counted
  clean. It now parses the real schema (`threats_detected` / `results[].matches`)
  — a malicious skill is flagged.
- **`pga status` disagreed with `pga guard status`.** It read only the legacy
  master config and printed "Config: Not initialized" while the daemon was
  running. It now consults the canonical Guard config + live engine and agrees.
- **`pga doctor`** read the wrong config path (reporting a fresh install as
  broken) and claimed Threat Cloud shared findings "by default"; it now reads the
  canonical config and shows Threat Cloud as opt-in / off.
- **`pga -v`** printed nothing useful and fell through to the first-run setup
  wizard (which wrote config files); it now prints the version and exits.
- **Dashboard mode + collective-defense toggles** reported success but reverted,
  because the daemon never reloaded its config. They now apply live (the engine
  re-arms for the new mode) and two saves no longer clobber each other.
- **`pga audit skill <missing-path>`** returned a green PASS; it now errors. The
  default (cloud) audit no longer hangs ~120s after printing its report.
- **Honest posture end to end.** Zero loaded rules now shows DEGRADED instead of
  a green "PROTECTED" / all-clear; Report-only never displays PROTECTED; an
  unauthenticated dashboard shows an explicit "run `pga up`" screen instead of a
  static green "Active" badge.
- **English-only CLI/daemon output** (first-run consent prompt, interactive menu
  footer, config-load logs) and a renumbered interactive menu (no dead key).
- **Secondary CLIs.** `threat-cloud --version`/`--help` no longer boot a full
  HTTP server (now gated behind `threat-cloud serve`); `panguard-skill-audit`
  with no args prints help instead of silently scanning the current directory and
  dumping structured logs.
- **Cross-platform.** The unscoped `panguard` redirect no longer crashes on
  Windows (`pathToFileURL`); Linux persistence uses rootless `systemctl --user`.

### Security

- **`pga scan` no longer uploads to Threat Cloud without consent.** The bundled
  scanner reports anonymously by default; both `pga scan` paths now force
  `--no-report` and strip any inherited `TC_API_KEY` unless the user has
  explicitly opted in (consent stays default-off). A user-facing `--no-report`
  flag was added. Verified: a non-consented scan makes zero network calls.
- **Install package hardened (curl / PowerShell / Homebrew).** The installers now
  activate through the single hardened `pga up` path — real rule/threat counts,
  reboot-survival, and an authenticated dashboard URL — and the hardcoded fake
  "61 rules / learning mode day 1/7" lines were removed. Prebuilt-binary checksum
  verification is now fail-closed: an unverifiable binary is never installed (it
  falls back to a local source build). The served and source installer copies are
  kept byte-identical.
- **Corrupt config fails safe.** A malformed `config.json` no longer silently
  restores `protection` mode (discarding the user's telemetry opt-out); it falls
  back to the most conservative posture (report-only, telemetry + uploads off)
  with a prominent warning, and preserves the corrupt file.
- **Cloud rule sync fails closed** (an unsigned/unverifiable update loads zero
  rules with a loud warning, never silently); community blacklist revocation now
  requires a confidence threshold, resisting MITM/poisoning.
- **Outbound SSRF guards.** A shared validator (https-only; blocks
  private / reserved / loopback-metadata / IPv4-mapped-IPv6 addresses) now gates
  Threat Cloud provisioning, telemetry, notification webhooks, the dashboard
  endpoint, and the trap uploader; outbound `fetch` uses `redirect: 'error'`.
- **Hardening.** ReDoS checks on engine + LLM-generated regex; Slack/Discord
  webhook URLs redacted from config dumps and `/api/config`; removed argv secret
  flags (`threat-cloud` admin/Anthropic keys, `panguard-chat` Telegram token);
  config files written `0600`; `panguard-chat` config dump redacted; the PreToolUse
  hook fails open when `pga` is missing so an orphaned hook can't brick an agent.
- **Dependencies.** `ws` → `^8.21.0` (GHSA-96hv-2xvq-fx4p), `hono` override
  → `>=4.12.25`. A LICENSE file now ships in every published package.
- **Claims.** Trade-libel cleanup, defensible benchmark numbers, and rule counts
  realigned to the bundled ATR ruleset (650+, sourced dynamically).

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

### Security

- **Detection rules no longer live-apply from a network relay.** The Guard daemon
  used to pull ATR rule content from Threat Cloud every 5 minutes and apply it to
  the engine with no review — a supply-chain attack surface (a compromised or
  MITM'd relay could push ReDoS or auto-blocking rules to every client). Rules now
  ship bundled with the npm package (integrity-verified, immutable, publicly
  auditable) and change only via an explicit `pga upgrade`. A once-a-day check
  against the npm registry NOTIFIES when a newer published ruleset is available;
  it never downloads or applies rules automatically. Threat-indicator feeds
  (IP/domain blocklists, community skill lists) are unaffected.

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
