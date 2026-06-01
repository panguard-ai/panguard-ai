import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import { getDeliverable, listDeliverableFindings } from '@/lib/deliverables';
import { DeliverableMetaForm } from '@/components/deliverables/deliverable-meta-form';
import { FindingsEditor } from '@/components/deliverables/findings-editor';
import { IssueButton } from '@/components/deliverables/issue-button';
import { DuplicateButton } from '@/components/deliverables/duplicate-button';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ChevronRight, Download, FileCheck } from '@/components/icons';
import type { Deliverable, DeliverableFindingRow, Severity } from '@/lib/types';

const SEVERITY_TONE: Record<Severity, 'danger' | 'alert' | 'caution' | 'info' | 'neutral'> = {
  critical: 'danger',
  high: 'alert',
  medium: 'caution',
  low: 'info',
  info: 'neutral',
};

const LANGUAGE_LABEL: Record<string, string> = { en: 'English', 'zh-Hant': '繁體中文' };
const REGION_LABEL: Record<string, string> = {
  eu: 'European Union',
  us: 'United States',
  apac: 'APAC',
  global: 'Global',
};
const FRAMEWORK_LABEL: Record<string, string> = {
  'eu-ai-act': 'EU AI Act',
  'colorado-ai-act': 'Colorado AI Act',
  'nist-ai-rmf': 'NIST AI RMF',
  'iso-42001': 'ISO/IEC 42001',
  'owasp-agentic': 'OWASP Agentic Top 10',
  'owasp-llm': 'OWASP LLM Top 10',
};
const CLASSIFICATION_LABEL: Record<string, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  restricted: 'Restricted',
};

/** Read-only metadata record shown on the issued view — mirrors what the signed
 * PDF documents, so a reviewer can see scope/methodology without re-downloading. */
function IssuedDetails({ d }: { d: Deliverable }) {
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['Client', d.client_name || '—'],
    ['Classification', CLASSIFICATION_LABEL[d.classification] ?? d.classification],
    ['Version', d.version || '—'],
    ['Report date', d.report_date ?? '—'],
    ['Assessor', d.assessor_name || '—'],
    ['Prepared by', d.prepared_by || '—'],
    ['Reviewed by', d.reviewed_by || '—'],
  ];
  return (
    <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
          <dd className="text-sm text-text-primary">{value}</dd>
        </div>
      ))}
      {d.scope.length > 0 ? (
        <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-3">
          <dt className="text-xs uppercase tracking-wide text-text-muted">Scope</dt>
          <dd>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-text-primary">
              {d.scope.map((s, i) => (
                <li key={`scope-${i}`}>{s}</li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
      {d.methodology.length > 0 ? (
        <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-3">
          <dt className="text-xs uppercase tracking-wide text-text-muted">Methodology</dt>
          <dd>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-text-primary">
              {d.methodology.map((s, i) => (
                <li key={`method-${i}`}>{s}</li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function FindingsList({ findings }: { findings: ReadonlyArray<DeliverableFindingRow> }) {
  if (findings.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        This report was issued with no individual findings. The signed PDF still documents the
        scope, methodology, and compliance context of the assessment.
      </p>
    );
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Ref</TH>
          <TH>Title</TH>
          <TH>Severity</TH>
          <TH>CVSS</TH>
          <TH>Asset</TH>
        </TR>
      </THead>
      <TBody>
        {findings.map((f) => (
          <TR key={f.id}>
            <TD className="font-mono text-xs">{f.finding_ref || '—'}</TD>
            <TD className="text-text-primary">{f.title || 'Untitled'}</TD>
            <TD>
              <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
            </TD>
            <TD>{f.cvss ?? '—'}</TD>
            <TD className="text-text-muted">{f.affected_asset || '—'}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function IntegrityBlock({
  sha256,
  hmac,
  pageCount,
  findingCount,
  sizeBytes,
  issuedAt,
}: {
  sha256: string | null;
  hmac: string | null;
  pageCount: number | null;
  findingCount: number | null;
  sizeBytes: number | null;
  issuedAt: string | null;
}) {
  const rows: ReadonlyArray<{ label: string; value: string; mono?: boolean }> = [
    { label: 'SHA-256', value: sha256 ?? '—', mono: true },
    { label: 'HMAC-SHA256', value: hmac ?? 'Not signed', mono: true },
    { label: 'Pages', value: pageCount !== null ? String(pageCount) : '—' },
    { label: 'Findings', value: findingCount !== null ? String(findingCount) : '—' },
    { label: 'Size', value: formatBytes(sizeBytes) },
    {
      label: 'Issued',
      value: issuedAt ? new Date(issuedAt).toLocaleString() : '—',
    },
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-text-muted">{r.label}</dt>
          <dd
            className={`text-sm text-text-primary ${r.mono ? 'break-all font-mono text-xs' : ''}`}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  const deliverable = await getDeliverable(ctx.workspace.id, id);
  if (!deliverable) notFound();

  const findings = await listDeliverableFindings(id);
  const canWrite = ctx.role === 'admin' || ctx.role === 'analyst';
  const isIssued = deliverable.status === 'issued';

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-text-muted">
        <Link href={`/w/${slug}/deliverables`} className="hover:text-text-primary">
          Deliverables
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-text-secondary">{deliverable.report_ref || 'Untitled'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-primary">
              {deliverable.report_ref || 'Untitled deliverable'}
            </h1>
            {isIssued ? (
              <Badge tone="sage">Issued</Badge>
            ) : (
              <Badge tone="neutral">Draft</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {deliverable.client_name || '—'} · {FRAMEWORK_LABEL[deliverable.primary_framework] ??
              deliverable.primary_framework}{' '}
            · {REGION_LABEL[deliverable.region] ?? deliverable.region} ·{' '}
            {LANGUAGE_LABEL[deliverable.language] ?? deliverable.language}
          </p>
        </div>
        {isIssued ? (
          <div className="flex items-center gap-3">
            {canWrite ? <DuplicateButton slug={slug} id={id} /> : null}
            <Button href={`/w/${slug}/deliverables/${id}/download`}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        ) : canWrite ? (
          <IssueButton slug={slug} id={id} />
        ) : null}
      </div>

      {isIssued ? (
        <>
          <Card>
            <CardHeader title="Report details" subtitle="Metadata as issued in the signed PDF." />
            <IssuedDetails d={deliverable} />
          </Card>
          <Card>
            <CardHeader
              title="Integrity"
              subtitle="Tamper-evident hash of the issued PDF. Verify the downloaded file against these values."
            />
            <IntegrityBlock
              sha256={deliverable.sha256}
              hmac={deliverable.hmac_sha256}
              pageCount={deliverable.page_count}
              findingCount={deliverable.finding_count}
              sizeBytes={deliverable.size_bytes}
              issuedAt={deliverable.issued_at}
            />
          </Card>
          <Card>
            <CardHeader title="Findings" subtitle="As issued in the signed PDF." />
            <FindingsList findings={findings} />
          </Card>
        </>
      ) : canWrite ? (
        <>
          <DeliverableMetaForm slug={slug} deliverable={deliverable} />
          <FindingsEditor slug={slug} deliverableId={id} findings={findings} />
        </>
      ) : (
        <Card padding="lg" className="text-center">
          <FileCheck className="mx-auto h-8 w-8 text-brand-sage" />
          <h3 className="mt-3 text-base font-semibold text-text-primary">Read-only access</h3>
          <p className="mt-1 text-sm text-text-muted">
            This deliverable is still a draft. You need analyst access to edit or issue it.
          </p>
        </Card>
      )}
    </div>
  );
}
