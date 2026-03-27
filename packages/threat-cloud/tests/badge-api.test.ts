import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createBadgeRouter,
  generateBadgeSvg,
  parseCsv,
  parseCsvLine,
  estimateTextWidth,
} from '../src/badge-api.js';
import type { BadgeLevel } from '../src/badge-api.js';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { ServerResponse } from 'node:http';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal mock for ServerResponse */
function createMockResponse(): {
  res: ServerResponse;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  const state = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    res: null as unknown as ServerResponse,
  };

  const mock = {
    setHeader(name: string, value: string) {
      state.headers[name.toLowerCase()] = value;
    },
    writeHead(status: number) {
      state.statusCode = status;
    },
    end(data?: string) {
      state.body = data ?? '';
    },
  } as unknown as ServerResponse;

  state.res = mock;
  return state;
}

const SAMPLE_CSV = [
  'author,skill_name,downloads,risk_score,risk_level,finding_count,top_finding_severity,top_finding_title,impact_en,impact_zh,risk_summary_en,risk_summary_zh,scanned_at',
  'alice,safe-tool,1000,5,LOW,3,low,"Minor issue","Low impact","Low","Safe","Safe",2026-03-26T00:00:00Z',
  'bob,risky-tool,2000,50,HIGH,8,high,"Credential Theft","High impact","High","Warning","Warning",2026-03-26T00:00:00Z',
  'carol,dangerous-tool,500,90,CRITICAL,12,critical,"Prompt Injection","Critical","Critical","Danger","Danger",2026-03-26T00:00:00Z',
  'alice,medium-tool,800,20,MEDIUM,5,medium,"Some issue","Med impact","Med","Caution","Caution",2026-03-26T00:00:00Z',
].join('\n');

// ---------------------------------------------------------------------------
// Unit: parseCsvLine
// ---------------------------------------------------------------------------

describe('parseCsvLine', () => {
  it('should parse a simple CSV line', () => {
    const fields = parseCsvLine('a,b,c');
    expect(fields).toEqual(['a', 'b', 'c']);
  });

  it('should handle quoted fields with commas', () => {
    const fields = parseCsvLine('alice,safe-tool,1000,5,LOW,3,low,"Some, issue"');
    expect(fields[7]).toBe('Some, issue');
  });

  it('should handle empty fields', () => {
    const fields = parseCsvLine('a,,c');
    expect(fields).toEqual(['a', '', 'c']);
  });
});

// ---------------------------------------------------------------------------
// Unit: estimateTextWidth
// ---------------------------------------------------------------------------

describe('estimateTextWidth', () => {
  it('should return a positive number for non-empty strings', () => {
    expect(estimateTextWidth('ATR Scanned')).toBeGreaterThan(0);
  });

  it('should return 0 for empty string', () => {
    expect(estimateTextWidth('')).toBe(0);
  });

  it('should give wider result for uppercase than lowercase', () => {
    expect(estimateTextWidth('ABC')).toBeGreaterThan(estimateTextWidth('abc'));
  });
});

// ---------------------------------------------------------------------------
// Unit: parseCsv
// ---------------------------------------------------------------------------

describe('parseCsv', () => {
  it('should parse CSV into a map keyed by author/skillName', () => {
    const data = parseCsv(SAMPLE_CSV);
    expect(data.size).toBe(4);
    expect(data.has('alice/safe-tool')).toBe(true);
    expect(data.has('bob/risky-tool')).toBe(true);
    expect(data.has('carol/dangerous-tool')).toBe(true);
  });

  it('should deduplicate rows by keeping highest severity', () => {
    const csvWithDupes = [
      'author,skill_name,downloads,risk_score,risk_level,finding_count,top_finding_severity',
      'alice,tool,100,5,LOW,2,low',
      'alice,tool,100,50,HIGH,5,high',
    ].join('\n');
    const data = parseCsv(csvWithDupes);
    expect(data.size).toBe(1);
    const record = data.get('alice/tool');
    expect(record?.topFindingSeverity).toBe('high');
  });

  it('should handle empty CSV', () => {
    const data = parseCsv('');
    expect(data.size).toBe(0);
  });

  it('should handle header-only CSV', () => {
    const data = parseCsv('author,skill_name,downloads\n');
    expect(data.size).toBe(0);
  });

  it('should lowercase author and skill names', () => {
    const csv = [
      'author,skill_name,downloads,risk_score,risk_level,finding_count,top_finding_severity',
      'Alice,My-Tool,100,5,LOW,2,low',
    ].join('\n');
    const data = parseCsv(csv);
    expect(data.has('alice/my-tool')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit: generateBadgeSvg
// ---------------------------------------------------------------------------

describe('generateBadgeSvg', () => {
  const levels: BadgeLevel[] = ['clean', 'issues', 'critical', 'not-scanned'];

  for (const level of levels) {
    it(`should generate valid SVG for level "${level}"`, () => {
      const svg = generateBadgeSvg(level);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('ATR Scanned');
    });
  }

  it('should include green color for clean', () => {
    const svg = generateBadgeSvg('clean');
    expect(svg).toContain('#4c1');
    expect(svg).toContain('No Issues');
  });

  it('should include yellow color for issues', () => {
    const svg = generateBadgeSvg('issues');
    expect(svg).toContain('#dfb317');
    expect(svg).toContain('Issues Found');
  });

  it('should include red color for critical', () => {
    const svg = generateBadgeSvg('critical');
    expect(svg).toContain('#e05d44');
    expect(svg).toContain('CRITICAL');
  });

  it('should include gray color for not-scanned', () => {
    const svg = generateBadgeSvg('not-scanned');
    expect(svg).toContain('#9f9f9f');
    expect(svg).toContain('Not Yet Scanned');
  });
});

// ---------------------------------------------------------------------------
// Integration: createBadgeRouter
// ---------------------------------------------------------------------------

describe('createBadgeRouter', () => {
  let tempDir: string;
  let csvPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'badge-test-'));
    csvPath = join(tempDir, 'ecosystem-report.csv');
    writeFileSync(csvPath, SAMPLE_CSV, 'utf-8');
  });

  // Cleanup is best-effort
  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('should return false for non-badge paths', () => {
    const router = createBadgeRouter(csvPath);
    const { res } = createMockResponse();
    expect(router.handleRequest('/api/stats', 'GET', res)).toBe(false);
  });

  it('should return 405 for non-GET methods', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    const handled = router.handleRequest('/api/badge/alice/safe-tool', 'POST', mock.res);
    expect(handled).toBe(true);
    expect(mock.statusCode).toBe(405);
  });

  it('should return green badge for clean skill', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/alice/safe-tool', 'GET', mock.res);
    expect(mock.statusCode).toBe(200);
    expect(mock.headers['content-type']).toBe('image/svg+xml');
    expect(mock.body).toContain('No Issues');
    expect(mock.body).toContain('#4c1');
  });

  it('should return yellow badge for HIGH risk skill', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/bob/risky-tool', 'GET', mock.res);
    expect(mock.statusCode).toBe(200);
    expect(mock.body).toContain('Issues Found');
  });

  it('should return red badge for CRITICAL skill', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/carol/dangerous-tool', 'GET', mock.res);
    expect(mock.statusCode).toBe(200);
    expect(mock.body).toContain('CRITICAL');
    expect(mock.body).toContain('#e05d44');
  });

  it('should return gray badge for unknown skill', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/unknown/nonexistent', 'GET', mock.res);
    expect(mock.statusCode).toBe(200);
    expect(mock.body).toContain('Not Yet Scanned');
    expect(mock.body).toContain('#9f9f9f');
  });

  it('should be case-insensitive for author and skill lookups', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/Alice/Safe-Tool', 'GET', mock.res);
    expect(mock.statusCode).toBe(200);
    expect(mock.body).toContain('No Issues');
  });

  it('should set Cache-Control header for 1 hour', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/alice/safe-tool', 'GET', mock.res);
    expect(mock.headers['cache-control']).toContain('max-age=3600');
  });

  it('should return 400 for invalid badge path', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/only-one-segment', 'GET', mock.res);
    expect(mock.statusCode).toBe(400);
  });

  it('should handle URL-encoded segments', () => {
    const router = createBadgeRouter(csvPath);
    const mock = createMockResponse();
    router.handleRequest('/api/badge/alice/safe-tool', 'GET', mock.res);
    expect(mock.statusCode).toBe(200);
  });

  // Stats endpoint
  describe('/api/badge/stats', () => {
    it('should return JSON stats', () => {
      const router = createBadgeRouter(csvPath);
      const mock = createMockResponse();
      router.handleRequest('/api/badge/stats', 'GET', mock.res);
      expect(mock.statusCode).toBe(200);
      expect(mock.headers['content-type']).toBe('application/json');

      const parsed = JSON.parse(mock.body);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.totalSkills).toBe(4);
      expect(parsed.data.uniqueAuthors).toBe(3);
      expect(parsed.data.clean).toBe(2); // LOW + MEDIUM -> clean
      expect(parsed.data.issues).toBe(1); // HIGH -> issues
      expect(parsed.data.critical).toBe(1); // CRITICAL -> critical
    });

    it('should set Cache-Control header', () => {
      const router = createBadgeRouter(csvPath);
      const mock = createMockResponse();
      router.handleRequest('/api/badge/stats', 'GET', mock.res);
      expect(mock.headers['cache-control']).toContain('max-age=3600');
    });
  });

  // Error handling
  describe('error handling', () => {
    it('should handle missing CSV file gracefully', () => {
      const router = createBadgeRouter('/nonexistent/path.csv');
      const mock = createMockResponse();
      router.handleRequest('/api/badge/alice/safe-tool', 'GET', mock.res);
      // Should return not-scanned badge (empty data)
      expect(mock.statusCode).toBe(200);
      expect(mock.body).toContain('Not Yet Scanned');
    });

    it('should include warning in stats when CSV fails to load', () => {
      const router = createBadgeRouter('/nonexistent/path.csv');
      const mock = createMockResponse();
      router.handleRequest('/api/badge/stats', 'GET', mock.res);
      const parsed = JSON.parse(mock.body);
      expect(parsed.data.warning).toBeDefined();
      expect(parsed.data.totalSkills).toBe(0);
    });
  });
});
