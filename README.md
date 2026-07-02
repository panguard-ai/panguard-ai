<div align="center">

<img src="assets/PANGUARD_GitHub_Banner_Clean.png" alt="PanGuard AI" width="720">

<br>

### A firewall for your AI agents. Free, open source, on your machine.

### 給 AI agent 的防火牆。免費、開源、全在你的機器上。

<br>

[![npm](https://img.shields.io/npm/v/panguard?style=flat-square&color=cb3837&logo=npm&label=panguard)](https://www.npmjs.com/package/panguard)
[![GitHub Stars](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=flat-square&color=DAA520)](https://github.com/panguard-ai/panguard-ai/stargazers)
[![MIT License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)
[![ATR](https://img.shields.io/badge/built%20on-ATR%20650%2B%20rules-8b5cf6.svg?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

</div>

---

Your AI agents now act on your behalf. They install skills from registries you've never read, and they run shell commands, edit files, and fetch URLs on their own. **Someone should check what they're about to do.**

PanGuard is that check. One command scans every skill your agents installed against **650+ open ATR rules**, drops a guard between your agents and the tools they call, and shows you the whole thing in a local dashboard. Nothing about your code leaves your machine.

```bash
npm install -g panguard && pga up
```

---

## Why I built this

I'm **Adam Lin (林冠辛)**, a solo founder in Taiwan. I'm not a career engineer — I came from real estate sales and marketing, ran a hip-hop festival for five years, and taught myself to code. When AI agents started installing skills and running tools on my own machine, I realized there was no antivirus for any of it: a skill is just text an agent will follow, and a malicious one can tell your agent to exfiltrate your keys or `curl | bash` a payload — and nothing was watching.

So I built the thing that watches — and the open detection standard underneath it, **ATR**, the way Sigma standardized SIEM rules and YARA standardized malware signatures. ATR is independent and MIT-licensed; PanGuard is one runtime on top of it.

Solo, from zero — and the rules behind it are already **merged into Microsoft's and Cisco's security tooling** (details below). I'm giving the whole runtime away free because this should exist for everyone, not sit behind a sales call.

---

## What you get

- **Pre-install scan** — `pga scan` audits a skill or MCP server against 650+ ATR rules in seconds, and **exits non-zero on a real threat** so any CI can gate a malicious skill out.
- **Runtime guard** — a local daemon inspects every agent tool call — both MCP servers and the agent's _own_ built-in tools (Bash / Edit / Write / WebFetch) — across **7 platforms** (Claude Code, Cursor, Codex, Continue, Gemini CLI, Cline, Windsurf), and blocks known attacks before they run.
- **A local dashboard** — one glance answers "am I protected right now?"; one click quarantines a threat. Survives reboot like real antivirus.
- **Deterministic + explainable** — the blocking is regex/AST + ATR rules, on-device, sub-50ms. An optional LLM "second opinion" (bring your own — free local Ollama or a cloud key) only flags for review; **it never auto-blocks**.
- **100% free, MIT, on-device.** No account, no signup. Threat-sharing is **opt-in and off by default** — nothing leaves your machine unless you turn it on.

---

## Quick start

```bash
npm install -g panguard && pga up
```

1. `pga up` — scans your installed skills, starts protection, opens the dashboard
2. `pga audit skill ./some-skill` — vet a skill _before_ you install it (risk score + findings)
3. `pga scan ./some-skill --sarif` — SARIF 2.1.0 for your CI
4. `pga doctor` — confirm everything's healthy

Open the dashboard URL it prints. Stop there — you'll know in two minutes if this is for you.

> `panguard` and `@panguard-ai/panguard` are the same package; both `pga` and `panguard` work as the command.

Or scan online at **[panguard.ai](https://panguard.ai)** — paste a GitHub URL, get a report in seconds, no install.

---

## See it work

```text
$ npm install -g panguard && pga up

  PanGuard  Your AI Security Guard
  ──────────────────────────────────────────────
  ▣ Looking at your setup...
    ✓ Claude Code found      ✓ Cursor found
    ✓ Codex CLI   found      ✓ Continue found
  → Scanning installed skills against 650+ ATR rules...
    1 CRITICAL — prompt injection via tool description (blocked)
  ▣ Watching your agents...
    Built-in tools guarded across 7 platforms (restart the agent to activate)
  ──────────────────────────────────────────────
  PROTECTED · 655 rules active
  Dashboard   http://127.0.0.1:3100/?token=…   (open to see live status)
  Threat Cloud  off (opt-in) — nothing leaves this machine
```

Quiet is the goal. A clean machine shows "all clear"; a real threat shows up under **Threats** with the exact rule it matched and a one-click action.

---

## How it works

```
  pga up
    └─> detect AI platforms → scan installed skills → inject the runtime guard
          └─> every tool call → ATR evaluation (650+ rules, 10 categories) → ALLOW / DENY
                ├─> local dashboard (real-time status + evidence)
                └─> Threat Cloud (opt-in): a confirmed threat → reviewed → a new ATR rule for everyone
```

Deterministic by default. Layers A + B run on-device and do the blocking; Layer C is optional and advisory.

| Layer | Engine                            | Latency | Cost    | Auto-blocks?               |
| ----- | --------------------------------- | ------- | ------- | -------------------------- |
| **A** | 650+ ATR rules (regex + AST)      | < 50ms  | $0      | yes                        |
| **B** | On-device heuristics              | < 50ms  | $0      | yes                        |
| **C** | _Your_ LLM (local Ollama / cloud) | ~2–5s   | $0 / ~¢ | no — flags for review only |

Internet down? A and B keep running. No model configured? You still get full deterministic detection.

---

## Who it's for

- **Solo devs & agent builders** installing skills from registries you don't fully trust — a free pre-install scan and a runtime guard.
- **Security engineers** who want an executable, Sigma-style detection standard for AI agents instead of a checklist.
- **Teams** adding a pre-install / CI gate (SARIF) so a malicious skill can't merge.

---

## Real adoption

Not "stars" — merged code, in production.

| Organization                              | What                              | Status                                                                               |
| ----------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| **Microsoft** Agent Governance Toolkit    | ATR rules + weekly auto-sync      | Merged · [PR #1277](https://github.com/microsoft/agent-governance-toolkit/pull/1277) |
| **Cisco** AI Defense                      | ATR rule library in skill-scanner | Merged · [PR #99](https://github.com/cisco-ai-defense/skill-scanner/pull/99)         |
| **MISP** (threat intel)                   | Galaxy + taxonomy entries         | Merged                                                                               |
| **OWASP** Agentic Security Resource Hub\* | Listing                           | Merged                                                                               |

\* third-party resource hub, not the OWASP Foundation main repo. Several more integrations are in review (NVIDIA garak, OpenSSF SAFE-MCP, IBM, Meta PurpleLlama, Gen Digital) — listed honestly on [panguard.ai](https://panguard.ai), not counted as adoption.

---

## Benchmarks

Public corpora, deterministic samples, fixed seeds. We quote precise numbers — we don't round up. Full methodology: [panguard.ai/research/benchmarks](https://panguard.ai/research/benchmarks).

| Corpus                    | Recall   | Precision | Sample |
| ------------------------- | -------- | --------- | ------ |
| SKILL.md (real-world)     | **100%** | **97%**   | 498    |
| garak (ATR-core families) | **~98%** | —         | 650    |
| PINT (prompt-injection)   | 63.2%    | 99.7%     | 850    |

garak is an approximate figure that drifts across rule versions; the authoritative live rule count is in [stats.json](https://raw.githubusercontent.com/Agent-Threat-Rule/agent-threat-rules/main/data/stats.json).

---

## Honest about what leaves your machine

PanGuard is on-device by default. The optional **Threat Cloud** (off until you opt in) shares only a **minimal threat signature** — the matched rule ID, attack category, MITRE technique, a coarse country region, and a truncated IP. **Never** your prompts, code, file contents, file paths, secrets, or hostname. Inbound community rules are **ed25519 signature-verified and fail-closed** — a rogue server can't inject detection logic.

> Sharing is pseudonymous (a stable random install ID), transport-encrypted (TLS). End-to-end encrypted contributions — where not even our server can read a payload — are on the roadmap for regulated fleets.

---

## Architecture

```
panguard-ai/
  packages/
    panguard/                CLI: detect platforms, scan, deploy guard
    panguard-guard/          Runtime engine + dashboard server
    panguard-mcp-proxy/      MCP runtime interception for agent tool calls
    panguard-skill-auditor/  Multi-check security gate for every skill
    panguard-mcp/            MCP server: tools for AI assistants
    panguard-migrator/       Sigma / YARA → ATR YAML converter (Community, MIT)
    atr/                     ATR Layer 0 (synced from the open standard)
    scan-core/               Shared scan engine: regex + AST + context signals
    website/                 Next.js site + online scanner + research
```

TypeScript (strict) · Node.js 20+ · pnpm workspaces. ATR is the open standard (Layer 0); PanGuard is the runtime on top (Layer 1). The hosted Threat Cloud service and Enterprise features are separate and not in this repo.

---

## License

**MIT.** Community is free forever — the runtime engine, the ATR rules, the scanner, the MCP server, and the CLI. No telemetry by default, no vendor lock-in, no features locked inside the free product.

Enterprise and Sovereign tiers add separately-licensed commercial services for regulated orgs (signed multi-framework compliance evidence, end-to-end upload encryption, airgap, SLA, dedicated support). Detail at [panguard.ai/pricing](https://panguard.ai/pricing).

---

## Contributing

- **Scan your skills** — highest impact; every confirmed threat can strengthen the open standard.
- **Write ATR rules** — [ATR contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).
- **Report a vulnerability** — [security advisory](SECURITY.md).
- **Submit code** — fork, branch, test, PR. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

<div align="center">

**If AI agents can act on your behalf, someone should check what they're about to do.**

如果 AI agent 可以代表你行動,總得有人檢查它接下來要做什麼。

<br>

```bash
npm install -g panguard && pga up
```

Built solo by Adam Lin (林冠辛) · **adam@agentthreatrule.org** · Taipei, Taiwan

[Website](https://panguard.ai) · [ATR Standard](https://github.com/Agent-Threat-Rule/agent-threat-rules) · [Benchmarks](https://panguard.ai/research/benchmarks)

</div>
