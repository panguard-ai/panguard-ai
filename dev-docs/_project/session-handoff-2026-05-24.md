# Session Handoff — 2026-05-24

This file exists so the next Claude Code session can pick up without
re-doing the conversation. **Read this first before touching pricing,
HONESTY.md, or the three engineering items below.**

---

## Where the work landed

**Branch:** `claude/enterprise-atr-implementation-SxcL7`
**Two commits pushed this session:**

| SHA | Summary |
| --- | --- |
| `2100067` | `docs/HONESTY.md` created (bilingual, public trust asset). Pilot card on `/pricing` reframed from "Founding Customer" → "Design Partner engagement". |
| `827ef2a` | Production-readiness audit landed. `HONESTY.md` §4–§7 rewritten with precise caveats. `/pricing` collapsed from 4 tiers → 3 tiers. Enterprise → "Paused · Waitlist". Sovereign tier card + Sovereign National Reference Track section removed entirely. Founding 5 F500 callout removed. |

**Files of record (these are the source of truth, not marketing pages):**

- `docs/HONESTY.md` — what is shipping vs in-flight vs intentionally not-built
- `docs/architecture/customer-dashboard.md`, `dev-docs/_project/pricing.md` — older internal notes, may now contradict HONESTY.md; HONESTY.md wins

---

## The core decision made this session

The founder asked: _"我做的東西其實真的有價值可以去談價錢嗎？"_ ("Is what I'm building actually valuable enough to charge for?")

After auditing the repo against marketing claims, the answer was:

1. **Yes, Pilot ($25K / 90 days) is honestly priced.** The math: 76–140 founder hours × ATR-domain-expert rates = $179–$329/hr, with seven external production adoptions (Microsoft AGT, Cisco AI Defense, MISP, OWASP A-S-R-H, Gen Digital Sage) validating the underlying technical work.

2. **No, Enterprise ($150–500K) cannot be sold today.** The audit found that the differentiation justifying Enterprise pricing (live rule reload, multi-endpoint fleet, signed compliance auto-generator) is not yet shipping. Selling at $150K+ with Pilot-equivalent delivery scope would be a 6–20× markup on identical work. **Enterprise was moved to waitlist-only.**

3. **No, Sovereign ($5–20M) cannot be sold today.** No closed deal, no airgap installer, no multi-tenant Threat Cloud. **Removed from `/pricing` entirely.** Brief stays at `sovereign-ai-defense.vercel.app` as forward positioning.

4. **The Migrator + AI Governance Compliance modules are the real commercial wedge** — these do NOT conflict with Cisco / Microsoft selling ATR-integrated products downstream, because Cisco / Microsoft don't ship Migrator or compliance evidence generation. The founder's correction on this was important: keep Pilot/Enterprise as a real direct-sales channel for Migrator + Compliance, not gut them in favour of pure standards-maintainer model.

---

## The three engineering items that gate Enterprise tier reopen

From the production-readiness audit. **These are sequenced shortest → biggest:**

### Item 1 — Guard live rule reload (3–5 days)

**Why critical:** Today, `panguard-guard` requires process restart to pick up new ATR rules. The restart window has 5–30 seconds of zero detection. `TODOS.md` flags this P0 with "banks will not accept this for routine rule updates."

**Scope:**
- Add `chokidar` (or native `fs.watch`) on the rule directory
- SIGHUP signal handler that triggers reload
- In-flight event protection (queue + drain pattern)
- Tests for: rule add, rule modify, rule delete, malformed rule (skip + log)

**Files most likely touched:**
- `packages/panguard-guard/src/engines/` (rule engine)
- `packages/core/src/rules/` (already has `fs.watch` infrastructure for hot-reload — check if it generalises)
- New: `packages/panguard-guard/src/engines/rule-reload.ts`
- Tests in `packages/panguard-guard/tests/`

### Item 2 — panguard-manager JSON → SQLite + multi-endpoint fleet auth (1–2 weeks)

**Why critical:** Today `panguard-manager` persists fleet state in a JSON file. Will not scale past ~10–20 endpoints. Multi-tenant isolation does not exist; auth token management is basic.

**Scope:**
- Migrate persistence layer JSON → SQLite (follow `threat-cloud` package pattern — it already uses SQLite cleanly)
- Per-endpoint auth tokens with rotation
- Basic workspace / tenant isolation (single-tenant per manager instance for now; full multi-tenant is post-MVP)
- Migration script for any in-the-wild JSON deployments

**Files most likely touched:**
- `packages/panguard-manager/src/`
- New: `packages/panguard-manager/src/persistence/sqlite.ts`
- New: `packages/panguard-manager/migrations/`

### Item 3 — Single-framework compliance evidence auto-generator (2–3 weeks)

**Why critical:** Today the evidence pack at `panguard.ai/evidence-pack` is a **static** 16 KB PDF dated 2026-05-23. There is no generator that ingests customer detection events and produces a custom pack.

**Scope:**
- Pick ONE framework first — SOC 2 is the highest-leverage choice given SOC 2 Type 1 attestation is targeted October 2026 anyway
- Generator: customer detection events → ATR rule mapping → SOC 2 control mapping → signed PDF (SHA-256 + HMAC like the existing manifest)
- Reuse the public sample's template / styling
- Web UI: `/api/billing/evidence` already exists in `packages/app` — check what's already wired

**Files most likely touched:**
- `packages/panguard-report/` (the PDF generator already exists for templates — extend)
- `packages/app/src/app/api/billing/evidence/` (existing endpoint)
- New: `packages/panguard-report/src/generators/soc2-evidence-pack.ts`

---

## Things to be cautious about

1. **Don't oversell again.** The founder explicitly chose radical transparency over marketing polish. Any new bullet you add to `/pricing` or `HONESTY.md` must correspond to actual shipping code. If you write "we support X", grep the repo and confirm X is real first.

2. **The audit report.** It lives in this session's history. Future sessions will not see it directly. If you need to re-audit, prompt template:
   > "Run a production-readiness audit on packages/* using the criteria in `dev-docs/_project/session-handoff-2026-05-24.md`. Compare what marketing claims (README, pricing page, HONESTY.md) say vs what code actually delivers. Flag any new gaps that have appeared since 2026-05-24."

3. **The founder's emotional context.** This session went deep into "am I a fraud / am I just taking money?" The answer landed on: no, the work is real, but the marketing was too big. If a future session re-encounters this question, the answer is in HONESTY.md §10 — do not relitigate.

4. **The GTM tension that surfaced and was resolved.** There was an open question of whether Pilot / Enterprise direct sales conflicts with the standards-maintainer / partner GTM (Cisco AI Defense, Microsoft AGT). The resolution: Migrator + Compliance are the commercial wedge, those do NOT conflict with partners shipping ATR detection. Keep Pilot. Don't pivot to pure standards-maintainer model.

5. **Don't open new fronts unprompted.** GitHub Sponsors / `/sponsor` page / Vendor OEM tier were all discussed but **deferred**. Founder chose to ship the three engineering items first. Don't restart those conversations unless asked.

---

## Open commitments

- The three engineering items above (founder said she will ship; I offered to help with item 1 if she wants).
- No pending PR comments, no open review threads on the two commits this session.
- HONESTY.md is the canonical source — future pricing-page edits should reconcile against it.

---

## Quick-start prompt for the next session

A self-contained prompt the founder can paste at the start of the next Claude Code session:

> I'm continuing work on the panguard-ai monorepo, branch `claude/enterprise-atr-implementation-SxcL7`. Last session we shipped two commits (`2100067` and `827ef2a`) that landed `docs/HONESTY.md` as the public single source of truth for what we can deliver, and collapsed `/pricing` from 4 tiers to 3 (Enterprise → waitlist, Sovereign removed).
>
> Read `dev-docs/_project/session-handoff-2026-05-24.md` first — it has full context including the three engineering items that gate Enterprise tier reopening, the production-readiness audit findings, and the GTM decisions that were already resolved (do not relitigate).
>
> Today I want to work on [pick one]:
> - Item 1: Guard live rule reload (3–5 days, smallest, biggest unlock)
> - Item 2: panguard-manager JSON → SQLite + fleet auth (1–2 weeks)
> - Item 3: Single-framework compliance evidence auto-generator, SOC 2 first (2–3 weeks)
> - Or something else (specify)
>
> Honesty principle: any new bullet on `/pricing` or `HONESTY.md` must correspond to shipping code. Grep before claiming.
