<div align="center">

<img src="assets/PANGUARD_GitHub_Banner_Clean.png" alt="Panguard AI" width="720">

<br>

### The commercial platform for the ATR open detection standard.

ATR 開放偵測標準的商業實作層。

<br>

[![GitHub Stars](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=flat-square&color=DAA520)](https://github.com/panguard-ai/panguard-ai/stargazers)
[![npm version](https://img.shields.io/npm/v/@panguard-ai/panguard?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@panguard-ai/panguard)
[![MIT License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)
[![ATR](https://img.shields.io/badge/ATR-419%20rules-8b5cf6.svg?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules)
[![OWASP](https://img.shields.io/badge/OWASP%20Agentic%20Top%2010-10%2F10-green?style=flat-square)](docs/OWASP-MAPPING.md)
[![SAFE-MCP](https://img.shields.io/badge/SAFE--MCP-91.8%25-blue?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/SAFE-MCP-MAPPING.md)
[![garak](https://img.shields.io/badge/garak%20recall-97.1%25-2ea043?style=flat-square)](https://panguard.ai/research/benchmarks)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

[Quick Start](#quick-start) · [Why PanGuard](#why-panguard-layer-0--layer-1) · [Products](#products) · [Ecosystem](#ecosystem-adoption) · [Benchmarks](#benchmarks) · [Pricing](https://panguard.ai/pricing) · [Sovereign AI](https://sovereign-ai-defense.vercel.app)

</div>

---

## The Problem

AI agents install skills with zero review. They read files, execute commands, access credentials. We scanned 67,799 skills with parseable content across 4 registries. 1,096 confirmed malicious. 11,324 total threats detected. The npm ecosystem took 12 years to ship `npm audit`. AI agents don't have 12 years.

AI Agent 安裝 skill 沒有任何審核流程，卻擁有檔案存取、指令執行、憑證取得的完整權限。我們掃描了 4 個 registry 共 67,799 個可解析的 skill，1,096 個確認惡意，11,324 個威脅信號。npm 生態系花了 12 年才有 `npm audit`，AI agent 沒有 12 年可以等。

---

## Quick Start

```bash
npm install -g @panguard-ai/panguard && pga up
```

One command. Auto-detect AI platforms. Wrap every MCP server with a security proxy. Scan all skills. Start 24/7 monitoring with a real-time dashboard.

一行搞定。自動偵測 AI platform、注入 runtime proxy、掃描所有 skill、啟動 24/7 監控與 dashboard。

```bash
pga scan skill.md                 # auto-detects MCP JSON vs SKILL.md
pga scan skill.md --sarif         # SARIF 2.1.0 for CI integration
pga guard up                      # runtime engine, 4-agent pipeline
pga migrate sigma rule.yml        # Sigma / YARA -> ATR YAML
```

| Method                      | Command                                           |
| --------------------------- | ------------------------------------------------- |
| **npm** (recommended)       | `npm install -g @panguard-ai/panguard && pga up`  |
| **curl** (no Node required) | `curl -fsSL https://get.panguard.ai \| bash`      |
| **Homebrew** (macOS)        | `brew install panguard-ai/tap/panguard && pga up` |

Or scan online at **[panguard.ai](https://panguard.ai)**. Paste a GitHub URL. Report in 3 seconds.

---

## Why PanGuard: Layer 0 + Layer 1

Sigma defined the SIEM rule format. Splunk built the SIEM. YARA defined the malware signature format. VirusTotal runs it at scale. ATR defines the AI agent threat rule format. PanGuard is the runtime, the compliance evidence engine, and the migration toolkit on top.

Sigma 定義 SIEM 規則格式，Splunk 做平台。YARA 定義惡意樣本特徵格式，VirusTotal 做大規模偵測。ATR 定義 AI agent 威脅規則格式，PanGuard 做 runtime、合規證據、規則遷移工具。

| Layer                       | What it is                                                       | License        | Maintainer        |
| --------------------------- | ---------------------------------------------------------------- | -------------- | ----------------- |
| **Layer 0 — Open Standard** | [ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) — 419 rules, 920 detection patterns, 10 categories | MIT            | Community-driven  |
| **Layer 1 — Platform**      | PanGuard Guard runtime + Migrator + Threat Cloud + Compliance Evidence Module | MIT (Community) / Commercial (Enterprise) | Panguard AI, Inc. |

The bet: be both the open standard maintainer and the company that ships the platform layer. No peer competitor exists on either axis.

策略賭注：同時是開放標準的維護者，也是平台層的商業營運方。兩個軸線上目前都沒有對等競爭者。

---

## Sovereign AI

Saudi Arabia announced replacing 50% of civil servants with AI agents within 2 years. Other governments are quietly moving the same direction. They need a detection standard that is not US, not China, vendor-neutral, MIT-licensed, audit-ready. ATR is that standard. PanGuard is the commercial deployment built for that customer class.

沙烏地阿拉伯宣告兩年內 50% 公務員由 AI agent 取代。其他國家正在低調推進相同方向。他們需要一個非美、非中、廠商中立、MIT 授權、可稽核的偵測標準。ATR 是那個標準。PanGuard 是為這類客戶而設計的商業實作。

Brief: **[sovereign-ai-defense.vercel.app](https://sovereign-ai-defense.vercel.app)**

---

## Products

| Product                                                            | Role                                            | One-line description                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| **PanGuard Scan**                                                  | One-shot audit                                  | 60-second SKILL.md or MCP audit with SARIF 2.1.0 export for any CI.               |
| **PanGuard Guard**                                                 | Runtime engine                                  | 4-agent pipeline blocking malicious tool calls before they reach the real server. |
| **PanGuard Skill Auditor**                                         | Pre-install gate                                | 8 security checks every skill must pass before it can be installed.               |
| **PanGuard Migrator** ([details](https://panguard.ai/migrator))    | Standards bridge                                | Sigma / YARA rules to ATR YAML. Community on npm. Enterprise adds compliance.     |
| **PanGuard MCP Server**                                            | AI assistant integration                        | 12 tools served over Model Context Protocol for Claude, Codex, Cursor.            |
| **PanGuard Threat Cloud**                                          | Intelligence flywheel                           | Confirmed threats from any user become an ATR rule. Rule pushed to everyone.      |
| **Coming**                                                         | Trap / Chat / Report                            | Honeypot, conversational console, executive PDF reporting.                        |

Migrator Community: `npm install @panguard-ai/migrator-community` (MIT, v0.1.0). Migrator Enterprise adds 6-framework compliance evidence and audit trail.

---

## Ecosystem Adoption

13 PRs merged across 6 external organizations. 7 Tier-1 institutions with active engagement.

13 個 PR 通過 6 個外部組織 merge，7 個 Tier-1 機構正在審核中。

| Organization                              | Integration                                                         | Status         | Reference                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| **Microsoft AGT**                         | 287 ATR rules + weekly auto-sync workflow                           | Merged         | [PR #1277](https://github.com/microsoft/agent-governance-toolkit/pull/1277)                     |
| **Microsoft Copilot SWE Agent**           | Copilot-authored fixtures presuming ATR detection; v2.1.2 in 2h 16m | In production  | [AGT issue #1981](https://github.com/microsoft/agent-governance-toolkit/issues/1981)            |
| **Cisco AI Defense**                      | Full 419-rule library in skill-scanner production                   | Merged         | [PR #99](https://github.com/cisco-ai-defense/skill-scanner/pull/99)                             |
| **MISP** (threat intel)                   | Galaxy entry for global sharing                                     | Merged         | [misp-galaxy #1207](https://github.com/MISP/misp-galaxy/pull/1207)                              |
| **MISP** (taxonomies)                     | Taxonomy registered                                                 | Merged         | [misp-taxonomies #323](https://github.com/MISP/misp-taxonomies/pull/323)                        |
| **OWASP A-S-R-H**                         | Agentic Security Resource Hub listing                               | Merged         | PR #74 ("Welcome to the team" from project lead)                                                |
| **Gen Digital Sage** (Norton/Avast/AVG)   | Detection rule pipeline integration                                 | Open           | PR #33                                                                                          |
| NVIDIA garak                              | Multi-language attack coverage                                      | In review      | Issue #1676                                                                                     |
| OpenSSF SAFE-MCP                          | Technique mapping pipeline                                          | In review      | PR #187                                                                                         |
| IBM mcp-context-forge                     | Context server hardening                                            | In review      | PR #4109                                                                                        |
| Meta PurpleLlama                          | Detection layer integration                                         | In review      | PR #206                                                                                         |
| Promptfoo                                 | Evaluation harness rules                                            | In review      | PR #8529                                                                                        |

OWASP A-S-R-H is a third-party Agentic Security Resource Hub. The OWASP Foundation main repo PRs are pending and not listed in this table as merged.

OWASP A-S-R-H 是 third-party 的 Agentic Security Resource Hub。OWASP Foundation 主 repo 的 PR 仍在 review，沒有列為 merged。

Production CVE coverage: 6 CVEs across Spring AI (3), LiteLLM (CISA KEV [CVE-2026-42208](https://nvd.nist.gov/vuln/detail/CVE-2026-42208)), Microsoft Semantic Kernel (2).

---

## Standards Alignment

Every ATR rule maps to 6 compliance frameworks. Enterprise compliance evidence is signed and audit-ready.

每條 ATR 規則對應 6 個合規框架。Enterprise 層提供簽章後的稽核證據。

| Framework                | Coverage                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| OWASP Agentic Top 10     | **10 / 10** ([mapping](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/OWASP-MAPPING.md))                               |
| SAFE-MCP                 | **78 / 85 = 91.8%** ([mapping](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/SAFE-MCP-MAPPING.md))                    |
| OWASP LLM Top 10         | Per-rule mapping in YAML frontmatter                                                                                                           |
| MITRE ATLAS              | Per-rule technique IDs                                                                                                                         |
| NIST AI RMF              | OSCAL catalog v0.3 published                                                                                                                   |
| EU AI Act                | High-risk system clauses tagged                                                                                                                |
| ISO/IEC 42001            | AI management system controls tagged                                                                                                           |

---

## Benchmarks

Public benchmarks, deterministic samples, fixed seeds. Full methodology at [panguard.ai/research/benchmarks](https://panguard.ai/research/benchmarks).

| Corpus                              | Recall    | Precision | False positives | Sample size |
| ----------------------------------- | --------- | --------- | --------------- | ----------- |
| garak (ATR-core families)           | **97.1%** | -         | -               | 666         |
| SKILL.md real-world (v2.2.0)        | **100%**  | **100%**  | **0%**          | 341         |
| PINT (prompt-injection)             | 62.5%     | 99.6%     | 0.25%           | 850         |
| HackAPrompt                         | 66.2%     | -         | -               | 4,780       |

HackAPrompt is a +37.6 percentage point lift over the v2.1.x baseline of 28.6%. Numbers are precise. We do not round up.

HackAPrompt 相對 v2.1.x 基準 28.6% 提升 37.6 個百分點。數字是精確的，不四捨五入往上灌水。

---

## Wild Scan

96,096 entries crawled across 4 registries. 67,799 had parseable content and ran through the full pipeline. 1,096 confirmed malicious. 11,324 total threats detected. 249 packages combined shell + network + filesystem capabilities into a single skill ("triple-threat").

爬取 4 個 registry 共 96,096 個 entry。67,799 個有可解析內容並通過完整 pipeline。1,096 個確認惡意。11,324 個總威脅信號。249 個 package 同時具備 shell 執行、網路存取、檔案系統存取（"triple-threat"）。

| Registry                      | Entries crawled  |
| ----------------------------- | ---------------- |
| OpenClaw                      | 56,503           |
| ClawHub                       | 36,378           |
| Skills.sh                     | 3,115            |
| Hermes                        | 100              |
| **Total**                     | **96,096**       |

Full dataset, methodology, and reproducibility scripts: **[panguard.ai/research/96k-scan](https://panguard.ai/research/96k-scan)**.

---

## Pricing

Locked 2026-04-22. Four tiers. No middle tier. The page at [panguard.ai/pricing](https://panguard.ai/pricing) explains why the middle tier is a trap.

定價於 2026-04-22 鎖定。四個 tier。沒有中間層。[panguard.ai/pricing](https://panguard.ai/pricing) 解釋為什麼中間層是陷阱。

| Tier             | Price                | What you get                                                                                       |
| ---------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| **Community**    | $0 forever           | MIT, unlimited self-host, 419 ATR rules, no signup, no telemetry                                   |
| **Pilot**        | $25K / 90 days       | F500 procurement test drive. IT director can approve. Full credit to Y1 Enterprise.                |
| **Enterprise**   | $150K-$500K / year   | Migrator Pro, 5-framework signed evidence, airgap, SLA, dedicated CSM                              |
| **Sovereign**    | $5M-$20M / nation    | Nation-scale airgap, multi-tenant, custom compliance, AMD / Cisco / NVIDIA JV pre-integrated      |

---

## How It Works

```
  pga up
    |
    v
  Detect AI platforms (16 supported) -> inject MCP proxy on every server
    |
    v
  Every tool call -> ATR evaluation (419 rules, 920 patterns) -> ALLOW / DENY
    |                                                                  |
    v                                                                  v
  Dashboard (real-time)                                       Threat Cloud (flywheel)
    |                                                                  |
    v                                                                  v
  Blocked call -> alert + evidence                            3+ confirmations -> new ATR rule
                                                                       |
                                                                       v
                                                              Rule pushed to all users
```

One person encounters a threat. It becomes a rule. It protects everyone. That is the flywheel.

一個人遇到威脅。規則建立。所有人受保護。這就是飛輪。

### Three-Layer Detection

| Layer | Engine                     | Latency | Cost    |
| ----- | -------------------------- | ------- | ------- |
| **1** | 419 ATR rules (regex + AST) | < 50ms  | $0      |
| **2** | Local AI (Ollama)          | ~ 2s    | $0      |
| **3** | Cloud AI (Claude / OpenAI) | ~ 5s    | ~$0.008 |

Internet down? Rules + local AI keep running. Cloud down? Same. Everything degrades gracefully.

---

## Architecture

```
panguard-ai/
  packages/
    panguard/                CLI: 23 commands, 16-platform auto-detect
    panguard-guard/          Runtime engine + 4-agent pipeline + real-time dashboard
    panguard-mcp-proxy/      MCP runtime interception for every agent tool call
    panguard-skill-auditor/  8-check security gate for every skill
    panguard-mcp/            MCP server: 12 tools for AI assistants
    panguard-migrator/       Sigma / YARA -> ATR YAML converter
    atr/                     ATR Layer 0: 419 rules, 920 patterns, 10 categories
    threat-cloud/            Community threat intel server + LLM review pipeline
    scan-core/               Shared scan engine: regex + AST + context signals
    core/                    AI adapters, validation, logging
    website/                 Next.js marketing + online scanner + research pages
```

|                      |                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Language             | TypeScript 5.7 (strict mode)                                                                        |
| Runtime              | Node.js 20+                                                                                         |
| Monorepo             | pnpm workspaces, 18 packages                                                                        |
| Tests                | 159 test files, 3,528 tests passing                                                                 |
| AI                   | Ollama (local) + Claude / OpenAI (cloud)                                                            |
| Website              | Next.js 15 + Vercel                                                                                 |

### ATR Rule Categories

| Category                | Rules | Category                | Rules |
| ----------------------- | ----- | ----------------------- | ----- |
| prompt-injection        | 172   | privilege-escalation    | 12    |
| agent-manipulation      | 105   | model-abuse             | 10    |
| skill-compromise        | 40    | excessive-autonomy      | 8     |
| context-exfiltration    | 40    | model-security          | 3     |
| tool-poisoning          | 27    | data-poisoning          | 2     |

419 rules total. 357 stable, 62 experimental.

---

## Built in Taiwan

Adam Lin (林冠辛). Founder. Taiwan.

Cross-disciplinary builder background. Real estate sales. Marketing (Threads, 300M+ impressions). Hip-hop festival production (5th year). Self-taught engineer.

60 days, solo, from zero to: 419 ATR rules. 6 ecosystem integrations merged. 30+ PRs in flight across Microsoft, Cisco, MISP, OWASP A-S-R-H, NVIDIA, IBM, Meta, OpenSSF, NIST, EU AI Office. Microsoft Copilot SWE Agent wrote regression fixtures presuming ATR coverage; we shipped the matching rules in 2h 16m.

Adam Lin（林冠辛），創辦人，台灣。

跨領域背景：房地產業務、行銷（Threads 累積 3 億次觸及）、嘻哈音樂節製作（第 5 年）、自學工程。

60 天獨自從零開始：419 條 ATR 規則、6 個生態系整合 merged、30+ 個 PR 進行中，涵蓋 Microsoft、Cisco、MISP、OWASP A-S-R-H、NVIDIA、IBM、Meta、OpenSSF、NIST、EU AI Office。Microsoft Copilot SWE Agent 主動寫出預期 ATR 偵測的 regression fixture，我們在 2 小時 16 分鐘內 ship 出對應規則。

Contact: **adam@agentthreatrule.org**

---

## Contributing

- **Scan your skills** — Highest impact. Every scan strengthens Threat Cloud.
- **Write ATR rules** — See [ATR contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).
- **Report vulnerabilities** — [Open a security advisory](SECURITY.md).
- **Submit code** — Fork, branch, test, PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT for Community. 100% free. 100% open source. No telemetry by default. No vendor lock-in.

Enterprise and Sovereign tiers add commercial features (Migrator Pro compliance evidence, audit trail, signed reports, dedicated CSM) and are licensed separately. The runtime engine, ATR rules, scan core, MCP server, and CLI remain MIT forever.

---

<div align="center">

**If AI agents can act on your behalf, someone should check what they are about to do.**

如果 AI agent 可以代表你行動，總得有人檢查它接下來要做什麼。

<br>

[![Star on GitHub](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=for-the-badge&logo=github&label=Star%20on%20GitHub)](https://github.com/panguard-ai/panguard-ai)

**Panguard AI, Inc.** — Taipei, Taiwan · Delaware C-Corp

[Website](https://panguard.ai) ·
[Pricing](https://panguard.ai/pricing) ·
[Migrator](https://panguard.ai/migrator) ·
[Glossary](https://panguard.ai/glossary) ·
[Compare](https://panguard.ai/compare) ·
[Benchmarks](https://panguard.ai/research/benchmarks) ·
[96K Scan](https://panguard.ai/research/96k-scan) ·
[Sovereign AI](https://sovereign-ai-defense.vercel.app) ·
[ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules)

</div>
