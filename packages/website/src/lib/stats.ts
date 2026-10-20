/**
 * Single source of truth for all marketing statistics.
 *
 * Usage: Import STATS directly in components. RuleStatsContext wraps STATS
 * with live API data from /api/threat-intel/stats (rule counts only).
 * Study figures (wildScan, ecosystem) are static; live Threat Cloud registry
 * counts are read by useEcosystemStats and never stored here.
 *
 * When adding new stats: update here first, then all components auto-update.
 *
 * Derived from (verified 2026-03-12):
 *   packages/panguard-guard/src/types.ts       -> ResponseAction union (11 types)
 *   packages/core/src/ai/funnel-router.ts      -> 3 layers
 *   vitest run (159 test files)                -> 3,528 test cases
 *   packages/panguard/src/cli/index.ts         -> 23 top-level commands
 *   packages/panguard-mcp/src/server.ts        -> 10 MCP tools shown on /product/mcp
 *   packages/panguard-skill-auditor/src/checks/ -> 8 audit checks
 *   agent-threat-rules (latest npm release)    -> atrRules/totalRules, written by the ATR Stats Sync Bot
 *   agent-threat-rules (this workspace's)      -> scanner, written by scripts/compile-atr-rules.mjs
 *   packages/panguard-guard/src/playbook/      -> 3 playbook templates
 *   packages/panguard-guard/src/collectors/     -> 4 log parsers
 *
 * When rules are added/removed, update the numbers here and the entire
 * site picks them up automatically.
 */
export const STATS = {
  /** Must match packages/panguard/package.json "version" */
  cliVersion: '1.9.0',
  /**
   * atrVersion/atrRules/totalRules are written by the ATR Stats Sync Bot
   * (.github/workflows/sync-atr-stats.yml): EFFECTIVE rules in the latest
   * agent-threat-rules npm release, draft and deprecated excluded to match ATR's
   * outward count. They describe the ATR standard. The panguard.ai web scanner
   * runs a separate, older bundle: see `scanner` below.
   */
  atrVersion: '4.1.5',
  /**
   * Effective rules in the shipped npm package (v4.1.5: 829 rule files, of
   * which 5 draft and 2 deprecated are not loaded by the engine, so 822).
   * Written by the ATR Stats Sync Bot; do not hand-edit.
   */
  atrRules: 822,
  /**
   * Detection conditions across the same effective rules (npm 4.1.5: 3,416).
   * Written by the ATR Stats Sync Bot alongside atrRules; do not hand-edit.
   */
  atrPatterns: 3_416,
  totalRules: 822,
  /** Use this for all user-facing display — avoids stale hardcoded counts. */
  totalRulesDisplay: '822' as const,
  /** Separate display for honest breakdown */
  atrRulesDisplay: '822' as const,
  /**
   * What the panguard.ai web scanner (/api/scan) runs: src/lib/atr-rules-compiled.json,
   * the effective rules of the agent-threat-rules release this workspace resolves,
   * which lags the ATR release above. Written by scripts/compile-atr-rules.mjs and
   * checked by CI together with the bundle; do not hand-edit.
   */
  scanner: { atrRelease: '3.5.8', rules: 650, patterns: 2_903 },
  /** Promotion interval in Threat Cloud */
  promotionIntervalMinutes: 2,
  testsPassing: 3_528,
  testFiles: 159,
  detectionLayers: 3,
  responseActions: 11,
  cliCommands: 23,
  products: 6,
  aiAgents: 4,
  mcpTools: 10,
  playbookTemplates: 3,
  logParsers: 4,
  license: 'MIT' as const,
  skillAuditChecks: 8,
  atrDraftRules: 17,
  /**
   * OWASP Agentic Top 10 coverage (from agent-threat-rules/docs/OWASP-MAPPING.md)
   * Sync when rules are added/removed.
   */
  owaspAgentic: {
    totalCategories: 10,
    coveredCategories: 10,
    totalMappings: 866,
    categories: [
      { id: 'ASI01', rules: 445, strength: 'STRONG' as const },
      { id: 'ASI02', rules: 32, strength: 'STRONG' as const },
      { id: 'ASI03', rules: 107, strength: 'STRONG' as const },
      { id: 'ASI04', rules: 71, strength: 'STRONG' as const },
      { id: 'ASI05', rules: 65, strength: 'STRONG' as const },
      { id: 'ASI06', rules: 54, strength: 'STRONG' as const },
      { id: 'ASI07', rules: 21, strength: 'STRONG' as const },
      { id: 'ASI08', rules: 48, strength: 'STRONG' as const },
      { id: 'ASI09', rules: 16, strength: 'STRONG' as const },
      { id: 'ASI10', rules: 7, strength: 'MODERATE' as const },
    ],
  },
  /** Per-category breakdown — counted from the full agent-threat-rules v3.5.8 corpus (747 rules). */
  rulesByCategory: {
    'prompt-injection': 246,
    'context-exfiltration': 119,
    'agent-manipulation': 108,
    'tool-poisoning': 97,
    'privilege-escalation': 51,
    'skill-compromise': 45,
    'model-abuse': 38,
    'excessive-autonomy': 33,
    'data-poisoning': 7,
    'model-security': 3,
  },
  /** Compliance frameworks ATR maps to (per-rule metadata) — matches complianceFrameworkList length. */
  complianceFrameworks: 7,
  complianceFrameworkList: [
    'OWASP Agentic Top 10:2026',
    'OWASP LLM Top 10:2025',
    'MITRE ATLAS',
    'NIST AI RMF',
    'EU AI Act',
    'ISO/IEC 42001',
    'SAFE-MCP',
  ],
  /** Rule source corpora integrated in v2.2.0 sprint */
  ruleSourceCorpora: [
    'NVIDIA garak (3,475 prompts)',
    'HackAPrompt EMNLP 2023 (4,780 samples)',
    'NeMo-Guardrails vendor suite',
    'llm-guard vendor suite',
    'Promptfoo vendor suite',
    'PromptInject NeurIPS 2022',
    'OWASP LLM Top 10 + MITRE ATLAS PoCs',
    'CISA KEV catalog',
    'Spring AI CVE disclosures',
  ],
  /** Threat Intel Pipeline stats (auto-updated by CI every hour) */
  threatIntel: {
    sources: 11,
    activeSources: 10,
    validatedRecords: 5_146,
    autoGeneratedATR: 0,
    promotedRules: 808,
    draftRules: 536,
    lastSync: '2026-03-27',
    syncInterval: '1h',
  },
  /**
   * The March 2026 MCP ecosystem scan behind /research/mcp-ecosystem-scan
   * (crawl-mcp-registry + audit-npm-skills-v2). Its denominator is the classified
   * total, the sum of the five findings* fields. It is a different population from
   * the 2026-04 wild scan (`wildScan`): never cite one study's counts against the
   * other's "scanned" total.
   *
   * Live Threat Cloud registry counts (scanned, blacklisted, whitelisted) are not
   * stored here. useEcosystemStats reads them live and shows them as unavailable
   * when Threat Cloud does not answer, instead of a stored snapshot.
   */
  ecosystem: {
    /** Total MCP/AI skill entries crawled from registries (ClawHub 37,394 + OpenClaw 50,283 + Skills.sh 3,115) */
    entriesCrawled: 90_792,
    /** npm packages found in crawl */
    npmPackages: 2_769,
    /** Total MCP tool definitions extracted from scanned packages */
    toolsExtracted: 35_858,
    /** Packages with security findings (any severity) */
    packagesWithFindings: 2_322,
    /** ATR rule candidates from scan findings */
    atrRulesGenerated: 225,
    /** Total ATR rule matches across all packages */
    atrRuleMatches: 3_361,
    /** Top ATR rule: ATR-2026-099 hit count */
    topAtrRuleHits: 1_515,
    /** Triple threat packages (shell + network + filesystem access) */
    tripleThreat: 249,
    /** Packages with postinstall scripts */
    postinstallScripts: 122,
    /** Breakdown by severity */
    findingsCritical: 182,
    findingsHigh: 1_124,
    findingsMedium: 1_016,
    findingsLow: 7_354,
    findingsClean: 26_718,
    registrySources: 3,
    lastCrawl: '2026-04-16',
  },
  /**
   * Benchmark results — verified against 資安/state/facts.json 2026-07-04.
   * All numbers are corpus-level Layer 1 (deterministic rules) measurements;
   * ALWAYS display with corpus + version context, never as engine-wide claims.
   *
   * PINT: self-built 850-sample PINT-format corpus (deepset prompt-injections +
   *   Lakera Gandalf); NOT Lakera's official private PINT benchmark.
   * SKILL.md: real-world skill corpus (498 samples from ClawHub + OpenClaw + Skills.sh)
   * Garak: NVIDIA in-the-wild jailbreak corpus (650 samples)
   * HackAPrompt: EMNLP 2023 competition corpus (4,780 deterministic samples)
   */
  // All recall/precision/fp values are PERCENTAGES (0-100) for a single
  // consistent unit across the site — call sites render `${value}%` directly.
  benchmark: {
    pint: { recall: 65.41, precision: 100, fp: 0, samples: 850 },
    /**
     * SKILL.md recall is hunt-lane and IN-SAMPLE: the 466 benign samples are the
     * set rules are tuned against (32 malicious). Precision and FP on this corpus
     * are not cited for that reason.
     */
    skill: { recall: 100, samples: 498 },
    /**
     * Hunt-lane recall on garak's in-the-wild jailbreak set, ATR 4.1.5. Partly
     * closed-book: some rules were written from this corpus. Always cite the lane
     * and that caveat; the enforce lane (used when blocking is on) recalls far less.
     */
    garak: { recall: 92.3, samples: 650 },
    /**
     * garak's full probe corpus (23 families, 3,475 prompts), hunt lane, ATR 4.1.5
     * (agent-threat-rules data/measurements/garak-full/latest.json). The per-family
     * figures belong to this corpus, not to the 650-sample in-the-wild set above.
     * Also partly closed-book: rules were written from garak's probe corpus.
     */
    garakFull: {
      recall: 57.2,
      samples: 3_475,
      families: 23,
      perFamily: { latentinjection: 34.4, sysprompt_extraction: 96.4, dan: 92.5 },
    },
    /**
     * Attack-only corpus: precision and FP are mathematically undefined, so not cited.
     * Closed-book: ATR mined rules from this corpus's misses, and baselineRecall is
     * ATR's own recall before those rules. Measured on ATR v3.5.0 (2026-06-16).
     */
    hackaprompt: { recall: 69.6, samples: 4_780, baselineRecall: 28.6 },
    /**
     * The lane-based benign-gate FP rates (enforce ~0.24% / hunt ~9%, "65K
     * samples") were withdrawn by ATR on 2026-09-19 and must not be cited.
     * Re-measurement is pending.
     */
    asOf: '2026-10-14',
  },
  /**
   * 2026-04 wild scan of published agent skills. FROZEN caliber, reconciled
   * 2026-08-27 against the source file in agent-threat-rules
   * (data/full-scan-v2-2026-04-14.json), whose per-registry subtotals add up.
   *
   * Citable: 101,280 scanned / 1,434 flagged, always together with the scan
   * engine (v2.0.0, 113 rules, run 2026-04-13). A flag is a rule match, not a
   * verdict.
   *
   * Not citable in any form, "hundreds" included: a confirmed-malicious count.
   * None of 751, 703 or 552 is a per-skill verdict. 751 is a filtered flag count
   * for one registry (OpenClaw), 703 adds up three accounts' listings, and 552 is
   * two accounts' flagged files, marked malicious by account rather than file by
   * file. 1,302 is the flag total of a separate 2026-04-14 report that does not
   * reconcile with this record.
   *
   * The five sources are OpenClaw, ClawHub, Skills.sh, Hermes Agent and an MCP
   * server crawl (Glama, npm, GitHub, awesome-lists, mcp.so; "MCP Registry" in
   * the record, 5,184 entries). 96,096 is the four SKILL.md registries without
   * that crawl. Cite it only under that label.
   */
  wildScan: {
    skillsScanned: 101_280,
    flagged: 1_434,
    sources: 5,
    engineVersion: 'v2.0.0',
    engineRules: 113,
    scannedOn: '2026-04-13',
    /** The four SKILL.md registries only, without the MCP server crawl (see above). */
    fourRegistrySubset: 96_096,
  },
  /** Standards coverage */
  coverage: {
    owaspAgentic: '10/10',
    safeMcp: 91.8,
    safeMcpDetail: '78/85',
  },
  /** Ecosystem adoption — evidence-tiered per deck v11 (2026-07-02); every merge links to its PR */
  adoption: {
    /** Cisco AI Defense skill-scanner: 314-rule ATR pack merged (deck v11 canonical figure) */
    ciscoRulesMerged: 314,
    /** Microsoft AGT: PR #908 (15 rules) → PR #1277 expanded to 287 rules + weekly auto-sync workflow auto-pulls v2.2.0 */
    microsoftRulesMerged: 287,
    /** Microsoft Copilot SWE Agent → AGT#1981 (5/11 06:07 UTC) regression-test fixtures presuming ATR detection */
    microsoftCopilotLoopIssue: 1981,
    /** 13 external PR merges across 6 external orgs */
    externalPRMerges: 13,
    externalOrgs: 6,
    /**
     * Monthly downloads summed across @panguard-ai/* npm scope + agent-threat-rules
     * + pyatr (PyPI). Manually re-fetched 2026-05-26 from npmjs.org + pypistats.org;
     * not auto-synced from stats.json (that file does not track this number today).
     * TODO: wire scripts/sync-npm-downloads.ts to refresh this monthly.
     */
    npmDownloads30d: 10_046,
    /** Tier-1 institutions with active engagement: Microsoft, Cisco, Gen Digital (Sage), MISP, OWASP, NVIDIA, IBM */
    /** Tier-1 in conversation: Microsoft, Cisco, Gen Digital, MISP, OWASP, NVIDIA (IBM dropped — PR #4109 closed without merge). */
    tier1Institutions: 6,
    /** Vendor + standards-body merges: MISP×2 + OWASP A-S-R-H + Gen Digital Sage */
    standardsBodyMerges: 4,
    /** Production CVE coverage (Spring AI + LiteLLM + Semantic Kernel via ATR v2.1.2/v2.1.4) */
    cveCoverage: [
      'CVE-2026-26030',
      'CVE-2026-25592',
      'CVE-2026-41705',
      'CVE-2026-41712',
      'CVE-2026-41713',
      'CVE-2026-42208',
      'CVE-2025-59536',
      'CVE-2026-21852',
    ],
    cisaKevCovered: 1,
    agentsProtected: 50,
    githubStars: 86,
    /** Agent runtimes PanGuard auto-detects and registers its MCP protection into. */
    platformsSupported: 17,
  },
  /** Platform coverage */
  platform: {
    layerCoverage: '5 of 7' as const,
    /** L2 Audit, L3 Protect, L4 Detect, L5 Deceive, L6 Respond shipped today */
    layersShipped: [2, 3, 4, 5, 6] as const,
    /** L1 Discover (central inventory) + L7 Govern (compliance reporting + AIAM) — coming Q2/Q3 2026 */
    layersComingSoon: [1, 7] as const,
    upstreamMerged: ['Microsoft AGT', 'Cisco AI Defense'] as const,
  },
  /** Written by the ATR Stats Sync Bot. */
  lastUpdated: '2026-10-19T18:21:56.335Z',
} as const;

export type Stats = typeof STATS;

/** Product maturity label */
export type MaturityLevel = 'GA' | 'Beta' | 'ComingSoon';

/** Maturity status for each feature / product */
export const MATURITY: Record<string, MaturityLevel> = {
  scan: 'GA',
  guard: 'GA',
  chat: 'GA',
  threatCloud: 'GA',
  skillAuditor: 'GA',
  mcp: 'GA',
  trap: 'GA',
  report: 'GA',
};
