/**
 * HackerOne Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HackerOneAdapter } from '../../src/threat-intel/hackerone-adapter.js';
import type { HackerOneHacktivityResponse } from '../../src/threat-intel/types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/** Empty page response that stops pagination */
const EMPTY_PAGE: HackerOneHacktivityResponse = { data: [], links: {} };
const emptyResp = () => ({ ok: true, json: async () => EMPTY_PAGE });

function makeResponse(overrides: Record<string, unknown> = {}): HackerOneHacktivityResponse {
  return {
    data: [
      {
        id: 2701701,
        type: 'hacktivity_item',
        attributes: {
          title: 'Injection in path parameter of Ingress-nginx',
          substate: 'resolved',
          url: 'https://hackerone.com/reports/2701701',
          disclosed_at: '2026-03-07T05:10:30.190Z',
          vulnerability_information: null,
          cve_ids: ['CVE-2021-25748'],
          cwe: 'Code Injection',
          severity_rating: 'High',
          votes: 7,
          total_awarded_amount: null,
          latest_disclosable_action: 'Activities::ReportBecamePublic',
          latest_disclosable_activity_at: '2026-03-07T05:10:31.254Z',
          submitted_at: '2024-09-05T15:29:42.557Z',
          disclosed: true,
          ...overrides,
        },
        relationships: {
          report_generated_content: {
            data: {
              type: 'report_generated_content',
              attributes: {
                hacktivity_summary: 'A vulnerability was discovered in the Ingress-nginx controller.',
              },
            },
          },
          reporter: {
            data: { type: 'user', attributes: { name: 'Test User', username: 'testuser' } },
          },
          program: {
            data: { type: 'program', attributes: { handle: 'kubernetes', name: 'Kubernetes' } },
          },
        },
      },
    ],
    links: {},
  };
}

/** Helper: mock page 1 with data, then empty pages */
function mockOnePage(overrides: Record<string, unknown> = {}) {
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => makeResponse(overrides) })
    .mockResolvedValue(emptyResp());
}

describe('HackerOneAdapter', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches and converts disclosed reports', async () => {
    mockOnePage();
    const adapter = new HackerOneAdapter({ maxReports: 1, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();

    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe('2701701');
    expect(reports[0].title).toBe('Injection in path parameter of Ingress-nginx');
    expect(reports[0].severity).toBe('high');
    expect(reports[0].cweId).toBe('CWE-94');
    expect(reports[0].cweName).toBe('Code Injection');
    expect(reports[0].cveIds).toEqual(['CVE-2021-25748']);
    expect(reports[0].summary).toContain('Ingress-nginx');
    expect(reports[0].programHandle).toBe('kubernetes');
    expect(reports[0].programName).toBe('Kubernetes');
    expect(reports[0].reporterUsername).toBe('testuser');
    expect(reports[0].url).toBe('https://hackerone.com/reports/2701701');
  });

  it('filters by minimum severity', async () => {
    mockOnePage({ severity_rating: 'Low' });
    const adapter = new HackerOneAdapter({ minSeverity: 'medium', maxReports: 5, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports).toHaveLength(0);
  });

  it('accepts reports meeting minimum severity', async () => {
    mockOnePage({ severity_rating: 'Critical' });
    const adapter = new HackerOneAdapter({ minSeverity: 'high', maxReports: 1, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports).toHaveLength(1);
  });

  it('skips non-disclosed reports', async () => {
    mockOnePage({ disclosed: false });
    const adapter = new HackerOneAdapter({ maxReports: 5, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports).toHaveLength(0);
  });

  it('skips reports without title', async () => {
    mockOnePage({ title: null });
    const adapter = new HackerOneAdapter({ maxReports: 5, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports).toHaveLength(0);
  });

  it('pages through multiple pages to find disclosed reports', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeResponse() })
      .mockResolvedValueOnce({ ok: true, json: async () => makeResponse({ title: 'XSS in search' }) })
      .mockResolvedValue(emptyResp());

    const adapter = new HackerOneAdapter({ maxReports: 2, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports).toHaveLength(2);
  });

  it('stops on rate limit (429)', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeResponse() })
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' });

    const adapter = new HackerOneAdapter({ maxReports: 50, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports).toHaveLength(1);
  });

  it('supports incremental sync with since parameter', async () => {
    mockOnePage({ disclosed_at: '2026-01-01T00:00:00Z' });
    const adapter = new HackerOneAdapter({ maxReports: 5, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports('2026-03-01T00:00:00Z');
    expect(reports).toHaveLength(0);
  });

  it('includes reports after since date', async () => {
    mockOnePage({ disclosed_at: '2026-03-07T00:00:00Z' });
    const adapter = new HackerOneAdapter({ maxReports: 1, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports('2026-03-01T00:00:00Z');
    expect(reports).toHaveLength(1);
  });

  it('handles API errors', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });
    const adapter = new HackerOneAdapter({ rateLimitPerMinute: 600 });
    await expect(adapter.fetchReports()).rejects.toThrow('HackerOne API error: 500');
  });

  it('handles missing CWE', async () => {
    mockOnePage({ cwe: null });
    const adapter = new HackerOneAdapter({ maxReports: 1, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports[0].cweId).toBeNull();
    expect(reports[0].cweName).toBeNull();
  });

  it('resolves CWE name to ID', async () => {
    mockOnePage({ cwe: 'Cross-Site Scripting (XSS)' });
    const adapter = new HackerOneAdapter({ maxReports: 1, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports[0].cweId).toBe('CWE-79');
    expect(reports[0].cweName).toBe('Cross-Site Scripting (XSS)');
  });

  it('sets User-Agent header', async () => {
    mockOnePage();
    const adapter = new HackerOneAdapter({ maxReports: 1, rateLimitPerMinute: 600 });
    await adapter.fetchReports();
    const fetchOpts = mockFetch.mock.calls[0][1] as RequestInit;
    expect((fetchOpts.headers as Record<string, string>)['User-Agent']).toContain('Panguard');
  });

  it('respects maxReports limit', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeResponse() });
    const adapter = new HackerOneAdapter({ maxReports: 1, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();
    expect(reports).toHaveLength(1);
  });

  it('stops after consecutive empty pages', async () => {
    const undisclosedPage: HackerOneHacktivityResponse = {
      data: [{
        id: 99999, type: 'hacktivity_item',
        attributes: {
          title: null, substate: null, url: null, disclosed_at: null,
          vulnerability_information: null, cve_ids: null, cwe: null,
          severity_rating: null, votes: 0, total_awarded_amount: null,
          latest_disclosable_action: 'Activities::BountyAwarded',
          latest_disclosable_activity_at: '2026-03-07T00:00:00Z',
          submitted_at: '2026-03-01T00:00:00Z', disclosed: false,
        },
      }],
      links: {},
    };

    mockFetch.mockResolvedValue({ ok: true, json: async () => undisclosedPage });
    const adapter = new HackerOneAdapter({ maxReports: 50, rateLimitPerMinute: 600 });
    const reports = await adapter.fetchReports();

    expect(reports).toHaveLength(0);
    expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(16);
  });
});
