# Panguard AI

AI-powered security for agents and servers — detect threats in real-time, on-device, with 675+ open-source detection rules.

## Features

- **Guard Daemon** — Real-time endpoint monitoring with automatic threat response
- **Local Dashboard** — Zero-telemetry security control center running on your machine
- **675+ Detection Rules** — ATR (Agent Threat Rules) community-driven, LLM-reviewed standards
- **MCP Proxy** — Transparent tool-call evaluation for Claude, Cursor, and other AI agents
- **Skill Auditor** — Pre-deployment security audit for AgentSkills and OpenClaw
- **100% Free & Open Source (MIT)** — All features available in Community

## Quick Start

```bash
npm install -g @panguard-ai/panguard
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
3. **Detection Rules** — Based on ATR (Agent Threat Rules), an open standard with 675+ rules
4. **MCP Integration** — Proxy tool calls through ATR before execution
5. **Skill Auditor** — Analyze SKILL.md files for vulnerabilities

## Links

- **Website**: https://panguard.ai
- **ATR Standard**: https://github.com/agent-threat-rules/agent-threat-rules
- **GitHub**: https://github.com/panguard-ai/panguard-ai
- **License**: MIT
