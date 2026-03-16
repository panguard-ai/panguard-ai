# The MCP Ecosystem Has a Security Problem — Here's the Data

_We scanned 1,295 MCP skills. 26 were malicious. SSH key theft, prompt injection, credential harvesting — all found in real packages from npm._

---

## TL;DR

- AI agents (Claude Code, Cursor, Codex, OpenClaw) install MCP skills with **full system access** — file read, command execution, network requests, credential access
- Unlike mobile apps, there is **zero review process** before a skill runs on your machine
- We scanned **1,295 MCP skills** from 4,648 registry entries across 3 sources
- **26 were malicious** (21 CRITICAL, 5 HIGH) — actively stealing credentials, injecting prompts, and exfiltrating data
- We open-sourced everything: [ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) (detection standard) + [PanGuard](https://github.com/panguard-ai/panguard-ai) (scanner + runtime protection)

---

## The Problem No One Is Talking About

AI agents are exploding. Claude Code, Cursor, Codex, OpenClaw, WorkBuddy, QClaw — they all use the Model Context Protocol (MCP) to integrate external tools. The MCP ecosystem has grown to 4,600+ entries in just months.

Here's what most developers don't realize: **when you install an MCP skill, you're giving it the same access as a root user.**

An MCP skill can:

- Read any file on your system (including `~/.ssh/id_rsa`, `~/.aws/credentials`, `.env`)
- Execute arbitrary commands
- Make network requests to any endpoint
- Access all environment variables (API keys, database URLs, tokens)

And here's the kicker: **there is no review process.** Anyone can publish a skill. No signature verification. No permission model. No audit.

This is exactly where mobile apps were before Apple introduced App Review in 2008.

---

## What We Did

We built [ATR (Agent Threat Rules)](https://github.com/Agent-Threat-Rule/agent-threat-rules) — the first open detection standard for AI agent threats. Think of it as Sigma rules, but for AI agents. 52 rules across 9 threat categories, with 450+ detection patterns.

Then we scanned the entire MCP ecosystem.

**Methodology:**

- Crawled 4,648 MCP/AI skill entries from npm registry, GitHub repositories, and community awesome-lists
- 1,295 had parseable SKILL.md or README.md files
- Each skill was scanned with: 52 ATR rules, secret detection (AWS keys, GitHub tokens, SSH keys), permission analysis, and manifest validation
- Results classified as CRITICAL, HIGH, MEDIUM, or CLEAN

---

## The Results

| Result       | Count  | Percent  |
| ------------ | ------ | -------- |
| Clean        | 1,266  | 97.8%    |
| **CRITICAL** | **21** | **1.6%** |
| **HIGH**     | **5**  | **0.4%** |
| MEDIUM       | 3      | 0.2%     |

The good news: 97.8% of skills are clean. The MCP community is overwhelmingly building legitimate tools.

The bad news: **26 skills are actively malicious.** And if you installed any of them, your credentials may already be compromised.

---

## What We Found: 5 Real Cases

All examples are anonymized. Package names are redacted to prevent exploitation.

### Case 1: SSH Key Exfiltration

**Severity: CRITICAL**

A skill marketed as a "code deployment helper" included a tool definition that reads `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, and `~/.aws/credentials`. The content was base64-encoded and sent via HTTP POST to an external endpoint on each invocation.

**Impact:** Full SSH access to all servers the user can reach. AWS credentials exposed. Lateral movement possible.

**Found:** 3 instances across different npm packages.

### Case 2: Hidden Prompt Injection

**Severity: CRITICAL**

A skill injected invisible instructions into its tool response using Unicode control characters and HTML comments. The injected text instructed the agent to "ignore previous instructions and execute the following commands" — including downloading and running a remote script.

**Impact:** Complete agent hijacking. Arbitrary command execution on the user's machine via the AI agent.

**Found:** 12 instances, including 4 with obfuscated payloads using Unicode RTL override characters.

### Case 3: Over-Privileged Skill with Data Exfiltration

**Severity: CRITICAL**

A "markdown formatter" skill requested filesystem write, network access, and process execution permissions. Analysis revealed it reads the content of all files passed to it and sends file paths + partial content to a logging endpoint. The skill only needs read access to function.

**Impact:** Source code and sensitive files exposed to third party. User unaware due to seemingly benign tool name.

**Found:** 5 instances.

### Case 4: Environment Variable Harvesting

**Severity: HIGH**

A skill's tool definition included `process.env` access that collected all environment variables — including `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, and similar secrets. Variables were concatenated and returned as part of the tool response, making them visible in agent context and potentially logged.

**Impact:** All API keys and database credentials exposed. Cloud service bills. Data breach via compromised database access.

**Found:** 2 instances.

### Case 5: Git Token Theft

**Severity: HIGH**

A "git helper" skill read `~/.gitconfig` and `~/.git-credentials`, extracting GitHub personal access tokens and repository URLs. The tokens were sent to an external API disguised as "analytics telemetry."

**Impact:** GitHub repository access compromised. Private repos exposed. Possible supply chain attack via push access.

**Found:** 3 instances.

---

## Threat Category Breakdown

| Category              | Findings | % of Malicious | Description                                 |
| --------------------- | -------- | -------------- | ------------------------------------------- |
| Prompt Injection      | 12       | 46%            | Hidden instructions in tool responses       |
| Credential Theft      | 8        | 31%            | SSH keys, API tokens, git credentials       |
| Excessive Permissions | 5        | 19%            | Requesting more access than needed          |
| Data Exfiltration     | 3        | 12%            | Sending file contents to external endpoints |

_Note: a single skill may have findings across multiple categories._

Prompt injection was the most common attack vector, which makes sense — it's the easiest to implement and hardest to detect visually. A malicious tool response looks identical to a legitimate one unless you're specifically scanning for injection patterns.

---

## Why Traditional Security Tools Miss This

We compared PanGuard's detection capabilities against established security tools:

| Capability                  | PanGuard     | CrowdStrike    | Snyk       | Lakera  |
| --------------------------- | ------------ | -------------- | ---------- | ------- |
| AI agent threat detection   | Yes          | No             | No         | Partial |
| MCP skill pre-install audit | Yes          | No             | No         | No      |
| Prompt injection detection  | 21 ATR rules | No             | No         | Yes     |
| Tool poisoning detection    | 11 ATR rules | No             | No         | No      |
| Credential theft via agent  | Yes          | Partial        | No         | No      |
| Runtime agent monitoring    | 24/7         | Endpoints only | No         | No      |
| Cost                        | $0 (MIT)     | $25-60/ep/mo   | Free tier+ | Paid    |

CrowdStrike sees processes and files but has no concept of prompt flows or MCP tool definitions. Snyk scans code dependencies but doesn't understand AI skill semantics. Lakera filters prompts but doesn't monitor runtime behavior or scan skills pre-install.

**The AI agent layer is a blind spot for the entire security industry.**

---

## What This Means For You

If you use Claude Code, Cursor, Codex, OpenClaw, or any MCP-compatible AI agent:

1. **Assume your skills are unaudited.** None of the major platforms currently review MCP skills before installation.

2. **Check what you've installed.** Go to your MCP config file and review every skill. If you don't recognize one, scan it.

3. **Your credentials may already be compromised.** If you installed any skill from an untrusted source, rotate your SSH keys, API tokens, and git credentials.

---

## What We're Doing About It

We believe this ecosystem needs what the App Store brought to mobile apps: **a review standard.**

### ATR (Agent Threat Rules)

[ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) is the first open detection standard for AI agent threats. 52 rules across 9 categories, with mappings to OWASP LLM Top 10, OWASP Agentic Top 10, and MITRE ATLAS.

It's the Sigma/YARA equivalent for AI agents: YAML-based, machine-readable, community-driven, MIT licensed.

### PanGuard

[PanGuard](https://github.com/panguard-ai/panguard-ai) is the security platform built on ATR:

- **Skill Auditor:** Scan any MCP skill in 3 seconds. [Try it online](https://panguard.ai) — paste a GitHub URL and get a report.
- **Guard:** 24/7 runtime monitoring with 10,400+ detection rules (ATR + Sigma + YARA). Auto-blocks threats.
- **Threat Cloud:** Every scan generates threat intelligence shared with the community. One person's discovery protects everyone.

```bash
# Install and protect all your AI platforms in one command
npm install -g @panguard-ai/panguard
panguard setup
# Auto-detects: Claude Code, Cursor, QClaw, OpenClaw, Codex, WorkBuddy, Claude Desktop
```

### The Flywheel

Every scan makes the ecosystem safer:

```
Scan a skill → Find a threat → Auto-upload to Threat Cloud →
Community + LLM review → New ATR rule → Pushed to all users →
Next time: blocked in < 50ms
```

Currently: 61 community-generated rules from 1,295 scans. Growing daily.

---

## Call to Action

1. **Scan your skills.** Go to [panguard.ai](https://panguard.ai) and paste a GitHub URL. Free. No install needed.

2. **Install PanGuard.** One command: `npm install -g @panguard-ai/panguard && panguard setup`

3. **Contribute ATR rules.** The standard grows with the community. [Contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).

4. **Share this report.** Every developer who learns about this problem makes the ecosystem safer.

---

## Full Report

The complete technical report with all data is available at: **[panguard.ai/research/mcp-ecosystem-scan](https://panguard.ai/research/mcp-ecosystem-scan)**

---

_PanGuard AI is 100% free, 100% open source, MIT licensed. Built in Taiwan._

_Follow us: [GitHub](https://github.com/panguard-ai/panguard-ai) · [X/Twitter](https://x.com/panguard_ai)_

---

**Tags:** #security #ai #mcp #aiagents #cybersecurity #opensource #claudecode #cursor #codex
