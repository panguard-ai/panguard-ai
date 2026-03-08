/**
 * AlienVault OTX (Open Threat Exchange) Adapter
 * AlienVault OTX 適配器 - 開放威脅情報交換平台
 *
 * Fetches threat intelligence pulses from AlienVault OTX.
 *
 * Strategy:
 * - Authenticated (OTX_API_KEY env var): uses /api/v1/pulses/subscribed
 * - Public fallback: uses /otxapi/pulses listing + per-pulse /indicators/
 *
 * Gracefully returns empty array when API key is missing or invalid.
 *
 * License: Public community data
 *
 * @module @panguard-ai/threat-cloud/threat-intel/adapters/otx-adapter
 */

import type {
  ThreatIntelRecord,
  ThreatIntelAdapter,
  ThreatSource,
  AdapterConfig,
  OtxPulseResponse,
  OtxPulse,
  OtxIndicator,
  ThreatIndicator,
} from '../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Authenticated endpoint — returns full pulses with indicators */
const SUBSCRIBED_API = 'https://otx.alienvault.com/api/v1/pulses/subscribed';
/** Public listing endpoint — returns pulse metadata (no indicators) */
const PUBLIC_PULSES_API = 'https://otx.alienvault.com/otxapi/pulses';
/** Public per-pulse indicators endpoint (no auth required) */
const PULSE_INDICATORS_API = 'https://otx.alienvault.com/otxapi/pulses';
const USER_AGENT = 'Panguard-ThreatIntel/1.0';
const MAX_PAGES = 5;
/** Max indicators to fetch per pulse in public mode */
const MAX_INDICATORS_PER_PULSE = 200;

const DEFAULT_CONFIG: AdapterConfig = {
  requestTimeoutMs: 30_000,
  rateLimitPerMinute: 60, // 10,000/hr ~ 166/min, keep conservative
  maxRecords: 5000,
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Map OTX indicator type strings to our normalized types */
const OTX_TYPE_MAP: Record<string, ThreatIndicator['type']> = {
  IPv4: 'ipv4',
  IPv6: 'ipv6',
  domain: 'domain',
  hostname: 'domain',
  URL: 'url',
  URI: 'url',
  'FileHash-MD5': 'md5',
  'FileHash-SHA1': 'sha1',
  'FileHash-SHA256': 'sha256',
  email: 'email',
};

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPV6_RE = /^(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$/;
const DOMAIN_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const MD5_RE = /^[a-fA-F0-9]{32}$/;
const SHA1_RE = /^[a-fA-F0-9]{40}$/;
const SHA256_RE = /^[a-fA-F0-9]{64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CVE_RE = /CVE-\d{4}-\d{4,}/g;

function isValidUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/** Validate an indicator value against its declared type */
function isValidIndicatorValue(type: ThreatIndicator['type'], value: string): boolean {
  switch (type) {
    case 'ipv4':
      return IPV4_RE.test(value);
    case 'ipv6':
      return IPV6_RE.test(value);
    case 'domain':
      return value.length <= 253 && DOMAIN_RE.test(value);
    case 'url':
      return isValidUrl(value);
    case 'md5':
      return MD5_RE.test(value);
    case 'sha1':
      return SHA1_RE.test(value);
    case 'sha256':
      return SHA256_RE.test(value);
    case 'email':
      return value.length <= 254 && EMAIL_RE.test(value);
    case 'filename':
      return value.length > 0 && value.length <= 255;
    default:
      return false;
  }
}

/** Sanitize a string field -- strip injection payloads, truncate */
function sanitize(value: unknown, maxLen = 1000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[^>]*>.*?<\/script>/gi, '[removed]')
    .replace(/javascript:/gi, '[removed]')
    .replace(/on\w+\s*=/gi, '[removed]')
    .slice(0, maxLen);
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OtxAdapter implements ThreatIntelAdapter {
  readonly source: ThreatSource = 'alienvault-otx';

  private readonly config: AdapterConfig;
  private readonly apiKey: string | null;
  private lastRequestAt = 0;

  constructor(config?: Partial<AdapterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiKey = typeof process !== 'undefined'
      ? (process.env?.['OTX_API_KEY'] ?? null)
      : null;
  }

  /**
   * Fetch OTX pulses and convert indicators to ThreatIntelRecords.
   *
   * Strategy:
   * - If OTX_API_KEY is set, use the authenticated `/api/v1/pulses/subscribed`
   *   endpoint which returns full pulses with embedded indicators.
   * - Otherwise, use the public `/otxapi/pulses` listing to discover pulses,
   *   then fetch each pulse's indicators via `/otxapi/pulses/{id}/indicators/`.
   *
   * Gracefully returns an empty array on auth errors or missing API key failures.
   *
   * @param since - Optional ISO date string; pulses before this date are skipped.
   */
  async fetch(since?: string): Promise<ThreatIntelRecord[]> {
    try {
      if (this.apiKey) {
        return await this.fetchAuthenticated(since);
      }
      return await this.fetchPublic(since);
    } catch {
      // Graceful degradation: return empty array on any unhandled error
      return [];
    }
  }

  /**
   * Authenticated path: use /api/v1/pulses/subscribed (returns indicators inline).
   */
  private async fetchAuthenticated(since?: string): Promise<ThreatIntelRecord[]> {
    const sinceDate = since ? new Date(since) : null;
    const records: ThreatIntelRecord[] = [];
    let page = 1;

    while (page <= MAX_PAGES && records.length < this.config.maxRecords) {
      await this.rateLimit();

      const sinceParam = since ? `&modified_since=${encodeURIComponent(since)}` : '';
      const url = `${SUBSCRIBED_API}?limit=50&page=${page}${sinceParam}`;
      const response = await this.fetchPage(url, true);
      if (!response) break;

      const pulses = response?.results;
      if (!Array.isArray(pulses) || pulses.length === 0) break;

      for (const pulse of pulses) {
        if (records.length >= this.config.maxRecords) break;
        const converted = this.convertPulse(pulse, sinceDate);
        for (const rec of converted) {
          if (records.length >= this.config.maxRecords) break;
          records.push(rec);
        }
      }

      if (!response?.next) break;
      page++;
    }

    return records;
  }

  /**
   * Public (no-auth) path: list pulses then fetch indicators per pulse.
   */
  private async fetchPublic(since?: string): Promise<ThreatIntelRecord[]> {
    const sinceDate = since ? new Date(since) : null;
    const records: ThreatIntelRecord[] = [];
    let page = 1;

    while (page <= MAX_PAGES && records.length < this.config.maxRecords) {
      await this.rateLimit();

      const url = `${PUBLIC_PULSES_API}?limit=50&page=${page}&sort=-modified`;
      const response = await this.fetchPage(url, false);
      if (!response) break;

      const pulses = response?.results;
      if (!Array.isArray(pulses) || pulses.length === 0) break;

      for (const pulse of pulses) {
        if (records.length >= this.config.maxRecords) break;

        // Public listing does not include indicators; fetch them separately
        const indicators = await this.fetchPulseIndicators(pulse.id);
        const enrichedPulse: OtxPulse = { ...pulse, indicators };

        const converted = this.convertPulse(enrichedPulse, sinceDate);
        for (const rec of converted) {
          if (records.length >= this.config.maxRecords) break;
          records.push(rec);
        }
      }

      if (!response?.next) break;
      page++;
    }

    return records;
  }

  /**
   * Fetch indicators for a specific pulse via the public otxapi endpoint.
   * Returns an empty array on failure (graceful degradation).
   */
  private async fetchPulseIndicators(pulseId: string): Promise<OtxIndicator[]> {
    if (!pulseId) return [];

    try {
      await this.rateLimit();
      const url = `${PULSE_INDICATORS_API}/${encodeURIComponent(pulseId)}/indicators/?limit=${MAX_INDICATORS_PER_PULSE}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
          signal: controller.signal,
        });

        if (!res.ok) return [];

        const data = (await res.json()) as { results?: OtxIndicator[] };
        return Array.isArray(data?.results) ? data.results : [];
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async fetchPage(url: string, useAuth: boolean): Promise<OtxPulseResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    };
    if (useAuth && this.apiKey) {
      headers['X-OTX-API-KEY'] = this.apiKey;
    }

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) return null;
        // Auth failure: return null instead of throwing (graceful degradation)
        if (res.status === 401 || res.status === 403) return null;
        throw new Error(`OTX API error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as OtxPulseResponse;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`OTX API request timed out after ${this.config.requestTimeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Convert a single OTX pulse to one or more ThreatIntelRecords.
   * Each pulse maps to a single record containing all its indicators.
   */
  private convertPulse(pulse: OtxPulse, sinceDate: Date | null): ThreatIntelRecord[] {
    // Validate pulse shape
    const pulseId = typeof pulse?.id === 'string' ? pulse.id : '';
    if (!pulseId) return [];

    const created = pulse?.created;
    if (!isValidIsoDate(created)) return [];

    // Incremental sync: skip old pulses
    if (sinceDate && new Date(created) <= sinceDate) return [];

    const pulseName = sanitize(pulse?.name, 500) || 'Untitled Pulse';
    const pulseDesc = sanitize(pulse?.description, 2000) || null;
    const modified = isValidIsoDate(pulse?.modified) ? pulse.modified : null;

    // Extract valid indicators
    const rawIndicators = Array.isArray(pulse?.indicators) ? pulse.indicators : [];
    const indicators: ThreatIndicator[] = [];

    for (const ind of rawIndicators) {
      const mapped = this.convertIndicator(ind, created);
      if (mapped) {
        indicators.push(mapped);
      }
    }

    // Skip pulses with zero valid indicators
    if (indicators.length === 0) return [];

    // Collect references
    const references: string[] = [];
    const rawRefs = Array.isArray(pulse?.references) ? pulse.references : [];
    for (const ref of rawRefs) {
      if (isValidUrl(ref)) {
        references.push(ref);
      }
    }

    // Extract CVEs from description
    const cveIds: string[] = [];
    if (pulseDesc) {
      const matches = pulseDesc.match(CVE_RE);
      if (matches) {
        for (const cve of matches) {
          if (!cveIds.includes(cve)) {
            cveIds.push(cve);
          }
        }
      }
    }

    // Sanitize tags
    const tags = Array.isArray(pulse?.tags)
      ? pulse.tags.filter((t): t is string => typeof t === 'string').map((t) => sanitize(t, 100))
      : [];

    const adversary = sanitize(pulse?.adversary, 200);
    const tlp = sanitize(pulse?.tlp, 20);

    const descParts = [
      pulseDesc,
      adversary ? `Adversary: ${adversary}` : null,
      tlp ? `TLP: ${tlp}` : null,
      tags.length > 0 ? `Tags: ${tags.join(', ')}` : null,
      `Indicators: ${indicators.length}`,
    ].filter(Boolean);

    const record: ThreatIntelRecord = {
      id: `otx:${pulseId}`,
      source: 'alienvault-otx',
      type: 'ioc',
      title: `OTX Pulse: ${pulseName}`,
      description: descParts.join('\n'),
      severity: this.inferSeverity(indicators),
      cvssScore: null,
      cveIds,
      cweIds: [],
      mitreTechniques: [],
      indicators,
      affectedProducts: [],
      references,
      publishedAt: created,
      modifiedAt: modified,
      fetchedAt: new Date().toISOString(),
      sourceReliability: 'medium',
      validation: {
        valid: true,
        score: 100,
        checks: [],
        validatedAt: new Date().toISOString(),
      },
    };

    return [record];
  }

  /** Convert a single OTX indicator to our ThreatIndicator format */
  private convertIndicator(ind: OtxIndicator, pulseCreated: string): ThreatIndicator | null {
    const rawType = typeof ind?.type === 'string' ? ind.type : '';
    const mappedType = OTX_TYPE_MAP[rawType];
    if (!mappedType) return null;

    const value = typeof ind?.indicator === 'string' ? ind.indicator.trim() : '';
    if (!value || value.length > 2048) return null;

    // Validate the indicator value against its type
    if (!isValidIndicatorValue(mappedType, value)) return null;

    const context = sanitize(ind?.title, 200) || sanitize(ind?.description, 200) || null;
    const firstSeen = isValidIsoDate(ind?.created) ? ind.created : pulseCreated;

    return {
      type: mappedType,
      value,
      context,
      firstSeen,
      lastSeen: null,
    };
  }

  /** Infer severity from the types of indicators present */
  private inferSeverity(indicators: ThreatIndicator[]): ThreatIntelRecord['severity'] {
    const hasHash = indicators.some(
      (i) => i.type === 'md5' || i.type === 'sha1' || i.type === 'sha256',
    );
    const hasUrl = indicators.some((i) => i.type === 'url');
    const hasIp = indicators.some((i) => i.type === 'ipv4' || i.type === 'ipv6');

    // Malware hashes or malicious URLs suggest higher severity
    if (hasHash) return 'high';
    if (hasUrl) return 'high';
    if (hasIp) return 'medium';
    return 'medium';
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
}
