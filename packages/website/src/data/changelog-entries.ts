export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: { type: 'feature' | 'fix' | 'improvement' | 'security'; text: string }[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: '2026-03-22',
    title: 'Auto-Block & Auto-Guard',
    description:
      'CRITICAL skills are now auto-blocked on install. Guard auto-starts after setup. Ecosystem scan pipeline scanned 2,386 MCP skills.',
    changes: [
      { type: 'feature', text: 'Auto-block: CRITICAL skills blocked immediately on detection' },
      { type: 'feature', text: 'Auto-guard: Guard daemon starts automatically after panguard setup' },
      {
        type: 'feature',
        text: 'Ecosystem scan pipeline: crawled 4,648 registry entries, scanned 2,386 npm packages',
      },
      { type: 'feature', text: 'ATR eval framework with PINT benchmark for detection effectiveness' },
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
      { type: 'improvement', text: 'Removed Sigma and YARA rule engines (legacy, not AI-specific)' },
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
      { type: 'feature', text: 'panguard.ai website with web scanner and bilingual support (EN + zh-TW)' },
      { type: 'feature', text: 'Threat Cloud with community consensus (3+ reports + LLM review)' },
      { type: 'security', text: 'Web scanner SSRF protection with private IP blocklist' },
    ],
  },
];
