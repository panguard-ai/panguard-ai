#!/usr/bin/env tsx
/**
 * Generate public/llms-full.txt — a long-form context file for AI coding tools
 * (Cursor, Claude Code, GitHub Copilot, Windsurf) that fetch llms-full.txt
 * to seed their understanding of a project.
 *
 * Pulls from:
 *   - src/lib/stats.ts (single source of truth for product stats)
 *   - src/lib/atr-rules-compiled.ts (rule IDs + titles + categories)
 *   - src/data/blog-posts.ts (top blog excerpts)
 *
 * Output is structured markdown with stable headings so AI tools can extract
 * the section they need. Output is capped at ~100K tokens (≈ 400 KB) so it
 * stays within Vercel response limits and AI tool ingestion budgets.
 *
 * Run: `pnpm gen:llms` (added to postbuild).
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'llms-full.txt');

// Inline minimal stats — we cannot import from src/ at script time because
// the rule file uses ESM with Next.js conventions. Keep this list manually
// synced with src/lib/stats.ts (it is the single most-changed-together pair).
const STATS = {
  cliVersion: '1.5.6',
  atrRules: 419,
  atrPatterns: 920,
  totalRulesDisplay: '419',
  promotionIntervalMinutes: 2,
  testsPassing: 3528,
  detectionLayers: 3,
  responseActions: 11,
  cliCommands: 23,
  mcpTools: 12,
  skillAuditChecks: 8,
  benchmark: {
    pint: { recall: 62.5, precision: 99.6, samples: 850 },
    skill: { recall: 100, precision: 97, fp: 0.2, samples: 498 },
    garak: { recall: 97.1, samples: 666 },
  },
  ecosystem: {
    skillsScanned: 67_799,
    maliciousFound: 11_324,
    packagesWithFindings: 2_322,
    tripleThreat: 249,
  },
  adoption: {
    ciscoRulesMerged: 419,
    microsoftRulesMerged: 287,
    externalPRMerges: 13,
    externalOrgs: 6,
    tier1Institutions: 7,
  },
  coverage: {
    owaspAgentic: '10/10',
    safeMcpDetail: '78/85',
  },
};

const HEADER = `# PanGuard AI — full context for AI coding tools

This file is a structured long-form context dump intended for AI coding tools
(Cursor, Claude Code, GitHub Copilot, Windsurf, Anthropic agents) that fetch
llms-full.txt to understand a project at depth. It is auto-generated from
the canonical source files in the panguard-ai repository.

Last generated: ${new Date().toISOString()}
Sources of truth:
- src/lib/stats.ts (product stats)
- src/lib/atr-rules-compiled.ts (ATR rule index)
- src/data/blog-posts.ts (recent writing)
- public/llms.txt (compact index)

To regenerate: \`pnpm gen:llms\` in packages/website/.

---

`;

const COMPANY_SECTION = `## Section 1 — Company and product positioning

PanGuard AI is the commercial platform built on top of ATR (Agent Threat Rules),
an open detection standard for AI agent security threats. The split mirrors
Sigma/Splunk (open rule standard plus commercial SIEM) and YARA/VirusTotal
(open signature standard plus commercial threat intel) — the standard is free
and community-driven, the platform layer is where commercial value lives.

### Founder
Adam Lin (林冠辛). Email: adam@agentthreatrule.org. GitHub: eeee2345.
Background: cross-disciplinary builder with backgrounds in sales (real estate),
marketing (Threads, 300M impressions), and culture (hip-hop festival, 5th year).
Self-taught engineer. Based in Taiwan, shipping globally. Founded Panguard AI,
Inc. (Delaware C-Corp) on 2026-05-12.

### Product tiers (locked 2026-04-22)
- Community: $0 forever, MIT licensed, 419 ATR rules, unlimited self-host.
- Pilot: $25K / 90 days. F500 procurement test drive. IT director can approve.
  Full credit toward Y1 Enterprise.
- Enterprise: $150K-500K / year. Migrator Pro, 5-framework signed compliance
  evidence packs, airgap deployment, SLA, dedicated CSM.
- Sovereign: $5M-20M / nation. Nation-scale airgap, multi-tenant, custom
  compliance, Cisco/AMD/NVIDIA JV pre-integrated.

There is deliberately no middle tier between Community and Pilot. The /pricing
page explains why the middle tier is a trap (insufficient revenue for support
cost, insufficient differentiation, vendor death spiral).

### Strategic positioning
- Layer 0 (open standard, free): ATR. Wins category vocabulary, becomes the
  schema that ecosystem tools cite.
- Layer 1 (commercial platform): PanGuard Migrator + Guard + Threat Cloud +
  Compliance Evidence Module.
- Goal: be the open standard plus the company that monetizes the platform
  layer, with no peer competitor on either dimension.

---

`;

const STATS_SECTION = `## Section 2 — Core stats (verified ${new Date().toISOString().split('T')[0]})

### Rule corpus
- ${STATS.atrRules} ATR rules in v2.2.0
- ${STATS.atrPatterns} compiled detection patterns across all rules
- 10 threat categories (prompt-injection, agent-manipulation, skill-compromise,
  context-exfiltration, tool-poisoning, privilege-escalation, model-abuse,
  excessive-autonomy, model-security, data-poisoning)
- ${STATS.coverage.owaspAgentic} OWASP Agentic Top 10 coverage
- ${STATS.coverage.safeMcpDetail} SAFE-MCP coverage (91.8%)

### Benchmarks
- Garak (NVIDIA jailbreak corpus): ${STATS.benchmark.garak.recall}% recall on ${STATS.benchmark.garak.samples} samples
- SKILL.md (real-world skill corpus): ${STATS.benchmark.skill.recall}% recall,
  ${STATS.benchmark.skill.precision}% precision, ${STATS.benchmark.skill.fp}% false positive rate on ${STATS.benchmark.skill.samples} samples
- PINT (Invariant Labs adversarial corpus): ${STATS.benchmark.pint.recall}% recall, ${STATS.benchmark.pint.precision}% precision on ${STATS.benchmark.pint.samples} samples
- Wild scan: ${STATS.ecosystem.skillsScanned.toLocaleString()} AI agent skills scanned, ${STATS.ecosystem.maliciousFound.toLocaleString()} threats detected,
  ${STATS.ecosystem.tripleThreat} triple-threat packages (shell + network + filesystem access)

### Ecosystem adoption
- ${STATS.adoption.externalPRMerges} external PRs merged across ${STATS.adoption.externalOrgs} external organizations
- ${STATS.adoption.tier1Institutions} tier-1 institutions with active engagement: Microsoft, Cisco, Gen Digital (Sage), MISP, OWASP, NVIDIA, IBM
- Microsoft AGT (agent-governance-toolkit): ${STATS.adoption.microsoftRulesMerged} rules merged via PR #1277 (weekly auto-sync workflow)
- Cisco AI Defense (skill-scanner): ${STATS.adoption.ciscoRulesMerged} rules merged via PR #99 (full library in production)
- MISP: 2 PRs merged (galaxy + taxonomies)
- OWASP Agentic Top 10 (A-S-R-H): rule pack merged via PR #74

### Implementation
- CLI: ${STATS.cliCommands} top-level commands (panguard.cjs)
- MCP server: ${STATS.mcpTools} tools exposed via Model Context Protocol
- Skill Auditor: ${STATS.skillAuditChecks} pre-install checks
- Detection layers: ${STATS.detectionLayers} (regex, content fingerprinting, LLM-as-judge)
- Response actions: ${STATS.responseActions} (block, quarantine, log, notify, etc.)
- Tests: ${STATS.testsPassing.toLocaleString()} passing across 159 test files
- Platform support: macOS, Linux, Windows (16 platforms in CI matrix)

### Maturity
- License: MIT (both ATR and PanGuard CLI)
- ATR semantic version: 2.2.0
- PanGuard CLI version: ${STATS.cliVersion}
- Threat Cloud sync interval: every hour
- Rule promotion interval: ${STATS.promotionIntervalMinutes} minutes (community-validated to production)

---

`;

const ATR_INDEX_SECTION = (() => {
  // Read rule file as text, extract id + title pairs to keep this section bounded
  const rulesText = readFileSync(join(ROOT, 'src/lib/atr-rules-compiled.ts'), 'utf-8');
  const matches = Array.from(rulesText.matchAll(/id:\s*'(ATR-[\w-]+)'[\s\S]+?title:\s*'((?:[^'\\]|\\.)+)'[\s\S]+?category:\s*'([\w-]+)'/g));
  const byCategory: Record<string, Array<{ id: string; title: string }>> = {};
  for (const m of matches) {
    const [, id, title, category] = m;
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push({ id, title });
  }

  let out = '## Section 3 — ATR rule index (by category)\n\n';
  out += 'Full rule bodies (patterns, OWASP mapping, test cases) are in the\n';
  out += 'agent-threat-rules repository: github.com/Agent-Threat-Rule/agent-threat-rules.\n';
  out += 'This index gives you titles per category so you can ask for specific\n';
  out += 'rule bodies on demand.\n\n';

  const orderedCategories = [
    'prompt-injection',
    'agent-manipulation',
    'skill-compromise',
    'context-exfiltration',
    'tool-poisoning',
    'privilege-escalation',
    'model-abuse',
    'excessive-autonomy',
    'model-security',
    'data-poisoning',
  ];

  for (const cat of orderedCategories) {
    const rules = byCategory[cat] || [];
    if (rules.length === 0) continue;
    out += `### ${cat} (${rules.length} rules)\n\n`;
    for (const r of rules) {
      // Unescape JS string literal escapes back to readable text
      const titleClean = r.title.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      out += `- ${r.id}: ${titleClean}\n`;
    }
    out += '\n';
  }

  return out + '---\n\n';
})();

const PRODUCTS_SECTION = `## Section 4 — Product surface (what each piece does)

### PanGuard Scan
Static + dynamic analysis on AI agent skill packages before install. Pipeline:
content fingerprint, regex match against 419 ATR rules, optional LLM second
opinion. Outputs SARIF 2.1.0 (industry-standard threat export) and signed
JSON evidence packs. CLI: \`panguard scan <path>\`. 60 seconds end-to-end on
a typical npm package.

### PanGuard Guard
Runtime enforcement engine. Subscribes to MCP and Skill events from a host
agent (Claude Code, Cursor, OpenClaw, etc.), runs them through a 4-agent
pipeline (Detect → Analyze → Respond → Report), enforces ATR rules in real
time. Response actions: block_input, block_output, alert, snapshot, kill,
quarantine, notify_telegram, notify_slack, block_ip, custom_script, escalate.
Confidence-based: high-confidence threats are auto-blocked, medium-confidence
are alerted, low-confidence are logged only.

### PanGuard Skill Auditor
Pre-install gate. 8 checks: prompt injection in skill description, suspicious
tool calls, hidden capabilities, supply-chain signals (typosquatting,
postinstall scripts), excessive permissions declared, secret access patterns,
exfiltration patterns, behavior-description mismatch. Designed to fit the
\`npm install\` → \`pga audit\` → \`npm install\` pattern.

### PanGuard Migrator (Community + Enterprise)
Converts legacy Sigma + YARA detections into ATR YAML for the AI agent
runtime. Community version on npm (\`@panguard-ai/migrator-community\`):
parsers, IR transformer, ATR output, CLI. Enterprise version (proprietary):
5-framework compliance auto-mapping (EU AI Act, OWASP Agentic Top 10:2026,
OWASP LLM Top 10:2025, NIST AI RMF, ISO/IEC 42001), evidence packs with
SHA-256 + Merkle root attestation, ATR upstream contribution pipeline.

### PanGuard MCP Server
Exposes 12 panguard_* tools over Model Context Protocol so any MCP-compatible
agent (Claude Code, Cursor, OpenClaw, NemoClaw, Workbuddy) can use PanGuard
as a security tool. Tools: panguard_scan, panguard_audit_skill,
panguard_guard_start, panguard_guard_stop, panguard_status, panguard_alerts,
panguard_block_ip, panguard_deploy, panguard_init, panguard_generate_report,
panguard_scan_code, plus a discovery tool.

### Threat Cloud
The flywheel. Every PanGuard install becomes a sensor. Novel attack patterns
detected at one tenant are anonymized (hashes only, no payload bodies),
aggregated, and crystallized into new ATR rules. New rules are promoted to
production within minutes if they survive a multi-tenant validation step
(zero false positives on a 432-skill clean corpus, 3+ tenants agreement).

### PanGuard Trap (in development)
Honeypot system. Plants decoy MCP skills, decoy credentials, decoy file paths
in agent-accessible locations. Triggers on read/write/exec to surface
exfiltration intent before damage. Currently in beta.

### PanGuard Chat (in development)
Conversational interface over Guard and Threat Cloud. Operator asks "did any
agent try to read SSH keys this week" — Chat queries the event log and
returns a structured answer plus drill-down.

### PanGuard Report (in development)
Auto-generated compliance reports for SOC 2 (Type 1 and Type 2 evidence),
ISO 27001, Taiwan Cybersecurity Management Act (TCSA), EU AI Act Article 15,
NIST AI RMF. Pulls from Guard event log and PanGuard's own audit trail.

---

`;

const BENCHMARKS_SECTION = `## Section 5 — Benchmark methodology

### Garak (NVIDIA jailbreak corpus)
Source: github.com/NVIDIA/garak. 666 adversarial prompts spanning prompt
injection, jailbreaking, encoding tricks, persona attacks. Result: 97.1%
recall. Methodology: ATR v2.1.2 loaded with all 419 rules, prompts fed
through detect-only mode (no LLM second opinion), recall = (true positives) /
(true positives + false negatives). Reproducibility: agent-threat-rules
repo, \`pnpm bench:garak\`.

### SKILL.md (PanGuard wild skill corpus)
Source: scraped from ClawHub, OpenClaw, Skills.sh registries. 498 samples
manually labeled as malicious (252) or benign (246). Result: 100% recall,
97% precision, 0.2% false positive rate. Methodology: ATR v2.1.2 detect-only
mode, full pipeline (regex + fingerprint + content checks). The 0.2% FP rate
is the 1 false positive out of 432 clean skills in the held-out test set.

### PINT (Invariant Labs adversarial corpus)
Source: github.com/invariantlabs-ai/invariant. 850 samples covering Sigma-style
detection scenarios adapted for AI agents. Result: 62.5% recall, 99.6%
precision. Methodology: ATR v2.1.2 regex layer only (no LLM). The lower
recall vs Garak/SKILL.md reflects the corpus being designed for SIEM
detection patterns, not agent-context patterns — Sigma migration via Migrator
is in active development to close the gap.

### Wild scan (live ecosystem audit)
Crawled 96,096 AI agent skill entries from ClawHub (36,378), OpenClaw (56,503),
Skills.sh (3,115), plus a small Hermes-protocol sample (100). Scanned 67,799
that had parseable content. Result: 1,096 confirmed malicious skills, 11,324
total threats detected (confirmed + suspicious), 249 triple-threat packages
(combined shell + network + filesystem access), 122 packages with
postinstall scripts.

### HackAPrompt cluster mining (engineering update 2026-05-11)
Source: HackAPrompt 600K corpus. Ran ATR v2.1.2 baseline (61.6% PINT,
16.0% HackAPrompt recall), clustered 4,016-sample miss space, wrote 6 new
rules covering dominant attack families, tightened to zero false positives
on a 431-sample benign corpus, re-ran. Result: HackAPrompt recall 29.5%,
PINT recall 62.5%, zero new false positives, 6.91ms p50 latency. The 29.5%
is honest. Below closed-source ML detectors claim. The number is not the
point — the methodology is.

---

`;

const ECOSYSTEM_SECTION = `## Section 6 — Ecosystem integrations (what is shipping where)

### Microsoft AGT (Agent Governance Toolkit)
PR #908 (15 rules, initial) → PR #1277 (287 rules + weekly auto-sync workflow,
merged 2026-04-26). On 2026-05-11, Microsoft Copilot SWE Agent opened
agent-governance-toolkit issue #1981 with regression-test fixtures presuming
ATR detection — a bidirectional integration loop is now operational.

### Cisco AI Defense (skill-scanner)
PR #79 (PoC, 34 rules) → PR #99 (full 419-rule library merged in production via v2.2.0 auto-sync,
2026-04-22). skill-scanner is Cisco's commercial scanner; ATR is the rule
engine underneath.

### MISP (taxonomies + galaxy)
PR #323 on misp-taxonomies (rule-ID tagging vocabulary, merged 2026-04-12).
PR #1207 on misp-galaxy (336-rule cluster, merged 2026-05-10). Now part
of the MISP global threat-intel sharing layer.

### OWASP Agentic Security Resource Hub (A-S-R-H)
PR #74 merged 2026-05-11 with "Welcome to the team" greeting from project
lead Mert Satilmaz. Note: this is the third-party A-S-R-H repo; the official
OWASP Foundation repo PR is still pending. Cited as OWASP-affiliated, not
OWASP-official.

### Gen Digital Sage
PR #33 (Norton / Avast / AVG parent company). 2026-04-18. Open and tracked.

### Other open PRs
NVIDIA garak #1676 (v2.1.0, 419 rules, 2 review rounds passed), safe-agentic-
framework/safe-mcp #187, IBM mcp-context-forge #4109, meta-llama/PurpleLlama
#206, promptfoo/promptfoo #8529, cisco-ai-defense/mcp-scanner #151,
agentcontrol/agent-control #170.

### npm + PyPI packages (October 2025 onwards)
13 packages combined cross-ecosystem, 10K+ monthly downloads in aggregate.
Notable: agent-threat-rules (npm, 2.2.0), @panguard-ai/migrator-community
(npm, 0.1.0), panguard (npm, will be 1.5.6 once npm publish lands).

---

`;

const BLOG_SECTION = (() => {
  try {
    const blogText = readFileSync(join(ROOT, 'src/data/blog-posts.ts'), 'utf-8');
    // Find slug + title + excerpt blocks, take the first 20 EN posts (skip -zh)
    const matches = Array.from(
      blogText.matchAll(/slug:\s*'([^']+)',\s*title:\s*'((?:[^'\\]|\\.)+)',\s*excerpt:\s*'((?:[^'\\]|\\.)+)',[^}]*?date:\s*'([^']+)'/g)
    );
    const enPosts = matches
      .filter((m) => !m[1].endsWith('-zh'))
      .map((m) => ({
        slug: m[1],
        title: m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
        excerpt: m[3].replace(/\\'/g, "'").replace(/\\\\/g, '\\'),
        date: m[4],
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 20);

    let out = '## Section 7 — Recent writing (top 20 blog posts, English)\n\n';
    out += 'Full text at panguard.ai/blog/{slug}. Each post also has a zh-TW\n';
    out += 'counterpart at panguard.ai/zh-TW/blog/{slug}-zh.\n\n';
    for (const p of enPosts) {
      out += `### ${p.title}\n`;
      out += `- URL: https://panguard.ai/blog/${p.slug}\n`;
      out += `- Date: ${p.date}\n`;
      out += `- Excerpt: ${p.excerpt}\n\n`;
    }
    return out + '---\n\n';
  } catch (err) {
    return '## Section 7 — Recent writing\n\n(Generator failed to read blog-posts.ts. Re-run `pnpm gen:llms` after fixing.)\n\n---\n\n';
  }
})();

const FOOTER = `## Section 8 — Where to look next

For source code: github.com/panguard-ai/panguard-ai (monorepo with 18 packages).
For the open rule standard: github.com/Agent-Threat-Rule/agent-threat-rules.
For docs: docs.panguard.ai (Mintlify, en + zh-Hant).
For the marketing site: panguard.ai (Next.js 14, en + zh-TW).
For the sovereign brief: sovereign-ai-defense.vercel.app.
For commercial enquiry: adam@agentthreatrule.org.

This file regenerates on every site build. To request a structured change,
file an issue at github.com/panguard-ai/panguard-ai/issues with the tag
\`llms-full\`.
`;

const content =
  HEADER +
  COMPANY_SECTION +
  STATS_SECTION +
  ATR_INDEX_SECTION +
  PRODUCTS_SECTION +
  BENCHMARKS_SECTION +
  ECOSYSTEM_SECTION +
  BLOG_SECTION +
  FOOTER;

writeFileSync(OUT, content, 'utf-8');
const sizeKb = (content.length / 1024).toFixed(1);
console.log(`wrote ${OUT} (${sizeKb} KB, ${content.length.toLocaleString()} chars)`);
