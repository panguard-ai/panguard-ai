/**
 * ATR Scanned Badge API
 * Generates shields.io-style SVG badges for AI skills scanned by ATR.
 *
 * Endpoints:
 * - GET /api/badge/:author/:skillName  - SVG badge for a specific skill
 * - GET /api/badge/stats               - JSON summary statistics
 *
 * @module @panguard-ai/threat-cloud/badge-api
 */

import { readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Severity level for a scanned skill */
type BadgeLevel = 'clean' | 'issues' | 'critical' | 'not-scanned';

/** Parsed row from the ecosystem-report CSV */
interface ScanRecord {
  readonly author: string;
  readonly skillName: string;
  readonly riskLevel: string;
  readonly topFindingSeverity: string;
}

/** Badge stats returned by /api/badge/stats */
interface BadgeStats {
  readonly totalSkills: number;
  readonly uniqueAuthors: number;
  readonly clean: number;
  readonly issues: number;
  readonly critical: number;
}

// ---------------------------------------------------------------------------
// SVG generation
// ---------------------------------------------------------------------------

const BADGE_CONFIG: Record<BadgeLevel, { label: string; color: string }> = {
  clean: { label: 'No Issues', color: '#4c1' },
  issues: { label: 'Issues Found', color: '#dfb317' },
  critical: { label: 'CRITICAL', color: '#e05d44' },
  'not-scanned': { label: 'Not Yet Scanned', color: '#9f9f9f' },
} as const;

const BADGE_PREFIX = 'ATR Scanned';

/**
 * Estimate text width using approximate character widths for Verdana 11px.
 * This avoids external font measurement dependencies.
 */
function estimateTextWidth(text: string): number {
  // Average character widths for Verdana ~11px (simplified)
  let width = 0;
  for (const ch of text) {
    if (ch === ' ') {
      width += 3.4;
    } else if (ch >= 'A' && ch <= 'Z') {
      width += 7.5;
    } else if (ch >= 'a' && ch <= 'z') {
      width += 6.2;
    } else {
      width += 6.5;
    }
  }
  return width;
}

/** Generate a flat-style SVG badge */
function generateBadgeSvg(level: BadgeLevel): string {
  const { label, color } = BADGE_CONFIG[level];
  const prefixWidth = Math.round(estimateTextWidth(BADGE_PREFIX)) + 12;
  const labelWidth = Math.round(estimateTextWidth(label)) + 12;
  const totalWidth = prefixWidth + labelWidth;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${BADGE_PREFIX}: ${label}">`,
    '  <title>' + BADGE_PREFIX + ': ' + label + '</title>',
    '  <linearGradient id="s" x2="0" y2="100%">',
    '    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>',
    '    <stop offset="1" stop-opacity=".1"/>',
    '  </linearGradient>',
    `  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>`,
    '  <g clip-path="url(#r)">',
    `    <rect width="${prefixWidth}" height="20" fill="#555"/>`,
    `    <rect x="${prefixWidth}" width="${labelWidth}" height="20" fill="${color}"/>`,
    `    <rect width="${totalWidth}" height="20" fill="url(#s)"/>`,
    '  </g>',
    '  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">',
    `    <text aria-hidden="true" x="${prefixWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${BADGE_PREFIX}</text>`,
    `    <text x="${prefixWidth / 2}" y="14">${BADGE_PREFIX}</text>`,
    `    <text aria-hidden="true" x="${prefixWidth + labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>`,
    `    <text x="${prefixWidth + labelWidth / 2}" y="14">${label}</text>`,
    '  </g>',
    '</svg>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Parse a single CSV line respecting quoted fields */
function parseCsvLine(line: string): readonly string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse the ecosystem-report CSV into a lookup map.
 * Key: "author/skillName" (lowercased), Value: ScanRecord.
 * Deduplicates rows by keeping the one with the highest severity.
 */
function parseCsv(csvContent: string): ReadonlyMap<string, ScanRecord> {
  const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return new Map();

  const severityRank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };

  const result = new Map<string, ScanRecord>();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]!);
    if (fields.length < 7) continue;

    const author = (fields[0] ?? '').trim().toLowerCase();
    const skillName = (fields[1] ?? '').trim().toLowerCase();
    const riskLevel = (fields[4] ?? '').trim().toUpperCase();
    const topFindingSeverity = (fields[6] ?? '').trim().toLowerCase();

    if (!author || !skillName) continue;

    const key = `${author}/${skillName}`;
    const existing = result.get(key);

    // Keep the row with the highest severity
    const existingRank = existing
      ? (severityRank[existing.topFindingSeverity] ?? 0)
      : -1;
    const newRank = severityRank[topFindingSeverity] ?? 0;

    if (newRank > existingRank) {
      result.set(key, { author, skillName, riskLevel, topFindingSeverity });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Badge Router
// ---------------------------------------------------------------------------

export interface BadgeRouter {
  /**
   * Handle an incoming request for badge endpoints.
   * Returns true if the request was handled, false if the path did not match.
   */
  handleRequest(
    pathname: string,
    method: string,
    res: ServerResponse,
  ): boolean;
}

/**
 * Create a badge router that reads scan data from the given CSV path.
 * The CSV is loaded lazily on first request and cached in memory.
 */
export function createBadgeRouter(csvPath: string): BadgeRouter {
  let scanData: ReadonlyMap<string, ScanRecord> | null = null;
  let loadError: string | null = null;

  function ensureLoaded(): ReadonlyMap<string, ScanRecord> {
    if (scanData !== null) return scanData;

    try {
      const content = readFileSync(csvPath, 'utf-8');
      scanData = parseCsv(content);
      loadError = null;
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
      scanData = new Map();
    }

    return scanData;
  }

  function determineBadgeLevel(record: ScanRecord): BadgeLevel {
    const severity = record.topFindingSeverity;
    const riskLevel = record.riskLevel;

    if (severity === 'critical' || riskLevel === 'CRITICAL') {
      return 'critical';
    }
    if (severity === 'high' || riskLevel === 'HIGH') {
      return 'issues';
    }
    return 'clean';
  }

  function computeStats(data: ReadonlyMap<string, ScanRecord>): BadgeStats {
    const authors = new Set<string>();
    let clean = 0;
    let issues = 0;
    let critical = 0;

    for (const record of data.values()) {
      authors.add(record.author);
      const level = determineBadgeLevel(record);
      if (level === 'clean') clean++;
      else if (level === 'issues') issues++;
      else if (level === 'critical') critical++;
    }

    return {
      totalSkills: data.size,
      uniqueAuthors: authors.size,
      clean,
      issues,
      critical,
    };
  }

  function sendSvg(res: ServerResponse, svg: string): void {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.writeHead(200);
    res.end(svg);
  }

  function sendJson(
    res: ServerResponse,
    status: number,
    data: unknown,
  ): void {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.writeHead(status);
    res.end(JSON.stringify(data));
  }

  const BADGE_PREFIX_PATH = '/api/badge/';

  return {
    handleRequest(pathname: string, method: string, res: ServerResponse): boolean {
      if (!pathname.startsWith(BADGE_PREFIX_PATH)) return false;

      if (method !== 'GET') {
        sendJson(res, 405, { ok: false, error: 'Method not allowed' });
        return true;
      }

      const subPath = pathname.slice(BADGE_PREFIX_PATH.length);

      // Stats endpoint
      if (subPath === 'stats') {
        const data = ensureLoaded();
        const stats = computeStats(data);
        sendJson(res, 200, {
          ok: true,
          data: {
            ...stats,
            ...(loadError ? { warning: `CSV load error: ${loadError}` } : {}),
          },
        });
        return true;
      }

      // Badge endpoint: /api/badge/:author/:skillName
      const parts = subPath.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        sendJson(res, 400, {
          ok: false,
          error: 'Invalid badge path. Use /api/badge/:author/:skillName',
        });
        return true;
      }

      const author = decodeURIComponent(parts[0]).toLowerCase();
      const skillName = decodeURIComponent(parts[1]).toLowerCase();

      const data = ensureLoaded();
      const key = `${author}/${skillName}`;
      const record = data.get(key);

      const level: BadgeLevel = record
        ? determineBadgeLevel(record)
        : 'not-scanned';

      sendSvg(res, generateBadgeSvg(level));
      return true;
    },
  };
}

// Exported for testing
export { generateBadgeSvg, parseCsv, parseCsvLine, estimateTextWidth };
export type { BadgeLevel, ScanRecord, BadgeStats };
