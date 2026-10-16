#!/usr/bin/env tsx
/**
 * Generate public/llms.txt (compact index) and public/llms-full.txt (long-form
 * context) for AI tools that fetch them to understand the project.
 *
 * Every figure comes from src/lib/stats.ts, the site's single source of truth,
 * so these files cannot drift from the pages. Blog excerpts that quote a figure
 * ATR has since withdrawn or narrowed carry the same dated correction as the
 * post page (src/lib/withdrawn-figures.ts).
 *
 * Run: `pnpm gen:llms` (also runs as prebuild).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STATS } from '../src/lib/stats.ts';
import { CORRECTION_DATE, correctionsFor } from '../src/lib/withdrawn-figures.ts';

const ROOT = join(import.meta.dirname, '..');
const OUT_FULL = join(ROOT, 'public', 'llms-full.txt');
const OUT_INDEX = join(ROOT, 'public', 'llms.txt');

const n = (value: number): string => value.toLocaleString('en-US');

const B = STATS.benchmark;
const WS = STATS.wildScan;
const SCANNER = STATS.scanner;
const ATR_REPO = 'https://github.com/Agent-Threat-Rule/agent-threat-rules';

const WILD_SCAN_LINE = `${n(WS.skillsScanned)} published AI agent skills and MCP servers from five public sources, scanned ${WS.scannedOn} with scan engine ${WS.engineVersion} (${WS.engineRules} ATR rules, not today's rule set); ${n(WS.flagged)} flagged. A flag is a rule match, not a verdict, so no confirmed-malicious count is published.`;

const BENCHMARK_LINES = [
  `garak in-the-wild jailbreaks: ${B.garak.recall}% recall on ${n(B.garak.samples)} samples (hunt lane; partly closed-book, because some rules were written from this corpus).`,
  `garak full probe corpus (${B.garakFull.families} families, ${n(B.garakFull.samples)} prompts): ${B.garakFull.recall}% recall (hunt lane, also partly closed-book). By family: latentinjection ${B.garakFull.perFamily.latentinjection}%, sysprompt_extraction ${B.garakFull.perFamily.sysprompt_extraction}%, dan ${B.garakFull.perFamily.dan}%.`,
  `SKILL.md: ${B.skill.recall}% recall on ${n(B.skill.samples)} samples (hunt lane, in-sample: the benign samples are the set the rules are tuned against, so precision and false-positive figures are not cited).`,
  `PINT-format corpus, self-built from deepset prompt-injections + Lakera Gandalf (NOT Lakera's official PINT benchmark): ${B.pint.recall}% recall, ${B.pint.precision}% precision on ${n(B.pint.samples)} samples. It is effectively a prompt-injection-family score.`,
  `HackAPrompt (EMNLP 2023): ${B.hackaprompt.recall}% recall on ${n(B.hackaprompt.samples)} samples, measured on ATR v3.5.0. Closed-book: ATR mined rules from this corpus's misses, and ${B.hackaprompt.baselineRecall}% is ATR's own recall before them. The corpus is attack-only, so precision and false-positive rate are undefined on it.`,
  'The benign-gate false-positive rates once quoted for a "65,000-sample" gate were withdrawn on 2026-09-19 pending re-measurement. There is no single engine-wide false-positive number.',
  'Recall figures above are the hunt lane (all effective rules). The enforce lane, which is what runs when blocking is on, recalls far less.',
];

const ADOPTION_LINES = [
  'Cisco AI Defense skill-scanner: ATR rule pack merged into the open-source cisco-ai-defense/skill-scanner repository (PR #99, after PoC #79). This describes that repository, not any Cisco product.',
  'Microsoft Agent Governance Toolkit: ATR example adapters merged into the repository examples (examples/atr-import, PR #2308, and examples/acs-atr-annotator, PR #3025). The rule pack added by the earlier example PRs #908 and #1277 was removed upstream on 2026-07-30.',
  'MISP / CIRCL: ATR rule-ID taxonomy and threat-intel galaxy merged (MISP/misp-taxonomies PR #323, MISP/misp-galaxy PR #1207).',
  'Gen Digital Sage: ATR-derived agent-layer threat patterns contributed (gendigitalinc/sage PR #33).',
];

const MCP_TOOLS = [
  'panguard_scan',
  'panguard_scan_code',
  'panguard_audit_skill',
  'panguard_guard_start',
  'panguard_guard_stop',
  'panguard_status',
  'panguard_alerts',
  'panguard_block_ip',
  'panguard_deploy',
  'panguard_init',
  'panguard_generate_report',
];

const bullets = (lines: readonly string[]): string => lines.map((line) => `- ${line}`).join('\n');

/* ───────────────────────────── llms-full.txt ───────────────────────────── */

const HEADER = `# PanGuard AI — full context for AI coding tools

This file is a structured long-form context dump for AI tools (Cursor, Claude
Code, GitHub Copilot, Windsurf, Anthropic agents) that fetch llms-full.txt. It
is generated on every site build from the panguard-ai repository:
- src/lib/stats.ts (every figure below)
- src/lib/atr-rules-compiled.ts (the rule index)
- src/data/blog-posts.ts (recent writing)

Last generated: ${new Date().toISOString()}
To regenerate: \`pnpm gen:llms\` in packages/website/.

---

`;

const COMPANY_SECTION = `## Section 1 — Company and product positioning

PanGuard AI is the commercial platform built on top of ATR (Agent Threat Rules),
an open detection standard for AI agent security threats. ATR is a separate,
community-driven project under the MIT license; PanGuard uses it.

### Founder
Adam Lin (林冠辛). Email: adam@agentthreatrule.org. GitHub: eeee2345.
Background: cross-disciplinary builder with backgrounds in sales (real estate),
marketing (Threads, 300M impressions), and culture (hip-hop festival, 5th year).
Self-taught engineer. Based in Taiwan, shipping globally. Founded Panguard AI,
Inc. (Delaware C-Corp) on 2026-05-12.

### Product tiers (see https://panguard.ai/pricing)
- Community: $0, MIT licensed, self-hosted.
- Founding Pilot: $25K one-time, self-serve via https://panguard.ai/scoping,
  credited toward year-one Enterprise.
- Enterprise and up: from $150K, sales-led (https://panguard.ai/enterprise).
  Sovereign is nation-scale airgap deployment.

---

`;

const STATS_SECTION = `## Section 2 — Core stats

### ATR, the open standard
- ${STATS.totalRulesDisplay} effective rules in agent-threat-rules v${STATS.atrVersion} (draft and deprecated rules excluded)
- 10 threat categories (prompt-injection, agent-manipulation, skill-compromise,
  context-exfiltration, tool-poisoning, privilege-escalation, model-abuse,
  excessive-autonomy, model-security, data-poisoning)
- ${STATS.coverage.owaspAgentic} OWASP Agentic Top 10 categories mapped
- ${STATS.coverage.safeMcpDetail} SAFE-MCP techniques mapped (${STATS.coverage.safeMcp}%)

### What PanGuard runs
- The panguard.ai web scanner runs ${n(SCANNER.rules)} rules (${n(SCANNER.patterns)} detection conditions)
  from agent-threat-rules v${SCANNER.atrRelease}, which lags the latest ATR release.
- The PanGuard CLI and Guard load whichever agent-threat-rules release is
  installed with them (see the dependency ranges in packages/*/package.json).

### Benchmarks (ATR Layer 1 rules, ATR v${STATS.atrVersion} unless stated)
${bullets(BENCHMARK_LINES)}

### Wild scan (2026-04)
- ${WILD_SCAN_LINE}
- ${n(WS.fourRegistrySubset)} is the four SKILL.md registries without the MCP server crawl; cite it
  only with that label. No confirmed-malicious count from this scan is supported,
  and the counts PanGuard published earlier are withdrawn.

### Implementation (PanGuard ${STATS.cliVersion})
- CLI: ${STATS.cliCommands} top-level commands
- Skill Auditor: ${STATS.skillAuditChecks} pre-install checks
- Detection layers: ${STATS.detectionLayers} (rules, content fingerprinting, LLM analysis)
- Guard response actions: ${STATS.responseActions}
- License: MIT (both ATR and the PanGuard CLI)

---

`;

const ATR_INDEX_SECTION = (() => {
  // Parse the bundle itself (not its .ts mirror) so every rule keeps its own id, title and category.
  const rules = JSON.parse(
    readFileSync(join(ROOT, 'src/lib/atr-rules-compiled.json'), 'utf-8')
  ) as Array<{ id: string; title: string; category: string }>;
  const byCategory: Record<string, Array<{ id: string; title: string }>> = {};
  for (const { id, title, category } of rules) {
    byCategory[category] = [...(byCategory[category] ?? []), { id, title }];
  }

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

  let out = '## Section 3 — ATR rule index (the web scanner bundle, by category)\n\n';
  out += `These are the ${n(rules.length)} rules the panguard.ai web scanner runs, from\n`;
  out += `agent-threat-rules v${SCANNER.atrRelease}. The latest ATR release (v${STATS.atrVersion}) has more.\n`;
  out += `Full rule bodies (patterns, mappings, test cases) are in ${ATR_REPO}.\n\n`;
  for (const cat of orderedCategories) {
    const rules = byCategory[cat] ?? [];
    if (rules.length === 0) continue;
    out += `### ${cat} (${rules.length} rules)\n\n`;
    for (const r of byCategory[cat]) {
      out += `- ${r.id}: ${r.title}\n`;
    }
    out += '\n';
  }
  return out + '---\n\n';
})();

const PRODUCTS_SECTION = `## Section 4 — Product surface (what each piece does)

### PanGuard Scan
Pre-install analysis of AI agent skill packages and MCP configs: content
fingerprinting, regex matching against ATR rules, optional LLM second opinion.
Outputs SARIF 2.1.0. CLI: \`panguard scan <path>\`.

### PanGuard Guard
Runtime enforcement engine. Subscribes to MCP and Skill events from a host
agent (Claude Code, Cursor, OpenClaw, etc.), runs them through a 4-agent
pipeline (Detect → Analyze → Respond → Report) and enforces ATR rules.
${STATS.responseActions} response actions: block_input, block_output, alert, snapshot, kill,
quarantine, notify_telegram, notify_slack, block_ip, custom_script, escalate.

### PanGuard Skill Auditor
Pre-install gate with ${STATS.skillAuditChecks} checks: prompt injection in the skill description,
suspicious tool calls, hidden capabilities, supply-chain signals (typosquatting,
postinstall scripts), excessive declared permissions, secret access patterns,
exfiltration patterns, behavior-description mismatch.

### PanGuard Migrator (Community + Enterprise)
Converts legacy Sigma + YARA detections into ATR YAML. The Community version is
on npm (\`@panguard-ai/migrator-community\`); compliance mapping and evidence
packs are in the Enterprise version.

### PanGuard MCP Server
Exposes panguard_* tools over the Model Context Protocol, so MCP-compatible
agents can use PanGuard as a security tool: ${MCP_TOOLS.join(', ')}.

### Threat Cloud
Designed as the shared intelligence service: PanGuard installs send anonymized
detections (hashes, no payload bodies), from which candidate ATR rules are
proposed. Candidates are reviewed before they ship in an ATR release.

### PanGuard Trap, Chat, Report (in development)
Trap plants decoy skills, credentials and paths to surface exfiltration intent.
Chat is a conversational interface over Guard. Report generates compliance
reports from Guard's event log.

---

`;

const BENCHMARKS_SECTION = `## Section 5 — Benchmark methodology

Each figure is a measurement of ATR's deterministic Layer 1 rules on one named
corpus, never an engine-wide claim. ATR's measurement records live in
${ATR_REPO}/tree/main/data/measurements.

### garak in-the-wild jailbreaks
${B.garak.samples} jailbreak prompts from NVIDIA garak. ${B.garak.recall}% recall in the hunt lane
(all effective rules), detect-only, no LLM second opinion. Partly closed-book:
some rules were written from this corpus, so it overstates out-of-sample recall.

### garak full probe corpus
${n(B.garakFull.samples)} prompts across ${B.garakFull.families} garak probe families. ${B.garakFull.recall}% recall in the hunt lane.
Per-family figures (latentinjection ${B.garakFull.perFamily.latentinjection}%, sysprompt_extraction ${B.garakFull.perFamily.sysprompt_extraction}%,
dan ${B.garakFull.perFamily.dan}%) belong to this corpus, not to the in-the-wild set above.

### SKILL.md
${B.skill.samples} labeled skills. ${B.skill.recall}% recall in the hunt lane. In-sample: the benign
samples are the set the rules are tuned against, so precision and
false-positive figures on this corpus are not cited.

### PINT-format (self-built)
${B.pint.samples} samples assembled from deepset/prompt-injections + Lakera Gandalf. This is NOT
Lakera's official PINT benchmark, whose corpus is private. ${B.pint.recall}% recall, ${B.pint.precision}%
precision. It is effectively a prompt-injection-family score, not a measure of
overall coverage.

### HackAPrompt
${n(B.hackaprompt.samples)} deterministic samples from the EMNLP 2023 competition corpus.
${B.hackaprompt.recall}% recall, measured on ATR v3.5.0. Closed-book: ATR mined rules from
this corpus's misses, and ${B.hackaprompt.baselineRecall}% is ATR's own recall before them. The corpus is
attack-only, so precision and false-positive rate are undefined on it.

### Wild scan (2026-04)
${WILD_SCAN_LINE}
It is not a labeled benchmark: there is no ground truth, so it has no recall
or precision. The scan record (data/full-scan-v2-2026-04-14.json in the ATR
repository) keeps file paths and rule ids but not content, so it cannot be
re-run. ${n(WS.fourRegistrySubset)} is the four SKILL.md registries without the MCP server crawl.

---

`;

const ECOSYSTEM_SECTION = `## Section 6 — Where ATR has been merged

Maintainer-accepted contributions, not vendor endorsements. The evidence-linked
list is ADOPTERS.md in ${ATR_REPO}. Selected entries:

${bullets(ADOPTION_LINES)}

---

`;

const BLOG_SECTION = (() => {
  try {
    const blogText = readFileSync(join(ROOT, 'src/data/blog-posts.ts'), 'utf-8');
    // Find slug + title + excerpt blocks; keep the 20 newest English posts (skip -zh)
    const matches = Array.from(
      blogText.matchAll(
        /slug:\s*'([^']+)',\s*title:\s*'((?:[^'\\]|\\.)+)',\s*excerpt:\s*'((?:[^'\\]|\\.)+)',[^}]*?date:\s*'([^']+)'/g
      )
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

    let out = '## Section 7 — Recent writing (20 newest blog posts, English)\n\n';
    out += 'Full text at panguard.ai/blog/{slug}. Each post also has a zh-TW\n';
    out += 'counterpart at panguard.ai/zh-TW/blog/{slug}-zh. Posts keep their\n';
    out += 'original text; a dated correction is noted where a post quotes a\n';
    out += 'figure that has since been withdrawn or narrowed.\n\n';
    for (const p of enPosts) {
      out += `### ${p.title}\n`;
      out += `- URL: https://panguard.ai/blog/${p.slug}\n`;
      out += `- Date: ${p.date}\n`;
      out += `- Excerpt: ${p.excerpt}\n`;
      for (const correction of correctionsFor([p.title, p.excerpt])) {
        out += `- Correction (${CORRECTION_DATE}): ${correction.en}\n`;
      }
      out += '\n';
    }
    return out + '---\n\n';
  } catch (err) {
    console.error('generate-llms-full: could not read blog-posts.ts', err);
    return '## Section 7 — Recent writing\n\n(Generator failed to read blog-posts.ts. Re-run `pnpm gen:llms` after fixing.)\n\n---\n\n';
  }
})();

const FOOTER = `## Section 8 — Where to look next

For source code: github.com/panguard-ai/panguard-ai (monorepo).
For the open rule standard: ${ATR_REPO}.
For docs: docs.panguard.ai (Mintlify, en + zh-Hant).
For the marketing site: panguard.ai (Next.js, en + zh-TW).
For the sovereign brief: sovereign-ai-defense.vercel.app.
For commercial enquiry: adam@agentthreatrule.org.

This file regenerates on every site build. To request a structured change,
file an issue at github.com/panguard-ai/panguard-ai/issues with the tag
\`llms-full\`.
`;

/* ─────────────────────────────── llms.txt ─────────────────────────────── */

const INDEX = `# PanGuard AI

> PanGuard AI is the commercial platform for AI agent security built on ATR
> (Agent Threat Rules), an open, MIT-licensed detection standard with
> ${STATS.totalRulesDisplay} effective rules in v${STATS.atrVersion}. PanGuard adds runtime enforcement, pre-install
> auditing, and migration and compliance tooling. Community is free; Founding
> Pilot and Enterprise tiers add the platform layer.

## Core stats

- ATR: ${STATS.totalRulesDisplay} effective rules in v${STATS.atrVersion}, 10 threat categories, MIT
- OWASP Agentic Top 10: ${STATS.coverage.owaspAgentic} categories mapped
${bullets(BENCHMARK_LINES)}
- Wild scan (2026-04): ${WILD_SCAN_LINE}
- The panguard.ai web scanner runs ${n(SCANNER.rules)} rules from agent-threat-rules v${SCANNER.atrRelease}

## Core products

- [PanGuard product overview](https://panguard.ai/product)
- [Skill Auditor](https://panguard.ai/product/skill-auditor): ${STATS.skillAuditChecks}-check pre-install gate for AI agent skills
- [PanGuard Scan](https://panguard.ai/product/scan): pre-install audit with ATR, Sigma and YARA rule engines
- [PanGuard Guard](https://panguard.ai/product/guard): 4-agent runtime pipeline (detect, analyze, respond, report)
- [PanGuard Migrator](https://panguard.ai/migrator): converts legacy Sigma/YARA detections into ATR YAML
- [PanGuard MCP Server](https://panguard.ai/product/mcp): panguard_* tools for Claude Code, Cursor, OpenClaw and other MCP clients
- [ATR Standard](https://panguard.ai/atr): the open detection standard
- [Threat Cloud](https://panguard.ai/threat-cloud): shared intelligence; candidate rules are reviewed before they ship

## Pricing

- [Pricing](https://panguard.ai/pricing): Community ($0, MIT, self-hosted), Founding Pilot ($25K one-time, self-serve), Enterprise and up (from $150K, sales-led)

## Benchmarks and research

- [Benchmark results](https://panguard.ai/research/benchmarks): each result with its corpus, lane, ATR version and caveats
- [Wild scan report](https://panguard.ai/research/96k-scan): the April 2026 scan of published agent skills
- [MCP ecosystem scan](https://panguard.ai/research/mcp-ecosystem-scan): the March 2026 scan of MCP server packages

## Documentation

- [Getting Started](https://docs.panguard.ai/getting-started)
- [Installation](https://docs.panguard.ai/installation): macOS / Linux / Windows / npm
- [Quickstart](https://docs.panguard.ai/quickstart)
- [ATR concept page](https://docs.panguard.ai/atr)
- [CLI Reference](https://docs.panguard.ai/cli): ${STATS.cliCommands} commands
- [Skill Auditor docs](https://docs.panguard.ai/products/skill-auditor)
- [Guard docs](https://docs.panguard.ai/products/guard): ${STATS.responseActions} response actions
- [Scan docs](https://docs.panguard.ai/products/scan)
- [Threat Cloud docs](https://docs.panguard.ai/products/threat-cloud)

## ATR (Agent Threat Rules)

- Repo: ${ATR_REPO}
- npm: \`agent-threat-rules\` (v${STATS.atrVersion})
- License: MIT
- Where it has been merged, with evidence: ADOPTERS.md in the repository (maintainer-accepted contributions, not vendor endorsements)

## Company

- [About PanGuard](https://panguard.ai/about)
- [Trust Center](https://panguard.ai/trust)
- [Compliance](https://panguard.ai/compliance)
- [Sovereign AI Defense brief](https://sovereign-ai-defense.vercel.app)
- [Blog](https://panguard.ai/blog)
- [GitHub](https://github.com/panguard-ai/panguard-ai)
- [Full context for AI tools](https://panguard.ai/llms-full.txt)

## Founder

- Adam Lin (林冠辛), founder. Email: adam@agentthreatrule.org. GitHub: github.com/eeee2345. Self-taught engineer, based in Taiwan.
`;

const full =
  HEADER +
  COMPANY_SECTION +
  STATS_SECTION +
  ATR_INDEX_SECTION +
  PRODUCTS_SECTION +
  BENCHMARKS_SECTION +
  ECOSYSTEM_SECTION +
  BLOG_SECTION +
  FOOTER;

writeFileSync(OUT_FULL, full, 'utf-8');
writeFileSync(OUT_INDEX, INDEX, 'utf-8');
console.log(`wrote ${OUT_FULL} (${(full.length / 1024).toFixed(1)} KB)`);
console.log(`wrote ${OUT_INDEX} (${(INDEX.length / 1024).toFixed(1)} KB)`);
