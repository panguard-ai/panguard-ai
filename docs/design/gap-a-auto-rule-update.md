# Gap A — background auto-update of detection rules (compromise design)

Status: slice 1 (verified-pull foundation) + slice 2 (advise-cap load +
enforce-on-trust for the tool-call hook path) landed, adversarially verified.
Daemon async-response advise-cap is a documented follow-up (see below).

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

## Slice 2 (LANDED — advise-cap load + enforce-on-trust on the tool-call hook path)

The path a developer actually FEELS in real time is the per-tool-call hook
(`pga hook run` on Bash/Edit/WebFetch/MCP), evaluated by `ProxyEvaluator`. That
is the exact FP-scar surface, so slice 2 gates it end-to-end:

1. config `autoUpdateTrustedVersion?: string` — the bundle version whose
   auto-pulled rules are trusted to ENFORCE.
2. `resolveStagedAutoRules(dataDir, trustedVersion)` (lean `./auto-rules`
   subpath) decides `adviseOnly = !trusted || staged > trusted`. Single source
   of the advise-vs-enforce decision.
3. `ProxyEvaluator.loadAutoRules(dir, {adviseOnly})` merges only FRESH rule ids
   (ids not already bundled stay as their trusted bundled copy) and records the
   fresh ids in `adviseOnlyIds`. `evaluate()` excludes advise-only ids from the
   hard-deny decision — they can surface an 'ask' but never a 'deny'.
4. Enforce-posture safety: `EvalResult.adviseOnly` flags an 'ask' driven ONLY by
   advise-only rules; the hook does NOT escalate such an 'ask' to a block even
   under `--enforce`. So a fresh rule cannot wall off a tool under ANY posture
   until trusted.
5. The hook wires steps 2–3 in behind `readAutoUpdateSettings()` (opt-in).
6. CLI `pga guard trust-updates` shows the N fresh rules and, on confirm, writes
   `autoUpdateTrustedVersion` (atomically, to the config file the daemon reads).

### Adversarially verified (3 independent skeptics)

- A fresh (untrusted) auto-pulled critical rule DETECTS ('ask') but never blocks
  — under guarded AND enforce postures. Armed (trusted) => 'deny'.
- Enforce floor intact: no bundled/trusted rule can stop blocking; no bundled id
  can enter `adviseOnlyIds`.
- Tamper (slice 1): an integrity-mismatched bundle is never extracted/loaded.
- Trust persistence writes the file the daemon actually reads; corrupt config
  fails SAFE (defaults off, does not fall through to an enabling master config).

## Known limitations / documented follow-ups

- Daemon async-response path: the daemon (`event-processor` → confidence-
  threshold `actionPolicy`) does NOT yet load `<dataDir>/auto-rules/`. So
  auto-pulled detections do not yet surface on the dashboard/telemetry until
  trusted+installed. No safety gap (the daemon simply doesn't see them); it is a
  visibility follow-up that needs the confidence-cap treatment, not the
  hook's shouldHardDeny gate.
- Re-shipped severity upgrade: `loadAutoRules` keeps the bundled copy on an id
  collision, so a newer bundle that UPGRADES an existing rule's severity is not
  applied by auto-update (net-new ids only). Safe (never weakens the floor),
  applied on the next full `pga upgrade`.
- Rollback: trusting version N trusts all staged versions `<= N`. Re-arming an
  older bundle requires local write access to `<dataDir>/auto-rules/`, which
  already bypasses the npm integrity anchor — no new remote surface.
