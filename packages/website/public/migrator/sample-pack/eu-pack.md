# EU AI Act Audit Evidence Pack — AI Agent Detection Rule Set

**Pack type:** eu-ai-act-migrator-evidence
**Schema version:** 1.0
**Generated:** 2026-05-02T19:30:11.794Z
**Customer ID:** DEMO-CORP-EU
**Audit period:** 2026-Q2
**Migrator version:** unknown

## Audit Signature (auditor verifies these)

| Field | Value |
|---|---|
| Pack SHA-256 | `f34be37c154c769df5ddc6771b57fd0377b8384636b8732d89d7ab692224a1bd` |
| Rules Merkle Root | `5c7a58e5fc6044bfa9288ca34a5e339eea3f5dcbfd829d37c22a998a038cee36` |
| Algorithm | sha256 |
| Signed at | 2026-05-02T19:30:11.795Z |

**Auditor verification:** recompute the pack SHA-256 over the JSON form of this pack with the `signature` block excluded; recompute the merkle root by SHA-256-pairing the per-rule hashes (sorted by `rule_id`). Both should match the values above. The companion JSON file (`eu-ai-act-evidence-pack.json`) is the canonical input.

## Coverage Summary

- **Total rules in scope:** 50
- **Rules with AI agent analogue (production-grade):** 40
- **Rules needing human review:** 10
- **Hand-crafted (LLM-enriched) rules:** 40
- **Placeholder rules (auto-generated, pending review):** 10

## Framework Mapping Coverage

### EU AI Act

**Rules with at least one eu_ai_act mapping:** 50

| Reference | Rules | Primary | Secondary | Partial |
|---|---|---|---|---|
| 12 | 18 | 7 | 1 | 10 |
| 14 | 13 | 13 | 0 | 0 |
| 15 | 40 | 40 | 0 | 0 |
| 50 | 4 | 2 | 2 | 0 |
| 9 | 4 | 4 | 0 | 0 |

### OWASP Agentic Top 10 (2026)

**Rules with at least one owasp_agentic mapping:** 40

| Reference | Rules | Primary | Secondary | Partial |
|---|---|---|---|---|
| ASI01:2026 | 3 | 1 | 2 | 0 |
| ASI02:2026 | 4 | 4 | 0 | 0 |
| ASI04:2026 | 2 | 2 | 0 | 0 |
| ASI05:2026 | 17 | 17 | 0 | 0 |
| ASI06:2026 | 21 | 18 | 3 | 0 |
| ASI07:2026 | 4 | 3 | 1 | 0 |
| ASI08:2026 | 1 | 1 | 0 | 0 |
| ASI09:2026 | 3 | 2 | 1 | 0 |

### OWASP LLM Top 10 (2025)

**Rules with at least one owasp_llm mapping:** 36

| Reference | Rules | Primary | Secondary | Partial |
|---|---|---|---|---|
| LLM01:2025 | 4 | 3 | 1 | 0 |
| LLM02:2025 | 11 | 11 | 0 | 0 |
| LLM03:2025 | 3 | 3 | 0 | 0 |
| LLM06:2025 | 19 | 15 | 3 | 1 |

### NIST AI RMF 1.0

**Rules with at least one nist_ai_rmf mapping:** 50

| Reference | Rules | Primary | Secondary | Partial |
|---|---|---|---|---|
| Govern::GV.1.1 | 10 | 0 | 0 | 10 |
| Manage::MG.2.3 | 18 | 18 | 0 | 0 |
| Manage::MG.3.2 | 2 | 2 | 0 | 0 |
| Manage::MG.4.1 | 8 | 8 | 0 | 0 |
| Manage::MG.4.2 | 4 | 4 | 0 | 0 |
| Measure::MS.2.7 | 4 | 4 | 0 | 0 |
| Measure::MS.3.3 | 4 | 4 | 0 | 0 |

### ISO/IEC 42001:2023

**Rules with at least one iso_42001 mapping:** 33

| Reference | Rules | Primary | Secondary | Partial |
|---|---|---|---|---|
| 8.4 | 33 | 33 | 0 | 0 |

## Per-Rule Detail

Each entry includes the rule SHA-256 (tamper-evidence), provenance, and full compliance context. Rules sorted by ID for stable diffs.

### ATR-2026-10882 — Screen Capture Activity Via Psr.EXE

- **SHA-256:** `a9c504cbaffeec4dad29a54c27b7c4cdcbc55bb0945f632fd9afc83c44c2e92a`
- **Severity:** medium
- **Source:** sigma rule `2158f96f-43c2-43cb-952a-ab4580f32382`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — screen capture by agent leaks UI content not in agent context.
- Article 50 (primary) — Article 50 transparency — users should know agent is recording screen.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — psr.exe used for surveillance.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure via screen content.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime detection of unsanctioned data capture.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for surveillance via agent.

---

### ATR-2026-12808 — Process Initiated Network Connection To Ngrok Domain

- **SHA-256:** `d2b58a89010bd7e8280c6fae3519f6fcbf86e0fc7beaed4481bb901e6bff9238`
- **Severity:** high
- **Source:** sigma rule `18249279-932f-45e2-b37a-8925f2597670`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — agents fetching from or posting to ngrok tunnels are operating outside their declared scope. Often correlated with prompt-injection that exfiltrates context_window contents.
- Article 12 (primary) — Article 12 logging — every ngrok-bound tool_call should be logged for post-incident traceability. Firing this rule is the logging trigger.

**OWASP Agentic Top 10 (2026):**

- ASI02:2026 (primary) — ASI02:2026 Memory/Context Manipulation — exfiltrating context_window or memory_access contents via outbound HTTP to attacker tunnel.
- ASI05:2026 (primary) — ASI05:2026 Tool Misuse — using legitimate HTTP tools for exfiltration to non-business destinations.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — LLM02:2025 Sensitive Information Disclosure — exfiltration tunnels are the canonical disclosure channel.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — NIST AI RMF MG.2.3 — runtime treatment of identified data-exfiltration risks. Detection at the egress point is the primary control.

---

### ATR-2026-13292 — Sticky Key Like Backdoor Execution

- **SHA-256:** `61b60f6cc50a26dc6b218de9e69e48a845fbf27836e291e963695c8021f634b1`
- **Severity:** critical
- **Source:** sigma rule `2fdefcb3-dbda-401e-ae23-f0db027628bc`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 — backdoor install requires absolute human approval.
- Article 15 (primary) — Article 15 robustness — backdoor enables auth bypass.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise — sticky-keys gives SYSTEM at lock screen.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — Managing risk of agent installing auth backdoor.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment.

---

### ATR-2026-13963 — Triple Cross eBPF Rootkit Execve Hijack

- **SHA-256:** `b7d3e051c99b16b6dc88d1ed9c6e75b1198689016ff08660a3895d39a92dfed8`
- **Severity:** high
- **Source:** sigma rule `0326c3c8-7803-4a0f-8c5c-368f747f7c3e`
- **Rule version:** 1
- **Detection field:** `Image`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging applies generically: if the host running the agent process is compromised by a kernel rootkit, the agent's audit log integrity is at risk. The rule belongs in defense-in-depth host monitoring, not in agent runtime.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — NIST AI RMF GV.1.1 (governance policies) calls for host-environment integrity as a precondition for trustworthy AI. This rule supports the host-integrity precondition — it is not an AI-specific control.

---

### ATR-2026-14122 — User Has Been Deleted Via Userdel

- **SHA-256:** `953f12c111d7c30eee557095a3243e43356442ed82a9400b18a6ca9475243737`
- **Severity:** medium
- **Source:** sigma rule `08f26069-6f80-474b-8d1f-d971c6fedea0`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 oversight — irreversible identity actions REQUIRE human approval.
- Article 15 (primary) — Article 15 robustness against destructive cascade.

**OWASP Agentic Top 10 (2026):**

- ASI07:2026 (primary) — Cascading Tool Misuse — identity removal can cascade across systems.
- ASI06:2026 (secondary) — Privilege Compromise enabling user deletion.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency — agent should never delete users.

**NIST AI RMF 1.0:**

- Manage / MG.4.2 (primary) — Incident response trigger for irreversible identity actions.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for destructive identity ops.

---

### ATR-2026-14813 — Procdump Execution

- **SHA-256:** `cf1523e799b3116ca717ab3126bba222b4fa8d88de81e695f1c96ed3cb3a48a5`
- **Severity:** medium
- **Source:** sigma rule `2e65275c-8288-4ab4-aeb7-6274f58b6b20`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 — lsass dump requires human gate; never agent-initiated.
- Article 15 (primary) — Article 15 robustness — credential dump via agent.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise — lsass dump yields domain credentials.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure — credentials in memory dump.

**NIST AI RMF 1.0:**

- Manage / MG.4.2 (primary) — Incident response trigger.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment.

---

### ATR-2026-16162 — Touch Suspicious Service File

- **SHA-256:** `144b368c336bdeab601d0f2cdfbeda6802ea6c8167b38a1acd8f745dd4f3bd52`
- **Severity:** medium
- **Source:** sigma rule `31545105-3444-4584-bebf-c466353230d2`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 oversight — persistent root service install requires approval.
- Article 15 (primary) — Article 15 robustness against persistence.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via persistent root service.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — Managing risk of agent installing systemd persistence.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment.

---

### ATR-2026-17154 — Remote Access Tool - Potential MeshAgent Execution - MacOS

- **SHA-256:** `ecdbb403d5f772bdd02b326e83c7893ff0c25b2b713045abf5f8c47649dd4b17`
- **Severity:** medium
- **Source:** sigma rule `22c45af6-f590-4d44-bab3-b5b2d2a2b6d9`
- **Rule version:** 1
- **Detection field:** `CommandLine`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging — host RAT presence affects AI integrity.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host integrity.

---

### ATR-2026-20444 — UAC Bypass Using Consent and Comctl32 - Process

- **SHA-256:** `db3aa2e22021bdf2ce9ad0bafd6299bdc6fbfb4b439a5152e3178473be2bc1bb`
- **Severity:** high
- **Source:** sigma rule `1ca6bd18-0ba0-44ca-851c-92ed89a61085`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 oversight — UAC bypass defeats the very gate Microsoft built for human approval.
- Article 15 (primary) — Article 15 robustness — agent should not have privilege-elevation capability.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise — UAC bypass elevates agent to admin.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency — agent self-elevating privileges.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — Managing risk of agent altering its own privileges.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for UAC bypass via AI agent.

---

### ATR-2026-20705 — Remote Access Tool - Potential MeshAgent Execution - Windows

- **SHA-256:** `0f7c6809ec34444981010e6e790aae17efc77ab7085b3a3e316bc519581fe9ae`
- **Severity:** medium
- **Source:** sigma rule `2fbbe9ff-0afc-470b-bdc0-592198339968`
- **Rule version:** 1
- **Detection field:** `CommandLine`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging — host RAT presence.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host integrity.

---

### ATR-2026-21109 — Deletion of Volume Shadow Copies via WMI with PowerShell

- **SHA-256:** `78ed9b6e6afccf48b2e19cde9a724c23ec8312e749a20fc7979ac44c6a7cd942`
- **Severity:** high
- **Source:** sigma rule `21ff4ca9-f13a-41ad-b828-0077b2af2e40`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 human oversight is REQUIRED for irreversible high-impact actions. Shadow-copy deletion is irreversible (no recovery without backups). Any agent performing this without explicit human approval fails Article 14 compliance.
- Article 15 (primary) — Article 15 robustness — destructive cascade resistance. Agents should refuse or escalate destructive actions; firing this rule is direct evidence the safeguard failed.
- Article 9 (primary) — Article 9 risk management — destructive data actions must be in the risk register with active controls. This rule IS the active control.

**OWASP Agentic Top 10 (2026):**

- ASI07:2026 (primary) — ASI07:2026 (Cascading Tool Misuse) — agent chains read+delete operations to make data recovery impossible.
- ASI06:2026 (secondary) — Privilege compromise enabling the destructive action.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — LLM06:2025 Excessive Agency — destructive admin commands are the textbook example.

**NIST AI RMF 1.0:**

- Manage / MG.4.2 (primary) — NIST AI RMF MG.4.2 — incident response capability for AI-driven harm. Shadow-copy deletion via agent is a high-severity incident requiring immediate playbook execution.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for destructive AI actions — irreversibility makes this a top-priority assessment item.

---

### ATR-2026-24756 — Time Travel Debugging Utility Usage

- **SHA-256:** `85bd9b9733cea26d99db6a5307b3248bf37857d8f3fc95745a2ac85b4ed313bc`
- **Severity:** high
- **Source:** sigma rule `0b4ae027-2a2d-4b93-8c7e-962caaba5b2a`
- **Rule version:** 1
- **Detection field:** `ParentImage`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging applies generically; agent-host debugger compromise affects AI integrity.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host-environment debugger access boundary.

---

### ATR-2026-26270 — Potential Provisioning Registry Key Abuse For Binary Proxy Execution

- **SHA-256:** `b9c6174f2aa9971045a6e9b74db5fc8b4222a0692effc129b778773208f01221`
- **Severity:** high
- **Source:** sigma rule `2a4b3e61-9d22-4e4a-b60f-6e8f0cde6f25`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 oversight — provisioning install bypasses standard install gates.
- Article 15 (primary) — Article 15 robustness against persistence install via provisioning.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via provisioning persistence.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency for system-level provisioning install.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — Managing risk of agent altering system provisioning.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for provisioning abuse.

---

### ATR-2026-27041 — OMIGOD SCX RunAsProvider ExecuteShellCommand

- **SHA-256:** `fb8c31d7d05a66fc10357cf4c37dc4d8007641fdd39fe4aa27b5695ae4060563`
- **Severity:** high
- **Source:** sigma rule `21541900-27a9-4454-9c4c-3f0a4240344a`
- **Rule version:** 1
- **Detection field:** `User`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging — agent host running on Azure with OMI may be compromised.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host-environment integrity.

---

### ATR-2026-31863 — Suspicious Processes Spawned by Java.EXE

- **SHA-256:** `3268189f7c99bd9c0e304813ca650f9e30183e1bf9fc113b45ff3e6b8244dedb`
- **Severity:** high
- **Source:** sigma rule `0d34ed8b-1c12-4ff2-828c-16fc860b766d`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — Java deserialization / Log4Shell-style RCE via agent.
- Article 9 (primary) — Article 9 risk management — Log4Shell-class CVEs are documented AI deployment risks.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via Java RCE.

**OWASP LLM Top 10 (2025):**

- LLM03:2025 (primary) — Supply Chain — vulnerable Java dependency in agent runtime.

**NIST AI RMF 1.0:**

- Manage / MG.3.2 (primary) — Managing third-party dependency risk in AI runtime.

---

### ATR-2026-34130 — Disk Image Creation Via Hdiutil - MacOS

- **SHA-256:** `cd9381572ab5ac2f6cc7cb613c718620f76f6fa529ec3ffa711eceff76036724`
- **Severity:** medium
- **Source:** sigma rule `1cf98dc2-fcb0-47c9-8aea-654c9284d1ae`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — agent staging payload via DMG creation/mount.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — hdiutil for payload packaging.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (secondary) — Excessive Agency — agent should not mount disk images at runtime.

**NIST AI RMF 1.0:**

- Measure / MS.3.3 (primary) — Detect agent operating outside expected scope.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for macOS payload-staging.

---

### ATR-2026-34505 — Remote File Download Via Desktopimgdownldr Utility

- **SHA-256:** `49063ca896515ffcb17f87c644dfcc592f5c54acda5cd7ca6cd10c231dc57778`
- **Severity:** medium
- **Source:** sigma rule `214641c2-c579-4ecb-8427-0cf19df6842e`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — agent using OS LOLBIN to fetch second-stage payload.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — desktopimgdownldr repurposed as downloader.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency — agent should not have arbitrary download.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of LOLBIN download.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment.

---

### ATR-2026-36892 — Base64 MZ Header In CommandLine

- **SHA-256:** `5b29720974a3dcc036863f3dc590423495f4dc22c77621311fbf972836bf5511`
- **Severity:** high
- **Source:** sigma rule `22e58743-4ac8-4a9f-bf19-00a0428d8c5f`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — embedded PE payload via agent shell or prompt is direct exploit attempt.
- Article 9 (primary) — Article 9 risk management — embedded-payload exploitation is documented attack class.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via in-memory PE load.
- ASI01:2026 (secondary) — Goal Hijack — payload injected via user_input vector.

**OWASP LLM Top 10 (2025):**

- LLM01:2025 (primary) — Prompt Injection embedding base64 PE payload.
- LLM06:2025 (primary) — Excessive Agency executing decoded payload.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of payload-injection risk.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for payload exec via agent.

---

### ATR-2026-38740 — Access of Sudoers File Content

- **SHA-256:** `00a4b70e74ca0435ddc66876fd46ded2e33c73ccd99113430c745ea246eb7915`
- **Severity:** medium
- **Source:** sigma rule `0f79c4d2-4e1f-4683-9c36-b5469a665e06`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — reading sudoers is privilege-escalation reconnaissance.
- Article 50 (secondary) — Article 50 transparency — agent reading sensitive files should be logged for users.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — shell access used to read privileged files.
- ASI06:2026 (primary) — Privilege Compromise reconnaissance.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure — sudoers contents can be exfiltrated.

**NIST AI RMF 1.0:**

- Measure / MS.3.3 (primary) — Detect agent operating outside expected file-access scope.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for privileged-file access via agent.

---

### ATR-2026-39365 — Suspicious X509Enrollment - Process Creation

- **SHA-256:** `1b30ee686cbe7e62be9ee4a5d4ce7be2d8c30f304afb1a7e254204fa54316716`
- **Severity:** medium
- **Source:** sigma rule `114de787-4eb2-48cc-abdb-c0b449f93ea4`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — installing rogue trust roots breaks the entire TLS/code-signing trust chain agent runtime depends on.
- Article 14 (primary) — Article 14 oversight — trust-root install is high-impact and requires human approval.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise — rogue cert enables persistent MITM.
- ASI09:2026 (primary) — Identity Spoofing — rogue cert impersonates legitimate authority.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency — cert install should never be agent-initiated.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — Managing risk of agent altering trust boundaries.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for trust-anchor manipulation via AI agent.

---

### ATR-2026-41443 — Linux Recon Indicators

- **SHA-256:** `ff9fae0d1965c911dfdc2c54f253c300b764d03bde490dd0bb1c2cffc26f1f69`
- **Severity:** high
- **Source:** sigma rule `0cf7a157-8879-41a2-8f55-388dd23746b7`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness covers detection of agent steering toward unauthorized data discovery. SUID-binary and credential-file enumeration is reconnaissance preparation for privilege escalation; firing this rule is direct evidence of an agent acting outside its intended scope.
- Article 50 (secondary) — Article 50 (transparency) — when agent is doing reconnaissance, end users should be alerted; the rule provides the trigger.

**OWASP Agentic Top 10 (2026):**

- ASI04:2026 (primary) — ASI04:2026 (Resource Overload) and ASI05:2026 (Tool Misuse) — using shell tools for reconnaissance is canonical tool misuse beyond the agent task scope.

**NIST AI RMF 1.0:**

- Measure / MS.3.3 (primary) — Measuring agent behavior against expected scope — recon commands are a clear out-of-scope signal that NIST MS.3.3 monitoring should capture.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for AI deployment must account for agent-driven reconnaissance as a misuse vector.

---

### ATR-2026-43105 — Start of NT Virtual DOS Machine

- **SHA-256:** `b6fbc35d9014d199c88021c4fb3786b9094760ea6297d31abdfda7321bb507b6`
- **Severity:** medium
- **Source:** sigma rule `16905e21-66ee-42fe-b256-1318ada2d770`
- **Rule version:** 1
- **Detection field:** `Image`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging applies generically; NTVDM activity on agent host is host-EDR concern.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host-environment integrity precondition.

---

### ATR-2026-49108 — Use of Pcalua For Execution

- **SHA-256:** `aaa323c6be4a2956845b46053d0e0fb61497c17e7c56d1faaa1a10c89bdf9092`
- **Severity:** medium
- **Source:** sigma rule `0955e4e1-c281-4fb9-9ee1-5ee7b4b754d2`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — LOLBIN evasion via agent shell.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — pcalua proxy execution.

**NIST AI RMF 1.0:**

- Measure / MS.2.7 (primary) — LOLBIN technique detection.

---

### ATR-2026-50378 — HackTool - CrackMapExec Execution Patterns

- **SHA-256:** `5ef61b2998d8132d5df5df8158d1f6b135a0eb724d8bc2ebb09e3a02f0c1c134`
- **Severity:** high
- **Source:** sigma rule `058f4380-962d-40a5-afce-50207d36d7e2`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — agent issuing AD enumeration is direct evidence of out-of-scope reconnaissance.
- Article 12 (primary) — Article 12 logging — every AD-enum tool_call must be auditable.

**OWASP Agentic Top 10 (2026):**

- ASI04:2026 (primary) — Resource Overload — bulk AD enumeration via agent.
- ASI06:2026 (primary) — Privilege Compromise — AD recon precedes lateral movement.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency for post-exploit framework usage.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of agent-driven AD reconnaissance risk.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for AD reconnaissance via AI agent.

---

### ATR-2026-50890 — JAMF MDM Potential Suspicious Child Process

- **SHA-256:** `371a109d73328919c7936332095b9b93c297ba70cc37cff2680dad6e6ab8e4e8`
- **Severity:** medium
- **Source:** sigma rule `2316929c-01aa-438c-970f-099145ab1ee6`
- **Rule version:** 1
- **Detection field:** `ParentImage`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging — MDM compromise of agent host.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host integrity.

---

### ATR-2026-53865 — Network Communication Initiated To Portmap.IO Domain

- **SHA-256:** `c03deff3e0f8241eb3a82c3f0815ba91f300dd079b2c96b8e9d1badaa789dd4f`
- **Severity:** medium
- **Source:** sigma rule `07837ab9-60e1-481f-a74d-c31fb496a94c`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — tunneling-service connections from agent indicate scope violation.
- Article 12 (primary) — Article 12 logging requirements for outbound C2-class destinations.

**OWASP Agentic Top 10 (2026):**

- ASI02:2026 (primary) — Memory/Context Manipulation — context exfiltration to attacker-controlled tunnel.
- ASI05:2026 (primary) — Tool Misuse — HTTP tools used for non-business destinations.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure via tunnel.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime data-exfiltration detection at egress.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for outbound tunneling via AI agent.

---

### ATR-2026-54358 — Shell Execution Of Process Located In Tmp Directory

- **SHA-256:** `cc9be55952dd2a8be80ea631f98734a8fedb00571e1408680deeef7af1312e08`
- **Severity:** high
- **Source:** sigma rule `2fade0b6-7423-4835-9d4f-335b39b83867`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — agent executing binary from tmp is dropper-pattern signal.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — agent shell launching dropper binary.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (secondary) — Excessive Agency.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime detection of dropper staging.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment.

---

### ATR-2026-64888 — MacOS Scripting Interpreter AppleScript

- **SHA-256:** `b3adad43dc8fc8888219b3f443e9397ffca632cf1d3f1ae94d4fb74d9d588950`
- **Severity:** medium
- **Source:** sigma rule `1bc2e6c5-0885-472b-bed6-be5ea8eace55`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — agent invoking osascript for keychain access or credential dialog.
- Article 50 (primary) — Article 50 transparency — credential prompts via agent need user disclosure.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — scripting interpreter used for credential theft.
- ASI09:2026 (primary) — Identity Spoofing — fake credential prompt impersonates system.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure — credentials harvested.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime credential-theft detection.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for AppleScript abuse via agent.

---

### ATR-2026-65860 — Suspicious Splwow64 Without Params

- **SHA-256:** `3537445e44c4246d029599b4854720d70e46e6570c7006a0ccaa10a817ec9240`
- **Severity:** high
- **Source:** sigma rule `1f1a8509-2cbb-44f5-8751-8e1571518ce2`
- **Rule version:** 1
- **Detection field:** `Image`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging — host-EDR concern.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host-environment integrity.

---

### ATR-2026-70113 — Communication To Ngrok Tunneling Service Initiated

- **SHA-256:** `1fb0fc59178042fd768ab265a79fce84c41f8e084fc1827e09aa18615e36dbb7`
- **Severity:** high
- **Source:** sigma rule `1d08ac94-400d-4469-a82f-daee9a908849`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — outbound to tunneling service.

**OWASP Agentic Top 10 (2026):**

- ASI02:2026 (primary) — Memory/Context Manipulation via tunnel exfil.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure via tunnel.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime data-exfiltration detection.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for outbound tunneling.

---

### ATR-2026-70804 — Uncommon Network Connection Initiated By Certutil.EXE

- **SHA-256:** `573c5ab943bfc0f6f663a3a24963117a05f7db1c626f00669718081c936dc36e`
- **Severity:** high
- **Source:** sigma rule `0dba975d-a193-4ed1-a067-424df57570d1`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — agent using OS-built-in download cradles to fetch second-stage payloads.
- Article 12 (primary) — Article 12 logging — every certutil network invocation needs audit trail.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — certutil repurposed as a download tool by agent.
- ASI06:2026 (secondary) — Privilege Compromise via second-stage staging.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency — agent should not have arbitrary download capability.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of LOLBIN download via agent.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for agent-driven payload staging.

---

### ATR-2026-71531 — Suspicious Outlook Child Process

- **SHA-256:** `2dba20d6ae0e7b5dbb5351698521c00bde86337280350eae510f9fb516866000`
- **Severity:** high
- **Source:** sigma rule `208748f7-881d-47ac-a29c-07ea84bf691d`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — email agents resolving attachments are common phishing vector.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — email tools chained to shell exec.

**OWASP LLM Top 10 (2025):**

- LLM01:2025 (primary) — Prompt Injection — embedded macros / HTML in email content.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of email-driven exec.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for email-handling agent.

---

### ATR-2026-73413 — Suspicious HWP Sub Processes

- **SHA-256:** `cae74274fa7a8e9763b3e4350ecc6e3f7e595b1890672128ca581374e5a7ff5a`
- **Severity:** high
- **Source:** sigma rule `023394c4-29d5-46ab-92b8-6a534c6f447b`
- **Rule version:** 1
- **Detection field:** `ParentImage`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging applies generically; host-document compromise of the agent operator host can affect AI integrity.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host-environment integrity precondition for trustworthy AI deployment.

---

### ATR-2026-74985 — Suspicious Chromium Browser Instance Executed With Custom Extension

- **SHA-256:** `6d365cbeafcba99da88855dc6d31e8ff2bc7a7ef3176137fe36570f8af7aa312`
- **Severity:** high
- **Source:** sigma rule `27ba3207-dd30-4812-abbf-5d20c57d474e`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 cybersecurity — loading a third-party extension into the agent's browser context expands the trust boundary unpredictably. Robustness violation when the extension is attacker-controlled.
- Article 14 (primary) — Article 14 oversight — extension installation should require human gating, not be performed via tool_call directive.

**OWASP Agentic Top 10 (2026):**

- ASI08:2026 (primary) — ASI08:2026 Skill/Plugin Compromise — loading arbitrary browser extensions through tool_call is the browser-context analogue of skill compromise.

**OWASP LLM Top 10 (2025):**

- LLM03:2025 (primary) — LLM03:2025 Supply Chain — third-party extension is a supply-chain trust boundary violation when loaded mid-session.

**NIST AI RMF 1.0:**

- Manage / MG.3.2 (primary) — NIST AI RMF MG.3.2 — managing third-party tooling supply chain. Browser extensions are third-party plugins.

---

### ATR-2026-75586 — Dumping Process via Sqldumper.exe

- **SHA-256:** `530eb885f6fd7cfe364b9e6e00f2111e205b7331a585a657185f4f86f45fbdcb`
- **Severity:** medium
- **Source:** sigma rule `23ceaf5c-b6f1-4a32-8559-f2ff734be516`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — agent dumping process memory exfils credentials.
- Article 12 (primary) — Article 12 logging — every memory-dump tool_call needs audit.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — sqldumper repurposed as credential dumper.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure — memory dump contains credentials.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime credential-theft detection.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for memory-dump via agent.

---

### ATR-2026-76233 — HackTool - Wmiexec Default Powershell Command

- **SHA-256:** `592719102e40fca1501c58e81cf1decd99b48ee585413de61ee3df32449d7f41`
- **Severity:** high
- **Source:** sigma rule `022eaba8-f0bf-4dd9-9217-4604b0bb3bb0`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — lateral-movement via agent shell tool defeats single-host AI deployment isolation assumptions.
- Article 14 (primary) — Article 14 oversight — privileged remote-exec actions need human-in-the-loop gating.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via lateral movement using delegated shell tool authority.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency — agent should not have remote-exec capability for typical use cases.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of lateral-movement risk for AI agents with shell access.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — AI deployment impact assessment must account for lateral-movement misuse.

---

### ATR-2026-77355 — UtilityFunctions.ps1 Proxy Dll

- **SHA-256:** `80c147c4fc5280e4b046a1a98a233d86b03eb8fb7306776e707995202077826b`
- **Severity:** medium
- **Source:** sigma rule `0403d67d-6227-4ea8-8145-4e72db7da120`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — proxy-DLL helper signals defense-evasion attempt via agent shell.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via DLL hijack helper functions.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (secondary) — Excessive Agency — agent should not load proxy-DLL helpers.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of agent-driven defense evasion.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for agent-driven DLL hijack.

---

### ATR-2026-77646 — Potential Persistence Via Logon Scripts - CommandLine

- **SHA-256:** `2303bca98e8ffe72abcdabf94f4807c4f4a5450c36827f0f8588df52943e4bfb`
- **Severity:** high
- **Source:** sigma rule `21d856f9-9281-4ded-9377-51a1a6e2a432`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 oversight — persistence install requires approval.
- Article 15 (primary) — Article 15 robustness against persistence install via agent.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via persistence at logon.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency for persistence install.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — Managing risk of agent installing persistence.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment.

---

### ATR-2026-77772 — Potential Defense Evasion Activity Via Emoji Usage In CommandLine - 4

- **SHA-256:** `3f2e0ecb190dbf5f673379c996b2846e9bcf3796aa3d2097d70fae05b312f09f`
- **Severity:** high
- **Source:** sigma rule `225274c4-8dd1-40db-9e09-71dff4f6fb3c`
- **Rule version:** 1
- **Detection field:** `user_input`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness against adversarial input. Emoji-based obfuscation is a known evasion technique against keyword filters; detecting it is part of robustness assurance.

**OWASP Agentic Top 10 (2026):**

- ASI01:2026 (primary) — Agent Goal Hijack — obfuscated payloads in user_input attempt to override agent instructions while evading detection.

**OWASP LLM Top 10 (2025):**

- LLM01:2025 (primary) — LLM01:2025 Prompt Injection — emoji obfuscation is documented in the OWASP prompt-injection taxonomy.

**NIST AI RMF 1.0:**

- Measure / MS.2.7 (primary) — Measuring AI system security against documented adversarial techniques. Emoji obfuscation is a published technique requiring active detection.

---

### ATR-2026-78212 — Potential Hidden Directory Creation Via NTFS INDEX_ALLOCATION Stream - CLI

- **SHA-256:** `c2fb9e4852b18fbb780c6c753a23992507815a84afd2f2c8d4fc350911459e78`
- **Severity:** medium
- **Source:** sigma rule `0900463c-b33b-49a8-be1d-552a3b553dae`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — defense-evasion technique attempt via agent shell.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — using filesystem tools for evasion.

**NIST AI RMF 1.0:**

- Measure / MS.3.3 (primary) — Detect agent operating outside expected scope.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for filesystem-evasion via agent.

---

### ATR-2026-79114 — Hacktool Execution - Imphash

- **SHA-256:** `1a536e9a153e2213c52ef62620ec2e65644352b05fd50772792729d30d1f4492`
- **Severity:** critical
- **Source:** sigma rule `24e3e58a-646b-4b50-adef-02ef935b9fc8`
- **Rule version:** 1
- **Detection field:** `Hashes`
- **AI agent analogue:** NO
- **LLM-enriched:** YES
- **Needs human review:** 2 item(s)
  - detection.conditions[].field (endpoint→agent-context mapping)
  - detection.conditions[].field (LLM determined no agent analogue exists; rule kept with original endpoint fields and will not activate against agent events)

**EU AI Act:**

- Article 12 (partial) — Article 12 logging — host hacktool execution affects agent host integrity.

**NIST AI RMF 1.0:**

- Govern / GV.1.1 (partial) — Host integrity precondition.

---

### ATR-2026-81735 — HackTool - SILENTTRINITY Stager Execution

- **SHA-256:** `7fdf62f9aa2774d0ce968162a405c74af4f0b94c1883dc9bae04bffdcb01178b`
- **Severity:** high
- **Source:** sigma rule `03552375-cc2c-4883-bbe4-7958d5a980be`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — reflective code loading via agent shell defeats sandboxing.
- Article 12 (primary) — Article 12 logging — every reflective-load tool_call needs audit trail.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via in-memory code execution.
- ASI07:2026 (secondary) — Cascading Tool Misuse — chain of download + decode + execute.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — Excessive Agency — agent should not have arbitrary code execution.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — Managing risk of agent modifying its own runtime via reflective loading.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for in-process code injection via AI agent.

---

### ATR-2026-83241 — Network Connection Initiated via Finger.EXE

- **SHA-256:** `d671f1154634393fd54d5f388e7c64b13b8c35f8a2fcc1a1350e8dee93d255e8`
- **Severity:** high
- **Source:** sigma rule `2fdaf50b-9fd5-449f-ba69-f17248119af6`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — finger as covert C2 channel via agent.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — finger repurposed as C2.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Information disclosure via finger response.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime egress detection on uncommon protocols.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment.

---

### ATR-2026-85501 — Malicious PowerShell Commandlets - ProcessCreation

- **SHA-256:** `bd8823dea4f4d1bf0e0ed54003cfc553605c5b59946315cbee625bfb890c3b5c`
- **Severity:** high
- **Source:** sigma rule `02030f2f-6199-49ec-b258-ea71b07e03dc`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 requires high-risk AI systems to be resilient against malicious manipulation. An agent invoking PowerSharpPack/PowerView cmdlets via tool_call.arguments is direct evidence the agent has been steered toward attacker objectives — a robustness failure that this rule surfaces in real time.
- Article 12 (secondary) — Article 12 mandates automatic logging of high-risk AI events. Triggering on this rule produces the audit-grade event needed to demonstrate post-incident traceability of agent compromise.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — OWASP Agentic ASI06:2026 (Privilege Compromise) covers exactly this class — agent with delegated authority is induced to run privileged tooling. The cmdlets in the rule pattern (Invoke-Mimikatz, DCSync) are the canonical post-compromise toolset.
- ASI01:2026 (secondary) — When the agent's goal is hijacked into running these cmdlets, ASI01 (Agent Goal Hijack) is the upstream vector that the rule indirectly reveals.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (partial) — LLM06:2025 (Excessive Agency) — the agent has tools that can execute arbitrary cmdlets and is induced to misuse them. The rule fires on the misuse, not the agency itself, so 'partial'.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — NIST AI RMF MG.2.3 calls for active runtime countermeasures against identified agent risks. Detection of exploitation cmdlet invocation in tool_call arguments is the primary risk-treatment control for the Privilege Compromise risk class.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — ISO 42001 clause 8.4 requires impact assessment of AI deployments to consider adversarial misuse. Detection events from this rule are the monitoring evidence the impact assessment process needs.

---

### ATR-2026-88829 — Powershell Defender Exclusion

- **SHA-256:** `b813cfc5a685e7d66130b64206a1b917d57563203f6cf4865809de1111370944`
- **Severity:** medium
- **Source:** sigma rule `17769c90-230e-488b-a463-e05c08e9d48f`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — disabling host AV via agent action degrades the integrity of the AI deployment environment. Direct robustness violation.
- Article 14 (primary) — Article 14 (human oversight) — adding AV exclusions is a high-impact action that should require human-in-the-loop approval. Firing this rule means the action happened without that gate.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — ASI06:2026 Privilege Compromise — agent leveraging admin privileges to weaken host security posture. Canonical example.
- ASI09:2026 (secondary) — ASI09:2026 (Identity Spoofing) — when an agent runs as a privileged service identity, AV-exclusion actions inherit that identity and circumvent oversight.

**OWASP LLM Top 10 (2025):**

- LLM06:2025 (primary) — LLM06:2025 Excessive Agency — agent with privileges to modify security software is excessive for typical use cases. The rule surfaces concrete misuse.

**NIST AI RMF 1.0:**

- Manage / MG.4.1 (primary) — NIST AI RMF MG.4.1 — managing risks of AI systems modifying their operating environment. AV exclusion is the highest-impact form.

---

### ATR-2026-90343 — Communication To Ngrok Tunneling Service - Linux

- **SHA-256:** `fcadb93f650855f72ab8feb6055beec9d7927e2be904be60fce3856342148524`
- **Severity:** high
- **Source:** sigma rule `19bf6fdb-7721-4f3d-867f-53467f6a5db6`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — Linux agent reaching ngrok tunnel signals scope violation.
- Article 12 (primary) — Article 12 logging — outbound C2 destinations.

**OWASP Agentic Top 10 (2026):**

- ASI02:2026 (primary) — Memory/Context Manipulation — context exfil to attacker tunnel.
- ASI05:2026 (primary) — Tool Misuse — HTTP tools used for non-business destinations.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure via tunnel.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime treatment of data-exfiltration risk.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for outbound tunneling via Linux agent.

---

### ATR-2026-90471 — Shell Execution via Nice - Linux

- **SHA-256:** `6658a329fc3ad49197d8dd20e7f0cd2d869f45e9fff7f5ffb5d01eb5f0adec25`
- **Severity:** high
- **Source:** sigma rule `093d68c7-762a-42f4-9f46-95e79142571a`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 robustness — LOLBIN evasion via agent shell.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — using nice as a shell wrapper to evade detection.

**NIST AI RMF 1.0:**

- Measure / MS.2.7 (primary) — Measuring against documented evasion techniques.

---

### ATR-2026-93338 — Suspicious Double Extension File Execution

- **SHA-256:** `351019b31e1dcea208671945469ef38a4de62da054c062655269a645c623b742`
- **Severity:** high
- **Source:** sigma rule `1cdd9a09-06c9-4769-99ff-626e2b3991b8`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — agent resolving double-extension file is documented social-engineering vector.

**OWASP Agentic Top 10 (2026):**

- ASI05:2026 (primary) — Tool Misuse — file tools used to launch deceptively-named executable.

**OWASP LLM Top 10 (2025):**

- LLM01:2025 (secondary) — Prompt Injection often instructs agent to "open the document".

**NIST AI RMF 1.0:**

- Measure / MS.2.7 (primary) — Measure against documented social-engineering techniques.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for double-extension exec via agent.

---

### ATR-2026-94647 — Invocation of Active Directory Diagnostic Tool (ntdsutil.exe)

- **SHA-256:** `f161b7f94dc802a52cbbb2f08df1c7bccebe646eda798738b45cc199230665e9`
- **Severity:** medium
- **Source:** sigma rule `2afafd61-6aae-4df4-baed-139fa1f4c345`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 14 (primary) — Article 14 oversight — AD password database dump is the highest-impact action; absolute requirement for human approval.
- Article 15 (primary) — Article 15 robustness — agent dumping NTDS.dit is direct critical-asset compromise.
- Article 9 (primary) — Article 9 risk management — NTDS dump is documented top-tier AI deployment risk.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise — full domain compromise via NTDS dump.
- ASI07:2026 (primary) — Cascading Tool Misuse — single dump compromises every account.

**OWASP LLM Top 10 (2025):**

- LLM02:2025 (primary) — Sensitive Information Disclosure at scale (every domain credential).

**NIST AI RMF 1.0:**

- Manage / MG.4.2 (primary) — Incident response — NTDS dump triggers IR playbook immediately.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for AD-database dump via agent.

---

### ATR-2026-97982 — Potentially Suspicious WebDAV LNK Execution

- **SHA-256:** `9148586de84c59a98a7d5bc2f010504dcb1ab21fe9cb5060808db10d56b7a312`
- **Severity:** medium
- **Source:** sigma rule `1412aa78-a24c-4abd-83df-767dfb2c5bbe`
- **Rule version:** 1
- **Detection field:** `tool_call.arguments`
- **AI agent analogue:** YES
- **LLM-enriched:** YES

**EU AI Act:**

- Article 15 (primary) — Article 15 — agent invoking remote-payload LNK from WebDAV defeats local-execution boundary.

**OWASP Agentic Top 10 (2026):**

- ASI06:2026 (primary) — Privilege Compromise via remote payload load.

**OWASP LLM Top 10 (2025):**

- LLM03:2025 (primary) — Supply Chain — remote payload is a supply-chain trust violation.

**NIST AI RMF 1.0:**

- Manage / MG.2.3 (primary) — Runtime detection of remote payload load via agent.

**ISO/IEC 42001:2023:**

- Clause 8.4 (primary) — Impact assessment for remote-payload execution.

---

## Honest Disclosures

- This pack documents **migrator-converted detection rules** derived from upstream Sigma/YARA sources. Conversion fidelity varies per rule:
  - **40 rules** are LLM-enriched and reauthored with detection fields appropriate for AI agent runtime context (`tool_call.arguments`, `user_input`, `agent_output`, etc).
  - **10 rules** are auto-generated placeholders that retain the original Sigma/YARA endpoint detection fields. These rules are schema-valid and can be deployed, but will only fire on host OS event telemetry, not on agent runtime events. Each carries a `needs_human_review` marker explicitly listing the review items.
- The migrator deliberately preserves rules with no agent analogue (`has_agent_analogue: false`) rather than fabricate translations. These rules document the operator's detection coverage but are not expected to activate against agent telemetry.
- For full audit-grade detection coverage, replace placeholder rules with hand-crafted enrichments (LLM-assisted or manual review by a security engineer).

