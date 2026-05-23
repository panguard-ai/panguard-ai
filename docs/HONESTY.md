# Honesty: What We Can — and Cannot — Deliver Today

> **English / 中文 — single source of truth.**
> If anything on `panguard.ai` reads bigger than what this page says, **this page wins.**
> 若 `panguard.ai` 任何頁面講得比這份文件大，**以這份文件為準。**

This document exists because we are a small team selling into regulated industries.
Procurement teams, auditors, and investors deserve to know exactly where we are —
not the marketing version. Where a control or capability is in flight, we mark it.
Where it is not real, we say so.

這份文件存在的理由：我們是小團隊賣進受監管產業。採購、稽核、投資人有權知道我們現在到哪、不是行銷版本。在做的標清楚，沒做的也誠實說。

The closest existing reference is [`/legal/security`](https://panguard.ai/legal/security)
— this page extends that honesty stance to **product**, **delivery**, and **commercial**.

---

## 1. What is shipping today, externally verifiable

These can be checked without talking to us.

| Asset                                                | Where to verify                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **419 ATR rules, MIT-licensed**                      | [Agent-Threat-Rule/agent-threat-rules](https://github.com/Agent-Threat-Rule/agent-threat-rules)                                                                                                                                 |
| **7 production adoption merges**                     | Microsoft AGT (PR #908 + #1277), Cisco AI Defense (PR #79 + #99), MISP taxonomies #323 + galaxy #1207, OWASP A-S-R-H #74, Gen Digital Sage #33 — all linked at [`/atr/adopters`](https://panguard.ai/atr/adopters)              |
| **Migrator (Sigma / YARA → ATR)**                    | `@panguard-ai/migrator-community` on npm, MIT                                                                                                                                                                                   |
| **Sample evidence pack**                             | [`/evidence-pack`](https://panguard.ai/evidence-pack) — 3 framework PDFs (ISO 27001 + SOC 2 + Taiwan TCSA), JSON + HTML variants, `manifest.json` with SHA-256 + HMAC. The verification command is printed inside the manifest. |
| **67,799 skills scanned, 1,096 confirmed malicious** | Reproducible methodology in the ATR repo; dataset summary on the home page                                                                                                                                                      |
| **Garak benchmark — 97.1% recall**                   | [`/research/benchmarks`](https://panguard.ai/research/benchmarks), reproducible with the public corpus                                                                                                                          |
| **Zenodo research paper**                            | [DOI 10.5281/zenodo.19178002](https://doi.org/10.5281/zenodo.19178002)                                                                                                                                                          |
| **OWASP Agentic Top 10 mapping (10/10)**             | [`OWASP-MAPPING.md`](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/OWASP-MAPPING.md)                                                                                                                   |

中文摘要：上述 8 項都不是 demo、不是 PPT，是可以離線驗證的工件。Microsoft 跟 Cisco 的工程師審過 PR 才會 merge——這是我們最強的單一外部信任訊號。

---

## 2. What is in flight (dates, not promises)

These are real plans with real target dates. They are not yet usable.

| Item                                          | Target       | What this means today                                                                                                                                                                           |
| --------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SOC 2 Type 1 attestation**                  | October 2026 | Vanta contracted June 2026, A-LIGN selected as auditor July 2026. Roadmap at [`/samples/soc2-roadmap`](https://panguard.ai/samples/soc2-roadmap). Today: SOC 2 work-in-progress, not certified. |
| **AIAM (Agent Identity & Access Management)** | Q3 2026      | SAML SSO, SCIM, enforced MFA, WebAuthn — none of these are shipping yet.                                                                                                                        |
| **Founding Three TSC (ATR governance)**       | Q3 2026      | ATR is currently single-maintainer. The Founding Three resolves bus-factor=1. Seats not yet filled.                                                                                             |
| **SOC 2 Type II**                             | H2 2027      | Sequenced after Type 1.                                                                                                                                                                         |
| **Multi-region Threat Cloud**                 | Q1 2027      | Today: single-region only.                                                                                                                                                                      |
| **L1 Discover / L7 Govern layers**            | Q2 / Q3 2026 | 5 of 7 layers shipping today (L2 Audit · L3 Protect · L4 Detect · L5 Deceive · L6 Respond).                                                                                                     |

中文摘要：以上每一項都有 target 但都還沒 ship。若您的採購流程需要 SOC 2 Type 1 attestation letter，今天我們給不出來。

---

## 3. What we do not have, and will not pretend to have

These are things that other vendors in adjacent spaces have. We do not.

- **24/7 SOC / on-call rotation beyond the founding team.** Our `/legal/security` says this explicitly. Incident response is handled by founders.
- **Enterprise SLA with uptime credits.** [`/legal/sla`](https://panguard.ai/legal/sla) is best-effort; we do not yet underwrite uptime guarantees with financial credits.
- **Production multi-tenant Threat Cloud isolation.** Single-region, founding-team-only production access today.
- **F500-scale white-glove deployment org.** We do not have a customer success org. The maintainer is the deployer.
- **Customer-managed encryption keys (HSM / BYOK).** Disk-level AES-256 only.
- **24×7 phone support.** Email + GitHub Issues + Discord; founder is on-call asynchronously.
- **Sales engineering team.** Inbound triage is founder-led.
- **Pre-built integrations beyond the SIEM webhook template.** Most enterprise connector libraries (ServiceNow, Jira, PagerDuty, Tenable, etc.) are not yet packaged.

中文摘要：以上這些是 Vanta、Drata、Lakera、Apono 規模的公司會有的能力，我們暫時沒有。不是「快了」，是「沒做」。

---

## 4. What the $25K Pilot actually buys

We sell the Pilot as a **Design Partner engagement**, not a SaaS subscription.
Be clear with yourself on this — if you expected a product you log into and forget about, this is not that.

我們把 Pilot 賣為 **Design Partner engagement**，不是 SaaS 訂閱。請先把這點對自己講清楚——如果您以為買到的是登入就好不用管的產品，這不是那種東西。

**Tagline:** _AI Agent Security Baseline — Detect & Alert, not Remediate._

**Success metric we will write into the contract:** _"If the Pilot catches one AI agent attack or one malicious skill install during 90 days, it has paid for itself."_

> Every bullet below was reconciled against the actual code in this repo on the
> date of the last commit to this file. If we list it, we have shipping code that
> does it. Every caveat is a real gap, not legal CYA.

### What you actually get in 90 days

- **Panguard Guard runtime deployed on one endpoint** (Linux / macOS / Windows).
  109 ATR detection rules bundled into Guard today (the public ATR corpus on GitHub
  has 419 rules; Guard ships a 109-rule curated subset focused on the most actionable
  prompt-injection, tool-poisoning, and agent-behaviour categories).
  4-agent pipeline (Detect → Analyze → Respond → Report). Events to local dashboard
  - JSONL audit log. Response actions: alert, block input, kill agent, snapshot.
    **Caveat:** Guard requires a process restart to pick up new rules (~5–30 second
    zero-detection window). Live rule reload (SIGHUP) is targeted for Q3 2026 and is
    the explicit blocker for the F500 SLA tier.

- **Panguard Scan — 60-second skill / MCP audit** with SARIF 2.1.0 export for any CI.
  8 checks: manifest, imports, dependencies, CVE lookup, secrets, permissions, regex
  DoS, artifact hunting.
  **Caveat:** The SAST check is a placeholder in v1.5.6 (`run-scan.ts` returns a
  stub for native code analysis). Real SAST is on the roadmap, not in the Pilot.

- **Panguard Chat — multi-channel notifications** (Discord / Slack / Webhook / Telegram / LINE).
  Bilingual EN / ZH alert formatting, summary digests, agent commentary.
  **Caveat:** Webhook validation is basic; no encryption at rest on alert payloads.

- **Compliance PDF reports — template-based, informational.**
  Frameworks supported as templates: SOC 2 Type II, ISO 27001, Taiwan TCSA, NIST AI
  RMF, EU AI Act mapping. PDF generator (`@panguard-ai/panguard-report`) renders
  your detection events into the chosen template.
  **Caveat:** These are **internal informational reports, not auditor-signed evidence
  packs.** The auto-generator that turns customer events into a signed, tamper-evident
  evidence pack (matching the format at [`/evidence-pack`](https://panguard.ai/evidence-pack))
  is a Q4 2026 build. Your Pilot pack will be hand-compiled using the same template.

- **Migrator: Sigma + YARA → ATR conversion** via `@panguard-ai/migrator-community@0.1.2` on npm (MIT).
  **Caveat:** Only **Sigma and YARA** parsers exist today. The 15-source-format roadmap
  (AppLocker, Sysmon, Osquery, Falco, Suricata XML, Splunk SPL, Snort, Elastic EQL,
  Semgrep, CodeQL, etc.) is not built — each format is a 2+ week custom build outside
  the Pilot scope.

- **1–3 custom ATR rules tailored to your environment.**
  If suitable for upstream, they merge into the public ATR repo and ship across the
  ecosystem (Cisco AI Defense, Microsoft AGT, etc.). Optional: keep them private.

- **`pga` CLI install help into one cloud or on-prem environment.**
  15 subcommands (`scan`, `audit`, `up`, `guard`, `chat`, `report`, etc.), interactive
  menu, source / npm / Homebrew install paths.
  **Caveat:** No airgap installer — no offline package builder exists today.

- **~6 hours per week of senior engineering time, scheduled with your team.**
  Async Slack / email for the rest. No 24/7 phone line. The maintainer of ATR
  personally deploys — not a CS rep, not a contractor.

- **LLM token cost absorbed (~$200/month).**
  Detection itself runs 0% on LLM. LLM is used for enrichment and rule
  crystallisation only.

- **$25K credits 100% toward a Y1 Enterprise contract** when Enterprise tier reopens
  (see §6 for status). If you do not sign, you keep what was built. No clawback.

- **7-day no-questions refund** per [`/legal/refund`](https://panguard.ai/legal/refund).

### What you do NOT get in the Pilot

- A finished SaaS product with login, dashboard polish, and feature parity to Vanta / Drata.
- A 24/7 SOC watching your environment.
- An SLA with uptime credit.
- A SOC 2 Type 1 attestation letter (it is October 2026).
- An onboarded customer success team.
- **Airgap deployment.** No offline installer exists today.
- **Auto-generated, auditor-signed compliance evidence packs.** The Pilot pack is hand-compiled from the template.
- **Live rule reload.** Guard requires restart for new rules (~5–30s zero-detection window).
- **Multi-endpoint fleet management at scale.** `panguard-manager` uses JSON-file persistence today and will not scale past ~10–20 endpoints. SQLite upgrade is Q3 2026.
- **Custom format converters beyond Sigma / YARA.** AppLocker, Sysmon, Osquery, Falco, Suricata, etc. are not implemented — each is custom-quoted outside the Pilot.
- **Full 5-framework compliance auto-mapping.** Only templates exist; the auto-mapper is Q4 2026.
- **SAST / native static code analysis.** The check is a placeholder in v1.5.6.
- **Kernel-isolated sandbox.** `security-hardening/` provides userspace isolation only — no cgroup / seccomp / AppArmor profiles.

### Why $25K is the right price for this

| Component                                                                | Standalone market price              | Bundled in Pilot |
| ------------------------------------------------------------------------ | ------------------------------------ | ---------------- |
| Senior security consultant — 90 days                                     | $30–60K USD (TW) / $80–150K USD (US) | ✓                |
| Domain expert in ATR / OWASP Agentic (< 10 people in the world)          | n/a                                  | ✓                |
| Sigma / YARA → ATR migration tooling                                     | 6 months self-build                  | ✓                |
| 1–3 custom rules + template-based compliance work                        | $20–40K consultancy                  | ✓                |
| TCSA mapping (if Taiwan)                                                 | $15–30K local consultancy            | ✓                |
| **$25K credit 100% toward Y1 Enterprise** (when Enterprise tier reopens) | Free upgrade path                    | ✓                |
| **7-day no-questions refund**                                            | Buyer-side zero risk                 | ✓                |

The Pilot is **prepaid consulting from the rules' author**, with the upside that the rules
are already in production at Microsoft AGT and Cisco AI Defense — not theory, not a deck.

Pilot = 預付規則作者本人的顧問費 + 規則已在 Microsoft / Cisco 跑 production。不是理論，不是 PPT。

---

## 5. The Enterprise tier is currently paused (waitlist only)

`/pricing` previously listed the Enterprise tier at $150K floor, $250–350K target, up
to $500K+. After auditing the repo against what this tier needs to actually deliver,
**we have moved Enterprise to waitlist-only** until three engineering items ship:

| Blocker                                                                   | Effort    | Target  |
| ------------------------------------------------------------------------- | --------- | ------- |
| **1. Guard live rule reload** (SIGHUP + fsnotify, no restart window)      | 3–5 days  | Q3 2026 |
| **2. `panguard-manager` JSON → SQLite + multi-endpoint fleet auth**       | 1–2 weeks | Q3 2026 |
| **3. Compliance evidence auto-generator for one framework** (SOC 2 first) | 2–3 weeks | Q3 2026 |

Until these three ship, Enterprise tier is **founder-led delivery with the same scope
as Pilot, just longer engagement** — which means there is no real product
differentiation from Pilot at the $150K+ price point. Selling it today would be selling
a Pilot at 6–20× markup, which is dishonest.

| Available today (in Pilot already)                         | Target for Enterprise tier reopen                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Migrator (Sigma + YARA only)                               | Migrator Pro with 5+ additional source formats                      |
| AI Compliance template PDFs                                | Auto-generator with signed evidence packs (SHA-256 + HMAC)          |
| Direct line to ATR maintainer; early access to draft rules | Same, formalised in MSA                                             |
| On-prem / VPC deployment help (no airgap)                  | Airgap installer + multi-region Threat Cloud                        |
| SIEM webhook                                               | SIEM + ServiceNow / Jira / PagerDuty / Tenable pre-built connectors |
| Custom ATR rule packs                                      | Same, but at fleet scale via panguard-manager                       |
| LLM tokens included                                        | Same, plus dedicated CSM (after SOC 2 Type 1 ships)                 |

中文摘要：Enterprise tier 在三件工程項目 ship 完之前 (live reload / SQLite manager / 1-framework auto-gen，估計 3-5 週) 暫時下架到 waitlist。在那之前用 $150K-500K 賣等同於把 Pilot 加價 6-20 倍，那不誠實。Pilot tier ($25K) 是現在唯一的商業入口。

---

## 6. The Founding 5 F500 program is retired (no contracts signed)

`/pricing` previously advertised $100K × 2 years for the first 5 F500 customers in
exchange for public logo + case study rights.

**This program is retired as of this document version.** Zero Founding 5 F500
contracts were signed. The program is being retired rather than quietly extended
because the underlying Enterprise tier is now on waitlist (§5), and pricing a
Founding-tier discount on a tier we are not selling makes no sense.

Equivalent positioning (early-customer discount + logo / case study) will return when
Enterprise tier reopens — likely as a 2026 H2 "first 3 post-relaunch" tier with
honest pricing once the three blockers in §5 ship.

中文摘要：Founding 5 F500 program 下架。零份合約簽過。等 Enterprise tier 重開再以類似形式（早期客戶折扣 + logo）重新推出。

---

## 7. The Sovereign $5–20M tier — removed from /pricing, kept as forward brief

The Sovereign tier has been removed from the /pricing page. There is no closed
sovereign deal, no airgap installer, no multi-region Threat Cloud, and no multi-tenant
isolation today. Pricing a $5–20M tier in the same grid as a $25K Pilot when the
underlying infrastructure does not exist creates the wrong signal.

The positioning brief at [sovereign-ai-defense.vercel.app](https://sovereign-ai-defense.vercel.app)
remains live as a **forward-looking research document** for sovereign-AI conversations
(Saudi PIF, Luxembourg CIRCL, others). It is now linked from `/research` rather than
`/pricing`.

What is real today on the sovereign track:

- **Path 1 (free, standards citation):** A national-level body publicly cites ATR as
  reference framework. Reproducible in 1–2 weeks.
- **Path 2 (free, 90-day technical co-eval):** A national red team tests ATR's 419
  rules against their adversarial corpus, with full failure-case disclosure. Zero
  cost both sides.
- **Path 3 (commercial $5–20M):** Forward sales motion, delivered via vendor partner
  channel (Cisco AI Defense, Microsoft AGT) when ATR-integrated products reach
  nation-scale deployment. PanGuard's role is upstream standards maintenance and
  rule namespace provisioning, not direct delivery.

中文摘要：Sovereign tier 從 /pricing 拿掉，改放 /research 當前瞻 brief。Path 1/2 (免費) 是真實可重現的；Path 3 (商業 $5-20M) 是長期方向，會透過 Cisco/Microsoft 通道交付，不是 Panguard 直接做。

---

## 8. How we will tell you when something on this page has changed

- This file lives in the public repo at `docs/HONESTY.md`. The git history is the change log.
- When a "in flight" item ships, it moves to Section 1. When something we claimed turns out
  to be aspirational, it moves to Section 3.
- We will not silently delete or rewrite. Edits go through a normal PR.

---

## 9. Who to contact if any of this is unclear

- **Product / pilot questions** — [hello@panguard.ai](mailto:hello@panguard.ai)
- **Sales / enterprise** — [sales@panguard.ai](mailto:sales@panguard.ai)
- **Security disclosures** — [`SECURITY.md`](../SECURITY.md)
- **GitHub** — [panguard-ai/panguard-ai](https://github.com/panguard-ai/panguard-ai)

---

## 10. Why this document exists at all

Most security vendors will not publish a page like this because their marketing teams
will not let them. We do not have a marketing team. We have one founder who would rather
lose a $25K deal that should not happen than win one that ends in a refund or a bad
reference call.

If after reading this you decide we are too early for you, that is the correct outcome
for both sides. If after reading this you still want to engage, you are the customer we
are looking for.

大部分資安廠商不會放這種頁面，因為行銷團隊不會讓他們放。我們沒有行銷團隊。我們有一個 founder，寧可丟掉一個不該成立的 $25K 案子，也不要拿到一個會 refund 或變成負面 reference 的案子。

讀完這份如果您覺得我們對您太早期了——這個結論對雙方都對。讀完還願意談——您就是我們要找的客戶。
