export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: { type: 'feature' | 'fix' | 'improvement' | 'security'; text: string }[];
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '0.4.2',
    date: '2026-03-18',
    title: 'Ecosystem Scan Pipeline & ATR Eval Framework',
    description: 'Scanned 2,386 MCP skills from npm registry. ATR eval framework with PINT benchmark (39.9% detection rate). OpenClaw native integration.',
    changes: [
      { type: 'feature', text: 'Ecosystem scan pipeline: crawled 4,648 registry entries, scanned 2,386 npm packages' },
      { type: 'feature', text: 'ATR eval framework with PINT benchmark for measuring detection effectiveness' },
      { type: 'feature', text: 'OpenClaw native integration via panguard setup' },
      { type: 'feature', text: 'Threat Cloud live metrics API (/api/metrics) for real-time stats' },
      { type: 'improvement', text: 'ATR rules expanded to 61 across 9 threat categories' },
      { type: 'improvement', text: 'Threat intel pipeline auto-crawling 11 sources hourly' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-03-12',
    title: 'Threat Intelligence Pipeline & Website Launch',
    description: 'Automated threat intelligence from 11 sources. New panguard.ai website with bilingual support (EN + zh-TW).',
    changes: [
      { type: 'feature', text: 'Threat intel pipeline: NVD, CISA KEV, MITRE ATT&CK, URLhaus, MalwareBazaar, and 6 more sources' },
      { type: 'feature', text: 'panguard.ai website with web scanner for GitHub skill URLs' },
      { type: 'feature', text: 'Bilingual website support (English + Traditional Chinese)' },
      { type: 'improvement', text: 'Threat Cloud consensus: 3+ reports + LLM review for rule promotion' },
      { type: 'security', text: 'Web scanner SSRF protection with private IP blocklist' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-03-06',
    title: 'Skill Auditor & MCP Server Public Release',
    description: 'First public release on npm. Skill Auditor for AI agent security. MCP server with 11 tools. 61 ATR detection rules.',
    changes: [
      { type: 'feature', text: 'Panguard Skill Auditor: 6-check security audit for MCP skills and AI agent tools' },
      { type: 'feature', text: 'MCP server with 11 tools for AI-assisted security operations' },
      { type: 'feature', text: 'CLI: panguard audit skill <path> for pre-install scanning' },
      { type: 'feature', text: 'Panguard Guard: real-time monitoring with ATR rule engine' },
      { type: 'feature', text: 'Panguard Chat: security alerts via Telegram, Slack, and email' },
      { type: 'security', text: 'ReDoS protection in ATR rule regex compilation' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-02-20',
    title: 'Guard Runtime Protection & Chat Notifications',
    description: 'Guard daemon for 24/7 monitoring. Chat integration for security alerts. Confidence-based auto-response system.',
    changes: [
      { type: 'feature', text: 'Panguard Guard: 24/7 daemon with process, file, and network monitoring' },
      { type: 'feature', text: 'Confidence-based auto-response: auto-block at 85%+, alert at 50-84%' },
      { type: 'feature', text: 'Telegram and Slack notification channels with rich formatting' },
      { type: 'feature', text: '7-day learning period for behavioral baseline' },
      { type: 'improvement', text: '11 response actions: block_ip, kill_process, isolate_file, and more' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-01-15',
    title: 'Initial Release -- Scan & Report',
    description: 'First release of Panguard. Security scanning with PDF report generation. ATR rule engine foundation.',
    changes: [
      { type: 'feature', text: 'Panguard Scan: 60-second security audit with 7 scanner modules' },
      { type: 'feature', text: 'PDF report generation with ISO 27001 and SOC 2 control mapping' },
      { type: 'feature', text: 'ATR (Agent Threat Rules) engine with initial rule set' },
      { type: 'feature', text: 'Traditional Chinese language support' },
      { type: 'improvement', text: 'CLI with 23 commands for complete security workflow' },
    ],
  },
];
