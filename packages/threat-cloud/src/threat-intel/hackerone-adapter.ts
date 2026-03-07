/**
 * HackerOne Hacktivity Adapter
 * HackerOne 公開漏洞報告適配器
 *
 * Fetches publicly disclosed vulnerability reports from the HackerOne
 * Hacktivity API. Only retrieves public data — no authentication required.
 *
 * API: https://api.hackerone.com/v1/hackers/hacktivity
 * License: Public data, fair use
 *
 * @module @panguard-ai/threat-cloud/threat-intel/hackerone-adapter
 */

import type {
  HackerOneConfig,
  HackerOneHacktivityItem,
  HackerOneHacktivityResponse,
  StoredReport,
} from './types.js';

const DEFAULT_CONFIG: HackerOneConfig = {
  minSeverity: 'medium',
  maxReports: 100,
  requestTimeoutMs: 30_000,
  rateLimitPerMinute: 10,
};

const SEVERITY_ORDER = ['none', 'low', 'medium', 'high', 'critical'] as const;

const HACKTIVITY_API = 'https://api.hackerone.com/v1/hackers/hacktivity';
const PAGE_SIZE = 25;

/** CWE name → CWE ID mapping for common web vulnerabilities */
const CWE_NAME_TO_ID: Record<string, string> = {
  'code injection': 'CWE-94',
  'sql injection': 'CWE-89',
  'cross-site scripting (xss)': 'CWE-79',
  'cross site scripting': 'CWE-79',
  'xss': 'CWE-79',
  'server-side request forgery (ssrf)': 'CWE-918',
  'ssrf': 'CWE-918',
  'open redirect': 'CWE-601',
  'path traversal': 'CWE-22',
  'command injection': 'CWE-78',
  'os command injection': 'CWE-78',
  'xml external entity (xxe)': 'CWE-611',
  'xxe': 'CWE-611',
  'cross-site request forgery (csrf)': 'CWE-352',
  'csrf': 'CWE-352',
  'insecure direct object reference (idor)': 'CWE-639',
  'idor': 'CWE-639',
  'information disclosure': 'CWE-200',
  'authentication bypass': 'CWE-287',
  'authorization bypass': 'CWE-863',
  'privilege escalation': 'CWE-269',
  'file upload': 'CWE-434',
  'unrestricted upload': 'CWE-434',
  'deserialization': 'CWE-502',
  'insecure deserialization': 'CWE-502',
  'race condition': 'CWE-362',
  'denial of service': 'CWE-400',
  'improper access control': 'CWE-284',
  'business logic errors': 'CWE-840',
  'cryptographic issues': 'CWE-310',
  'improper authentication': 'CWE-287',
  'missing authorization': 'CWE-862',
  'incorrect authorization': 'CWE-863',
};

export class HackerOneAdapter {
  private readonly config: HackerOneConfig;
  private lastRequestAt = 0;

  constructor(config?: Partial<HackerOneConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch publicly disclosed reports from HackerOne Hacktivity.
   * Pages through results since most items are undisclosed.
   */
  async fetchReports(since?: string): Promise<StoredReport[]> {
    const reports: StoredReport[] = [];
    let pageNumber = 1;
    // Most items are undisclosed (~1-3 per page of 25 are disclosed),
    // so we need many pages. Cap at reasonable limit.
    const maxPages = Math.min(Math.ceil(this.config.maxReports * 12), 200);
    let consecutiveEmpty = 0;

    while (pageNumber <= maxPages && reports.length < this.config.maxReports) {
      await this.rateLimit();

      const url = `${HACKTIVITY_API}?page%5Bsize%5D=${PAGE_SIZE}&page%5Bnumber%5D=${pageNumber}`;
      const response = await this.fetchPage(url);
      if (!response) break;

      // No more data
      if (response.data.length === 0) break;

      const beforeCount = reports.length;

      for (const item of response.data) {
        if (reports.length >= this.config.maxReports) break;

        // Only disclosed reports with title
        if (!item.attributes.disclosed || !item.attributes.title) continue;

        // Incremental: skip if before `since`
        if (since && item.attributes.disclosed_at) {
          if (new Date(item.attributes.disclosed_at) <= new Date(since)) continue;
        }

        if (!this.meetsMinSeverity(item)) continue;

        const stored = this.toStoredReport(item);
        if (stored) reports.push(stored);
      }

      // Track consecutive pages with no new disclosed reports
      if (reports.length === beforeCount) {
        consecutiveEmpty++;
      } else {
        consecutiveEmpty = 0;
      }

      // Stop if 15+ consecutive pages with no finds (we've run out)
      if (consecutiveEmpty >= 15) break;

      pageNumber++;
    }

    return reports;
  }

  /** Fetch a single page from the API */
  private async fetchPage(url: string): Promise<HackerOneHacktivityResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Panguard-ThreatIntel/1.0 (https://panguard.ai)',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) return null;
        throw new Error(`HackerOne API error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as HackerOneHacktivityResponse;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`HackerOne API request timed out after ${this.config.requestTimeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Enforce rate limiting between requests */
  private async rateLimit(): Promise<void> {
    const minInterval = 60_000 / this.config.rateLimitPerMinute;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  /** Check if report meets minimum severity threshold */
  private meetsMinSeverity(item: HackerOneHacktivityItem): boolean {
    const rating = item.attributes.severity_rating?.toLowerCase() ?? 'none';
    const minIdx = SEVERITY_ORDER.indexOf(this.config.minSeverity);
    const reportIdx = SEVERITY_ORDER.indexOf(rating as typeof SEVERITY_ORDER[number]);
    return reportIdx >= minIdx;
  }

  /** Resolve CWE name to CWE ID */
  private resolveCweId(cweName: string | null): string | null {
    if (!cweName) return null;
    const normalized = cweName.toLowerCase().trim();
    return CWE_NAME_TO_ID[normalized] ?? null;
  }

  /** Convert API item to our stored format */
  private toStoredReport(item: HackerOneHacktivityItem): StoredReport | null {
    const attrs = item.attributes;
    if (!attrs.disclosed_at || !attrs.title) return null;

    const severity = (attrs.severity_rating?.toLowerCase() ?? 'medium') as StoredReport['severity'];
    const summary = item.relationships?.report_generated_content?.data?.attributes?.hacktivity_summary ?? null;

    return {
      id: String(item.id),
      title: attrs.title,
      severity,
      cweId: this.resolveCweId(attrs.cwe),
      cweName: attrs.cwe,
      cveIds: attrs.cve_ids ?? [],
      summary,
      disclosedAt: attrs.disclosed_at,
      programHandle: item.relationships?.program?.data?.attributes?.handle ?? null,
      programName: item.relationships?.program?.data?.attributes?.name ?? null,
      reporterUsername: item.relationships?.reporter?.data?.attributes?.username ?? null,
      url: attrs.url ?? `https://hackerone.com/reports/${item.id}`,
      fetchedAt: new Date().toISOString(),
    };
  }
}
