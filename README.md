<div align="center">

<br>

<!-- [English](README.md) | [繁體中文](README.zh-TW.md) -->

<img src="assets/PANGUARD_GitHub_Banner_Clean.png" alt="Panguard AI" width="100%">

<br>

### The First Open-Source Security Platform Built for AI Agents

<br>

[![GitHub Stars](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=social)](https://github.com/panguard-ai/panguard-ai)
[![npm version](https://img.shields.io/npm/v/@panguard-ai/panguard?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@panguard-ai/panguard)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-3%2C480%2B%20passed-22c55e.svg?style=flat-square)](packages/)
[![Rules](https://img.shields.io/badge/detection%20rules-9%2C700%2B-f97316.svg?style=flat-square)](#detection-rules)
[![ATR](https://img.shields.io/badge/ATR%20Standard-69%20rules-8b5cf6.svg?style=flat-square)](packages/atr/)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

<br>

[Website](https://panguard.ai) ·
[Documentation](docs/) ·
[ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules) ·
[Threat Cloud](https://panguard.ai/threat-cloud)

<br>

</div>

---

Every era of computing gets the security layer it deserves.

Servers got firewalls. Containers got scanning. Browser extensions got review.

**AI agents got nothing.**

They install skills with full system access -- file read, code execution, network requests, credential access -- with zero review process. One malicious skill is all it takes to steal your API keys, exfiltrate conversations, or hijack the agent itself.

Enterprise security tools don't cover this. They weren't built for it. And if you're a developer or a small team, there's nothing between you and the threat.

**Panguard is the missing layer.**

```bash
curl -fsSL https://get.panguard.ai | bash
```

Or install via npm if you prefer to verify the source first:

```bash
npm install -g @panguard-ai/panguard
```

From this point on, every AI agent skill on your machine goes through a multi-layer security audit before it can run. No configuration. No account. No cost.

---

## See It Work

```
$ panguard audit skill ./my-skill

+-------------------------------+
| Panguard Skill Audit Report   |
|                               |
| Skill:      my-skill          |
| Author:     Unknown           |
| Risk Score: 52/100 (CRITICAL) |
| Duration:   6ms               |
+-------------------------------+

[OK] [PASS] Manifest: Valid structure, required fields present
[!!] [FAIL] Prompt Safety: 1 injection pattern(s) detected
[!!] [FAIL] Tool Safety: curl|bash pipeline, potential exfiltration
[!]  [WARN] Dependencies: 1 URL(s), 1 external domain(s)
[!]  [WARN] Permissions: Uses Bash/Shell, File Read, Network/HTTP
[OK] [PASS] Secrets: No hardcoded credentials found
[OK] [PASS] Behavior: Code matches stated purpose

Verdict: BLOCK -- 2 failed checks, 2 warnings
```

Checks: manifest validation, prompt injection scan (11 patterns + Unicode + base64), tool poisoning detection, dependency analysis, permission scope check, secrets detection, and behavioral intent analysis. Returns a 0-100 risk score. Also available as MCP tool (`panguard_audit_skill`).

---

## How Panguard Gets Smarter

Panguard is not a static rule set. Every user makes everyone safer:

```
You install Panguard
    --> Skills are audited before they run
        --> Threats are detected in real-time
            --> New rules are drafted from novel attacks
                --> Shared anonymously to Threat Cloud
                    --> Community votes + LLM reviews
                        --> Rules distributed to all users
                            --> Your Panguard is now stronger --> Loop
```

One user's encounter with a new attack becomes a protection rule for everyone. The more people run Panguard, the faster new threats get caught.

---

## Quick Start

```bash
# One-line install (macOS / Linux)
curl -fsSL https://get.panguard.ai | bash

# Windows (PowerShell)
irm https://get.panguard.ai/windows | iex

# Or run directly with npx (no install)
npx @panguard-ai/panguard scan --quick
```

### First Commands

```bash
panguard scan --quick              # Scan your machine for vulnerabilities (60s)
panguard audit skill ./my-skill    # Check if a skill is safe before installing it
panguard guard start               # Start 24/7 background protection
panguard setup                     # Auto-configure Claude, Cursor, Windsurf, etc.
```

### MCP Configuration (Claude Desktop / Cursor)

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

Or auto-detect all installed AI platforms: `panguard setup`

Build from source and full development guide: [docs/getting-started.md](docs/getting-started.md)

---

## Three-Layer Detection

Each layer catches what the previous one missed. If any layer goes down, the others keep running.

| Layer | Engine                                                      | Coverage              | Latency | Cost    | Network  |
| ----- | ----------------------------------------------------------- | --------------------- | ------- | ------- | -------- |
| **1** | **Rules Engine** -- 9,700+ Sigma / YARA / ATR pattern rules | ~90% of known threats | < 50ms  | $0      | Offline  |
| **2** | **Local AI** -- Ollama on your machine                      | ~7% (ambiguous cases) | ~ 2s    | $0      | Offline  |
| **3** | **Cloud AI** -- Claude / OpenAI                             | ~3% (novel attacks)   | ~ 5s    | ~$0.008 | Optional |

Coverage estimates are from internal simulation benchmarks, not empirical field data. Real-world results vary by threat type and environment.

**Graceful degradation:** Cloud down? Local AI handles it. Local AI down? Rules keep running. Internet down? Everything still works. Protection never stops.

**Confidence engine:** >90% confidence triggers auto-response (block, kill, quarantine). 70-90% asks you first with evidence. <70% logs and notifies only.

**Evasion handling:** Layer 1 regex can be bypassed by paraphrasing. That's why Layer 2 (behavioral classification) and Layer 3 (multi-step LLM reasoning) exist -- they catch what patterns miss.

Full architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Product Suite

Everything is **free and open source**. MIT licensed. No tiers, no limits, no vendor lock-in.

| Product                               | What It Does                                                       | Status      |
| ------------------------------------- | ------------------------------------------------------------------ | ----------- |
| **[Skill Auditor](docs/overview.md)** | Multi-check security gate for AI agent skills before install       | Beta        |
| **[Scan](docs/DETECTION.md)**         | 60-second security audit with PDF report                           | GA          |
| **[Guard](docs/ARCHITECTURE.md)**     | 24/7 AI monitoring with 4-agent pipeline and auto-response         | GA          |
| **[Chat](docs/OPERATIONS.md)**        | Security alerts via Telegram, Slack, Discord, LINE, Email, Webhook | GA          |
| **[Trap](docs/DETECTION.md)**         | 8 honeypot services for attacker profiling                         | Coming Soon |
| **[Report](docs/DETECTION.md)**       | Compliance gap analysis: ISO 27001, SOC 2, Taiwan CMA              | Coming Soon |
| **[Threat Cloud](#threat-cloud)**     | Collective threat intelligence from all Panguard instances         | GA          |
| **[MCP Server](docs/API.md)**         | 11 tools for Claude, Cursor, Windsurf, and any MCP client          | Beta        |
| **[Manager](docs/OPERATIONS.md)**     | Distributed coordinator for up to 500 guard agents                 | GA          |

---

## Detection Rules

9,700+ open-source, community-driven rules. Bundled with the npm package. No cloud required.

| Rule Type   | Count | Purpose                                                              |
| ----------- | ----- | -------------------------------------------------------------------- |
| **Sigma**   | 3,760 | Network intrusion, auth bypass, lateral movement                     |
| **YARA**    | 5,961 | Malware, encoded payloads, obfuscated scripts                        |
| **ATR**     | 69    | AI agent threats: prompt injection, tool poisoning, skill compromise |
| **Builtin** | 20    | OS hardening, credential hygiene, service audit                      |

Full detection reference: [docs/DETECTION.md](docs/DETECTION.md)

---

## ATR: Agent Threat Rules

**What Sigma did for network attacks, ATR does for agent manipulation.**

ATR is the first open detection standard purpose-built for AI agent security threats. 52 stable + 17 AI-predicted rules across 9 threat categories, with 325 test cases, 12 CVE mappings, and full OWASP LLM Top 10 coverage. Framework-agnostic -- works with LangChain, CrewAI, AutoGen, or raw API calls.

```yaml
title: Direct Prompt Injection via User Input
id: ATR-2026-001
status: stable
severity: high
tags:
  category: prompt-injection
  owasp_llm: LLM01
detection:
  conditions:
    - field: content
      operator: regex
      value: "(?i)ignore\\s+(all\\s+)?(previous|prior|above)\\s+(instructions|prompts|rules)"
response:
  actions: [block, alert, snapshot]
```

```bash
npx @panguard-ai/atr scan events.json    # Scan agent events against all rules
npx @panguard-ai/atr scaffold            # Create a new rule interactively
```

Full specification and contribution guide: [github.com/Agent-Threat-Rule/agent-threat-rules](https://github.com/Agent-Threat-Rule/agent-threat-rules)

---

## Threat Cloud

Every Panguard instance is a sensor. When one user encounters a new attack, Panguard auto-drafts an ATR rule, uploads the anonymized signature to Threat Cloud, and after 3+ independent confirmations and an LLM review (Claude Sonnet), the rule is promoted and distributed to all users. Next time the same attack hits anyone, Layer 1 blocks it in < 50ms.

**Traditional threat intelligence is top-down:** a vendor writes rules, you pay for updates. **Threat Cloud is bottom-up:** every user contributes, every user benefits. The more people run Panguard, the faster new attacks get caught.

**Privacy:** Threat Cloud participation is fully optional. When enabled, only anonymized threat signatures leave your machine -- zero raw data, zero PII. Anonymous client IDs. TLS 1.3 encrypted. When disabled, everything runs 100% offline with zero network calls.

**Note:** The Threat Cloud **server** (`tc.panguard.ai`) is proprietary infrastructure operated by Panguard AI. The **client** (upload, download, sync) is fully open source and built into every installation. Enterprise users needing a private instance can [contact us](mailto:security@panguard.ai).

---

## Why Panguard

| Principle                     | Detail                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| **Open source, MIT licensed** | Use it, modify it, deploy it, sell it. No strings attached.                           |
| **No usage telemetry**        | Zero tracking, zero analytics, zero usage stats. Threat Cloud sharing is opt-in only. |
| **Offline-first**             | Rules engine and local AI work without internet. Cloud AI is optional.                |
| **Community-driven**          | Every detection strengthens everyone via Threat Cloud.                                |
| **Framework-agnostic**        | Works with Claude, GPT, LangChain, CrewAI, AutoGen, raw APIs.                         |
| **Production-tested**         | 16 packages, 3,480+ tests, TypeScript strict mode.                                    |
| **Made in Taiwan**            | Independent. No corporate strings.                                                    |

---

## MCP Integration

Panguard works as an MCP server with 11 tools, compatible with any MCP-enabled AI platform.

| Platform       | Setup                        |
| -------------- | ---------------------------- |
| Claude Desktop | `panguard setup`             |
| Claude Code    | `panguard setup`             |
| Cursor         | `panguard setup`             |
| Windsurf       | `panguard setup`             |
| Codex          | `panguard setup`             |
| Any MCP client | [Manual config](docs/API.md) |

Full MCP reference: [docs/API.md](docs/API.md)

---

## Architecture

```
panguard-ai/
  packages/
    core/                    Shared engine: rules, monitoring, AI adapters, i18n
    panguard/                SDK: @panguard-ai/panguard
    panguard-cli/            Unified CLI: setup wizard, all commands
    atr/                     Agent Threat Rules: 69 rules, 9 categories
    panguard-scan/           Security scanner + PDF report
    panguard-guard/          24/7 AI monitoring: 4-agent pipeline + Threat Cloud client
    panguard-chat/           Notifications: 6 channels, tone adaptation
    panguard-trap/           Honeypots: 8 services, attacker profiling
    panguard-report/         Compliance: ISO 27001 + SOC 2 + CMA
    panguard-skill-auditor/  Skill security auditor
    panguard-mcp/            MCP server: 11 tools
    panguard-auth/           Auth: OAuth, sessions, rate limiting
    panguard-manager/        Distributed coordinator (up to 500 agents)
    panguard-web/            Context engine + web interface
    admin/                   Admin panel
    website/                 Next.js 14 marketing site (EN / zh-TW)
  config/
    sigma-rules/             3,760 Sigma detection rules
    yara-rules/              5,961 YARA detection rules
```

| Category   | Technology                               |
| ---------- | ---------------------------------------- |
| Language   | TypeScript 5.7 (strict mode)             |
| Runtime    | Node.js 18+                              |
| Monorepo   | pnpm workspaces (16 packages)            |
| Testing    | Vitest 3 + v8 coverage (3,480+ tests)    |
| AI         | Ollama (local) + Claude / OpenAI (cloud) |
| Rules      | Sigma + YARA + ATR                       |
| Encryption | AES-256-GCM                              |

Full architecture documentation: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- **Write detection rules** -- The highest-impact contribution. ATR rules, Sigma rules, or YARA rules. See the [ATR contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).
- **Report vulnerabilities** -- Found a bypass? Open a security advisory. See [SECURITY.md](SECURITY.md).
- **Improve translations** -- Help make Panguard accessible in more languages.
- **Submit code** -- Fork, branch, test, PR. All tests must pass.
- **Share threat intelligence** -- Run Panguard with Threat Cloud enabled. Every detection strengthens the community.

---

## License

[MIT](LICENSE) -- Use it, modify it, deploy it, sell it. No strings attached.

100% free. 100% open source. No usage telemetry. No vendor lock-in. No "community edition" bait-and-switch.

---

<div align="center">

<br>

**Panguard AI** -- Taipei, Taiwan

[Website](https://panguard.ai) ·
[GitHub](https://github.com/panguard-ai) ·
[ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules) ·
[Documentation](docs/)

<br>

If Panguard helps protect your AI agents, consider giving it a star. It helps others discover the project.

[![Star on GitHub](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=for-the-badge&logo=github&label=Star%20on%20GitHub)](https://github.com/panguard-ai/panguard-ai)

<sub>If AI agents can act on your behalf, someone should check what they're about to do.</sub>

<br>

</div>
