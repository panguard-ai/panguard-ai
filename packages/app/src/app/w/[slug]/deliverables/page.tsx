import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import { listDeliverables, findingCountsByDeliverable } from '@/lib/deliverables';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { FileCheck } from '@/components/icons';
import { NewDeliverableButton } from '@/components/deliverables/new-deliverable-button';

export default async function DeliverablesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  const rows = await listDeliverables(ctx.workspace.id);
  const canWrite = ctx.role === 'admin' || ctx.role === 'analyst';

  // Drafts have no stored finding_count (set only at issue time), so show a
  // live tally for them; issued rows keep the frozen count from the signed PDF.
  const liveCounts = await findingCountsByDeliverable(rows.map((d) => d.id));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Deliverables</h1>
          <p className="mt-1 text-sm text-text-muted">
            Client-ready assessment reports: findings, CVSS, and compliance control traceability,
            signed for integrity.
          </p>
        </div>
        {canWrite ? <NewDeliverableButton slug={slug} /> : null}
      </div>

      {rows.length === 0 ? (
        <Card padding="lg" className="text-center">
          <FileCheck className="mx-auto h-8 w-8 text-brand-sage" />
          <h3 className="mt-3 text-base font-semibold text-text-primary">No deliverables yet</h3>
          <p className="mt-1 text-sm text-text-muted">
            Create a deliverable to seed findings from your scan events, enrich them, and issue a
            signed PDF for your client.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <Table>
            <THead>
              <TR>
                <TH>Reference</TH>
                <TH>Client</TH>
                <TH>Status</TH>
                <TH>Findings</TH>
                <TH>Date</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((d) => (
                <TR key={d.id}>
                  <TD>
                    <Link
                      className="font-medium text-brand-sage hover:text-brand-sage-light"
                      href={`/w/${slug}/deliverables/${d.id}`}
                    >
                      {d.report_ref || 'Untitled'}
                    </Link>
                  </TD>
                  <TD className="text-text-primary">{d.client_name || '—'}</TD>
                  <TD>
                    {d.status === 'issued' ? (
                      <Badge tone="sage">Issued</Badge>
                    ) : (
                      <Badge tone="neutral">Draft</Badge>
                    )}
                  </TD>
                  <TD>
                    {d.status === 'issued' ? (d.finding_count ?? 0) : (liveCounts.get(d.id) ?? 0)}
                  </TD>
                  <TD>{d.report_date ?? new Date(d.created_at).toLocaleDateString()}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
