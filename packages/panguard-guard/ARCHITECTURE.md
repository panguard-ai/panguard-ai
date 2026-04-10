# PanguardGuard Architecture

PanguardGuard is a runtime AI agent security agent. Unlike traditional EDR
(which watches OS-level behavior like syscalls, rootkits, and network packets),
Guard monitors the layers where AI agents actually get attacked:

- **Prompt layer** — prompt injection, jailbreaks, system prompt exfiltration
- **Tool call layer** — tool poisoning, unauthorized invocation, MCP response tampering
- **Skill / artifact layer** — skill poisoning via git, skill hijacking, supply chain attacks
- **Agent behavior layer** — excessive autonomy, context exfiltration, multi-agent manipulation

All detection runs against **ATR (Agent Threat Rules)** — an open-source
standard of 100+ AI-specific attack patterns maintained at
[github.com/Agent-Threat-Rule/agent-threat-rules](https://github.com/Agent-Threat-Rule/agent-threat-rules).

## Detection Pipeline

PanguardGuard processes security events through a 5-stage pipeline:

```
SecurityEvent
    |
    v
[1. DETECT] ---- ATR rule engine + threat intelligence + event correlation
    |
    v
[2. ANALYZE] --- LLM-powered threat analysis (optional)
    |
    v
[3. RESPOND] --- Auto-block, alert, quarantine, kill agent
    |
    v
[4. REPORT] ---- Log to audit trail, anonymize for upload
    |
    v
[5. UPLOAD] ---- Anonymized threat data to Threat Cloud (opt-out available)
```

### Stage 1: Detect

The detection stage uses the ATR rule engine, threat intelligence feeds, and
sliding-window event correlation.

| Source               | Purpose                                            | Count |
| -------------------- | -------------------------------------------------- | ----- |
| **ATR**              | AI agent attack patterns (bundled + user rules)    | 109+  |
| **Threat intel**     | IP / domain / hash reputation feeds                | -     |
| **Event correlator** | Sliding-window attack chain detection (T1110/T1046 style) | -     |

ATR rules cover: prompt injection, tool poisoning, context exfiltration,
agent manipulation, privilege escalation, excessive autonomy, skill compromise,
MCP abuse, and multi-agent attacks.

### Stage 2: Analyze

When an LLM provider is configured (local Ollama, Claude, or OpenAI), the
AnalyzeAgent evaluates detections against the environment baseline to determine
threat severity, MITRE ATT&CK mapping, and confidence score. This is optional
— Guard runs rule-only in offline mode.

### Stage 3: Respond

The RespondAgent executes response actions based on threat verdict:

- `block_input` / `block_output` — Block malicious I/O
- `block_tool` — Prevent tool execution
- `alert` — Notify operators
- `quarantine_session` — Isolate agent session
- `kill_agent` — Terminate agent process
- `snapshot` — Capture session state for forensics
- `escalate` — Escalate to human reviewer

Real response primitives live in `src/response/`:
`process-killer.ts`, `file-quarantine.ts`, `ip-blocker.ts`.

### Stage 4: Report

Every event is logged to an append-only audit trail (`events.jsonl`).
For non-benign events, anonymized threat data is generated for Threat Cloud
upload. See `PRIVACY.md` for the exact fields and anonymization rules.

### Stage 5: Upload

Anonymized data is batched (50 events/batch) and uploaded to Panguard Threat
Cloud. Fully opt-out: use `--no-telemetry` to disable.

Threat Cloud aggregates reports across installations, runs LLM-assisted
pattern extraction, and crystallizes new ATR rule candidates that flow back
into the public ATR repository.

## Graceful Degradation

PanguardGuard operates at 4 levels depending on available resources:

| Level  | Available            | Detection              | Analysis       | Response       |
| ------ | -------------------- | ---------------------- | -------------- | -------------- |
| **L1** | Rules only (offline) | ATR rules              | Rule-based     | Auto-block     |
| **L2** | + LLM provider       | ATR + LLM triage       | LLM-powered    | Full           |
| **L3** | + Threat Cloud       | + community rule sync  | + threat intel | + IP blocklist |
| **L4** | + Manager            | + distributed events   | + cross-node   | + coordinated  |

The system never fails silently. If a component is unavailable, it logs the
degradation and continues with available capabilities.

## ATR Integration

ATR (Agent Threat Rules) provides detection for AI-specific threats.
The `GuardATREngine` wrapper converts `SecurityEvent` objects into `AgentEvent`
format and evaluates them against ATR rules.

```
SecurityEvent.source mapping:
  agent_input / llm_input     -> AgentEvent type: llm_input
  agent_output / llm_output   -> AgentEvent type: llm_output
  tool_call / function_call   -> AgentEvent type: tool_call
  tool_response / mcp_response -> AgentEvent type: tool_response
  agent_behavior              -> AgentEvent type: agent_behavior
  multi_agent                 -> AgentEvent type: multi_agent_message
```

ATR matches flow through the same Analyze → Respond → Report pipeline as any
other detection source.

## Key Files

```
src/
  guard-engine.ts            # Main pipeline orchestrator
  engines/
    atr-engine.ts            # ATR rule engine wrapper (SecurityEvent -> AgentEvent)
    atr-drafter.ts           # TC-driven ATR rule drafting
    skill-watcher.ts         # Skill artifact change watcher
    skill-whitelist.ts       # Skill allow-list enforcement
  agent/
    detect-agent.ts          # Stage 1: ATR rule matching + correlation
    analyze-agent.ts         # Stage 2: LLM analysis
    respond-agent.ts         # Stage 3: Response execution
    report-agent.ts          # Stage 4: Logging + anonymization
  monitors/
    git-watcher.ts           # Git repo watcher (skill poisoning, secret exposure)
  response/
    process-killer.ts        # Terminate agent processes (protected-list aware)
    file-quarantine.ts       # Quarantine compromised artifacts
    ip-blocker.ts            # OS-level IP blocking
  correlation/
    event-correlator.ts      # Sliding-window attack chain detection
  investigation/
    llm-planner.ts           # LLM-driven incident investigation planner
  threat-cloud/
    index.ts                 # Threat Cloud client (upload + fetch)
  cli/
    index.ts                 # CLI entry point
```
