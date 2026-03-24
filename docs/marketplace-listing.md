# MCP Marketplace Listing Guide

## Listing Content (Copy-Paste Ready)

### Short Description (one-liner)
AI agent security scanner — audit MCP skills for threats, monitor agents 24/7, community threat intelligence.

### Long Description
PanGuard scans MCP skills before you install them, catching SSH key exfiltration, prompt injection, credential theft, and supply chain attacks. 11 security tools via MCP: skill auditing, real-time monitoring, code scanning, compliance reports, and more. Powered by ATR (Agent Threat Rules) — an open detection standard with 61 rules and 474 patterns. Free, open source, MIT licensed.

### Tags/Keywords
security, audit, mcp, skill-auditor, threat-detection, guard, monitoring, atr

---

## Platform-Specific Instructions

### 1. Smithery (smithery.ai) — READY

**File created:** `packages/panguard-mcp/smithery.yaml`

**Steps:**
1. Go to https://smithery.ai/new
2. Enter repo URL: `https://github.com/panguard-ai/panguard`
3. Point to `packages/panguard-mcp/` subdirectory
4. Smithery will auto-detect `smithery.yaml`
5. Fill in description and tags
6. Submit

### 2. awesome-mcp-servers (GitHub) — PR Ready

**Target repo:** `punkpeye/awesome-mcp-servers`

**Steps:**
1. Fork: https://github.com/punkpeye/awesome-mcp-servers
2. Add entry under **Security** section:

```markdown
- [PanGuard](https://github.com/panguard-ai/panguard) - AI agent security scanner with skill auditing, 24/7 monitoring, and community threat intelligence. 61 ATR rules, 11 MCP tools.
```

3. Submit PR with title: "Add PanGuard — AI agent security scanner"

### 3. Glama (glama.ai/mcp)

**Steps:**
1. Go to https://glama.ai/mcp/submit (or equivalent submit page)
2. Enter npm package: `@panguard-ai/panguard-mcp`
3. Or GitHub URL: `https://github.com/panguard-ai/panguard`
4. Glama auto-indexes from npm/GitHub

### 4. mcp.so

**Steps:**
1. Go to https://mcp.so/submit
2. Enter GitHub repo URL
3. Fill in category: Security
4. Submit for community review

### 5. PulseMCP (pulsemcp.com)

**Steps:**
1. Go to https://pulsemcp.com/submit
2. Fill in the submission form
3. Include npm install command: `npm install -g @panguard-ai/panguard`

### 6. OpenClaw Hub / Chinese Ecosystem

**SKILL.md already exists:** `packages/panguard-mcp/openclaw-skill/SKILL.md`

**Steps for each OpenClaw fork:**
- OpenClaw: Check their skill marketplace submission process
- QClaw: Similar SKILL.md format
- WorkBuddy: Check their extension format
- NemoClaw: Check their plugin system

**Chinese market notes:**
- Prepare Chinese README for panguard-mcp
- WeChat article about AI agent security (linking to PanGuard)
- Submit to Chinese MCP registries as they emerge

### 7. npm (DONE)

Already published: `@panguard-ai/panguard-mcp@1.3.0`

---

## Tracking Checklist

- [ ] Smithery — submit
- [ ] awesome-mcp-servers — PR
- [ ] Glama — submit
- [ ] mcp.so — submit
- [ ] PulseMCP — submit
- [ ] OpenClaw Hub — research & submit
- [ ] Chinese MCP registries — research & submit
