/**
 * Unit + integration coverage for the P2 issue path's pure core: the
 * Supabase-row -> DeliverableReportInput mapper (`from-db.ts`), then feeding
 * that input through the real generator to prove an issued deliverable yields
 * a valid PDF (the server action only adds Supabase I/O on top of this). No
 * database is touched — rows are plain fixtures.
 */

import { describe, it, expect } from 'vitest';
import {
  deliverableToReportInput,
  findingRowToDomain,
  orgBrandingToReportBranding,
} from '../../src/lib/report/from-db';
import { generateDeliverableReport } from '../../src/lib/report/generator';
import type { Deliverable, DeliverableFindingRow } from '../../src/lib/types';

function makeDeliverable(over: Partial<Deliverable> = {}): Deliverable {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    workspace_id: '22222222-2222-2222-2222-222222222222',
    status: 'draft',
    language: 'en',
    classification: 'confidential',
    region: 'eu',
    primary_framework: 'eu-ai-act',
    client_name: 'Example Bank N.V.',
    client_detail: 'Amsterdam, Netherlands',
    assessor_name: 'Acme Security JV',
    assessor_detail: 'PanGuard EU Delivery Partner',
    report_ref: 'PG-RPT-2026-0042',
    version: '1.0',
    report_date: '2026-05-30',
    prepared_by: 'Jordan Reyes, Lead Assessor',
    reviewed_by: 'Sam Carter, QA Reviewer',
    scope: ['Production MCP gateway', 'Assessment window: 2026-05-20 to 2026-05-28'],
    methodology: [],
    sha256: null,
    hmac_sha256: null,
    storage_path: null,
    size_bytes: null,
    page_count: null,
    finding_count: null,
    issued_by: null,
    issued_at: null,
    created_by: '33333333-3333-3333-3333-333333333333',
    created_at: '2026-05-30T00:00:00.000Z',
    updated_at: '2026-05-30T00:00:00.000Z',
    ...over,
  };
}

function makeFinding(over: Partial<DeliverableFindingRow> = {}): DeliverableFindingRow {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    deliverable_id: '11111111-1111-1111-1111-111111111111',
    ordinal: 0,
    finding_ref: 'PG-001',
    title: 'MCP server argv command injection',
    severity: 'critical',
    category: 'tool-poisoning',
    atr_rule_id: 'ATR-2026-00543',
    affected_asset: 'mcp-gateway-01',
    description: 'User-controlled text reached a child-process command line unsanitised.',
    evidence: 'spawn("sh", ["-c", "lookup " + userInput])',
    cvss: 9.8,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    remediation: 'Pass args as an array without a shell; allowlist tool inputs.',
    controls: [
      { framework: 'eu-ai-act', identifier: 'Art. 15', context: 'Cybersecurity', strength: 'primary' },
    ],
    created_at: '2026-05-30T00:00:00.000Z',
    updated_at: '2026-05-30T00:00:00.000Z',
    ...over,
  };
}

describe('findingRowToDomain', () => {
  it('prefers the human finding_ref as the domain id', () => {
    const out = findingRowToDomain(makeFinding({ finding_ref: 'PG-007' }));
    expect(out.id).toBe('PG-007');
  });

  it('falls back to the row id when finding_ref is empty or null', () => {
    expect(findingRowToDomain(makeFinding({ finding_ref: null })).id).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    );
    expect(findingRowToDomain(makeFinding({ finding_ref: '' })).id).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    );
  });

  it('normalises nullable columns to undefined (not null)', () => {
    const out = findingRowToDomain(
      makeFinding({
        category: null,
        atr_rule_id: null,
        affected_asset: null,
        evidence: null,
        cvss: null,
        cvss_vector: null,
      })
    );
    expect(out.category).toBeUndefined();
    expect(out.atrRuleId).toBeUndefined();
    expect(out.affectedAsset).toBeUndefined();
    expect(out.evidence).toBeUndefined();
    expect(out.cvss).toBeUndefined();
    expect(out.cvssVector).toBeUndefined();
  });

  it('passes controls through structurally unchanged', () => {
    const out = findingRowToDomain(makeFinding());
    expect(out.controls).toEqual([
      { framework: 'eu-ai-act', identifier: 'Art. 15', context: 'Cybersecurity', strength: 'primary' },
    ]);
  });
});

describe('deliverableToReportInput', () => {
  it('maps a full row + findings into a valid generator input', () => {
    const input = deliverableToReportInput(makeDeliverable(), [makeFinding()]);
    expect(input.client).toEqual({ name: 'Example Bank N.V.', detail: 'Amsterdam, Netherlands' });
    expect(input.assessor.name).toBe('Acme Security JV');
    expect(input.region).toBe('eu');
    expect(input.classification).toBe('confidential');
    expect(input.primaryFramework).toBe('eu-ai-act');
    expect(input.reportId).toBe('PG-RPT-2026-0042');
    expect(input.reportDate).toBe('2026-05-30');
    expect(input.findings).toHaveLength(1);
    expect(input.findings[0]?.id).toBe('PG-001');
  });

  it('normalises empty methodology to undefined (so generator uses regional default)', () => {
    expect(deliverableToReportInput(makeDeliverable({ methodology: [] }), []).methodology).toBeUndefined();
    expect(
      deliverableToReportInput(makeDeliverable({ methodology: ['Step one'] }), []).methodology
    ).toEqual(['Step one']);
  });

  it('maps null detail/reviewer/date to undefined / empty string', () => {
    const input = deliverableToReportInput(
      makeDeliverable({ client_detail: null, assessor_detail: null, reviewed_by: null, report_date: null }),
      []
    );
    expect(input.client.detail).toBeUndefined();
    expect(input.assessor.detail).toBeUndefined();
    expect(input.reviewedBy).toBeUndefined();
    expect(input.reportDate).toBe('');
  });

  it('threads signing key / branding / logo from options', () => {
    const input = deliverableToReportInput(makeDeliverable(), [], {
      signingKey: 'k',
      branding: { legalName: 'Acme', reportFooter: 'Confidential', primaryColor: '#123456' },
      logoPath: '/tmp/logo.png',
    });
    expect(input.signingKey).toBe('k');
    expect(input.branding?.legalName).toBe('Acme');
    expect(input.logoPath).toBe('/tmp/logo.png');
  });
});

describe('orgBrandingToReportBranding', () => {
  it('returns undefined for null / undefined input', () => {
    expect(orgBrandingToReportBranding(null)).toBeUndefined();
    expect(orgBrandingToReportBranding(undefined)).toBeUndefined();
  });

  it('returns undefined when no usable fields are set (so generator keeps defaults)', () => {
    expect(orgBrandingToReportBranding({})).toBeUndefined();
    // logo_url is intentionally ignored (partner logo rides on logoPath), so a
    // branding blob that only carries a logo still maps to nothing renderable.
    expect(orgBrandingToReportBranding({ logo_url: 'https://example.com/logo.png' })).toBeUndefined();
  });

  it('maps the full branding blob to legalName / reportFooter / primaryColor', () => {
    expect(
      orgBrandingToReportBranding({
        legal_name: 'Acme Security JV B.V.',
        report_footer: 'Confidential — Acme Security JV',
        primary_color: '#1a365d',
        logo_url: 'https://example.com/logo.png',
      })
    ).toEqual({
      legalName: 'Acme Security JV B.V.',
      reportFooter: 'Confidential — Acme Security JV',
      primaryColor: '#1a365d',
    });
  });

  it('keeps only the fields that are actually set (partial branding)', () => {
    expect(orgBrandingToReportBranding({ legal_name: 'Acme Security JV B.V.' })).toEqual({
      legalName: 'Acme Security JV B.V.',
    });
    expect(orgBrandingToReportBranding({ report_footer: 'Confidential' })).toEqual({
      reportFooter: 'Confidential',
    });
  });
});

describe('issue path produces a real PDF from rows', () => {
  it('renders a signed, multi-finding deliverable to a valid PDF', async () => {
    const input = deliverableToReportInput(
      makeDeliverable(),
      [makeFinding(), makeFinding({ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', finding_ref: 'PG-002', severity: 'high', cvss: 8.1 })],
      { signingKey: 'test-key' }
    );
    const out = await generateDeliverableReport(input);
    expect(out.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(out.buffer.byteLength).toBeGreaterThan(3000);
    expect(out.pageCount).toBeGreaterThanOrEqual(1);
    expect(out.findingCount).toBe(2);
    expect(out.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(out.hmacSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('issues a valid PDF even with zero findings (empty deliverable is allowed)', async () => {
    const out = await generateDeliverableReport(deliverableToReportInput(makeDeliverable(), []));
    expect(out.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(out.findingCount).toBe(0);
    expect(out.pageCount).toBeGreaterThanOrEqual(1);
  });
});
