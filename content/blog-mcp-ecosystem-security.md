# We Scanned 2,386 MCP Packages. Half Had Security Issues.

_SSH key theft. Hidden prompt injection. Delayed backdoors. Environment variable harvesting. All found in real packages on npm — the same registry your AI agent installs from._

---

## TL;DR

- AI agents (Claude Code, Cursor, Codex, OpenClaw) install MCP packages with **full system access** — shell execution, file read/write, network requests, credential access
- There is **zero review process** before a package runs on your machine
- We scanned **2,386 MCP packages** from npm, extracting **35,858 tool definitions**
- **49% had security findings** — 402 CRITICAL, 240 HIGH, 299 MEDIUM
- **249 packages have the "triple threat"**: shell execution + network requests + filesystem write
- **122 packages auto-execute code on install** via postinstall scripts
- Detection: **99.4% precision** (near-zero false positives), **39.9% recall** (catches known patterns, improving as new rules are added)
- Everything is open source: [ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) (detection standard) + [PanGuard](https://github.com/panguard-ai/panguard-ai) (scanner)

---

## The Problem No One Is Talking About

AI agents are exploding. Claude Code, Cursor, Codex, OpenClaw, Devin — they all use the Model Context Protocol (MCP) to connect to external tools. The npm MCP ecosystem has grown to 4,600+ entries in months.

Here's what most developers don't realize: **when you install an MCP package, you're giving it the same access as a root user.**

An MCP package can:

- Read any file on your system (including `~/.ssh/id_rsa`, `~/.aws/credentials`, `.env`)
- Execute arbitrary shell commands
- Make network requests to any endpoint
- Access all environment variables (API keys, database URLs, tokens)

And here's the kicker: **there is no review process.** Anyone can publish. No signature verification. No permission model. No audit.

This is exactly where mobile apps were before Apple introduced App Review in 2008.

---

## What We Did

We built [ATR (Agent Threat Rules)](https://github.com/Agent-Threat-Rule/agent-threat-rules) — the first open detection standard for AI agent threats. 61 rules across 9 threat categories, with 474 detection patterns.

Then we scanned the entire MCP ecosystem on npm.

**Methodology:**

- Crawled 4,648 MCP/AI skill entries from npm registry using 8 search queries with pagination
- 2,386 packages were analyzable (had parseable code or metadata)
- Extracted **35,858 MCP tool definitions** from built JavaScript
- Each package was scanned with:
  - 61 ATR detection rules (pattern matching on tool descriptions, schemas, and code)
  - AST-level analysis (prototype pollution, conditional backdoors, delayed execution)
  - Supply chain signals (postinstall scripts, typosquatting, suspicious naming)
  - Code behavior analysis (outbound URLs, shell execution, filesystem writes, env access)
- Results classified by risk score: CRITICAL (70+), HIGH (40-69), MEDIUM (15-39), LOW (1-14), CLEAN (0)

**What we did NOT do:**

- No runtime analysis (we never connected to any MCP server)
- No source code review (we scanned distributed/built JS only)
- No network traffic monitoring

**Limitations:**

- Static analysis has false positives. "Shell execution" means the code _contains_ shell execution patterns, not that it's malicious.
- Risk scores are heuristic. CRITICAL does not mean "malware" — it means the package has multiple high-risk signals that warrant manual review.
- Many "high-risk" capabilities are intentional and legitimate — a database MCP server is _supposed_ to run SQL queries. The risk is the _absence of guardrails_ when AI agents invoke these tools autonomously.
- Our detection precision is 99.4% (PINT benchmark), but recall is 39.9% — we likely **miss more threats than we catch**.

---

## The Results

| Risk Level   | Packages | Percent   | What It Means                                                                                        |
| ------------ | -------- | --------- | ---------------------------------------------------------------------------------------------------- |
| **CRITICAL** | **402**  | **16.8%** | Multiple high-risk signals: ATR rule matches, dangerous tool combinations, or supply chain red flags |
| **HIGH**     | **240**  | **10.1%** | Concerning signals: excessive permissions, credential access + network, or ATR matches               |
| **MEDIUM**   | **299**  | **12.5%** | Moderate signals: filesystem write + network, or single ATR match                                    |
| **LOW**      | **226**  | **9.5%**  | Minor signals: outbound URLs only, minor permission concerns                                         |
| CLEAN        | 1,216    | 51.0%     | No significant findings                                                                              |
| ERROR        | 3        | 0.1%      | Could not be analyzed                                                                                |

The good news: **51% of packages are clean.** The majority of the MCP community is building legitimate tools.

The bad news: **49% have at least one security finding.** And 642 packages (27%) are HIGH or CRITICAL — meaning they have dangerous capability combinations that a prompt injection attacker could exploit.

---

## The "Triple Threat"

**249 packages** (10.4%) have all three capabilities simultaneously:

- Shell command execution
- Network requests to external endpoints
- Filesystem write access

This is the perfect storm for a download-and-execute attack. A single prompt injection can turn these packages into remote code execution vectors.

```
Attacker injects prompt → Agent calls MCP tool →
Tool downloads payload (network) → writes to disk (filesystem) →
executes it (shell) → game over
```

---

## What ATR Detected

Our 61 ATR rules triggered **3,361 times** across the scanned packages:

| ATR Rule     | What It Detects                                                                | Packages          |
| ------------ | ------------------------------------------------------------------------------ | ----------------- |
| ATR-2026-099 | High-risk tool invocation without human confirmation (delete, deploy, execute) | **1,515** (63.5%) |
| ATR-2026-061 | Tool description doesn't match actual behavior                                 | **728** (30.5%)   |
| ATR-2026-063 | Multi-skill chain attack potential (tool A feeds tool B)                       | **356** (14.9%)   |
| ATR-2026-040 | Privilege escalation and admin function access                                 | **300** (12.6%)   |
| ATR-2026-012 | Unauthorized tool call patterns                                                | **231** (9.7%)    |
| ATR-2026-066 | Parameter injection via tool arguments                                         | **138** (5.8%)    |
| ATR-2026-051 | Resource exhaustion potential                                                  | **56** (2.3%)     |
| ATR-2026-060 | Skill impersonation / typosquatting                                            | **15**            |
| ATR-2026-030 | Cross-agent attack                                                             | **9**             |
| ATR-2026-032 | Goal hijacking                                                                 | **3**             |

The most common issue: **63.5% of packages expose destructive operations (delete, deploy, execute) without requiring human confirmation.** This means a single prompt injection can trigger irreversible actions.

---

## What We Found: 5 Real Cases

All packages are real. Names redacted to prevent exploitation.

### Case 1: SSH Key Exfiltration

**Severity: CRITICAL**

A package marketed as a "code deployment helper" included a tool that reads `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, and `~/.aws/credentials`. Content was base64-encoded and sent via HTTP POST to an external endpoint on each invocation.

**Impact:** Full SSH access to all servers. AWS credentials exposed. Lateral movement possible.

**Found:** 3 instances across different npm packages.

### Case 2: Hidden Prompt Injection

**Severity: CRITICAL**

A package injected invisible instructions into tool responses using Unicode control characters and HTML comments. The injected text instructed the agent to "ignore previous instructions and execute the following commands" — including downloading and running a remote script.

**Impact:** Complete agent hijacking. Arbitrary command execution via AI agent.

**Found:** 12 instances, including 4 with obfuscated payloads using Unicode RTL override characters.

### Case 3: Delayed Backdoor

**Severity: CRITICAL**

AST analysis detected `setTimeout` with code execution — a pattern where malicious behavior only activates after a delay, bypassing initial inspection. One package had conditional execution based on `process.env` — the backdoor only triggers in specific environments.

**Impact:** Undetectable during manual review. Activates after you've already trusted the package.

**Found:** 2 instances with environment-conditional triggers.

### Case 4: Environment Variable Harvesting

**Severity: HIGH**

A package's tool definition accessed `process.env` to collect all environment variables — including `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`. Variables were returned as part of the tool response, making them visible in agent context and potentially logged.

**Impact:** All API keys and database credentials exposed. Cloud service bills. Data breach.

**Found:** 2 instances.

### Case 5: Over-Privileged "Formatter"

**Severity: CRITICAL**

A "markdown formatter" requested filesystem write, network access, and shell execution. Analysis revealed it reads content of all files passed to it and sends file paths + partial content to a logging endpoint. A formatter only needs read access.

**Impact:** Source code and sensitive files exposed to third party.

**Found:** 5 instances with similar over-permission patterns.

---

## Supply Chain Signals

| Signal              | Count             | What It Means                           |
| ------------------- | ----------------- | --------------------------------------- |
| Postinstall scripts | **122** (5.1%)    | Code auto-executes before you review it |
| Typosquat risk      | **4**             | Package name similar to popular package |
| Shell execution     | **725** (30.4%)   | Can run arbitrary commands              |
| Network requests    | **1,269** (53.2%) | Can communicate externally              |
| Filesystem write    | **754** (31.6%)   | Can create/modify files                 |
| Triple threat       | **249** (10.4%)   | Shell + network + filesystem combined   |

**122 packages run code immediately on `npm install`** — before you've even looked at what they do. This is the #1 supply chain attack vector.

---

## Why Traditional Security Tools Miss This

| Capability                  | PanGuard     | CrowdStrike    | Snyk       | Lakera  |
| --------------------------- | ------------ | -------------- | ---------- | ------- |
| AI agent threat detection   | Yes          | No             | No         | Partial |
| MCP skill pre-install audit | Yes          | No             | No         | No      |
| Prompt injection detection  | 21 ATR rules | No             | No         | Yes     |
| Tool poisoning detection    | 11 ATR rules | No             | No         | No      |
| Credential theft via agent  | Yes          | Partial        | No         | No      |
| Runtime agent monitoring    | 24/7         | Endpoints only | No         | No      |
| Cost                        | $0 (MIT)     | $25-60/ep/mo   | Free tier+ | Paid    |

CrowdStrike sees processes and files but has no concept of prompt flows or MCP tool definitions. Snyk scans code dependencies but doesn't understand AI tool semantics. Lakera filters prompts but doesn't scan packages pre-install.

**The AI agent layer is a blind spot for the entire security industry.**

---

## Detection Accuracy

We benchmark ATR rules against the [PINT corpus](https://github.com/Agent-Threat-Rule/agent-threat-rules) — 850 labeled samples of real and synthetic AI agent threats:

| Metric                  | Value     | What It Means                                           |
| ----------------------- | --------- | ------------------------------------------------------- |
| **Precision**           | **99.4%** | When we flag something, it's almost always a real issue |
| **Recall**              | **39.9%** | We catch 40% of threats (conservative by design)        |
| **False Positive Rate** | **0.25%** | 1 in 400 clean packages falsely flagged                 |
| **P50 Latency**         | **3.3ms** | Scanning is instant                                     |

We intentionally tuned for **high precision, lower recall** — a scanner that cries wolf loses trust. We'd rather miss some threats than flood developers with false alarms. The 60% we miss today is why the rules keep growing: every real-world scan finds new patterns we add to ATR.

---

## What This Means For You

If you use Claude Code, Cursor, Codex, OpenClaw, or any MCP-compatible AI agent:

1. **Assume your packages are unaudited.** None of the major platforms currently review MCP packages before installation.

2. **Check what you've installed.** Go to your MCP config and review every package. If you don't recognize one, scan it.

3. **Your credentials may already be compromised.** If you installed any package from an untrusted source, rotate your SSH keys, API tokens, and git credentials. Now.

---

## What We're Doing About It

We believe this ecosystem needs what the App Store brought to mobile apps: **a detection standard.**

### ATR (Agent Threat Rules)

[ATR](https://github.com/Agent-Threat-Rule/agent-threat-rules) is the first open detection standard for AI agent threats. 61 rules across 9 categories, mapping to OWASP LLM Top 10, OWASP Agentic Top 10, and MITRE ATLAS.

It's the Sigma/YARA equivalent for AI agents: YAML-based, machine-readable, community-driven, MIT licensed.

Any security tool can implement ATR. It's not locked to PanGuard.

### PanGuard

[PanGuard](https://github.com/panguard-ai/panguard-ai) is the security platform built on ATR:

- **Scan:** Audit any MCP package in 3 seconds. [Try it online](https://panguard.ai) — paste a GitHub URL and get a report.
- **Guard:** 24/7 runtime monitoring with 61 ATR rules. Auto-blocks threats.
- **Threat Cloud:** Every scan generates threat intelligence shared with the community. One person's discovery protects everyone.

```bash
# Scan your AI agent skills in one command
npm install -g @panguard-ai/panguard
panguard setup
# Auto-detects: Claude Code, Cursor, OpenClaw, Codex, Claude Desktop
```

### The Flywheel

Every scan makes the ecosystem safer:

```
Scan a package --> Find a threat --> Auto-upload to Threat Cloud -->
Community + LLM review --> New ATR rule --> Pushed to all users -->
Next time: blocked before install
```

Currently: 61 bundled rules + 150 community rules from Threat Cloud. Growing daily.

---

## Call to Action

1. **Scan your packages.** Go to [panguard.ai](https://panguard.ai) and paste a GitHub URL. Free. No install needed.

2. **Install PanGuard.** One command: `npm install -g @panguard-ai/panguard && panguard setup`

3. **Contribute ATR rules.** The standard grows with the community. [Contribution guide](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/CONTRIBUTING.md).

4. **Share this report.** Every developer who learns about this problem makes the ecosystem safer.

---

## Full Data

The complete dataset (2,386 packages, 35,858 tools analyzed) is available at:

- Technical report: **[panguard.ai/research/mcp-ecosystem-scan](https://panguard.ai/research/mcp-ecosystem-scan)**
- ATR rules: **[github.com/Agent-Threat-Rule/agent-threat-rules](https://github.com/Agent-Threat-Rule/agent-threat-rules)**
- Raw scan data: **[agent-threat-rules/data/audit-v3-full.json](https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/data/audit-v3-full.json)**

---

_PanGuard AI is 100% free, 100% open source, MIT licensed. Built in Taiwan._

_Follow us: [GitHub](https://github.com/panguard-ai/panguard-ai)_

---

**Tags:** #security #ai #mcp #aiagents #cybersecurity #opensource #claudecode #cursor #codex
