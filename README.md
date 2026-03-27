<div align="center">

<img src="assets/PANGUARD_GitHub_Banner_Clean.png" alt="Panguard AI" width="720">

<br>

### Every app gets reviewed before you install it. AI skills should too.

每個 App 上架都要審核。AI Skill 不該例外。

<br>

[![GitHub Stars](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=flat-square&color=DAA520)](https://github.com/panguard-ai/panguard-ai/stargazers)
[![npm version](https://img.shields.io/npm/v/@panguard-ai/panguard?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@panguard-ai/panguard)
[![MIT License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)
[![ATR](https://img.shields.io/badge/ATR-71%20rules-8b5cf6-8b5cf6.svg?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules)
[![OWASP](https://img.shields.io/badge/OWASP%20Agentic%20Top%2010-10%2F10-green?style=flat-square)](docs/OWASP-MAPPING.md)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

[Quick Start](#quick-start) | [Online Scanner](https://panguard.ai) | [ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules) | [Ecosystem Report](https://panguard.ai/research/mcp-ecosystem-scan)

</div>

---

> AI agents have full system access -- read files, execute commands, access credentials -- with **zero review process**. We scanned 36,394 MCP skills. Of 9,676 with source code, 1 in 7 triggered CRITICAL or HIGH severity rules. Credential harvesting. Prompt injection. Data exfiltration. [Live numbers](https://panguard.ai).
>
> AI Agent 擁有完整系統權限，卻沒有任何審核。我們掃描了 36,394 個 MCP skills，每 7 個就有 1 個觸發 CRITICAL 或 HIGH security rules。即時數據見 [panguard.ai](https://panguard.ai)。

---

## Quick Start

```bash
npm install -g @panguard-ai/panguard && pga up
```

One command. Auto-detects your AI platforms, scans all installed skills, starts 24/7 monitoring with real-time dashboard.

一行搞定。自動偵測 platform、掃描所有 skills、啟動 24/7 monitoring + real-time dashboard。

**16 platforms:** Claude Code, Claude Desktop, Cursor, OpenClaw, Codex, WorkBuddy, NemoClaw, ArkClaw, Windsurf, QClaw, Cline, VS Code Copilot, Zed, Gemini CLI, Continue, Roo Code

| Method                      | Command                                           |
| --------------------------- | ------------------------------------------------- |
| **npm** (recommended)       | `npm install -g @panguard-ai/panguard && pga up`  |
| **curl** (no Node required) | `curl -fsSL https://get.panguard.ai \| bash`      |
| **Homebrew** (macOS)        | `brew install panguard-ai/tap/panguard && pga up` |

Or scan online at **[panguard.ai](https://panguard.ai)** -- paste a GitHub URL, get a report in 3 seconds.

---

## How It Works

```
  You install PanGuard
       |
       v
  pga up → scans all skills against 71 ATR rules (< 60 seconds)
       |
       v
  Guard starts → watches for new skill installs in real time
       |
       v
  New skill installed → auto-scanned instantly
       |
       v
  Threat found → anonymized hash uploaded to Threat Cloud
       |
       v
  3+ independent confirmations + LLM review → new ATR rule
       |
       v
  Rule pushed to ALL users within 1 hour
       |
       v
  Next time: blocked in < 50ms → everyone is safer
```

One person encounters a threat. It becomes a rule. It protects everyone. That's the flywheel.

### Three-Layer Detection

| Layer | Engine                     | Latency | Cost    |
| ----- | -------------------------- | ------- | ------- |
| **1** | 71 ATR regex rules         | < 50ms  | $0      |
| **2** | Local AI (Ollama)          | ~ 2s    | $0      |
| **3** | Cloud AI (Claude / OpenAI) | ~ 5s    | ~$0.008 |

Internet down? Rules + local AI keep running. Cloud down? Same. Everything degrades gracefully.

---

## Ecosystem Scan (2026-03-27)

We scanned the entire ClawHub MCP skill registry. [Full report](https://panguard.ai/research/mcp-ecosystem-scan).

|                                                                   | Count  |
| ----------------------------------------------------------------- | ------ |
| Skills crawled                                                    | 36,394 |
| With parseable source code                                        | 9,676  |
| **CRITICAL** (credential theft, reverse shells, prompt injection) | 182    |
| **HIGH** (data exfiltration, unauthorized network access)         | 1,124  |
| **MEDIUM** (over-permissioned, suspicious dependencies)           | 1,016  |
| Triple threat (shell + network + filesystem)                      | 249    |

Raw data: [ecosystem-report.csv](https://github.com/Agent-Threat-Rule/agent-threat-rules/tree/main/data/clawhub-scan) (open source)

**Research paper:** [The Collapse of Trust: Security Architecture for the Age of Autonomous AI Agents](https://doi.org/10.5281/zenodo.19178002) (Zenodo, DOI: 10.5281/zenodo.19178002)

---

## Standards Alignment

ATR is not a competing standard. It is the detection layer that makes standards enforceable.

| Layer           | What it does                 | Project                                                                    |
| --------------- | ---------------------------- | -------------------------------------------------------------------------- |
| **Standards**   | Define threat categories     | [SAFE-MCP](https://openssf.org/) (OpenSSF, $12.5M)                         |
| **Taxonomy**    | Enumerate attack surfaces    | [OWASP Agentic Top 10](https://genai.owasp.org/)                           |
| **Detection**   | Match threats in real time   | [ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) -- 71 rules |
| **Enforcement** | Scan, monitor, block, report | **PanGuard** (this project)                                                |

- OWASP Agentic Top 10: **10/10 categories covered** ([mapping](docs/OWASP-MAPPING.md))
- SAFE-MCP techniques: **91.8% covered** ([mapping](docs/SAFE-MCP-MAPPING.md))

---

## For Enterprise

PanGuard is free and open source for individual developers. For organizations running AI agents at scale:

**Policy Engine** -- Define what your agents can and cannot do. Enforce across teams.

```yaml
# panguard-policy.yaml
rules:
  - block_severity: CRITICAL
  - allow_network: ['internal.corp.com', 'api.openai.com']
  - deny_filesystem: ['/etc/shadow', '~/.ssh/*', '~/.aws/*']
  - require_scan_before_install: true
```

**Compliance Reporting** -- Map every scan to SOC 2, ISO 27001, or Taiwan Cyber Security Act (TCSA) controls. Generate audit-ready PDF reports.

**Air-gapped Deployment** -- Run entirely on-premise. No data leaves your network. ATR rules update via signed bundles.

**Dashboard** -- Real-time threat visibility across all agents, all teams, one pane of glass.

Enterprise inquiry: hello@panguard.ai

---

## Architecture

```
panguard-ai/
  packages/
    panguard/                CLI: 28 commands, 16 platform auto-detect
    panguard-guard/          24/7 monitoring + real-time dashboard + Threat Cloud sync
    panguard-skill-auditor/  6-check security gate for every skill
    panguard-mcp/            MCP server: 11+ tools for AI assistants
    atr/                     Agent Threat Rules: 71 rules, 10 categories
    threat-cloud/            Community threat intel server + LLM review
    scan-core/               Shared scan engine: regex + context signals
    core/                    AI adapters, validation, logging
    website/                 Next.js marketing site + online scanner
```

|          |                                          |
| -------- | ---------------------------------------- |
| Language | TypeScript 5.7 (strict mode)             |
| Runtime  | Node.js 20+                              |
| Monorepo | pnpm workspaces                          |
| AI       | Ollama (local) + Claude / OpenAI (cloud) |
| Website  | Next.js 15 + Vercel                      |

---

## Contributing

- **Scan your skills** -- Highest impact. Every scan strengthens Threat Cloud.
- **Write detection rules** -- See [ATR contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).
- **Report vulnerabilities** -- [Open a security advisory](SECURITY.md).
- **Submit code** -- Fork, branch, test, PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT -- 100% free. 100% open source. No telemetry by default. No vendor lock-in.

---

<div align="center">

**If AI agents can act on your behalf, someone should check what they're about to do.**

<br>

[![Star on GitHub](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=for-the-badge&logo=github&label=Star%20on%20GitHub)](https://github.com/panguard-ai/panguard-ai)

**Panguard AI** -- Taipei, Taiwan

[Website](https://panguard.ai) ·
[Online Scanner](https://panguard.ai) ·
[ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules) ·
[Ecosystem Report](https://panguard.ai/research/mcp-ecosystem-scan) ·
[Documentation](docs/)

</div>
