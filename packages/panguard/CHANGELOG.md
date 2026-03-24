# Changelog

All notable changes to Panguard AI will be documented in this file.

## [1.3.2] - 2026-03-25

### Added
- **`pg` shortcut command.** Two characters to invoke Panguard from anywhere. Works exactly like `panguard`.
- **`pg up` quick start.** Start protection + dashboard in one command. No more `panguard guard start --dashboard`.
- **First-run auto-detection.** Run `pg` for the first time and setup wizard starts automatically.
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
