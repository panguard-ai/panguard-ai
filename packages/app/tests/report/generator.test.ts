/**
 * Smoke + contract tests for the deliverable PDF generator. We don't pixel-diff
 * the PDF; we assert it is a real, non-empty, multi-page PDF, that the integrity
 * block is wired to the pure hash, that signing is honoured, and that the
 * Traditional Chinese path renders without throwing.
 */

import { describe, it, expect } from 'vitest';
import { generateDeliverableReport } from '../../src/lib/report/generator';
import { computeIntegrityHash } from '../../src/lib/report/logic';
import type { DeliverableReportInput } from '../../src/lib/report/types';

function makeInput(over: Partial<DeliverableReportInput> = {}): DeliverableReportInput {
  return {
    client: { name: 'Example Bank N.V.', detail: 'Amsterdam' },
    assessor: { name: 'Acme Security JV', detail: 'EU Partner' },
    region: 'eu',
    classification: 'confidential',
    primaryFramework: 'eu-ai-act',
    findings: [
      {
        id: 'PG-001',
        title: 'MCP server command injection',
        severity: 'critical',
        category: 'tool-poisoning',
        atrRuleId: 'ATR-2026-00543',
        affectedAsset: 'mcp-gateway-01',
        description: 'An agent tool definition allowed shell metacharacters to reach a subprocess.',
        evidence: 'argv: ["sh","-c","...redacted..."]',
        cvss: 9.8,
        cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
        remediation:
          'Use an allowlist and pass arguments as an array; never interpolate into a shell.',
        controls: [
          {
            framework: 'eu-ai-act',
            identifier: 'Art. 15',
            context: 'Accuracy, robustness and cybersecurity',
          },
          { framework: 'iso-42001', identifier: '8.3', context: 'AI system operation controls' },
        ],
      },
      {
        id: 'PG-002',
        title: 'Unauthenticated Redis exposed on network',
        severity: 'high',
        category: 'network',
        affectedAsset: '10.0.2.14:6379',
        description: 'A Redis instance accepted unauthenticated commands from the assessment host.',
        cvss: 8.1,
        remediation: 'Enable AUTH and bind to localhost.',
        controls: [{ framework: 'eu-ai-act', identifier: 'Art. 15' }],
      },
      {
        id: 'PG-003',
        title: 'Verbose error messages leak stack traces',
        severity: 'low',
        description: 'Stack traces were returned to unauthenticated callers.',
        remediation: 'Return generic error messages; log details server-side.',
      },
    ],
    scope: ['Production MCP gateway and agent runtime', 'Window: 2026-05-20 to 2026-05-28'],
    language: 'en',
    reportId: 'PG-RPT-2026-0042',
    version: '1.0',
    reportDate: '2026-05-30',
    preparedBy: 'Jordan Reyes, Lead Assessor',
    reviewedBy: 'Sam Carter, QA',
    ...over,
  };
}

describe('generateDeliverableReport', () => {
  it('produces a valid, non-empty, multi-page PDF', async () => {
    const out = await generateDeliverableReport(makeInput());
    expect(out.contentType).toBe('application/pdf');
    expect(out.buffer.byteLength).toBeGreaterThan(2000);
    // PDF magic header
    expect(out.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // trailer present
    expect(out.buffer.subarray(-1024).toString('latin1')).toContain('%%EOF');
    expect(out.pageCount).toBeGreaterThanOrEqual(2);
  });

  it('reports severity counts and finding count', async () => {
    const out = await generateDeliverableReport(makeInput());
    expect(out.findingCount).toBe(3);
    expect(out.severityCounts).toEqual({ critical: 1, high: 1, medium: 0, low: 1, info: 0 });
  });

  it('wires the integrity hash to the pure computation', async () => {
    const input = makeInput();
    const out = await generateDeliverableReport(input);
    expect(out.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(out.sha256).toBe(computeIntegrityHash(input));
  });

  it('omits HMAC without a signing key and includes it with one', async () => {
    const noSig = await generateDeliverableReport(makeInput());
    expect(noSig.hmacSha256).toBeNull();

    const signed = await generateDeliverableReport(makeInput({ signingKey: 'unit-test-key' }));
    expect(signed.hmacSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('renders the Traditional Chinese variant without throwing', async () => {
    const out = await generateDeliverableReport(
      makeInput({
        language: 'zh-Hant',
        client: { name: '範例銀行股份有限公司' },
        assessor: { name: '合作夥伴資安公司' },
      })
    );
    expect(out.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(out.pageCount).toBeGreaterThanOrEqual(2);
  });

  it('renders a no-findings report (clean bill of health)', async () => {
    const out = await generateDeliverableReport(makeInput({ findings: [] }));
    expect(out.findingCount).toBe(0);
    expect(out.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(out.pageCount).toBeGreaterThanOrEqual(1);
  });

  it('throws a clear error on invalid input', async () => {
    await expect(generateDeliverableReport(makeInput({ reportId: '' }))).rejects.toThrow(
      /Invalid report input/
    );
  });
});
