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
