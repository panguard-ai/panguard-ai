# TODOS

Deferred work items from pre-launch review (2026-03-14).

## ~~P1 - Guard Engine Refactor~~ DONE (2026-03-14)

Split guard-engine.ts (1,516 lines) into: rule-loader.ts, rule-sync.ts, event-processor.ts, response-engine.ts, guard-lifecycle.ts

## ~~P2 - serve.ts Refactor~~ DONE (2026-03-14)

Split serve.ts (1,649 lines) into: serve-auth.ts, serve-admin.ts, serve-tc.ts, serve-core.ts, serve-types.ts

## ~~P2 - Validation Consolidation~~ DONE (2026-03-14)

Consolidated with Zod schemas in packages/core/src/validation.ts (commit 25f28cb3)

## ~~P2 - CSP Nonce for Website~~ DONE (already implemented)

middleware.ts generates per-request nonce, builds CSP header, all inline scripts use nonce attribute via getNonce() helper.

## ~~P2 - Memory Monitoring for Guard~~ DONE (already implemented)

All 3 items already exist in guard-engine.ts: checkMemoryPressure() with 60% warning / 80% critical thresholds, consecutive-check tracking, forced GC, and memory_critical event emission.

## ~~P3 - respond-agent.ts Refactor~~ DONE (2026-03-15)

Split respond-agent.ts (1,171 lines) into: types.ts, safety-rules.ts, action-rate-limiter.ts, evidence-extractor.ts, action-manifest.ts, escalation-tracker.ts, os-actions.ts (commit d2a35c82)

## ~~P3 - interactive.ts Refactor~~ DONE (2026-03-15)

Split interactive.ts (1,912 lines) into: lang.ts, menu-defs.ts, render.ts + 5 action files (commit d2a35c82)

## ~~P3 - E2E Test Coverage~~ DONE (2026-03-15)

Added: legal-pages.spec.ts (8 legal pages + zh variants), mobile-responsive.spec.ts (viewport, hamburger, overflow), locale-switch.spec.ts (EN/ZH switching, persistence), enhanced navigation.spec.ts (product pages, footer links, content pages).

## P2 - Merge TC Handler + ATR Engine Triple Implementation (L) — PARTIAL

**Scan engine unified (2026-03-22):** `@panguard-ai/scan-core` package created. CLI Auditor, Website, and Guard now share one scan engine with unified hash computation. Flywheel hash consistency fixed.

**Remaining:** TC handler duplication (serve-tc.ts vs server.ts — same 7 API endpoints). Extract shared handler logic into a common module.

## P2 - Flywheel Core Component Unit Tests (XL)

The 6 flywheel core components currently have minimal direct test coverage:

- `skill-watcher.ts` (SkillWatcher: config watch, auto-audit trigger, blacklist check)
- `llm-reviewer.ts` (LLM reviewer: analyzeSkills, reviewProposal, parseVerdict)
- `rule-sync.ts` (Rule sync: ATR cloud sync, IP/domain blocklist refresh)
- `server.ts` (TC server: all 7 POST handlers with Zod validation)
- `atr-action-handlers.ts` (ATR actions: quarantine, reduce permissions, path sanitization)
- `os-actions.ts` (OS actions: isolateFile with SAFE_PATHS/DENY_PATHS)

Target: unit tests covering happy path, error path, and edge cases (path traversal, malformed input, LLM failure) for each component.

Additionally: `atr-engine.ts` `resolveBundledRulesDir()` now has a 4-layer fallback chain (createRequire → CLI argv → walk node_modules → bundled-rules) that is critical for npm -g installs. Needs mock-based unit tests to verify each fallback triggers correctly when prior strategies fail.

## P2 - scan-core Unit Tests (M) — IN PROGRESS (2026-03-22)

`packages/scan-core/` core scan logic (extracted from website route.ts) needs unit test coverage:

- `hash-utils.ts` — contentHash (16-char hex), patternHash (unified `scan:` prefix)
- `risk-scorer.ts` — dedup by ID, contextMultiplier, critical override logic
- `atr-engine.ts` — compileRules (safe-regex validation, (?i) flag), scanWithATR (two-pass)
- `scanner.ts` — scanContent() end-to-end (empty input, benign, malicious)
- `manifest-parser.ts` — frontmatter parsing, fallback behavior

Basic tests being written. Full coverage (edge cases, ReDoS rejection, cloud rule merge) still needed.

## ~~P2 - FinalCTANew i18n Restoration~~ DONE (2026-03-16)

Restored `useTranslations('home.finalCta')` in FinalCTANew.tsx. Full EN + ZH translations added in landing page redesign commit (b6089fef).

## P3 - Dashboard WebSocket Token Auth (S)

Guard dashboard WebSocket endpoint (`/ws`) has no authentication. Add token-based auth: generate a one-time token on dashboard page load, validate on WS upgrade, reject unauthenticated connections. Low risk since dashboard binds to localhost, but needed for defense-in-depth.

## P2 - Knowledge Distiller: Convert to ATR Output Format (M)

`packages/core/src/ai/knowledge-distiller.ts` currently generates Sigma YAML rules from learned event patterns. With the Sigma RuleEngine removed, these generated rules have no consumer. Convert the distiller to output ATR-format rules instead, enabling the local learning flywheel:

Events observed → Pattern learned → ATR rule generated → ATR Engine loads → Better detection

The distiller uses LLM to generate rules — main change is updating the prompt template and output parser to produce ATR YAML instead of Sigma YAML. Threat Cloud already has ATR rule creation infrastructure that can be referenced for format.

## P3 - Rename Legacy DB Field: sigma_rule_matched (S)

`packages/threat-cloud/src/database.ts` and `packages/panguard-guard/src/types.ts` still use `sigma_rule_matched` / `sigmaRuleMatched` as a field name. This is a legacy name from when the detection engine was Sigma-based. Should be renamed to `rule_matched` / `ruleMatched` with a DB migration. Low priority since it's internal and doesn't affect functionality.

---

# Migrator-related backlog (from 2026-05-04 plan-eng-review)

These items support the PanGuard Migrator + Threat Cloud integration.
Cross-references with `panguard-enterprise/TODO.md` (private repo).

## P0 - Guard SIGHUP / fsnotify live rule reload (panguard-guard) (M)

Guard currently requires process restart to pick up new rules. Restart
window has 5-30s of zero detection — banks will not accept this for
routine rule updates. Suricata, Snort, Falco all have live reload.

Implementation:

- `kill -HUP <guard-pid>` triggers in-place rule reload
- Optional `watch_rules: true` in `panguard-guard.yaml` enables fsnotify
- Atomic swap so in-flight scans complete on old rules, new scans use new
- Load test: deploy 50 new rules via `pga migrate-pro --deploy-to-guard`
  with telemetry-traffic-replay, verify zero missed events

Effort: ~3-5 days. Critical for first F500 production deployment.

## P0 - Guard CLI: `panguard guard validate <rules-dir>` (panguard-guard) (S)

Migrator's `--deploy-to-guard` needs a dry-run validate before swapping
rules so a syntax-broken rule never reaches the live ruleset. Currently
the migrator backs up + copies, then user manually verifies via
`pga guard restart` — a 30s detection-downtime window.

Acceptance:

- `panguard guard validate /path/to/rules` exits 0 only if all rules
  load without error
- Migrator integrates: validate → atomic rename → restart Guard
- Failed validate triggers automatic rollback (already implemented in
  Migrator's `--rollback-guard` flag)

Effort: ~1-2 days

## P1 - Schema versioning: `SCHEMA_COMPAT.md` in atr repo (cross-org)

ATR schema has no compat policy. Migrator now stamps `target_atr_engine`
range on every output (panguard-enterprise commit 395466d), but Guard
doesn't read it. Without policy + tooling, Migrator v0.5 producing rules
for Guard v3.0 silently mis-parses.

Steps:

1. Open PR to `atr-org/agent-threat-rules` adding `SCHEMA_COMPAT.md`
   documenting each schema version's breaking changes
2. Update Guard rule loader to read `target_atr_engine` and reject
   out-of-range loads with clear error
3. Update PR template in all 3 repos to require schema-bump checklist

Effort: ~1-2 weeks calendar time (community process). CC ~2-3 days
of actual work.

## ~~P2 - npm publish first version of @panguard-ai/migrator-community~~ DONE (2026-05-04)

Published `@panguard-ai/migrator-community@0.1.0` to npm.

- Tarball: 75 files, 46.2 kB packed, 172.9 kB unpacked
- shasum: 9dd2cbcf46361dd402b11f93d14d519bc6b23d5e
- Tag: migrator-community-v0.1.0 (commit 4f07d358)
- CI runs: 25328758797 (dry-run) + 25328920283 (real publish)
- Install verified: `npm install @panguard-ai/migrator-community` resolves
  3 deps cleanly, `panguard-migrate` binary registered, public API
  (convertSigma, validateAtrOutput) round-trips correctly

## P2 - Migrator `/migrator` page CTA: replace mailto with Calendly

Bank CISOs don't email gmail addresses. Replace `mailto:` with a real
Cal.com or Calendly booking link. Half-day work, high signal change.

Cross-ref: `panguard-enterprise/TODO.md` Service polish section.
