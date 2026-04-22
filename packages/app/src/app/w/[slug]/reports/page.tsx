import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import type { Report } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Download, FileText } from '@/components/icons';
import { generateReport } from './actions';

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  const supabase = await createClient();
  const { data: reportsRaw } = await supabase
    .from('reports')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .order('generated_at', { ascending: false })
    .limit(50);

  const rows = (reportsRaw ?? []) as unknown as Report[];

  // Wrap the action to return void (React 19 form-action signature).
  async function onGenerate(formData: FormData): Promise<void> {
    'use server';
    await generateReport(formData);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Compliance reports</h1>
        <p className="mt-1 text-sm text-text-muted">
          Evidence-backed reports generated from live endpoint data.
        </p>
      </div>

      <Card padding="lg">
        <CardHeader
          title="Generate a new report"
          subtitle="Pick a framework and we'll synthesise ATR rule coverage plus HMAC-signed integrity."
        />
        <form action={onGenerate} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="slug" value={ctx.workspace.slug} />
          <Select
            name="framework"
            label="Framework"
            defaultValue="eu-ai-act"
            options={[
              { value: 'eu-ai-act', label: 'EU AI Act (2024/1689)' },
              { value: 'nist-ai-rmf', label: 'NIST AI RMF 1.0' },
              { value: 'iso-42001', label: 'ISO/IEC 42001:2023' },
              { value: 'colorado-ai-act', label: 'Colorado SB24-205' },
              { value: 'owasp-agentic', label: 'OWASP Agentic Top 10' },
              { value: 'owasp-llm', label: 'OWASP LLM Top 10' },
            ]}
          />
          <Select
            name="format"
            label="Format"
            defaultValue="pdf"
            options={[
              { value: 'pdf', label: 'PDF' },
              { value: 'json', label: 'JSON' },
              { value: 'md', label: 'Markdown' },
            ]}
          />
          <div className="md:col-span-2">
            <Input
              name="orgName"
              required
              label="Organization name"
              placeholder="Acme Security Inc."
              defaultValue={ctx.workspace.name}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">
              <FileText className="h-4 w-4" />
              Generate report
            </Button>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card padding="lg" className="text-center">
          <FileText className="mx-auto h-8 w-8 text-brand-sage" />
          <h3 className="mt-3 text-base font-semibold text-text-primary">
            No reports generated yet
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Once you generate your first report it will appear here, ready to download or share
            with auditors.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <Table>
            <THead>
              <TR>
                <TH>Framework</TH>
                <TH>Format</TH>
                <TH>Organization</TH>
                <TH>Mapped rules</TH>
                <TH>Generated</TH>
                <TH>Download</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.framework}</TD>
                  <TD className="uppercase font-mono text-xs">{r.format}</TD>
                  <TD className="text-text-primary">{r.org_name}</TD>
                  <TD>
                    <Badge tone="sage">
                      {r.rules_mapped ?? 0}/{r.rules_loaded ?? 0}
                    </Badge>
                  </TD>
                  <TD>{new Date(r.generated_at).toLocaleString()}</TD>
                  <TD>
                    {r.storage_path ? (
                      <Link
                        className="inline-flex items-center gap-1 text-brand-sage hover:text-brand-sage-light"
                        href={`/w/${ctx.workspace.slug}/reports/${r.id}/download`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
