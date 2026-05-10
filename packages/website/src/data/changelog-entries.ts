export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: { type: 'feature' | 'fix' | 'improvement' | 'security'; text: string }[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.5.4',
    date: '2026-05-10',
    title: 'ATR v2.1.0 · Migrator GA · 100% NIST AI RMF',
    description:
      'ATR upgraded to v2.1.0 with 330 detection rules and 100% NIST AI RMF mapping (1,566 mappings across 16 subcategories). Migrator Community v0.1.0 shipped on npm under MIT. Cisco AI Defense expanded to the full 330-rule pack via PR #99; Microsoft AGT now ships 287 rules + weekly auto-sync via PR #1277.',
    changes: [
      {
        type: 'feature',
        text: 'ATR v2.1.0: 100% NIST AI RMF coverage — every rule carries compliance.nist_ai_rmf metadata, 1,566 mappings across GV / MP / MS / MG',
      },
      {
        type: 'feature',
        text: 'Migrator Community v0.1.0 on npm (@panguard-ai/migrator-community, MIT) — Sigma / YARA / Snort parsers, IR, transformers, validators, basic CLI',
      },
      {
        type: 'feature',
        text: 'Migrator Enterprise v0.1.0 production-ready — 15 source-format adapters, strict 0-FP quality pipeline, 5-framework auto-mapping, 6-tab web dashboard, audit evidence packs',
      },
      {
        type: 'improvement',
        text: 'Cisco AI Defense: PR #99 expanded from 34-rule PoC to full 330-rule pack in skill-scanner production',
      },
      {
        type: 'improvement',
        text: 'Microsoft AGT: PR #1277 expanded to 287 rules + weekly auto-sync workflow into Agent Governance Toolkit',
      },
      {
        type: 'improvement',
        text: 'NVIDIA garak in-the-wild benchmark: 97.1% recall (646/666) maintained · 0.20% FP on 498-sample SKILL.md corpus',
      },
      {
        type: 'fix',
        text: 'Engine: code-block + table-cell suppression now applied to array-format rules (was silently bypassed for every rule from 2026 onward)',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-22',
    title: 'Auto-Block & Auto-Guard',
    description:
      'CRITICAL skills are now auto-blocked on install. Guard auto-starts after setup. Ecosystem scan pipeline scanned 2,386 MCP skills.',
    changes: [
      { type: 'feature', text: 'Auto-block: CRITICAL skills blocked immediately on detection' },
      {
        type: 'feature',
        text: 'Auto-guard: Guard daemon starts automatically after panguard setup',
      },
      {
        type: 'feature',
        text: 'Ecosystem scan pipeline: crawled 4,648 registry entries, scanned 2,386 npm packages',
      },
      {
        type: 'feature',
        text: 'ATR eval framework with PINT benchmark for detection effectiveness',
      },
      { type: 'feature', text: 'OpenClaw, WorkBuddy, NemoClaw, ArkClaw native integration' },
      { type: 'improvement', text: 'Threat Cloud live metrics API (/api/metrics)' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-20',
    title: 'ATR-Only Detection & Sigma/YARA Removal',
    description:
      'Focused detection on ATR (Agent Threat Rules) only. Removed legacy Sigma and YARA rule engines. 61 ATR rules across 9 threat categories.',
    changes: [
      { type: 'feature', text: 'ATR-only detection pipeline — purpose-built for AI agent threats' },
      {
        type: 'improvement',
        text: 'Removed Sigma and YARA rule engines (legacy, not AI-specific)',
      },
      { type: 'improvement', text: '61 ATR rules with 474 detection patterns across 9 categories' },
      { type: 'improvement', text: 'Threat intel pipeline auto-crawling 11 sources hourly' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-19',
    title: 'Unified v1.0.0 Release',
    description:
      'Unified version across all packages. First stable release with Skill Auditor, Guard, Scan, Threat Cloud, and MCP server.',
    changes: [
      { type: 'feature', text: 'Unified version: all packages aligned to v1.0.0' },
      { type: 'feature', text: 'Panguard Skill Auditor: 8-check security audit for MCP skills' },
      { type: 'feature', text: 'MCP server with 11 tools for AI-assisted security operations' },
      {
        type: 'feature',
        text: 'panguard.ai website with web scanner and bilingual support (EN + zh-TW)',
      },
      { type: 'feature', text: 'Threat Cloud with community consensus (3+ reports + LLM review)' },
      { type: 'security', text: 'Web scanner SSRF protection with private IP blocklist' },
    ],
  },
];
