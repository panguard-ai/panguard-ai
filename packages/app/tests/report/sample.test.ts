/**
 * Generates real sample deliverables to the OS temp dir so a human can open
 * and eyeball them, and asserts they are valid PDFs on disk (end-to-end file
 * output, not just an in-memory buffer). The richer fixture spans multiple
 * pages so table page-breaks and the traceability matrix are exercised.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateDeliverableReport } from '../../src/lib/report/generator';
import type { DeliverableFinding, DeliverableReportInput } from '../../src/lib/report/types';

const FINDINGS: DeliverableFinding[] = [
  {
    id: 'PG-001',
    title: 'MCP server argv command injection',
    severity: 'critical',
    category: 'tool-poisoning',
    atrRuleId: 'ATR-2026-00543',
    affectedAsset: 'mcp-gateway-01',
    description:
      'A registered MCP tool passed user-controlled text into a child process command line. Shell metacharacters were not neutralised, allowing arbitrary command execution on the gateway host.',
    evidence: 'spawn("sh", ["-c", "lookup " + userInput])  // userInput = "; id #"',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    remediation:
      'Pass arguments as an array to spawn() without a shell. Validate tool inputs against a strict allowlist before dispatch.',
    controls: [
      { framework: 'eu-ai-act', identifier: 'Art. 15', context: 'Accuracy, robustness and cybersecurity', strength: 'primary' },
      { framework: 'iso-42001', identifier: '8.3', context: 'AI system operational controls', strength: 'secondary' },
    ],
  },
  {
    id: 'PG-002',
    title: 'Unauthenticated Redis reachable from agent subnet',
    severity: 'high',
    category: 'network',
    atrRuleId: 'ATR-2026-00310',
    affectedAsset: '10.0.2.14:6379',
    description:
      'A Redis instance backing the agent memory store accepted unauthenticated commands from the assessment host on the agent subnet.',
    evidence: 'redis-cli -h 10.0.2.14 PING -> PONG (no AUTH)',
    cvss: 8.1,
    cvssVector: 'CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    remediation: 'Enable requirepass, bind to 127.0.0.1, and restrict the subnet with a host firewall rule.',
    controls: [{ framework: 'eu-ai-act', identifier: 'Art. 15', context: 'Cybersecurity of high-risk AI systems' }],
  },
  {
    id: 'PG-003',
    title: 'Prompt-injection guard missing on retrieval tool',
    severity: 'high',
    category: 'prompt-injection',
    atrRuleId: 'ATR-2026-00112',
    affectedAsset: 'rag-retriever',
    description:
      'Documents returned by the retrieval tool were concatenated into the system prompt without delimiting or instruction-stripping, allowing indirect prompt injection from poisoned sources.',
    cvss: 7.4,
    remediation: 'Delimit retrieved content, strip imperative instructions, and apply an ATR prompt-injection ruleset at ingest.',
    controls: [
      { framework: 'owasp-llm', identifier: 'LLM01', context: 'Prompt Injection' },
      { framework: 'iso-42001', identifier: '8.4' },
    ],
  },
  {
    id: 'PG-004',
    title: 'Overly broad device-code scope on CLI tokens',
    severity: 'medium',
    category: 'authorization',
    affectedAsset: 'pga CLI device flow',
    description:
      'Device-authorisation tokens were issued with a wildcard scope rather than narrowed to the operations the CLI actually performs.',
    cvss: 5.4,
    remediation: 'Issue least-privilege scopes per device-code grant; reject wildcard scope requests server-side.',
    controls: [{ framework: 'nist-ai-rmf', identifier: 'GOVERN.1.2', context: 'Accountability structures' }],
  },
  {
    id: 'PG-005',
    title: 'Verbose error responses leak stack traces',
    severity: 'low',
    category: 'information-disclosure',
    affectedAsset: 'app.api',
    description: 'Unhandled exceptions returned full stack traces to unauthenticated callers.',
    cvss: 3.1,
    remediation: 'Return generic error messages to clients; log detailed context server-side only.',
    controls: [{ framework: 'iso-42001', identifier: '8.2' }],
  },
  {
    id: 'PG-006',
    title: 'Telemetry retains redacted-but-correlatable identifiers',
    severity: 'info',
    category: 'privacy',
    description:
      'Redacted telemetry retained a stable per-endpoint hash that, while not raw PII, could correlate activity across sessions.',
    remediation: 'Rotate the per-endpoint salt on a schedule if cross-session correlation is not required.',
  },
];

function sampleInput(over: Partial<DeliverableReportInput> = {}): DeliverableReportInput {
  return {
    client: { name: 'Example Bank N.V.', detail: 'Amsterdam, Netherlands' },
    assessor: { name: 'Acme Security JV', detail: 'PanGuard EU Delivery Partner' },
    region: 'eu',
    classification: 'confidential',
    primaryFramework: 'eu-ai-act',
    findings: FINDINGS,
    scope: [
      'Production MCP gateway, agent runtime, and retrieval (RAG) services',
      'Internal agent subnet 10.0.2.0/24',
      'Assessment window: 2026-05-20 to 2026-05-28',
      'Excluded: third-party SaaS providers and physical security',
    ],
    language: 'en',
    reportId: 'PG-RPT-2026-0042',
    version: '1.0',
    reportDate: '2026-05-30',
    preparedBy: 'Jordan Reyes, Lead Assessor',
    reviewedBy: 'Sam Carter, QA Reviewer',
    signingKey: 'sample-signing-key',
    ...over,
  };
}

describe('deliverable sample artifacts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'panguard-samples-'));

  it('writes a valid multi-page EN sample to disk', async () => {
    const out = await generateDeliverableReport(sampleInput());
    const path = join(dir, 'deliverable-sample-en.pdf');
    writeFileSync(path, out.buffer);
    const onDisk = readFileSync(path);
    expect(onDisk.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(onDisk.byteLength).toBeGreaterThan(5000);
    expect(out.pageCount).toBeGreaterThanOrEqual(3);
    // eslint-disable-next-line no-console
    console.log(`[sample] EN  -> ${path} (${onDisk.byteLength} bytes, ${out.pageCount} pages, hmac=${out.hmacSha256 ? 'yes' : 'no'})`);
  });

  it('writes a valid Traditional Chinese sample to disk', async () => {
    const out = await generateDeliverableReport(
      sampleInput({
        language: 'zh-Hant',
        client: { name: '範例銀行股份有限公司', detail: '台北市' },
        assessor: { name: '合作夥伴資安顧問公司', detail: 'PanGuard 亞太交付夥伴' },
        region: 'apac',
        primaryFramework: 'iso-42001',
        scope: [
          '正式環境 MCP 閘道、代理人執行環境與檢索（RAG）服務',
          '內部代理人子網段 10.0.2.0/24',
          '評估期間：2026-05-20 至 2026-05-28',
        ],
        preparedBy: '陳怡君，首席評估員',
        reviewedBy: '王志明，品保覆核',
      })
    );
    const path = join(dir, 'deliverable-sample-zh.pdf');
    writeFileSync(path, out.buffer);
    const onDisk = readFileSync(path);
    expect(onDisk.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(onDisk.byteLength).toBeGreaterThan(5000);
    // eslint-disable-next-line no-console
    console.log(`[sample] ZH  -> ${path} (${onDisk.byteLength} bytes, ${out.pageCount} pages)`);
  });
});
