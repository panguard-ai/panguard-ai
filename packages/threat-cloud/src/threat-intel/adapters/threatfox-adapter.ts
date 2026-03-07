/**
 * ThreatFox Adapter - Abuse.ch IOC Feed
 * ThreatFox 適配器 - Abuse.ch IOC 資料源
 *
 * Fetches IOCs linked to malware families from ThreatFox.
 *
 * API: POST https://threatfox-api.abuse.ch/api/v1/
 * License: CC0 public domain
 *
 * @module @panguard-ai/threat-cloud/threat-intel/adapters/threatfox-adapter
 */

import type {
  ThreatIntelRecord,
  ThreatIntelAdapter,
  ThreatSource,
  AdapterConfig,
  ThreatFoxResponse,
  ThreatFoxEntry,
  ThreatIndicator,
} from '../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = 'https://threatfox.abuse.ch/export/json/recent/';
const USER_AGENT = 'Panguard-ThreatIntel/1.0';

const DEFAULT_CONFIG: AdapterConfig = {
  requestTimeoutMs: 30_000,
  rateLimitPerMinute: 10,
  maxRecords: 1000,
};

/** Strict validation patterns */
const PATTERNS = {
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  domain: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
  md5: /^[a-fA-F0-9]{32}$/,
  sha256: /^[a-fA-F0-9]{64}$/,
} as const;

/** Map ThreatFox ioc_type to our indicator type */
type IndicatorType = ThreatIndicator['type'];

function mapIocType(iocType: string): IndicatorType | null {
  const normalized = iocType.toLowerCase().trim();
  if (normalized === 'ip:port' || normalized === 'ip') return 'ipv4';
  if (normalized === 'domain') return 'domain';
  if (normalized === 'url') return 'url';
  if (normalized === 'md5_hash' || normalized === 'md5') return 'md5';
  if (normalized === 'sha256_hash' || normalized === 'sha256') return 'sha256';
  return null;
}

/** Sanitize a string field — strip injection payloads, truncate */
function sanitize(value: unknown, maxLen = 1000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[^>]*>.*?<\/script>/gi, '[removed]')
    .replace(/javascript:/gi, '[removed]')
    .replace(/on\w+\s*=/gi, '[removed]')
    .slice(0, maxLen);
}

/** Validate date string */
function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/** Validate a URL string strictly */
function isValidUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parse IP address from "ip:port" format.
 * Returns only the IP portion after strict validation.
 */
function parseIpFromIocValue(value: string): string | null {
  // Handle ip:port format
  const colonIdx = value.lastIndexOf(':');
  const ip = colonIdx > 0 ? value.slice(0, colonIdx) : value;
  return PATTERNS.ipv4.test(ip) ? ip : null;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class ThreatFoxAdapter implements ThreatIntelAdapter {
  readonly source: ThreatSource = 'threatfox';

  private readonly config: AdapterConfig;
  private lastRequestAt = 0;

  constructor(config?: Partial<AdapterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch recent IOCs from ThreatFox (last 7 days).
   * @param since - Optional ISO date string; records before this date are skipped.
   */
  async fetch(since?: string): Promise<ThreatIntelRecord[]> {
    await this.rateLimit();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    let rawData: Record<string, Array<Record<string, unknown>>>;
    try {
      const res = await fetch(API_URL, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`ThreatFox API error: ${res.status} ${res.statusText}`);
      }

      rawData = (await res.json()) as Record<string, Array<Record<string, unknown>>>;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`ThreatFox API request timed out after ${this.config.requestTimeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!rawData || typeof rawData !== 'object') return [];

    const sinceDate = since ? new Date(since) : null;
    const records: ThreatIntelRecord[] = [];

    // Export format: { "id": [{ ioc_value, ioc_type, threat_type, malware, ... }] }
    const entries: ThreatFoxEntry[] = [];
    for (const [id, items] of Object.entries(rawData)) {
      const item = items?.[0];
      if (!item) continue;
      entries.push({
        id: String(id),
        ioc: String(item['ioc_value'] ?? ''),
        ioc_type: String(item['ioc_type'] ?? ''),
        threat_type: String(item['threat_type'] ?? ''),
        malware: String(item['malware_printable'] ?? item['malware'] ?? ''),
        confidence_level: typeof item['confidence_level'] === 'number' ? item['confidence_level'] : 50,
        first_seen: String(item['first_seen_utc'] ?? ''),
        last_seen: item['last_seen_utc'] ? String(item['last_seen_utc']) : null,
        tags: Array.isArray(item['tags']) ? (item['tags'] as string[]) : null,
        reference: item['reference'] ? String(item['reference']) : null,
      });
    }

    for (const entry of entries) {
      if (records.length >= this.config.maxRecords) break;

      const record = this.convertEntry(entry, sinceDate);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private convertEntry(entry: ThreatFoxEntry, sinceDate: Date | null): ThreatIntelRecord | null {
    // Validate required fields
    const entryId = typeof entry?.id === 'string' ? entry.id : String(entry?.id ?? '');
    if (!entryId) return null;

    const rawIoc = typeof entry?.ioc === 'string' ? entry.ioc : '';
    if (!rawIoc || rawIoc.length > 2048) return null;

    const rawIocType = typeof entry?.ioc_type === 'string' ? entry.ioc_type : '';
    if (!rawIocType) return null;

    const firstSeen = entry?.first_seen;
    if (!isValidDate(firstSeen)) return null;

    // Incremental sync: skip old records
    if (sinceDate && new Date(firstSeen) <= sinceDate) return null;

    // Map ioc_type to our indicator type
    const indicatorType = mapIocType(rawIocType);
    if (!indicatorType) return null;

    // Build the indicator with strict validation per type
    const indicator = this.buildIndicator(indicatorType, rawIoc, firstSeen, entry);
    if (!indicator) return null;

    const malware = sanitize(entry?.malware, 200) || 'unknown';
    const threatType = sanitize(entry?.threat_type, 200) || 'unknown';
    const confidence = typeof entry?.confidence_level === 'number'
      ? Math.max(0, Math.min(100, entry.confidence_level))
      : 50;
    const tags = Array.isArray(entry?.tags)
      ? entry.tags.filter((t): t is string => typeof t === 'string').map((t) => sanitize(t, 100))
      : [];

    const title = `ThreatFox: ${malware} - ${threatType} (${rawIocType})`;
    const descriptionParts = [
      `IOC reported to ThreatFox.`,
      `Malware: ${malware}`,
      `Threat type: ${threatType}`,
      `IOC type: ${sanitize(rawIocType, 100)}`,
      `Confidence: ${confidence}%`,
      tags.length > 0 ? `Tags: ${tags.join(', ')}` : null,
    ];

    const references: string[] = [];
    const rawRef = entry?.reference;
    if (isValidUrl(rawRef)) {
      references.push(rawRef);
    }

    const description = descriptionParts.filter(Boolean).join('\n');

    // Determine severity from confidence
    const severity = this.confidenceToSeverity(confidence);

    return {
      id: `threatfox:${entryId}`,
      source: 'threatfox',
      type: 'ioc',
      title,
      description,
      severity,
      cvssScore: null,
      cveIds: [],
      cweIds: [],
      mitreTechniques: [],
      indicators: [indicator],
      affectedProducts: [],
      references,
      publishedAt: firstSeen,
      modifiedAt: isValidDate(entry?.last_seen) ? entry.last_seen : null,
      fetchedAt: new Date().toISOString(),
      sourceReliability: 'high',
      validation: {
        valid: true,
        score: 100,
        checks: [],
        validatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Build a validated ThreatIndicator from the raw IOC value.
   * Returns null if the value fails strict validation for the given type.
   */
  private buildIndicator(
    type: IndicatorType,
    rawValue: string,
    firstSeen: string,
    entry: ThreatFoxEntry,
  ): ThreatIndicator | null {
    const lastSeen = isValidDate(entry?.last_seen) ? entry.last_seen : null;
    const malware = sanitize(entry?.malware, 200) || 'unknown';
    const context = `${malware}_ioc`;

    switch (type) {
      case 'ipv4': {
        const ip = parseIpFromIocValue(rawValue);
        if (!ip) return null;
        return { type: 'ipv4', value: ip, context, firstSeen, lastSeen };
      }
      case 'domain': {
        if (!PATTERNS.domain.test(rawValue)) return null;
        return { type: 'domain', value: rawValue, context, firstSeen, lastSeen };
      }
      case 'url': {
        if (!isValidUrl(rawValue)) return null;
        return { type: 'url', value: rawValue, context, firstSeen, lastSeen };
      }
      case 'md5': {
        if (!PATTERNS.md5.test(rawValue)) return null;
        return { type: 'md5', value: rawValue, context, firstSeen, lastSeen };
      }
      case 'sha256': {
        if (!PATTERNS.sha256.test(rawValue)) return null;
        return { type: 'sha256', value: rawValue, context, firstSeen, lastSeen };
      }
      default:
        return null;
    }
  }

  /** Map ThreatFox confidence to severity level */
  private confidenceToSeverity(confidence: number): ThreatIntelRecord['severity'] {
    if (confidence >= 90) return 'critical';
    if (confidence >= 70) return 'high';
    if (confidence >= 50) return 'medium';
    if (confidence >= 30) return 'low';
    return 'none';
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
