/**
 * OSV.dev Adapter
 * 開源漏洞資料庫適配器
 *
 * Queries the OSV.dev API for open-source vulnerability data across multiple
 * ecosystems (npm, PyPI, Go, Maven, crates.io). Results are normalised into
 * ThreatIntelRecord format.
 *
 * API docs: https://osv.dev/docs/
 * License: CC-BY 4.0
 *
 * @module @panguard-ai/threat-cloud/threat-intel/adapters/osv-adapter
 */

import type {
  ThreatIntelAdapter,
  ThreatIntelRecord,
  ThreatSource,
  AdapterConfig,
  OsvVulnerability,
  OsvQueryResponse,
  AffectedProduct,
  ValidationStatus,
} from '../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OSV_QUERY_URL = 'https://api.osv.dev/v1/querybatch';

const SUPPORTED_ECOSYSTEMS = ['npm', 'PyPI', 'Go', 'Maven', 'crates.io'] as const;

/** Popular packages to query per ecosystem for broad vulnerability coverage */
const ECOSYSTEM_PACKAGES: Record<string, string[]> = {
  'npm': ['express', 'lodash', 'axios', 'next', 'react', 'webpack', 'jsonwebtoken', 'moment', 'node-fetch', 'sharp'],
  'PyPI': ['django', 'flask', 'requests', 'numpy', 'pillow', 'cryptography', 'jinja2', 'sqlalchemy', 'pyyaml', 'urllib3'],
  'Go': ['github.com/gin-gonic/gin', 'github.com/gorilla/mux', 'golang.org/x/crypto', 'github.com/golang-jwt/jwt', 'github.com/stretchr/testify'],
  'Maven': ['org.apache.logging.log4j:log4j-core', 'org.springframework:spring-core', 'com.fasterxml.jackson.core:jackson-databind', 'org.apache.commons:commons-text'],
  'crates.io': ['hyper', 'tokio', 'serde', 'reqwest', 'actix-web'],
};

const DEFAULT_CONFIG: AdapterConfig = {
  requestTimeoutMs: 30_000,
  rateLimitPerMinute: 30,
  maxRecords: 500,
};

/** Strict pattern for OSV IDs: prefix-year-number or similar */
const OSV_ID_PATTERN = /^[A-Za-z0-9][\w.-]{1,100}$/;

/** Strict CVE pattern */
const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/;

/** Basic sanitisation */
function sanitizeString(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isValidIsoDate(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

function freshValidation(): ValidationStatus {
  return { valid: true, score: 100, checks: [], validatedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OsvAdapter implements ThreatIntelAdapter {
  readonly source: ThreatSource = 'osv';
  private readonly config: AdapterConfig;
  private readonly ecosystems: readonly string[];
  private lastRequestAt = 0;

  constructor(
    config?: Partial<AdapterConfig>,
    ecosystems?: readonly string[],
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ecosystems = ecosystems ?? SUPPORTED_ECOSYSTEMS;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  async fetch(since?: string): Promise<ThreatIntelRecord[]> {
    const records: ThreatIntelRecord[] = [];
    const seenIds = new Set<string>();

    for (const ecosystem of this.ecosystems) {
      if (records.length >= this.config.maxRecords) break;

      const perEcosystem = await this.fetchEcosystem(
        String(ecosystem),
        since,
        this.config.maxRecords - records.length,
      );

      for (const rec of perEcosystem) {
        if (!seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          records.push(rec);
        }
      }
    }

    return records;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async fetchEcosystem(
    ecosystem: string,
    since: string | undefined,
    remaining: number,
  ): Promise<ThreatIntelRecord[]> {
    const records: ThreatIntelRecord[] = [];
    const packages = ECOSYSTEM_PACKAGES[ecosystem] ?? [];

    // Build batch query for all packages in this ecosystem
    const queries = packages.map(name => ({ package: { ecosystem, name } }));
    if (queries.length === 0) return records;

    await this.rateLimit();

    const response = await this.postQuery({ queries });
    if (!response) return records;

    // Batch response: { results: [{ vulns: [...] }, ...] }
    const batchResults = (response as unknown as { results?: Array<{ vulns?: OsvVulnerability[] }> })?.results;
    if (!Array.isArray(batchResults)) return records;

    const sinceDate = since ? new Date(since) : null;

    for (const result of batchResults) {
      const vulns = result?.vulns;
      if (!Array.isArray(vulns)) continue;

      for (const vuln of vulns) {
        if (records.length >= remaining) break;
        if (!vuln?.id) continue;

        if (sinceDate && vuln.modified) {
          const modDate = new Date(vuln.modified);
          if (!Number.isNaN(modDate.getTime()) && modDate <= sinceDate) continue;
        }

        const record = this.toRecord(vuln);
        if (record) records.push(record);
      }
    }

    return records;
  }

  private async postQuery(body: Record<string, unknown>): Promise<OsvQueryResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const res = await fetch(OSV_QUERY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'Panguard-ThreatIntel/1.0',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) return null;
        throw new Error(`OSV API error: ${String(res.status)} ${String(res.statusText)}`);
      }

      const data: unknown = await res.json();
      if (typeof data !== 'object' || data === null) return null;
      return data as OsvQueryResponse;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(
          `OSV API request timed out after ${String(this.config.requestTimeoutMs)}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private toRecord(vuln: OsvVulnerability): ThreatIntelRecord | null {
    const rawId = sanitizeString(vuln?.id, 100);
    if (!OSV_ID_PATTERN.test(rawId)) return null;

    const title = sanitizeString(vuln?.summary, 500) || rawId;
    const description = sanitizeString(vuln?.details, 10_000) || null;

    // Extract CVE aliases
    const cveIds: string[] = [];
    if (Array.isArray(vuln?.aliases)) {
      for (const alias of vuln.aliases) {
        const cleaned = sanitizeString(alias, 30);
        if (CVE_PATTERN.test(cleaned)) {
          cveIds.push(cleaned);
        }
      }
    }

    // Extract CVSS score and severity
    let cvssScore: number | null = null;
    if (Array.isArray(vuln?.severity)) {
      for (const sev of vuln.severity) {
        if (sev?.type === 'CVSS_V3' && typeof sev.score === 'string') {
          const parsed = this.parseCvssScore(sev.score);
          if (parsed !== null) {
            cvssScore = parsed;
            break;
          }
        }
      }
    }

    const severity = this.cvssToSeverity(cvssScore);

    // Extract affected packages
    const affectedProducts: AffectedProduct[] = [];
    if (Array.isArray(vuln?.affected)) {
      for (const aff of vuln.affected) {
        const pkgName = sanitizeString(aff?.package?.name, 200);
        const ecosystem = sanitizeString(aff?.package?.ecosystem, 50);
        if (!pkgName) continue;

        let versionRange: string | null = null;
        let fixedVersion: string | null = null;

        if (Array.isArray(aff?.ranges)) {
          for (const range of aff.ranges) {
            if (!Array.isArray(range?.events)) continue;
            for (const event of range.events) {
              if (event?.introduced) {
                const intro = sanitizeString(event.introduced, 50);
                versionRange = versionRange ? versionRange : `>=${intro}`;
              }
              if (event?.fixed) {
                fixedVersion = sanitizeString(event.fixed, 50) || null;
                if (versionRange && fixedVersion) {
                  versionRange = `${versionRange}, <${fixedVersion}`;
                }
              }
            }
          }
        }

        affectedProducts.push({
          name: pkgName,
          vendor: ecosystem || null,
          versionRange,
          fixedVersion,
        });
      }
    }

    // Reference URLs
    const references: string[] = [];
    if (Array.isArray(vuln?.references)) {
      for (const ref of vuln.references) {
        const url = sanitizeString(ref?.url, 2048);
        if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
          references.push(url);
        }
      }
    }

    const publishedAt = isValidIsoDate(vuln?.published)
      ? String(vuln.published)
      : new Date().toISOString();
    const modifiedAt = isValidIsoDate(vuln?.modified) ? String(vuln.modified) : null;

    return {
      id: `osv:${rawId}`,
      source: 'osv',
      type: 'vulnerability',
      title,
      description,
      severity,
      cvssScore,
      cveIds,
      cweIds: [],
      mitreTechniques: [],
      indicators: [],
      affectedProducts,
      references,
      publishedAt,
      modifiedAt,
      fetchedAt: new Date().toISOString(),
      sourceReliability: 'high',
      validation: freshValidation(),
    };
  }

  /**
   * Parse a CVSS v3 vector string to extract the base score.
   * OSV stores the full vector (e.g. "CVSS:3.1/AV:N/AC:L/...") in the score
   * field. We try to parse the numeric score first; if that fails we look for
   * a trailing /S:n.n pattern. Returns null if unparseable.
   */
  private parseCvssScore(raw: string): number | null {
    // Sometimes the field is just a numeric score
    const direct = parseFloat(raw);
    if (!Number.isNaN(direct) && direct >= 0 && direct <= 10) {
      return Math.round(direct * 10) / 10;
    }
    // CVSS vector strings don't embed the score directly; return null
    return null;
  }

  private cvssToSeverity(score: number | null): ThreatIntelRecord['severity'] {
    if (score === null) return 'medium';
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    if (score > 0) return 'low';
    return 'none';
  }

  private async rateLimit(): Promise<void> {
    const minInterval = 60_000 / this.config.rateLimitPerMinute;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }
    this.lastRequestAt = Date.now();
  }
}
