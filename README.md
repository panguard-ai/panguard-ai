<div align="center">

<img src="assets/PANGUARD_GitHub_Banner_Clean.png" alt="Panguard AI" width="720">

<br>

### Free, on-device security for your AI agents.

Scan every skill they install, watch what they do at runtime, see it all in a local dashboard — nothing leaves your machine. Built on **ATR**, the open detection standard for AI-agent threats.

給你的 AI agent 的免費、本機資安。掃描它們安裝的每個 skill、即時守護執行中的行為、全在本機 dashboard 看到——程式碼不離開你的機器。建構於開放偵測標準 **ATR**。

<br>

[![GitHub Stars](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=flat-square&color=DAA520)](https://github.com/panguard-ai/panguard-ai/stargazers)
[![npm version](https://img.shields.io/npm/v/@panguard-ai/panguard?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@panguard-ai/panguard)
[![MIT License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)
[![ATR](https://img.shields.io/badge/ATR-650%2B%20rules-8b5cf6.svg?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules)
[![OWASP](https://img.shields.io/badge/OWASP%20Agentic%20Top%2010-10%2F10-green?style=flat-square)](docs/OWASP-MAPPING.md)
[![garak](https://img.shields.io/badge/garak%20recall-~97%25-2ea043?style=flat-square)](https://panguard.ai/research/benchmarks)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

[Quick start](#quick-start) · [See it work](#see-it-work) · [Who it's for](#who-its-for) · [Why PanGuard](#why-panguard-layer-0--layer-1) · [Ecosystem](#ecosystem-adoption) · [Benchmarks](#benchmarks)

</div>

---

## What you get

- **One command** installs the CLI, auto-detects your AI agent platforms, and scans every installed skill against **650+ open ATR rules** — locally.
- **A local Guard daemon** that inspects each agent tool call at runtime and blocks known attacks before they run.
- **A real-time dashboard** on `localhost` — protection status, threats caught, one-click quarantine, audit-ready evidence.
- **SARIF export** so any CI can gate installs on it.
- **100% free, MIT, on-device.** No account, no telemetry by default, no paid features hidden inside the free product. Nothing about your code leaves your machine.

一行指令裝好 CLI、自動偵測 AI agent 平台、用 650+ 條開放 ATR 規則在本機掃描每個 skill;本機 Guard daemon 即時檢查每個工具呼叫、擋下已知攻擊;localhost 即時 dashboard 看防護狀態與證據;SARIF 匯出可接任何 CI。永久免費、MIT、全在本機,程式碼不離開你的機器。

---

## Quick start

```bash
npm install -g @panguard-ai/panguard && pga up
```

One command: detect your AI platforms, scan installed skills, deploy runtime protection, and open an authenticated local dashboard.

| Method                      | Command                                           |
| --------------------------- | ------------------------------------------------- |
| **npm** (recommended)       | `npm install -g @panguard-ai/panguard && pga up`  |
| **curl** (no Node required) | `curl -fsSL https://get.panguard.ai \| bash`      |
| **Homebrew** (macOS)        | `brew install panguard-ai/tap/panguard && pga up` |

Day-to-day:

```bash
pga scan skill.md                 # audit one skill (auto-detects MCP JSON vs SKILL.md)
pga scan skill.md --sarif         # SARIF 2.1.0 for CI
pga guard ai                      # optionally add an advisory LLM second opinion (Layer C)
panguard-migrate sigma rule.yml   # Sigma / YARA -> ATR YAML (@panguard-ai/migrator-community)
```

Or scan online at **[panguard.ai](https://panguard.ai)** — paste a GitHub URL, report in 3 seconds, no install.

---

## See it work

```text
$ npm install -g @panguard-ai/panguard && pga up

  PanGuard  Your AI Security Guard
  ──────────────────────────────────────────────
  ▣ Looking at your setup...
    ✓ Claude Code   found      ✓ Cursor      found
    ✓ Claude Desktop found     ✓ Codex CLI   found
  → Scanning installed skills against 650+ ATR rules...
    1 CRITICAL — prompt injection via tool description (blocked)
  ▣ Watching your agents...
    Built-in tools guarded on 4 platforms (restart the agent to activate)
  ──────────────────────────────────────────────
  PROTECTED · 652 rules active
  Dashboard   http://127.0.0.1:3100/?token=…   (open to see live status)
  Threat Cloud  off (opt-in) — nothing leaves this machine
```

Quiet is the goal. A clean machine shows "all clear"; a real threat shows up under **Threats** with the rule it matched and a one-click action.

---

## Who it's for

- **Solo devs & agent builders** installing skills from registries you don't fully trust — get a pre-install scan and a runtime guard, free.
- **Security engineers** who want an executable, Sigma-style detection standard for AI agents instead of a checklist.
- **Teams** adding a pre-install / CI gate (SARIF) so a malicious skill can't merge.

---

## Why PanGuard: Layer 0 + Layer 1

Sigma defined the SIEM rule format; Splunk built the platform. YARA defined the malware-signature format; VirusTotal ran it at scale. **ATR** defines the AI-agent threat-rule format. **PanGuard** is the runtime, the compliance-evidence engine, and the migration toolkit on top.

> **ATR is independent and works without PanGuard** — it's the open standard (MIT, like Sigma/YARA). PanGuard is one implementation of it.

Sigma 定義 SIEM 規則格式、Splunk 做平台;YARA 定義惡意樣本格式、VirusTotal 做大規模偵測。ATR 定義 AI agent 威脅規則格式,PanGuard 做 runtime、合規證據、規則遷移。ATR 是獨立的開放標準(MIT),沒有 PanGuard 也能用;PanGuard 是它的一個實作。

| Layer                       | What it is                                                                                       | License                                   | Maintainer        |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- | ----------------- |
| **Layer 0 — Open Standard** | [ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) — 650+ rules across 10 categories | MIT                                       | Community-driven  |
| **Layer 1 — Platform**      | PanGuard Guard runtime + Migrator + Threat Cloud + Compliance Evidence Module                    | MIT (Community) / Commercial (Enterprise) | Panguard AI, Inc. |

---

## Products

| Product                                                         | Role                     | One-line description                                                           |
| --------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| **PanGuard Scan**                                               | One-shot audit           | 60-second SKILL.md or MCP audit with SARIF 2.1.0 export for any CI.            |
| **PanGuard Guard**                                              | Runtime engine           | Pipeline blocking malicious tool calls before they reach the real server.      |
| **PanGuard Skill Auditor**                                      | Pre-install gate         | 8 security checks every skill must pass before it can be installed.            |
| **PanGuard Migrator** ([details](https://panguard.ai/migrator)) | Standards bridge         | Sigma / YARA rules to ATR YAML. Community on npm. Enterprise adds compliance.  |
| **PanGuard MCP Server**                                         | AI assistant integration | 12 tools served over Model Context Protocol for Claude, Codex, Cursor.         |
| **PanGuard Threat Cloud**                                       | Intelligence flywheel    | Opt-in: a confirmed threat on one machine can become an ATR rule for everyone. |

Migrator Community: `npm install @panguard-ai/migrator-community` (MIT). Migrator Enterprise adds multi-framework compliance evidence and an audit trail.

---

## Ecosystem Adoption

Two real production adopters (Microsoft, Cisco) plus merges into MISP and the OWASP Agentic Security Resource Hub. Several more in review — listed honestly below, not counted as adoption.

兩個真正在 production 採用(Microsoft、Cisco),加上 MISP 與 OWASP 資源中心已 merge。其餘為 in-review,誠實列出、不算採用。

| Organization                        | Integration                                                         | Status        | Reference                                                                            |
| ----------------------------------- | ------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| **Microsoft AGT**                   | 287 ATR rules + weekly auto-sync workflow                           | Merged        | [PR #1277](https://github.com/microsoft/agent-governance-toolkit/pull/1277)          |
| **Microsoft Copilot SWE Agent**     | Copilot-authored fixtures presuming ATR detection; v2.1.2 in 2h 16m | In production | [AGT issue #1981](https://github.com/microsoft/agent-governance-toolkit/issues/1981) |
| **Cisco AI Defense**                | ATR rule library in skill-scanner production                        | Merged        | [PR #99](https://github.com/cisco-ai-defense/skill-scanner/pull/99)                  |
| **MISP** (threat intel)             | Galaxy entry for global sharing                                     | Merged        | [misp-galaxy #1207](https://github.com/MISP/misp-galaxy/pull/1207)                   |
| **MISP** (taxonomies)               | Taxonomy registered                                                 | Merged        | [misp-taxonomies #323](https://github.com/MISP/misp-taxonomies/pull/323)             |
| **OWASP A-S-R-H**                   | Agentic Security Resource Hub listing                               | Merged        | PR #74                                                                               |
| Gen Digital Sage (Norton/Avast/AVG) | Detection rule pipeline integration                                 | In review     | PR #33                                                                               |
| NVIDIA garak                        | Multi-language attack coverage                                      | In review     | Issue #1676                                                                          |
| OpenSSF SAFE-MCP                    | Technique mapping pipeline                                          | In review     | PR #187                                                                              |
| IBM mcp-context-forge               | Context server hardening                                            | In review     | PR #4109                                                                             |
| Meta PurpleLlama                    | Detection layer integration                                         | In review     | PR #206                                                                              |
| Promptfoo                           | Evaluation harness rules                                            | In review     | PR #8529                                                                             |

OWASP A-S-R-H is a third-party Agentic Security Resource Hub, not the OWASP Foundation main repo.

OWASP A-S-R-H 是 third-party 資源中心,非 OWASP Foundation 主 repo。

---

## Standards Alignment

| Framework            | Coverage                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| OWASP Agentic Top 10 | **10 / 10** ([mapping](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/OWASP-MAPPING.md))            |
| SAFE-MCP             | **78 / 85 = 91.8%** ([mapping](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/docs/SAFE-MCP-MAPPING.md)) |
| OWASP LLM Top 10     | Per-rule mapping in YAML frontmatter                                                                                        |
| MITRE ATLAS          | Per-rule technique IDs                                                                                                      |
| NIST AI RMF          | OSCAL catalog published                                                                                                     |
| EU AI Act            | High-risk system clauses tagged                                                                                             |
| ISO/IEC 42001        | AI management system controls tagged                                                                                        |

Enterprise compliance evidence (signed, audit-ready) maps each detection to these frameworks.

---

## Benchmarks

Public corpora, deterministic samples, fixed seeds. Full methodology at [panguard.ai/research/benchmarks](https://panguard.ai/research/benchmarks). Numbers are precise — we don't round up.

| Corpus                    | Recall    | Precision | False positives | Sample size |
| ------------------------- | --------- | --------- | --------------- | ----------- |
| garak (ATR-core families) | **~98%**  | -         | -               | 650         |
| SKILL.md real-world       | **100%**  | **97%**   | **0.20%**       | 498         |
| PINT (prompt-injection)   | 63.2%     | 99.7%     | 0.25%           | 850         |
| HackAPrompt               | per-batch | -         | -               | 4,780       |

These are the last verified measurements against published external corpora; garak is an approximate figure that drifts across rule versions, and HackAPrompt recall is reported per rule batch in the engineering blog rather than as a single headline number.

---

## Wild Scan

96,096 entries crawled across 4 registries. 67,799 had parseable content and ran the full pipeline. 1,096 confirmed malicious. 11,324 total threats detected. 249 packages combined shell + network + filesystem in a single skill ("triple-threat").

Full dataset, methodology, and reproducibility scripts: **[panguard.ai/research/96k-scan](https://panguard.ai/research/96k-scan)**.

---

## How It Works

```
  pga up
    |
    v
  Detect AI platforms -> scan installed skills -> inject runtime guard
    |
    v
  Every tool call -> ATR evaluation (650+ rules, 10 categories) -> ALLOW / DENY
    |                                                                  |
    v                                                                  v
  Local dashboard (real-time)                       Threat Cloud (opt-in flywheel)
    |                                                                  |
    v                                                                  v
  Blocked call -> alert + evidence                  3+ confirmations -> new ATR rule -> everyone
```

Deterministic by default: Layer A (ATR regex/AST) + Layer B (heuristics) run on-device and do the blocking. Layer C (an LLM second opinion) is **optional and advisory — it flags for review, never auto-blocks** — and you bring your own model (free local Ollama, or a cloud key for a few cents/month). Internet down? A and B keep running.

| Layer | Engine                          | Latency | Cost    | Blocks?  |
| ----- | ------------------------------- | ------- | ------- | -------- |
| **A** | 650+ ATR rules (regex + AST)    | < 50ms  | $0      | yes      |
| **B** | On-device heuristics            | < 50ms  | $0      | yes      |
| **C** | Your LLM (local Ollama / cloud) | ~ 2–5s  | $0 / ~¢ | advisory |

---

## Architecture

```
panguard-ai/
  packages/
    panguard/                CLI: auto-detect platforms, scan, deploy guard
    panguard-guard/          Runtime engine + dashboard server
    panguard-mcp-proxy/      MCP runtime interception for agent tool calls
    panguard-skill-auditor/  8-check security gate for every skill
    panguard-mcp/            MCP server: 12 tools for AI assistants
    panguard-migrator/       Sigma / YARA -> ATR YAML converter
    atr/                     ATR Layer 0 (synced from the open standard)
    threat-cloud/            Opt-in community threat-intel server + LLM review
    scan-core/               Shared scan engine: regex + AST + context signals
    website/                 Next.js marketing + online scanner + research
```

| Language | TypeScript (strict) | Runtime | Node.js 20+                                      |
| -------- | ------------------- | ------- | ------------------------------------------------ |
| Monorepo | pnpm workspaces     | AI      | Ollama (local) + Claude / OpenAI (cloud, opt-in) |

### ATR Rule Categories

| Category             | Category           | Category             |
| -------------------- | ------------------ | -------------------- |
| prompt-injection     | agent-manipulation | skill-compromise     |
| context-exfiltration | tool-poisoning     | privilege-escalation |
| model-abuse          | excessive-autonomy | model-security       |
| data-poisoning       |                    |                      |

650+ rules total across 10 categories. See [stats.json](https://raw.githubusercontent.com/Agent-Threat-Rule/agent-threat-rules/main/data/stats.json) for the authoritative live count.

---

## Pricing

Community is free and unlimited, forever — including SARIF and Evidence Pack export. No features are locked. Paid tiers add optional services for regulated orgs; full detail at [panguard.ai/pricing](https://panguard.ai/pricing).

| Tier           | Price              | What you get                                                                        |
| -------------- | ------------------ | ----------------------------------------------------------------------------------- |
| **Community**  | $0 forever         | MIT, unlimited self-host, 650+ ATR rules, SARIF + evidence export, no signup        |
| **Pilot**      | $25K / 90 days     | Procurement test drive; full credit toward Y1 Enterprise                            |
| **Enterprise** | $150K-$500K / year | Migrator Pro, multi-framework signed evidence, airgap, SLA, dedicated CSM           |
| **Sovereign**  | Let's talk         | Nation-scale airgap, multi-tenant, custom compliance, dedicated integration support |

A vendor-neutral, MIT-licensed, audit-ready detection standard is built for governments adopting AI agents at scale — [sovereign brief](https://sovereign-ai-defense.vercel.app).

---

## Built by

Adam Lin (林冠辛) — founder, Taiwan. Cross-disciplinary builder (real estate, marketing, festival production) and self-taught engineer.

Solo, from zero: 650+ ATR rules, two production adopters (Microsoft AGT, Cisco AI Defense), and more integrations in review (see [Ecosystem](#ecosystem-adoption)). Microsoft's Copilot SWE Agent wrote regression fixtures presuming ATR coverage; the matching rules shipped in 2h 16m.

Contact: **adam@agentthreatrule.org**

---

## Contributing

- **Scan your skills** — highest impact; every confirmed threat can strengthen the open standard.
- **Write ATR rules** — see the [ATR contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).
- **Report vulnerabilities** — [open a security advisory](SECURITY.md).
- **Submit code** — fork, branch, test, PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT for Community — 100% free, 100% open source, no telemetry by default, no vendor lock-in. The runtime engine, ATR rules, scan core, MCP server, and CLI are MIT forever. Enterprise and Sovereign tiers add separately-licensed commercial features (compliance evidence, audit trail, signed reports, dedicated support).

---

<div align="center">

**If AI agents can act on your behalf, someone should check what they are about to do.**

如果 AI agent 可以代表你行動,總得有人檢查它接下來要做什麼。

<br>

[![Star on GitHub](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=for-the-badge&logo=github&label=Star%20on%20GitHub)](https://github.com/panguard-ai/panguard-ai)

**Panguard AI, Inc.** — Taipei, Taiwan · Delaware C-Corp

[Website](https://panguard.ai) ·
[Benchmarks](https://panguard.ai/research/benchmarks) ·
[96K Scan](https://panguard.ai/research/96k-scan) ·
[Pricing](https://panguard.ai/pricing) ·
[Sovereign AI](https://sovereign-ai-defense.vercel.app) ·
[ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules)

</div>
