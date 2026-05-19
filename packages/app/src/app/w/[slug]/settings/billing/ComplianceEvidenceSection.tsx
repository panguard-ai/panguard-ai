/**
 * Compliance Evidence section — Pilot+ feature.
 *
 * Server component. Lists the evidence archives generated for this
 * workspace (migrator/audit/scan packs). Each row has a download button
 * that hits the API route which mints a 1-hour Supabase Storage signed
 * URL after re-verifying membership + tier.
 *
 * Why a separate component rather than inline in the billing page:
 * keeps the per-workspace SQL local and lets the TierGate above it
 * skip rendering entirely for Community workspaces (no wasted query).
 */

import { createClient } from '@/lib/supabase/server';
import type { EvidenceArchive, EvidenceSource } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Download } from '@/components/icons';

const sourceLabels: Record<EvidenceSource, string> = {
  migrator: 'Migration',
  audit: 'Audit',
  scan: 'Scan',
};

const sourceTones: Record<EvidenceSource, 'sage' | 'info' | 'neutral'> = {
  migrator: 'sage',
  audit: 'info',
  scan: 'neutral',
};

/** Format bytes into KB/MB/GB. Pure for testability. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function ComplianceEvidenceSection({ workspaceId }: { workspaceId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('evidence_archives')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('generated_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as EvidenceArchive[];

  return (
    <Card padding="lg">
      <CardHeader
        title="Compliance evidence"
        subtitle="Tamper-evident evidence packs for auditors. Pilot+ feature."
      />
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">
          No evidence packs yet. Run a migration, audit, or scan with evidence export enabled to
          populate this archive.
        </p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Source</TH>
              <TH>Generated</TH>
              <TH>Size</TH>
              <TH>Integrity (sha256)</TH>
              <TH>Download</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD>
                  <Badge tone={sourceTones[row.source]}>{sourceLabels[row.source]}</Badge>
                </TD>
                <TD className="text-xs">{new Date(row.generated_at).toLocaleString()}</TD>
                <TD className="text-text-secondary">{formatBytes(row.file_size_bytes)}</TD>
                <TD className="font-mono text-xs text-text-muted">{row.sha256.slice(0, 12)}…</TD>
                <TD>
                  <a
                    className="inline-flex items-center gap-1 text-brand-sage hover:text-brand-sage-light"
                    href={`/api/billing/evidence/${row.id}/download`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
