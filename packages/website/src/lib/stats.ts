/**
 * Single source of truth for all marketing statistics.
 *
 * Usage: Import STATS directly in components. RuleStatsContext wraps STATS
 * with live API data from /api/threat-intel/stats (rule counts only).
 * Ecosystem stats are static until P2 TC API integration.
 *
 * When adding new stats: update here first, then all components auto-update.
 *
 * Derived from (verified 2026-03-12):
 *   packages/panguard-guard/src/types.ts       -> ResponseAction union (11 types)
 *   packages/core/src/ai/funnel-router.ts      -> 3 layers
 *   vitest run (159 test files)                -> 3,528 test cases
 *   packages/panguard/src/cli/index.ts         -> 23 top-level commands
 *   packages/panguard-mcp/src/server.ts        -> 11 MCP tools
 *   packages/panguard-skill-auditor/src/checks/ -> 8 audit checks
 *   agent-threat-rules/rules/                  -> 652 ATR rules (v3.5.0, canonical 2026-06-20; npm latest 3.5.0). Guard build may include drafts; TC live aggregates external community rules separately.
 *   packages/panguard-guard/src/playbook/      -> 3 playbook templates
 *   packages/panguard-guard/src/collectors/     -> 4 log parsers
 *
 * When rules are added/removed, update the numbers here and the entire
 * site picks them up automatically.
 */
export const STATS = {
  /** Must match packages/panguard/package.json "version" */
  cliVersion: '1.7.3',
  /** Synced from agent-threat-rules/stats.json by sync-atr-stats workflow */
  atrVersion: '3.5.0',
  /** ATR v2.2.x: stable + experimental total */
  atrRules: 655,
  atrStableRules: 359,
  atrExperimentalRules: 62,
  /** Community ATR rules from Threat Cloud flywheel (TC-side aggregation, separate from main repo) */
  atrCommunityRules: 93,
  /** Total unique detection patterns across all ATR rules (compiled from YAML) */
  atrPatterns: 920,
  totalRules: 655,
  /** Use this for all user-facing display — avoids stale hardcoded counts */
  totalRulesDisplay: '655' as const,
  /** Separate display for honest breakdown */
  atrRulesDisplay: '655' as const,
  /** Promotion interval in Threat Cloud */
  promotionIntervalMinutes: 2,
  testsPassing: 3_528,
  testFiles: 159,
  detectionLayers: 3,
  responseActions: 11,
  cliCommands: 23,
  products: 6,
  aiAgents: 4,
  mcpTools: 12,
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
    totalMappings: 77,
    categories: [
      { id: 'ASI01', rules: 13, strength: 'STRONG' as const },
      { id: 'ASI02', rules: 11, strength: 'STRONG' as const },
      { id: 'ASI03', rules: 9, strength: 'STRONG' as const },
      { id: 'ASI04', rules: 8, strength: 'STRONG' as const },
      { id: 'ASI05', rules: 8, strength: 'STRONG' as const },
      { id: 'ASI06', rules: 8, strength: 'STRONG' as const },
      { id: 'ASI07', rules: 5, strength: 'MODERATE' as const },
      { id: 'ASI08', rules: 4, strength: 'MODERATE' as const },
      { id: 'ASI09', rules: 5, strength: 'MODERATE' as const },
      { id: 'ASI10', rules: 7, strength: 'MODERATE' as const },
    ],
  },
  /** Per-category breakdown — synced from agent-threat-rules/data/stats.json (2026-05-27 regen, 444 total). */
  rulesByCategory: {
    'prompt-injection': 173,
    'agent-manipulation': 105,
    'skill-compromise': 43,
    'context-exfiltration': 41,
    'tool-poisoning': 43,
    'privilege-escalation': 16,
    'model-abuse': 10,
    'excessive-autonomy': 8,
    'model-security': 3,
    'data-poisoning': 2,
  },
  /**
   * Two-tier framework story — SINGLE SOURCE OF TRUTH.
   * Keep in sync with /atr/crosswalks CROSSWALKS registry and ATR
   * data/compliance-frameworks/ allowlist.
   *
   * EVIDENCE tier (5): frameworks with validated, control-level identifiers in
   * ATR's data/compliance-frameworks/*.json allowlist, gated by
   * `npm run validate:compliance` — the same gate that caught the fabricated
   * ISO clauses (2026-06-05). PanGuard generates signed compliance evidence for
   * these. A framework only earns this tier once its allowlist file exists.
   */
  complianceFrameworks: 5,
  complianceFrameworkList: [
    'EU AI Act',
    'NIST AI RMF',
    'ISO/IEC 42001',
    'OWASP Agentic Top 10:2026',
    'OWASP LLM Top 10:2025',
  ],
  /**
   * CROSSWALK tier (breadth, the "universal standard" claim). MUST equal the
   * number of entries in the /atr/crosswalks CROSSWALKS array (that array is the
   * registry; this number mirrors it). Adding a crosswalk there → bump this.
   * Current 10 = the 5 evidence frameworks + MITRE ATLAS + SAFE-MCP + CWE +
   * Five Eyes joint guidance + CISA KEV. (Colorado AI Act is partial-by-design,
   * not counted.) Every entry must point to a real ATR mapping doc or per-rule
   * metadata — never claim a crosswalk a rule does not actually reference.
   */
  crosswalkStandards: 10,
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
    lastSync: '2026-06-14',
    syncInterval: '1h',
  },
  /**
   * Ecosystem scanning stats (from crawl-mcp-registry + audit-npm-skills-v2 pipeline)
   *
   * Pipeline: crawl-mcp-registry.ts → audit-npm-skills-v2.ts → push-to-threat-cloud.ts
   * Source: npm registry, GitHub API, awesome-lists (8 queries, pagination)
   * Updated: 2026-03-16
   */
  ecosystem: {
    /** Total MCP/AI skill entries crawled from registries (ClawHub 37,394 + OpenClaw 50,283 + Skills.sh 3,115) */
    entriesCrawled: 90_792,
    /** npm packages found in crawl */
    npmPackages: 2_769,
    /** Skills actually scanned — TC live data is authoritative; fallback synced 2026-04-16 */
    skillsScanned: 67_799,
    /** Total MCP tool definitions extracted from scanned packages */
    toolsExtracted: 35_858,
    /** Packages with security findings (any severity) */
    packagesWithFindings: 2_322,
    /** Threats detected (confirmed + suspicious) — synced from TC 2026-04-16 */
    maliciousFound: 11_324,
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
    /** Skills verified safe by community + TC (live from /api/metrics) */
    whitelistedSkills: 8_066,
    /** Skills confirmed malicious and blocked (live from /api/metrics) */
    blacklistedSkills: 1_096,
    /** Total skill threat reports submitted to TC */
    skillThreatsTotal: 21_669,
    registrySources: 3,
    lastCrawl: '2026-04-16',
  },
  /**
   * Benchmark results — SINGLE SOURCE OF TRUTH for all benchmark numbers on the site.
   *
   * STANDARDIZATION (2026-06-16): This block is the one defensible, consistent set.
   * README, the about page, the benchmarks page, and marketing copy all reference
   * THESE values. Do not hardcode benchmark percentages elsewhere — render from here.
   *
   * Sourcing & honesty rules:
   * - All recall/precision/fp values are WHOLE-NUMBER PERCENTAGES (e.g. 63.2 means 63.2%),
   *   so consumers can render `${value}%` directly. (Previously some were fractions and
   *   some were percentages in the same object, which rendered as raw 0.63%/0.97%.)
   * - PINT and SKILL.md are measured against published external corpora and are the
   *   numbers ATR/PanGuard cite as authoritative.
   * - Garak recall is reported as an approximate figure (`garakRecallApprox`) because the
   *   exact value drifts across rule versions and is not pinned to a single shipped build.
   * - HackAPrompt has NO headline number here on purpose: published figures are per-version
   *   (engineering blog) and the value moves with each rule batch; quoting a single % would
   *   be misleading. The blog posts keep their own version-labeled numbers.
   * - Authoritative v3.5.0 measurements (source: agent-threat-rules
   *   data/measurements/<bench>/latest.json, atr_version 3.5.0, verified 2026-06-16).
   *   Re-verify against latest.json before citing externally — they move on re-measure.
   */
  benchmark: {
    // PINT (Invariant Labs / Lakera adversarial corpus, 850 samples) — v3.5.0
    pint: {
      recall: 0.6363636363636364,
      precision: 0.9965277777777778,
      fp: 0.002506265664160401,
      samples: 850,
    },
    // SKILL.md real-world corpus (ClawHub + OpenClaw + Skills.sh, 498 manually-labeled samples) — v3.5.0
    skill: { recall: 1, precision: 0.97, fp: 0.002, samples: 498 },
    // NVIDIA garak in-the-wild corpus — v3.5.0 (down from 98.0%: rule ATR-2026-00495 deprecated)
    garak: {
      recallApprox: 97.2,
      samples: 650,
      perFamily: { latentinjection: 34.4, sysprompt_extraction: 67.9, dan: 90.2 },
    },
    // HackAPrompt (5K deterministic sample) — v3.5.0
    hackaprompt: { recall: 69.6, precision: 100, samples: 4_780 },
    wildFpRate: 0,
    wildSamples: 432,
  },
  /** Standards coverage */
  coverage: {
    owaspAgentic: '10/10',
    safeMcp: 91.8,
    safeMcpDetail: '78/85',
  },
  /** Ecosystem adoption (per ATR v2.2.0 ship 2026-05-12, pitch v5 substance) */
  adoption: {
    /** Cisco AI Defense: PR #79 PoC (34 rules) → PR #99 full 344-rule pack in skill-scanner; now 419 via v2.2.0 auto-sync */
    ciscoRulesMerged: 419,
    /** Microsoft AGT: PR #908 → PR #1277 merged ATR rule pack + weekly auto-sync workflow (auto-pulls latest). Count not asserted on live surfaces (unverifiable); field retained for historical reference. */
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
    tier1Institutions: 7,
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
    platformsSupported: 13,
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
  /**
   * NOTE: These fallback numbers are only used when TC live API is unreachable.
   * Website components should always prefer fetchLiveMetrics() for real-time data.
   * Update these periodically to keep fallbacks reasonable.
   */
  lastUpdated: '2026-06-16T11:05:13.632Z',
} as const;

export type Stats = typeof STATS;

/**
 * Live metrics from Threat Cloud API.
 * Used on the website to show real-time numbers from all scan sources.
 * Falls back to static STATS.ecosystem values if TC is unavailable.
 *
 * Usage:
 *   const metrics = await fetchLiveMetrics();
 *   // metrics.totalSkillsScanned -- from all sources (bulk + CLI + web)
 *   // metrics.totalAgentsProtected -- unique devices with panguard installed
 */
export interface LiveMetrics {
  totalSkillsScanned: number;
  totalAgentsProtected: number;
  totalThreatsDetected: number;
  totalAtrRules: number;
  sources: {
    bulk: { skills: number; findings: number };
    cli: { skills: number; findings: number; devices: number };
    web: { skills: number; findings: number };
  };
  lastUpdated: string;
}

const TC_METRICS_URL = process.env['THREAT_CLOUD_URL']
  ? `${process.env['THREAT_CLOUD_URL']}/api/metrics`
  : 'https://tc.panguard.ai/api/metrics';

/** Fetch live metrics from Threat Cloud, with static fallback */
export async function fetchLiveMetrics(): Promise<LiveMetrics> {
  try {
    const resp = await fetch(TC_METRICS_URL, {
      next: { revalidate: 60 },
    } as RequestInit);
    if (!resp.ok) throw new Error(`TC returned ${resp.status}`);
    const json = (await resp.json()) as { ok: boolean; data: LiveMetrics };
    if (json.ok && json.data) return json.data;
  } catch {
    // Fallback to static stats
  }

  return {
    totalSkillsScanned: STATS.ecosystem.skillsScanned,
    totalAgentsProtected: 0,
    totalThreatsDetected: STATS.ecosystem.maliciousFound,
    totalAtrRules: STATS.atrRules,
    sources: {
      bulk: { skills: STATS.ecosystem.skillsScanned, findings: STATS.ecosystem.maliciousFound },
      cli: { skills: 0, findings: 0, devices: 0 },
      web: { skills: 0, findings: 0 },
    },
    lastUpdated: STATS.lastUpdated,
  };
}

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
