# Gap A — background auto-update of detection rules (compromise design)

Status: spec + slice 1 (verified-pull foundation, zero engine change) landed.
Slice 2 (load-as-advise + enforce-on-trust, touches both engines) staged for a
dedicated, adversarially-verified build.

## Goal

Keep an installed daemon's detection rules fresh with zero user action
("invisible background protection"), WITHOUT auto-arming new rules to BLOCK the
user's tools (the 2026-06 "11 auto-promoted FP rules" scar). Two levers:

1. `autoUpdateRules` — auto-pull the latest signed bundle + hot-reload. New rules
   DETECT (advise) immediately. Opt-in; safe to default-on for the community
   "invisible" experience because advise never blocks.
2. Enforce-on-trust — auto-pulled rules only gain BLOCK power after a one-time
   `pga guard trust-updates` (or dashboard toggle). Until then they advise only.

## Why this is the right shape

- Rules are executable trust. `checkForRuleUpdates` today deliberately only
  NOTIFIES ("run pga upgrade") — never auto-applies network rules. This keeps
  the supply-chain-safe default while adding an _opt-in_ auto path.
- Distribution is via npm (immutable, provenance-signed) + the existing client
  Ed25519 verifier (`verifyCloudRuleSignature`), NOT a live TC push — a smaller
  attack surface than a high-frequency relay.
- Detection (advise) and enforcement (block) are separated so freshness never
  costs the user a surprise block.

## The two-engine reality (the crux)

- Daemon detection runs through `GuardATREngine` (bundledEngine + main engine).
- The per-tool-call hook + MCP proxy run through `ProxyEvaluator`
  (packages/panguard-mcp-proxy), a SEPARATE engine that loads its own bundled
  rules. This is the primary ENFORCE path for tool calls.
- Therefore auto-pulled rules must reach BOTH engines, and the advise-vs-enforce
  gate must hold in BOTH. This is what makes slice 2 a real, must-verify build.

## Slice 1 (LANDED — the verified-pull foundation; zero engine change)

Scope was deliberately kept to the part that is safe to ship in isolation and
that everything else builds on: fetch + verify + stage. It touches NO engine and
NO decision path, so it cannot change a single block/allow outcome.

- config: `autoUpdateRules?: boolean` (default false; opt-in) — on both the zod
  schema (config.ts) and the `GuardConfig` type (types.ts).
- `verifyTarballIntegrity(buf, integrity)` — the TRUST ANCHOR. Verifies a
  downloaded bundle against the npm SRI `dist.integrity` (sha512/384/256). A
  single flipped byte fails. Adversarially unit-tested (rule-sync-integrity.test.ts:
  tamper, wrong-payload, unknown-algo, malformed → all rejected).
- `pullRuleUpdate(deps)` — when `autoUpdateRules` and `checkForRuleUpdates`
  reports a newer version: fetch the registry metadata, REFUSE any tarball host
  other than `registry.npmjs.org`, download, verify integrity (discard on
  mismatch — never extracted), and extract ONLY `package/rules` from the verified
  archive to `<dataDir>/auto-rules/<version>/`. Never throws into the daemon.
- Wired reachably into the daily `setupRuleUpdateCheckTimer` so an opt-in install
  always keeps a fresh, integrity-verified copy on disk.
- What slice 1 does NOT do: it does not load the staged rules into ANY engine —
  not even advise. So there is provably no detection or enforcement change yet.
  The staged dir is the input the verified engine slice consumes next.

## Slice 2 (staged — load-as-advise + enforce-on-trust; own PR + adversarial verify)

This is the slice that touches the two engines, so it gets its own verified build.

1. Load the staged `<dataDir>/auto-rules/<version>/` rules into `GuardATREngine`
   AND `ProxyEvaluator` on an ADVISE-capped path: they surface as detections on
   the dashboard/telemetry but are excluded from every block decision.
2. config: `autoUpdateTrustedVersion?: string` — the bundle version whose
   auto-pulled rules are trusted to ENFORCE.
3. `GuardATREngine` + `ProxyEvaluator`: tag auto-pulled rules with their source
   version; the hard-deny path (`shouldHardDeny` / the daemon block decision)
   arms a rule only when it is bundled-with-the-install OR its source version
   `<= autoUpdateTrustedVersion`. A newer auto-pulled rule detects but cannot
   block until trusted.
4. CLI `pga guard trust-updates` (+ dashboard toggle): shows the N new
   would-block rules, and on confirm sets `autoUpdateTrustedVersion` to current.
5. Adversarial verify (like 1.8.1–1.8.4): prove (a) an untrusted auto-pulled
   critical rule DETECTS but does NOT block, (b) after trust it blocks, (c) the
   hook engine honors the same gate, (d) integrity failure => no load,
   fail-closed.

## Verification bar for slice 2 (do not merge without)

- Unit + live: an auto-pulled critical rule, untrusted => outcome advise/allow;
  trusted => deny. In BOTH the daemon and the hook path.
- Tamper: a bundle whose integrity fails is never loaded (fail-closed).
- No regression to the shipped-bundle enforce behavior.
