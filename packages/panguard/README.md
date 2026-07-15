# Panguard AI

AI-powered security for agents and servers — detect threats in real-time, on-device, with hundreds of open-source ATR detection rules (updated continuously).

## Features

- **Guard Daemon** — Real-time endpoint monitoring; blocks high-confidence threats (critical / high-stable) in the default guarded posture and advises on the rest (`--enforce` to block on every matched verdict, `--advisory` to detect-only). OS-level responses (block IP / isolate file / kill process) are off by default and require arming + elevated privileges.
- **Local Dashboard** — Zero-telemetry security control center running on your machine
- **Hundreds of Detection Rules** — ATR (Agent Threat Rules), a community-driven, LLM-reviewed open standard, updated continuously
- **MCP Proxy** — Transparent tool-call evaluation for Claude, Cursor, and other AI agents
- **Skill Auditor** — Pre-deployment security audit for AgentSkills and OpenClaw
- **100% Free & Open Source (MIT)** — Every Community feature is free forever. Cryptographic rule signing and SOC 2 evidence are Enterprise-only.

## Quick Start

```bash
npm install -g panguard
# or run without installing:
npx @panguard-ai/panguard

# Start the guard + dashboard
pga up

# Scan your skills before deploying
pga scan

# Run interactive menu
pga
```

## What It Does

1. **Guard** — Runs as a daemon, monitoring for malicious agent behavior (prompt injection, data exfiltration, unauthorized access)
2. **Dashboard** — Local web interface showing live threats, rules, and enforcement policies
3. **Detection Rules** — Based on ATR (Agent Threat Rules), an open standard with hundreds of continuously-updated rules
4. **MCP Integration** — Proxy tool calls through ATR before execution
5. **Skill Auditor** — Analyze SKILL.md files for vulnerabilities

## Links

- **Website**: https://panguard.ai
- **ATR Standard**: https://github.com/Agent-Threat-Rule/agent-threat-rules
- **GitHub**: https://github.com/panguard-ai/panguard-ai
- **License**: MIT
