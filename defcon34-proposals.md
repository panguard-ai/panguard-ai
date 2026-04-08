# DEF CON 34 Submission Proposals

## CFP Details Summary

### Main Stage (Briefings) CFP
- **URL**: https://defcon.org/html/defcon-34/dc-34-cfp.html
- **Submission system**: OpenConf
- **Deadline**: May 1, 2026, Midnight UTC
- **Time slots**: 20 min, 45 min, or 75 min (rare, panels)
- **Format**: Text or PDF, attach via OpenConf
- **Supporting materials**: mp4, pptx, pdf, txt, zip, or links to code/videos
- **Final abstract + bio for print**: Due June 15, 2026, Midnight UTC
- **Final slides + tools + references**: Due July 15, 2026, Midnight UTC
- **Contact**: talks@defcon.org

### Demo Labs CFP
- **URL**: https://defcon.org/html/defcon-34/dc-34-cfi.html (call index page)
- **Deadline**: May 1, 2026, Midnight UTC (same as CFP based on historical pattern)
- **Format**: Plain text in the body of an email to demolab@defcon.org
- **Requirement**: Tool MUST be open source. No sales pitches.
- **Contact**: demolab@defcon.org

### Demo Labs Submission Fields
- Presenter Name + Co-presenter (max 1)
- Tool/Project Name
- Short Abstract (1-2 paragraphs)
- Short Developer Bio (1 paragraph per presenter)
- URL to additional info
- Detailed Explanation of Tool (4-5 paragraphs)
- Link to code repository
- Level of development (early / prototype / solid / mature)
- Target audience (Offense / Defense / AppSec / Mobile / Hardware)

### Conference
- **Dates**: August 6-9, 2026
- **Venue**: Las Vegas Convention Center

---

## PROPOSAL A: Main Stage Talk (45 minutes)

### Title

108 Rules, 36,000 Skills, 3 CVEs: Building an Open Detection Standard for AI Agent Threats

### Abstract

AI agents are being handed credentials, file system access, and code execution capabilities through protocols like MCP (Model Context Protocol) and SKILL.md manifests. The security community has no shared language for detecting when these capabilities are being abused. We built one.

ATR (Agent Threat Rules) is an open-source detection standard -- 108 regex-based rules across 9 threat categories -- designed to catch prompt injection, tool poisoning, credential theft, data exfiltration, and privilege escalation in AI agent workflows. We scanned 36,394 MCP skill definitions in the wild and found 182 CRITICAL and 1,124 HIGH severity issues. Three of those findings contributed to CVEs disclosed in the past two weeks (CVE-2026-25536, CVE-2026-23744, CVE-2026-5023).

This talk covers:

1. **The attack surface nobody is watching.** MCP servers and skill manifests are the new config files -- except they grant arbitrary tool access to LLMs. We walk through real-world examples of tool poisoning, shadow instructions in skill descriptions, and cross-server data exfiltration found in production skill registries.

2. **How ATR works.** A three-layer detection architecture: fast regex gates (99.7% precision, sub-millisecond), LLM-assisted crystallization of novel attack patterns into new rules, and semantic analysis for attacks that evade string matching. We explain why regex is not a limitation but a deliberate design choice for the first gate, and where LLMs take over.

3. **The 36,394-skill scan.** Methodology, tooling, and findings from scanning two major skill registries (ClawHub and Skills.sh). Categories of real threats found: hidden `curl` exfiltration in tool descriptions, base64-encoded payloads, filesystem traversal instructions, and credential harvesting patterns.

4. **The 5-minute rule flywheel.** When a new attack pattern is detected, ATR crystallizes it into a distributable rule in under 5 minutes -- from raw adversarial sample to tested regex to pushed update. We demonstrate this live, including the precision validation step that prevents false positive proliferation.

5. **Enterprise adoption signal.** Cisco AI Defense merged 34 ATR rules into their skill-scanner (PR #79). We discuss what it means when a Fortune 500 security product consumes community-driven detection rules as upstream, and the implications for open-source security standards in the AI agent space.

We release all tools, rules, scan data, and the benchmark harness used in this research.

### Outline (45-minute slot)

- [0-5 min] The AI agent threat model: why MCP and skill manifests are the new attack surface
- [5-12 min] Live demo: injecting a malicious tool description and watching it execute
- [12-20 min] ATR architecture deep-dive: regex layer, crystallization pipeline, semantic layer
- [20-28 min] The 36K-skill scan: methodology, toolchain, and worst findings
- [28-33 min] CVE walkthrough: three real vulnerabilities from detection to disclosure
- [33-38 min] Live demo: 5-minute rule crystallization from novel attack to deployed rule
- [38-43 min] Enterprise implications: open detection standards vs. proprietary threat intel
- [43-45 min] Q&A

### Why DEF CON Should Accept This Talk

- **Novel attack surface**: AI agent tool ecosystems (MCP, SKILL.md) are growing exponentially but have near-zero security tooling. 60 MCP CVEs in 60 days. 38% of MCP servers have zero authentication.
- **Original research**: 36,394-skill scan is the largest public audit of AI agent skill registries to date.
- **Actionable output**: Every attendee walks away with an open-source detection engine they can deploy immediately. Not a framework. Not a checklist. Running code.
- **Demonstrated impact**: Cisco AI Defense adoption, 3 CVEs, 23,000+ npm downloads, OWASP coverage mapping (Agentic Top 10: 10/10, SAFE-MCP: 91.8%).
- **No vendor pitch**: ATR is MIT-licensed, community-governed, and has no commercial dependencies.

### Speaker Bio

[Your Name] is the founder of PanGuard, an open-source AI agent security project. A cross-disciplinary builder with a background in sales, marketing (300M+ impressions on Threads), and hip-hop event production, they pivoted to security after recognizing that AI agents were being deployed with the same trust assumptions as static APIs -- an assumption that breaks catastrophically when the agent can execute arbitrary tools.

Self-taught developer. Built ATR from scratch: 108 detection rules, a three-layer scanning engine, and a threat crystallization pipeline. The project has been adopted by Cisco AI Defense, scanned 36,394+ MCP skills, and contributed to 3 CVEs. 50 published versions. 23,000+ npm downloads. No VC funding. No team. Just the work.

### Supporting Materials

- GitHub: https://github.com/panguard-ai/agent-threat-rules (MIT license)
- npm: @panguard-ai/core, @panguard-ai/panguard (23,000+ downloads)
- Scan dataset: 36,394 MCP skills, 91,226 SKILL.md manifests
- Benchmark: PINT adversarial MCP benchmark (62.7% recall, 99.7% precision)
- Paper: Zenodo DOI 10.5281/zenodo.19178002
- CVEs: CVE-2026-25536, CVE-2026-23744, CVE-2026-5023

---

## PROPOSAL B: Demo Labs (Tool Demo)

### To: demolab@defcon.org
### Subject: DEF CON 34 Demo Labs Submission: ATR -- Agent Threat Rules

**Presenter Name:** [Your Name]
**Co-presenter:** None
**Tool/Project Name:** ATR (Agent Threat Rules)

**Short Abstract:**

ATR is an open-source detection engine for AI agent security threats. It scans MCP (Model Context Protocol) tool definitions and SKILL.md skill manifests for prompt injection, tool poisoning, credential theft, data exfiltration, and privilege escalation. 108 rules across 9 threat categories. We used it to scan 36,394 MCP skills and found 182 CRITICAL / 1,124 HIGH severity issues, contributing to 3 CVEs. Cisco AI Defense merged 34 ATR rules into their production scanner. The engine runs as a CLI, npm library, or CI/CD GitHub Action.

**Short Developer Bio:**

[Your Name] is a self-taught developer and founder of the PanGuard open-source AI agent security project. Background in sales, marketing (300M+ Threads impressions), and cultural production before pivoting to security tooling. Built ATR from scratch -- 108 detection rules, a three-layer scanning architecture, and a novel threat crystallization pipeline that converts new attack patterns into distributable rules in under 5 minutes. The project has 23,000+ npm downloads, adoption by Cisco AI Defense, and contributions to 3 MCP CVEs.

**URL to Additional Information:**

https://github.com/panguard-ai/agent-threat-rules

**Detailed Explanation of Tool:**

ATR (Agent Threat Rules) is an open-source detection standard and scanning engine purpose-built for the AI agent ecosystem. As AI agents gain access to tools, file systems, databases, and external APIs through protocols like MCP and SKILL.md, the attack surface has exploded -- but detection tooling has not kept pace. ATR fills that gap.

The engine implements a three-layer detection architecture. The first layer is a set of 108 regex-based rules organized into 9 threat categories: prompt injection, tool poisoning, credential theft, data exfiltration, privilege escalation, resource abuse, persistence mechanisms, supply chain attacks, and cross-origin violations. This layer runs in sub-millisecond time and achieves 99.7% precision on the PINT adversarial benchmark. It is deliberately regex-first: the goal is a fast, deterministic first gate that eliminates the vast majority of threats before any LLM processing is needed.

The second layer is the crystallization pipeline. When the engine encounters a novel attack pattern that partially matches existing rules or triggers heuristic signals, it can invoke an LLM to analyze the pattern, extract the signature, and generate a new rule. This rule is then precision-tested against a validation corpus before being added to the ruleset. The full cycle -- from novel adversarial sample to tested, deployable rule -- takes under 5 minutes. This is the core of the ATR flywheel: every scan produces potential new rules, which improve future scans.

The third layer handles semantic attacks that cannot be caught by string matching: obfuscated instructions, multi-step social engineering embedded in tool descriptions, and context-dependent exploitation. This layer uses LLM judgment with structured evaluation criteria and is designed to run selectively on samples that pass the regex gate but exhibit suspicious structural properties.

We have used ATR to conduct the largest public scan of AI agent skill registries to date: 36,394 MCP skills from ClawHub and 91,226 skill manifests from Skills.sh. The scan identified 182 CRITICAL and 1,124 HIGH severity issues, including hidden data exfiltration commands in tool descriptions, base64-encoded payloads, filesystem traversal instructions, and credential harvesting patterns. Three of these findings contributed to disclosed CVEs (CVE-2026-25536, CVE-2026-23744, CVE-2026-5023).

ATR is distributed as an npm package (@panguard-ai/core), a CLI tool, and a GitHub Action for CI/CD integration. It supports scanning both MCP server definitions and SKILL.md manifests. The project is MIT-licensed with 23,000+ npm downloads across 11 packages. Cisco AI Defense has merged 34 ATR rules into their production skill-scanner (PR #79), providing enterprise validation of the detection standard. At the demo, attendees will be able to scan their own MCP configurations and SKILL.md files in real time and see the detection results.

**Link to Code Repository:**

https://github.com/panguard-ai/agent-threat-rules

**Level of Development:**

Solid and working. 50 published npm versions. Production use by Cisco AI Defense. Active development with weekly releases.

**Target Audience:**

Defense, AppSec

---

## Submission Checklist

### Before May 1, 2026 Midnight UTC:

**Main Stage (OpenConf):**
- [ ] Create OpenConf account at defcon.org
- [ ] Submit abstract + outline as text/PDF
- [ ] Attach supporting materials (scan data, benchmark results)
- [ ] Select 45-minute time slot
- [ ] Include links to GitHub repo, npm, CVEs, paper DOI

**Demo Labs (Email):**
- [ ] Send plain-text email to demolab@defcon.org
- [ ] Include all required fields (above)
- [ ] No attachments, no PDFs -- body text only
- [ ] Verify GitHub repo is public and README is current

### After Acceptance:
- [ ] Final abstract + bio for print materials: June 15, 2026
- [ ] Final slides + tools + references: July 15, 2026
- [ ] Prepare live demo environment (offline-capable)
- [ ] Update ATR rule count and scan numbers to latest
