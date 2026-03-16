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
[![ATR](https://img.shields.io/badge/ATR-52%20rules%20%2B%2061%20community-8b5cf6.svg?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules)
[![Detection Rules](https://img.shields.io/badge/Detection%20Rules-10%2C400%2B-f97316.svg?style=flat-square)](#detection-rules)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

[Quick Start](#quick-start) | [Online Scanner](https://panguard.ai) | [ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules) | [Ecosystem Report](https://panguard.ai/research/mcp-ecosystem-scan)

</div>

---

> AI agents have full system access -- read files, execute commands, access credentials -- with **zero review process**. We scanned 1,295 MCP skills. 26 were malicious. Stealing SSH keys. Injecting prompts. Exfiltrating data.
>
> Panguard is the App Store review for AI skills. ATR is the open audit standard. Every scan protects everyone.
>
> AI Agent 擁有完整系統權限，卻沒有任何審核。我們掃描了 1,295 個 MCP Skill，發現 26 個惡意。Panguard 是 AI Skill 的 App Store 審核。

---

## Quick Start

```bash
# Install
npm install -g @panguard-ai/panguard

# Auto-configure all AI platforms
panguard setup
# Detects: Claude Code, Cursor, QClaw, OpenClaw, Codex, WorkBuddy, Claude Desktop

# Audit a skill before installing
panguard audit skill ./my-skill

# Start 24/7 protection
panguard guard start --dashboard
```

Or scan online at **[panguard.ai](https://panguard.ai)** -- paste a GitHub URL, get a report in 3 seconds.

不需帳號，不需設定。[線上掃描](https://panguard.ai) 或一行安裝。

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

| Component                                                          | Role                                                                   | Status |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------ |
| **[Skill Auditor](docs/overview.md)**                              | 8-check security gate before any skill runs                            | GA     |
| **[Guard](#guard)**                                                | 24/7 runtime monitoring + auto-block                                   | GA     |
| **[Threat Cloud](#threat-cloud)**                                  | Anonymous community threat intel. 3+ confirmations + LLM review.       | GA     |
| **[ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules)** | Open detection standard. 52 stable + 61 community rules. 9 categories. | RFC    |

One user's encounter with a new attack becomes a rule that protects everyone.

---

## Ecosystem Scan Results

We scanned **1,295 MCP skills** from 4,648 registry entries. [Full report](https://panguard.ai/research/mcp-ecosystem-scan).

| Result   | Count | Percent |
| -------- | ----- | ------- |
| Clean    | 1,266 | 97.8%   |
| CRITICAL | 21    | 1.6%    |
| HIGH     | 5     | 0.4%    |
| MEDIUM   | 3     | 0.2%    |

Top findings: SSH key exfiltration, prompt injection with Unicode obfuscation, environment variable harvesting, git token theft.

---

## Three-Layer Detection

| Layer | Engine                                   | Coverage           | Latency | Cost    |
| ----- | ---------------------------------------- | ------------------ | ------- | ------- |
| **1** | **Rules** -- 52 ATR + 10,400+ Sigma/YARA | ~90% known threats | < 50ms  | $0      |
| **2** | **Local AI** -- Ollama                   | ~7% ambiguous      | ~ 2s    | $0      |
| **3** | **Cloud AI** -- Claude / OpenAI          | ~3% novel          | ~ 5s    | ~$0.008 |

Cloud down? Local AI handles it. Local AI down? Rules keep running. Internet down? Everything still works.

---

## Detection Rules

| Rule Type | Count       | Purpose                                                              |
| --------- | ----------- | -------------------------------------------------------------------- |
| **Sigma** | 4,352       | Network intrusion, auth bypass, lateral movement                     |
| **YARA**  | 6,015       | Malware, encoded payloads, obfuscated scripts                        |
| **ATR**   | 52 + 61     | AI agent threats: prompt injection, tool poisoning, skill compromise |
| **Total** | **10,400+** | All bundled. No cloud required.                                      |

---

## Core Products

Everything is **free and open source**. MIT licensed.

| Product                               | What It Does                                                              | Status      |
| ------------------------------------- | ------------------------------------------------------------------------- | ----------- |
| **[Skill Auditor](docs/overview.md)** | 8-check security gate -- audits every AI skill before install             | GA          |
| **[Guard](docs/ARCHITECTURE.md)**     | 24/7 runtime monitoring: file, network, process, git, dependency watchers | GA          |
| **[Threat Cloud](#threat-cloud)**     | Collective threat intelligence -- every scan strengthens the network      | GA          |
| **[MCP Server](docs/API.md)**         | 11+ tools for Claude, Cursor, and any MCP client                          | GA          |
| **[Scan](docs/DETECTION.md)**         | 60-second security audit                                                  | GA          |
| **[Trap](docs/DETECTION.md)**         | Honeypot services for attacker profiling                                  | Coming Soon |
| **[Report](docs/DETECTION.md)**       | Compliance: ISO 27001, SOC 2                                              | Coming Soon |

---

## Guard

Install once, never worry again. Guard watches everything your agents do.

```bash
panguard guard start --dashboard
# Dashboard: http://localhost:3100
```

**Watchers:** Secret (.env, SSH keys, API tokens), Dependency (package.json, node_modules), Process (child commands), Git (commits, config), Skill (MCP config changes)

**Monitors:** Falco eBPF, Suricata IDS, Syscall, DPI, Memory Scanner

**11 Response Actions:** log, notify, block_ip, kill_process, isolate_file, block_tool, kill_agent, quarantine_session, revoke_skill, reduce_permissions, disable_account

---

## Threat Cloud

Every Panguard instance is a sensor. Threats are auto-drafted into ATR rules, uploaded anonymously, confirmed by 3+ users + LLM review, then pushed to everyone.

**Currently:** 61 community-generated rules from 1,295 skill scans.

**Privacy:** Fully optional. Only anonymized signatures. Zero raw data, zero PII. Disable anytime.

---

## MCP Integration

```bash
panguard setup
# Auto-detects: Claude Code, Cursor, QClaw, OpenClaw, Codex, WorkBuddy, Claude Desktop
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
    panguard-skill-auditor/  Skill security auditor (8 checks)
    panguard-guard/          24/7 monitoring + Threat Cloud sync
    atr/                     Agent Threat Rules: 52 stable rules, 9 categories
    threat-cloud/            Community threat intel server
    panguard-mcp/            MCP server: 11+ tools for AI assistants
    panguard-scan/           Security scanner
    core/                    Shared engine: rules, AI adapters, validation
    panguard/                Unified CLI (28 commands)
    website/                 Next.js marketing site + online scanner
  config/
    sigma-rules/             4,352 Sigma detection rules
    yara-rules/              6,015 YARA detection rules
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
