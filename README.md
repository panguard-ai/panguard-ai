<div align="center">

<img src="assets/PANGUARD_GitHub_Banner_Clean.png" alt="PanGuard AI" width="720">

<br>

### A firewall for your AI agents. Free, open source, on your machine.

### 給 AI agent 的防火牆。免費、開源、全在你的機器上。

<br>

[![npm](https://img.shields.io/npm/v/panguard?style=flat-square&color=cb3837&logo=npm&label=panguard)](https://www.npmjs.com/package/panguard)
[![GitHub Stars](https://img.shields.io/github/stars/panguard-ai/panguard-ai?style=flat-square&color=DAA520)](https://github.com/panguard-ai/panguard-ai/stargazers)
[![MIT License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)
[![ATR](https://img.shields.io/badge/built%20on-ATR-8b5cf6.svg?style=flat-square)](https://github.com/Agent-Threat-Rule/agent-threat-rules)
[![Made in Taiwan](https://img.shields.io/badge/Made%20in-Taiwan-e11d48.svg?style=flat-square)](https://panguard.ai)

</div>

---

Your AI agents now act on your behalf. They install skills from registries you've never read, and they run shell commands, edit files, and fetch URLs on their own. **Someone should check what they're about to do.**

PanGuard is that check. One command scans every skill your agents installed against the open **ATR** rules, puts a check in front of the tools your agents call, and shows you the whole thing in a local dashboard. Nothing about your code leaves your machine.

```bash
npm install -g panguard && pga up
```

---

## Why I built this

I'm **Adam Lin (林冠辛)**, a solo founder in Taiwan. I'm not a career engineer — I came from real estate sales and marketing, ran a hip-hop festival for five years, and taught myself to code. When AI agents started installing skills and running tools on my own machine, I realized there was no antivirus for any of it: a skill is just text an agent will follow, and a malicious one can tell your agent to exfiltrate your keys or `curl | bash` a payload — and nothing was watching.

So I built the thing that watches — and the open detection standard underneath it, **ATR**, the way Sigma standardized SIEM rules and YARA standardized malware signatures. ATR is independent and MIT-licensed; PanGuard is one runtime on top of it.

Solo, from zero — and ATR rules already ship inside Cisco's open-source skill-scanner, with an ATR example in Microsoft's Agent Governance Toolkit (details below). I'm giving the whole runtime away free because this should exist for everyone, not sit behind a sales call.

---

## What you get

- **Pre-install scan** — `pga scan` audits a skill or MCP server against the ATR rules in seconds, and **exits non-zero on a real threat** so any CI can gate a malicious skill out.
- **Tool-call hook** — before an agent runs one of its _own_ built-in tools (Bash / Edit / Write / WebFetch), a hook checks the command or content against ATR and answers allow, ask or deny. Supported hosts: Claude Code, Cursor, Codex, Continue, Gemini CLI, Cline, Windsurf. Each call is checked on its own; calls to MCP tools are not covered by the hook.
- **MCP proxy** — checks the calls an agent makes to the MCP servers the proxy wraps.
- **A local dashboard** — one glance answers "am I protected right now?"; one click quarantines a threat. Survives reboot like real antivirus.
- **Deterministic + explainable** — the blocking is regex/AST + ATR rules, on-device, sub-50ms. An optional LLM "second opinion" (bring your own — free local Ollama or a cloud key) only flags for review; **it never auto-blocks**.
- **100% free, MIT, on-device.** No account, no signup. Threat-sharing is **opt-in and off by default** — nothing leaves your machine unless you turn it on.

---

## Quick start

```bash
npm install -g panguard && pga up
```

The one-line installer on [panguard.ai](https://panguard.ai) (`curl -fsSL https://get.panguard.ai | bash`) is the other supported way to install.

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
  → Scanning installed skills against ATR rules...
    1 CRITICAL — prompt injection via tool description (blocked)
  ▣ Watching your agents...
    Built-in tools guarded across 7 platforms (restart the agent to activate)
  ──────────────────────────────────────────────
  PROTECTED · ATR rules active
  Dashboard   http://127.0.0.1:3100/?token=…   (open to see live status)
  Threat Cloud  off (opt-in) — nothing leaves this machine
```

Quiet is the goal. A clean machine shows "all clear"; a real threat shows up under **Threats** with the exact rule it matched and a one-click action.

---

## How it works

```
  pga up
    └─> detect AI platforms → scan installed skills → inject the runtime guard
          └─> built-in tool call (hook) / wrapped MCP call (proxy) → ATR evaluation → ALLOW / ASK / DENY
                ├─> local dashboard (real-time status + evidence)
                └─> rule proposal kept on this machine → you submit it as a public ATR issue
```

Deterministic by default. Layers A + B run on-device and do the blocking; Layer C is optional and advisory.

| Layer | Engine                            | Latency | Cost    | Auto-blocks?               |
| ----- | --------------------------------- | ------- | ------- | -------------------------- |
| **A** | ATR rules (regex + AST)           | < 50ms  | $0      | yes                        |
| **B** | On-device heuristics              | < 50ms  | $0      | yes                        |
| **C** | _Your_ LLM (local Ollama / cloud) | ~2–5s   | $0 / ~¢ | no — flags for review only |

Internet down? A and B keep running. No model configured? You still get full deterministic detection.

---

## Who it's for

- **Solo devs & agent builders** installing skills from registries you don't fully trust — a free pre-install scan and a runtime guard.
- **Security engineers** who want an executable, Sigma-style detection standard for AI agents instead of a checklist.
- **Teams** adding a pre-install / CI gate (SARIF) so a malicious skill can't merge.

---

## Where ATR rules are used

Merged code in other projects, checked on 2026-11-18.

| Project                                | What is merged                                                                         | Evidence                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Cisco** AI Defense skill-scanner     | An ATR rule pack inside the scanner                                                    | [PR #99](https://github.com/cisco-ai-defense/skill-scanner/pull/99)                                            |
| **Microsoft** Agent Governance Toolkit | An ATR rules example with a weekly sync workflow (an example, not a shipped rule pack) | [PR #1277](https://github.com/microsoft/agent-governance-toolkit/pull/1277)                                    |
| **MISP** (threat intel)                | Galaxy and taxonomy entries                                                            | [misp-galaxy](https://github.com/MISP/misp-galaxy), [misp-taxonomies](https://github.com/MISP/misp-taxonomies) |

ATR keeps the full, re-verified list in its [ADOPTERS.md](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/ADOPTERS.md).

---

## Benchmarks

Detection results depend on the ATR version, so they are published with the rules rather than copied here. See the measurements and methods in the [ATR repository](https://github.com/Agent-Threat-Rule/agent-threat-rules), and the live rule count in [stats.json](https://raw.githubusercontent.com/Agent-Threat-Rule/agent-threat-rules/main/data/stats.json).

---

## Honest about what leaves your machine

PanGuard is on-device by default. Joining Collective Defense (Threat Cloud) is **off until you opt in**, and one switch controls it: `pga config set threat-cloud true|false` (`telemetry` is the same switch). The full text you agree to is `pga config show --verbose`; it is the single source this section follows.

**Status, checked 2026-11-18:** the Threat Cloud service is offline, so uploads to it and its community lists do not go through even if you opt in. Third-party feeds and the drafter's model calls do not depend on Threat Cloud.

**If you opt in**, PanGuard:

1. Shares **minimal threat signatures**: the matched rule ID, attack category, MITRE technique, a coarse country region and a truncated IP (last two octets zeroed). These are **end-to-end encrypted** on your machine to the Threat Cloud ingest key; only the backend can read them. This is the only traffic that is sealed today.
2. Sends **summaries over HTTPS (not sealed)** when you audit skills or scan: the manifest or config name of a skill or MCP server (never a path), a hash of it (its `SKILL.md`, its files, or the server name and command shape; never its path), the risk level and score, the rule ID, category, severity and title of each finding, scan counts, your OS and CPU type, the PanGuard version, the list of agent platforms PanGuard set up, and, on `pga up` until the server accepts it once, your terminal program name and Node version.
3. **Downloads** community lists every 5 minutes (IP and domain blocklists, community skill allow/block lists) from Threat Cloud, plus public threat-intel feeds from third parties (abuse.ch, and GreyNoise or AbuseIPDB if you set their keys). Those servers see your IP address.
4. Turns on the **rule-proposal drafter**. In two calls (draft, then review) it sends the AI model you configured (a cloud provider if you set an API key, otherwise a local model) up to five event descriptions of up to 200 characters each, the analysis and evidence text built from them (capped), event counts, the time range, and then the rule it drafted.

**Never**: your prompts, code, file contents, file paths, secrets, hostname or username. The names of tools your agents call at runtime are never uploaded. Detection-rule proposals stay on your machine until you submit one yourself (below). Inbound community rules are **ed25519 signature-verified and fail-closed**: a rogue server can't inject detection logic.

**Whether or not you opt in:**

- Two daily version checks, the CLI's own and the rules', both plain lookups on the npm registry. They download nothing, and npm sees your IP address. `pga config set update-check false` turns both off; `PANGUARD_NO_UPDATE_CHECK=1` overrides it.
- `pga scan` in full mode looks up the names (and versions, when detected) of services listening on this machine on the NIST NVD vulnerability database.
- If you have run `pga login`, every `pga audit` also sends the findings to your workspace at app.panguard.ai: rule ID, severity and title of each finding, risk level and score, the skill name, the target's base name (or remote identifier), a hash of the target, a one-way hashed machine ID, your OS and the PanGuard version. The events are tied to your workspace. `pga logout` stops it.

Turning sharing off stops everything in the opt-in list. It restarts an installed always-on Guard service and stops a Guard that is running now; turning sharing on in a Guard you started by hand needs `pga guard restart`.

> Sharing is pseudonymous (a stable random install ID). Signatures are end-to-end encrypted as described above; the other uploads are transport-encrypted (TLS) only. Extending end-to-end encryption to them is on the roadmap for regulated fleets.

### Send what you catch to ATR (no Threat Cloud needed)

When a scan rates a skill HIGH or CRITICAL, PanGuard keeps the matched evidence as a detection-rule proposal in `~/.panguard/proposals/` on your machine. Nothing is sent anywhere.

```bash
pga proposals list            # what is waiting
pga proposals show <id>       # the exact text that would be published
pga proposals submit <id>     # opens a pre-filled "New Rule Proposal" issue on the ATR repository
```

`submit` only opens your browser at a pre-filled GitHub issue form. **You** read it, edit it if you want, and press Submit from your own account; PanGuard never posts for you and needs no token. The issue is **public**, so before any text reaches the form PanGuard de-identifies it on your machine: secrets and tokens, home-directory paths, your user name and host name, email addresses and IP addresses are masked, the skill name is left out, and only the matched snippet is kept. Read it anyway before you submit. ATR's maintainers turn accepted proposals into rules through the same quality gates as any other contribution. See [docs/guides/rule-proposals.md](docs/guides/rule-proposals.md).

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

**MIT.** The open-source edition is free with no paywall — the runtime engine, the ATR rules, the scanner, the MCP server, and the CLI. No telemetry by default, no vendor lock-in.

Services for organizations (one policy across many machines, records signed for auditors and insurers, on-premises deployment) are in development with design partners and are not in this repo. They have no public price yet; see [panguard.ai/pricing](https://panguard.ai/pricing).

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
