# Architecture

Technical architecture of the Panguard AI platform. For product-level documentation, see the [README](README.md).

---

## System Overview

```
                              User
                               |
                 +-------------+-------------+
                 |                           |
           [CLI: panguard]           [panguard.ai]
            22 commands              Next.js 14
                 |                   EN + zh-TW
                 |
   +------+------+------+------+------+------+------+
   |      |      |      |      |      |      |      |
 Scan  Guard   Chat   Trap  Report   MCP   Skill    ATR
        |                                  Auditor  Standard
        |
   Guard Detection Pipeline
   Detect -> Analyze -> Respond -> Report
        |
   +------------+------------+
   |            |            |
 Layer A     Layer B      Layer C
 ATR regex   Heuristics   Semantic LLM
 + AST                    (advisory, opt-in)
 652 rules
 v3.5.0
        |
   Threat Cloud
   Collective defense (opt-in, off by default)
        |
   Manager (optional)
   Up to 500 agents
```

---

## Package Dependency Graph

```
@panguard-ai/panguard (CLI)
  |-- @panguard-ai/core
  |-- @panguard-ai/panguard-scan
  |-- @panguard-ai/panguard-guard
  |     |-- @panguard-ai/core
  |     |-- @panguard-ai/panguard-trap
  |     |-- @panguard-ai/security-hardening
  |     |-- agent-threat-rules
  |-- @panguard-ai/panguard-chat
  |-- @panguard-ai/panguard-trap
  |-- @panguard-ai/panguard-report
  |-- @panguard-ai/panguard-auth
  |-- @panguard-ai/panguard-mcp
  |     |-- @panguard-ai/panguard-scan
  |     |-- @panguard-ai/panguard-guard
  |     |-- @panguard-ai/panguard-skill-auditor
  |-- @panguard-ai/panguard-skill-auditor
  |     |-- @panguard-ai/panguard-scan
  |     |-- @panguard-ai/core
  |-- @panguard-ai/manager
  |-- @panguard-ai/threat-cloud
  |-- @panguard-ai/security-hardening
```

**Foundation layer:** `@panguard-ai/core` is imported by every package. It provides rules engine, monitor engine, AI/LLM interface, discovery engine, scoring, i18n, and CLI utilities.

---

## Three-Layer Detection Pipeline

All events pass through a layered detection pipeline. The deterministic core
(Layer A + Layer B) is always on and can block; the semantic layer (Layer C) is
advisory-only and opt-in.

```
                    Event Stream
                         |
              +----------+----------+
              |                     |
         Layer A: ATR rules    (no match)
         652 ATR rules v3.5.0       |
         regex / AST           Layer B: Heuristics
         deterministic         behavioral / anomaly
         always on, can block  deterministic
              |                always on, can block
              |                     |
         (matched)            (uncertain, opt-in)
              |                     |
              |               Layer C: Semantic LLM
              |               bring-your-own key
              |               advisory only,
              |               never auto-blocks
              |                     |
              +----------+----------+
                         |
                  Response Engine
                  Block / Alert / Log
```

**Deterministic core:** Layer A (ATR regex/AST) and Layer B (heuristics) are the
always-on deterministic core and are the only layers that can block. They run
fully offline with no network dependency.

**Semantic layer (Layer C):** Off by default. When enabled, it requires the
user's own LLM API key and produces advisory signals only -- it never
auto-blocks. Disabling it leaves the deterministic core fully functional.

---

## Guard: 4-Agent Pipeline

The Guard engine processes events through four specialized agents:

```
Event -> [Detect Agent] -> [Analyze Agent] -> [Respond Agent] -> [Report Agent]
             |                   |                  |                  |
        Rule matching       AI classification   Auto-response     Logging
        Baseline check      Root cause analysis  IP blocking       Evidence
        ATR evaluation      Confidence scoring   Process kill      Compliance
        Anomaly detection   Investigation        Quarantine        Baseline update
```

**Learning Mode (first 7 days):**

- Detect Agent collects events and builds a behavioral baseline
- No auto-responses during learning (alert-only)
- After baseline established, switches to protection mode

**Protection Mode:**

- Deviations from baseline trigger analysis
- Confidence > 90%: auto-respond
- Confidence 70-90%: ask user with evidence
- Confidence < 70%: log and notify

---

## ATR Rule Architecture

ATR (Agent Threat Rules) is a YAML-based detection format for AI agent threats.
Panguard ships ATR v3.5.0 -- 652 rules across 10 categories -- bundled and
immutable at install time:

```
rules/
  prompt-injection/
  tool-poisoning/
  context-exfiltration/
  agent-manipulation/
  privilege-escalation/
  excessive-autonomy/
  skill-compromise/
  data-poisoning/
  model-security/
  ...                      # 10 categories, 652 rules total (v3.5.0)
```

Each rule contains:

- Detection patterns (regex, keyword, behavioral)
- True positive and true negative test cases
- Evasion tests (honestly documenting known bypasses)
- OWASP and MITRE ATLAS mappings
- Severity calibration and response actions

ATR rules are loaded by the Guard engine's ATR Engine as the deterministic Layer A. Rules are bundled and immutable at install; rule updates are notify-only and are never fetched and auto-applied over the network.

---

## Threat Cloud Data Flow (opt-in, off by default)

Collective defense is opt-in and off by default. Nothing leaves the user's
machine unless they explicitly enable it. `pga scan` is always forced
`--no-report`.

```
Your Machine                    Threat Cloud                   Other Users
     |                               |                              |
  Threat detected              Receives anonymized            Notified of
  (collective defense          threat signature               candidate rule
   explicitly enabled)               |                              |
     |                         Validate + deduplicate         Review and
  Anonymize                          |                        upgrade on their
  (strip all PII,              Generate candidate rule        own schedule
   keep only pattern)                |                        (notify-only,
     |                         Consensus check                 no auto-apply)
  Upload via TLS 1.3           (3+ clients confirm)                 |
     +--------->                     |                         Protection
                               Promote to stable               active
                                     |
                               Publish update
                                     +---------->
```

**Privacy guarantees:**

- Collective defense is opt-in and off by default
- Only anonymized threat signatures leave your machine, and only after you opt in
- Zero raw data, zero telemetry, zero source code
- TLS 1.3 encrypted transport
- Community tier works fully offline with collective defense disabled

**Rule updates are notify-only:** Bundled rules are immutable at install. When a
newer rule set is published, Panguard notifies the user; updates are never
fetched and applied automatically over the network. (The 1.6.1 security fix
removed live network auto-apply of rules.)

---

## MCP Integration

Panguard exposes 11 tools via the Model Context Protocol (MCP):

| Tool                       | Description                                 |
| -------------------------- | ------------------------------------------- |
| `panguard_scan`            | System security health check (quick/full)   |
| `panguard_scan_code`       | SAST scanning for vulnerabilities           |
| `panguard_guard_start`     | Launch threat monitoring daemon             |
| `panguard_guard_stop`      | Shutdown monitoring                         |
| `panguard_status`          | Multi-service status check                  |
| `panguard_alerts`          | Recent security alerts with severity filter |
| `panguard_block_ip`        | Manual IP blocking (1h/24h/permanent)       |
| `panguard_generate_report` | PDF compliance report generation            |
| `panguard_init`            | Non-interactive initialization              |
| `panguard_deploy`          | Full deployment pipeline                    |
| `panguard_audit_skill`     | AI agent skill security audit               |

**Platform auto-detection:** `panguard setup` detects installed AI agent platforms (Claude Code, Cursor, OpenClaw, Codex, WorkBuddy, NemoClaw, Claude Desktop) and injects MCP configuration automatically.

---

## Deployment Topologies

### Single Machine (default)

```
[Guard] + [Dashboard] + [Threat Cloud Client]
  All on one machine. Dashboard on localhost:3100.
```

### Distributed via Manager

```
[Guard Agent 1] --+
[Guard Agent 2] --+--> [Manager] --> [Threat Cloud]
[Guard Agent N] --+    Correlates threats across agents
                       Up to 500 agents
                       Policy distribution
                       Real-time dashboard relay
```

### Docker

```bash
docker compose up    # Panguard + Ollama (local AI)
```

Multi-stage Dockerfile: Node 22 build + standalone runtime. Published to `ghcr.io`.

### Website

Vercel deployment. Next.js 14 with ISR. Bilingual (EN + zh-TW).

---

## Package Inventory

| Package                | npm Name                            | Version | Maturity | Description                                              |
| ---------------------- | ----------------------------------- | ------- | -------- | -------------------------------------------------------- |
| core                   | @panguard-ai/core                   | 0.3.3   | GA       | Shared foundation: rules, AI, monitor, discovery, i18n   |
| panguard               | @panguard-ai/panguard               | 0.3.3   | GA       | Unified CLI with 22 commands                             |
| atr                    | agent-threat-rules                  | 3.5.0   | RFC      | Open detection standard for AI agent threats (652 rules) |
| panguard-scan          | @panguard-ai/panguard-scan          | 0.2.0   | GA       | 60-second security scanning                              |
| panguard-guard         | @panguard-ai/panguard-guard         | 0.2.0   | GA       | Real-time monitoring, 4-agent pipeline                   |
| panguard-chat          | @panguard-ai/panguard-chat          | 0.2.0   | GA       | 6-channel notification system                            |
| panguard-trap          | @panguard-ai/panguard-trap          | 0.2.0   | GA       | 8 honeypot service types                                 |
| panguard-report        | @panguard-ai/panguard-report        | 0.2.0   | GA       | Compliance reports (CMA, ISO 27001, SOC 2)               |
| panguard-mcp           | @panguard-ai/panguard-mcp           | 0.1.0   | Beta     | MCP server with 11 tools                                 |
| panguard-skill-auditor | @panguard-ai/panguard-skill-auditor | 0.1.1   | Beta     | 7-check skill security analysis                          |
| panguard-auth          | @panguard-ai/panguard-auth          | 0.2.0   | GA       | Auth, session management, usage metering                 |
| manager                | @panguard-ai/manager                | 0.2.0   | GA       | Distributed agent orchestration (500 max)                |
| threat-cloud           | @panguard-ai/threat-cloud           | 0.2.0   | GA       | Collective threat intelligence backend                   |
| panguard-web           | @panguard-ai/panguard-web           | 0.2.0   | GA       | Website content engine                                   |
| security-hardening     | @panguard-ai/security-hardening     | 0.1.1   | GA       | Security policy enforcement                              |
| website                | @panguard-ai/website                | 0.2.0   | GA       | Next.js 14 marketing site (39 pages)                     |

**Maturity levels:** GA = Generally Available, Beta = Feature complete but evolving, RFC = Request for Comments (open standard)

---

## CI/CD

| Workflow              | Trigger     | Purpose                                                 |
| --------------------- | ----------- | ------------------------------------------------------- |
| ci.yml                | push/PR     | Lint, format, typecheck, test with coverage             |
| deploy.yml            | push main   | Deploy website (Vercel) + backend (Docker)              |
| publish.yml           | release tag | Publish packages to npm                                 |
| threat-intel-sync.yml | scheduled   | Refresh server-side threat intel (no client auto-apply) |
| installer-e2e.yml     | event       | E2E testing for installer                               |
| cli-smoke.yml         | event       | CLI smoke tests                                         |
| release.yml           | manual      | Create GitHub releases                                  |
