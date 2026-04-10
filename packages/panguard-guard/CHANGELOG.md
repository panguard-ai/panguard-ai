# Changelog

All notable changes to `@panguard-ai/panguard-guard` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2026-04-11

### Mission realignment

PanguardGuard is now a focused runtime **AI agent security** agent. Legacy
OS-level EDR capabilities (Sigma, YARA, syscall polling, DPI, rootkit
detection, memory scanning) have been removed. For post-compromise OS-level
detection, Guard emits agent events that existing EDR/SIEM tools consume —
Guard does not rebuild EDR inline.

This release aligns PanguardGuard's scope with the ATR (Agent Threat Rules)
standard: the AI agent threat layer (prompt injection, tool poisoning, MCP
abuse, skill compromise, context exfiltration, multi-agent manipulation)
requires fundamentally different detection than OS-level EDR.

### Removed — BREAKING

- **Legacy EDR monitors** (2,300 LOC of source removed, plus 900 LOC of tests):
  - `SyscallMonitor` — `/proc` polling for process/network activity
  - `DpiMonitor` — deep packet inspection
  - `RootkitDetector` — kernel module / LD_PRELOAD / hidden process checks
  - `MemoryScanner` — memory injection scanning
- **Public API exports removed** from `@panguard-ai/panguard-guard`:
  - `DpiMonitor`
  - `RootkitDetector`
  - `createRootkitEvent`
  - `checkLdPreload`
- These monitors were dead code: they were re-exported via `src/index.ts`
  but were never wired into `guard-engine.ts`, and they detected traditional
  malware signals (`nc`, rootkits, port 4444, `ptrace`) that do not match
  any rule in the ATR corpus.

### Changed

- `ARCHITECTURE.md` rewritten around the four AI agent security layers:
  prompt layer, tool call layer, skill / artifact layer, agent behavior
  layer. The `DETECT` stage now documents ATR engine + threat intelligence
  + event correlation (previously listed Sigma + YARA + ATR).
- `PRIVACY.md` — removed the `sigmaRuleMatched` field from the Threat Cloud
  upload field table.
- `src/monitors/index.ts` — barrel now exports only `GitWatcher` (AI skill
  supply chain monitor).
- Test fixtures in `tests/event-correlator.test.ts` and `tests/response.test.ts`
  updated from legacy `sigma-*` / `YARA match` strings to `atr-*` / `ATR match`.
- Benchmark comments (`benchmarks/memory.bench.ts`,
  `benchmarks/rule-matching.bench.ts`) cleaned up.

### Migration guide

If you were importing any of the removed symbols:

```ts
// Before (v1.x)
import { DpiMonitor, RootkitDetector } from '@panguard-ai/panguard-guard';

// After (v2.0)
// These symbols no longer exist. For OS-level detection, integrate with
// your existing EDR (CrowdStrike, SentinelOne, Microsoft Defender) and
// consume Guard's agent events via SIEM correlation.
```

The remaining `monitors/` surface is `GitWatcher` — the skill / artifact
supply chain monitor — which is AI-agent-aligned (detects skill poisoning,
secret exposure in commits) and is kept.
