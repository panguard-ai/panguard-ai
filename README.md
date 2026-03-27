<div align="center">

<img src="assets/PANGUARD_GitHub_Banner_Clean.png" alt="Panguard AI" width="720">

<br>

### Every app gets reviewed before you install it. AI skills should too.

每個 App 上架都要審核。AI Skill 不該例外。

<br>

[![GitHub Stars](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=flat-square&color=DAA520)](https://github.com/panguard-ai/panguard-ai/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/panguard-ai/panguard-ai?style=flat-square)](https://github.com/panguard-ai/panguard-ai/network)
[![npm version](https://img.shields.io/npm/v/@panguard-ai/panguard?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@panguard-ai/panguard)
[![MIT License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)
[![ATR](https://img.shields.io/badge/ATR-71%20rules-8b5cf6-8b5cf6.svg?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

[Quick Start](#quick-start) | [Online Scanner](https://panguard.ai) | [ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules) | [Ecosystem Report](https://panguard.ai/research/mcp-ecosystem-scan)

</div>

---

> AI agents have full system access -- read files, execute commands, access credentials -- with **zero review process**. We scanned 36,394 MCP skills. Of 9,676 with source code, 1 in 7 triggered CRITICAL or HIGH severity rules. Credential harvesting. Prompt injection. Data exfiltration. [Live numbers](https://panguard.ai).
>
> Panguard is the App Store review for AI skills. [ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) is the open detection standard. Every scan strengthens the network.
>
> AI Agent 擁有完整系統權限，卻沒有任何審核。我們掃描了 36,394 個 MCP skills，每 7 個就有 1 個觸發 CRITICAL 或 HIGH security rules。即時數據見 [panguard.ai](https://panguard.ai)。

---

## Quick Start

```bash
# One command: install + auto-detect platforms + scan + start protection
npm install -g @panguard-ai/panguard && pga up
```

That's it. PanGuard detects your AI platforms, scans all installed skills, and starts 24/7 monitoring.

一行搞定。自動偵測 platform、掃描所有 skills、啟動 24/7 monitoring。

**16 platforms supported:** Claude Code, Claude Desktop, Cursor, OpenClaw, Codex, WorkBuddy, NemoClaw, ArkClaw, Windsurf, QClaw, Cline, VS Code Copilot, Zed, Gemini CLI, Continue, Roo Code

**3 install methods:**

| Method | Command |
|--------|---------|
| **npm** (recommended) | `npm install -g @panguard-ai/panguard && pga up` |
| **curl** (no Node required) | `curl -fsSL https://get.panguard.ai \| bash` |
| **Homebrew** (macOS) | `brew install panguard-ai/tap/panguard && pga up` |

Or scan online at **[panguard.ai](https://panguard.ai)** -- paste a GitHub URL, get a report in 3 seconds.

---

## ClawHub Ecosystem Scan (2026-03-27)

We scanned the entire ClawHub MCP skill registry. [Full report with live numbers](https://panguard.ai/research/mcp-ecosystem-scan).

| | Count |
|---|---|
| Skills crawled | 36,394 |
| With parseable source code | 9,676 |
| **CRITICAL** (credential theft, reverse shells, prompt injection) | 182 |
| **HIGH** (data exfiltration, unauthorized network access) | 1,124 |
| **MEDIUM** (over-permissioned, suspicious dependencies) | 1,016 |
| Triple threat (shell + network + filesystem) | 249 |

Raw data: [ecosystem-report.csv](https://github.com/Agent-Threat-Rule/agent-threat-rules/tree/main/data/clawhub-scan) (open source)

**Research paper:** [The Collapse of Trust: Security Architecture for the Age of Autonomous AI Agents](https://doi.org/10.5281/zenodo.19178002) (Zenodo, DOI: 10.5281/zenodo.19178002)

---

## The Flywheel

```
  You scan a skill
       |
       v
  Threat detected --> uploaded to Threat Cloud (anonymous)
       |
       v
  Community + LLM review --> new ATR rule confirmed
       |
       v
  Rule pushed to ALL users within 1 hour
       |
       v
  Next time: blocked in < 50ms --> Loop
```

| Component                                                          | Role                                                             | Status |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- | ------ |
| **[Skill Auditor](docs/overview.md)**                              | 6-check security gate before any skill runs                      | GA     |
| **[Guard](#guard)**                                                | 24/7 runtime monitoring + auto-block                             | GA     |
| **[Threat Cloud](#threat-cloud)**                                  | Anonymous community threat intel. 3+ confirmations + LLM review. | GA     |
| **[ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules)** | Open detection standard. 71 rules across 10 categories.          | RFC    |

One user's encounter with a new attack becomes a rule that protects everyone.

---

## Ecosystem Scan Results

We continuously scan the MCP skill ecosystem from npm, GitHub, and community registries. [Full report with live numbers](https://panguard.ai/research/mcp-ecosystem-scan).

Top findings: credential access patterns, prompt injection, environment variable harvesting, excessive filesystem/network permissions.

---

## Three-Layer Detection

| Layer | Engine                          | Coverage           | Latency | Cost    |
| ----- | ------------------------------- | ------------------ | ------- | ------- |
| **1** | **Rules** -- 71 ATR rules       | ~90% known threats | < 50ms  | $0      |
| **2** | **Local AI** -- Ollama          | ~7% ambiguous      | ~ 2s    | $0      |
| **3** | **Cloud AI** -- Claude / OpenAI | ~3% novel          | ~ 5s    | ~$0.008 |

Cloud down? Local AI handles it. Local AI down? Rules keep running. Internet down? Everything still works.

---

## Detection Rules

| Rule Type | Count | Purpose                                                              |
| --------- | ----- | -------------------------------------------------------------------- |
| **ATR**   | 71    | AI agent threats: prompt injection, tool poisoning, skill compromise |

ATR (Agent Threat Rules) is the only rule format designed to protect AI agents. Traditional security rules (Sigma, YARA) detect network/malware threats but cannot detect AI-specific attacks like prompt injection, tool poisoning, or context exfiltration.

---

## What You Get

Everything is **free and open source**. MIT licensed.

| What | How it works |
| ---- | ------------ |
| **Scan** | `pga up` scans all installed MCP skills against 71 ATR rules. 60 seconds. Done. |
| **24/7 Monitoring** | Guard watches for new skill installs and auto-scans them in real time. |
| **[Threat Cloud](#threat-cloud)** | Your scan results feed the community. One person finds a threat → becomes a rule → protects everyone within 1 hour. |
| **[ATR Rules](https://github.com/Agent-Threat-Rule/agent-threat-rules)** | 71 YAML detection rules. OWASP Agentic Top 10: 10/10. SAFE-MCP: 91.8%. Open standard. |
| **MCP Server** | 11+ tools for Claude Code, Cursor, and any MCP client. `panguard setup` auto-configures. |

---

## Guard

Install once, never worry again. Guard watches everything your agents do.

```bash
panguard guard start --dashboard
# Dashboard: http://localhost:3100
```

**Watchers:** Secret (.env, SSH keys, API tokens), Dependency (package.json, node_modules), Process (child commands), Git (commits, config), Skill (MCP config changes)

**Monitors:** Syscall, DPI, Memory Scanner

**11 Response Actions:** log, notify, block_ip, kill_process, isolate_file, block_tool, kill_agent, quarantine_session, revoke_skill, reduce_permissions, disable_account

---

## Threat Cloud

Every Panguard instance is a sensor. Threats are auto-drafted into ATR rules, uploaded anonymously, confirmed by 3+ users + LLM review, then pushed to everyone.

**Currently:** 71 ATR detection rules. Community rule generation active.

**Privacy:** Fully optional. Only anonymized signatures. Zero raw data, zero PII. Disable anytime.

---

## MCP Integration

```bash
panguard setup
# Auto-detects 16 platforms: Claude Code, Claude Desktop, Cursor, OpenClaw,
# Codex, Windsurf, Gemini CLI, VS Code Copilot, Zed, Cline, and more
```

Or manual config:

```json
{
  "mcpServers": {
    "panguard": {
      "command": "npx",
      "args": ["@panguard-ai/panguard-mcp"]
    }
  }
}
```

---

## Architecture

```
panguard-ai/
  packages/
    panguard-skill-auditor/  Skill security auditor (6 checks)
    panguard-guard/          24/7 monitoring + Threat Cloud sync
    atr/                     Agent Threat Rules: 71 rules, 10 categories
    threat-cloud/            Community threat intel server
    panguard-mcp/            MCP server: 11+ tools for AI assistants
    panguard-scan/           Security scanner
    core/                    Shared engine: rules, AI adapters, validation
    panguard/                Unified CLI (28 commands)
    website/                 Next.js marketing site + online scanner
```

| Category | Technology                               |
| -------- | ---------------------------------------- |
| Language | TypeScript 5.7 (strict mode)             |
| Runtime  | Node.js 20+                              |
| Monorepo | pnpm workspaces (17 packages)            |
| Testing  | Vitest 3 + v8 coverage (3,490+ tests)    |
| AI       | Ollama (local) + Claude / OpenAI (cloud) |
| Website  | Next.js 15 + Vercel                      |

---

## Contributing

- **Write detection rules** -- Highest impact. See [ATR contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).
- **Report vulnerabilities** -- [Open a security advisory](SECURITY.md).
- **Submit code** -- Fork, branch, test, PR. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Share threat intelligence** -- Run Panguard with Threat Cloud enabled.

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
