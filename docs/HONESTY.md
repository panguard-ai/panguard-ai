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

### What you actually get in 90 days

- **The maintainer of ATR personally deploys into your environment.**
  Not a customer success rep. Not a contractor. The person who wrote the rules
  that Microsoft AGT and Cisco AI Defense merged into production.
  ATR 標準維護者本人到您環境部署。不是 CS 代理，不是外包，就是寫出被 Microsoft / Cisco merge 的那套規則的本人。

- **~6 hours per week of senior engineering time, scheduled with your team.**
  Async Slack / email for the rest. No 24/7 phone line.
  每週約 6 小時資深工程時間，跟您團隊排程。其餘 async。沒有 24/7 電話。

- **1–3 custom ATR rules tailored to your environment.**
  If suitable for upstream, they merge into the public ATR repo — your detection
  IP ships to the rest of the ecosystem (Cisco AI Defense, Microsoft AGT, etc.).
  Optional: you can elect to keep them private.
  為您環境寫 1-3 條客製 ATR 規則。若適合 upstream，會 merge 到 ATR public repo——您的偵測 IP 會散播到下游 Cisco、Microsoft 等廠商。可選擇保留 private。

- **One real compliance evidence pack for one framework of your choice.**
  ISO 27001, SOC 2, NIST AI RMF, EU AI Act, or Taiwan TCSA — pick one for the pilot.
  Format matches the public sample at [`/evidence-pack`](https://panguard.ai/evidence-pack).
  一份真實合規 evidence pack，您選一個框架。格式跟 public sample 一致。

- **SIEM webhook integration sample.** Wired into your existing SIEM (Splunk, Wazuh, MISP, etc.).

- **LLM token cost absorbed (~$200/month).**
  Detection itself runs 0% on LLM — 336 deterministic rules at 97.1% recall.
  LLM is used for enrichment and rule crystallization only.

- **$25K credits 100% toward a Y1 Enterprise contract** if you sign within 12 months. If you do not sign, you keep what was built. No clawback.

- **7-day no-questions refund** per [`/legal/refund`](https://panguard.ai/legal/refund).

### What you do NOT get in the Pilot

- A finished SaaS product with login, dashboard polish, and feature parity to Vanta / Drata.
- A 24/7 SOC watching your environment.
- An SLA with uptime credit.
- A SOC 2 Type 1 attestation letter (it is October 2026).
- An onboarded customer success team.

### Why $25K is the right price for this

| Component                                 | Standalone market price              | Bundled in Pilot |
| ----------------------------------------- | ------------------------------------ | ---------------- |
| Senior security consultant — 90 days      | $30–60K USD (TW) / $80–150K USD (US) | ✓                |
| Domain expert in ATR / OWASP Agentic      | < 10 people in the world             | ✓                |
| Sigma / YARA → ATR migration              | 6 months self-build                  | ✓                |
| Custom compliance evidence pack           | $40K+ ISO consultancy                | ✓                |
| TCSA mapping (if Taiwan)                  | $15–30K local consultancy            | ✓                |
| **$25K credit 100% toward Y1 Enterprise** | Free upgrade path                    | ✓                |
| **7-day no-questions refund**             | Buyer-side zero risk                 | ✓                |

The Pilot is **prepaid consulting from the rules' author**, with the upside that the rules
are already in production at Microsoft and Cisco — not theory, not a deck.

Pilot = 預付規則作者本人的顧問費 + 規則已在 Microsoft / Cisco 跑 production。不是理論，不是 PPT。

---

## 5. What the Enterprise tier covers (and what is still in flight)

[`/pricing`](https://panguard.ai/pricing) lists the Enterprise tier at $150K floor,
$250–350K target, up to $500K+. Be honest about what that buys:

| Available today                                                       | Target (not today)                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Migrator Pro (all 15 source formats)                                  | SOC 2 Type 1 letter                                          |
| AI Compliance Audit Evidence Module (NIST AI RMF, EU AI Act mappings) | AIAM (SAML, SCIM, MFA, WebAuthn)                             |
| Direct line to ATR maintainer; early access to draft rules            | 24×7 SOC                                                     |
| On-prem / VPC / airgap deployment help                                | Multi-region Threat Cloud                                    |
| SIEM webhook integration                                              | Customer-managed keys (HSM / BYOK)                           |
| Custom ATR rule packs                                                 | F500-scale customer success org                              |
| LLM tokens included                                                   | Pre-built ServiceNow / Jira / PagerDuty / Tenable connectors |

**Today, Enterprise tier is also founder-led delivery** — the same person who delivers the
Pilot is the person who delivers Enterprise. That changes when SOC 2 Type 1 ships and we
can hire incident-response headcount. Until then, Enterprise pricing buys **more scope and
more dedicated time**, not a different delivery model.

中文摘要：今天 Enterprise tier 也是創辦人親自交付，跟 Pilot 同一個人。直到 SOC 2 Type 1 拿到、可以開始招 incident response 人力為止。在那之前，Enterprise 價錢買的是「更多範疇 + 更多專屬時間」，不是「不同的交付組織」。

---

## 6. The Founding 5 F500 program

[`/pricing`](https://panguard.ai/pricing) advertises $100K × 2 years for the first 5 F500
customers, in exchange for public logo + case study rights. As of this document version:

- We have not yet closed any Founding 5 F500. The slot count is real, not theatre.
- We are in active conversation with [count tracked in private CRM, not disclosed publicly here].
- If you sign as Founding 5 you are taking on **vendor risk** alongside price upside.
  We are explicit about this in the contract.

If the program does not close 5 within the planned window, we will publicly retire it
rather than quietly extend the deadline.

---

## 7. The Sovereign $5–20M tier

This tier exists on the pricing page because Saudi PIF dialogue exists. **There is no
closed sovereign deal yet.** The brief at [sovereign-ai-defense.vercel.app](https://sovereign-ai-defense.vercel.app)
is a positioning document, not evidence of revenue. Path 1 (free, standards citation) and
Path 2 (free, 90-day technical co-eval with national red teams) are real and reproducible
today. Path 3 (commercial) is a forward sales motion.

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
