'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from '@/components/icons';
import { FindingRowForm } from './finding-row-form';
import { ImportScansButton } from './import-scans-button';
import type { DeliverableFindingRow } from '@/lib/types';

/**
 * Draft-mode findings editor: an "import from scans" affordance in the header,
 * a collapsible row-editor per finding, and an "add finding" button that opens
 * one blank form at a time. Every mutation calls router.refresh() inside the
 * row form, so the server-rendered list re-fetches and stays the source of
 * truth — this component only owns the transient "is the add form open" flag.
 */
export function FindingsEditor({
  slug,
  deliverableId,
  findings,
}: {
  slug: string;
  deliverableId: string;
  findings: ReadonlyArray<DeliverableFindingRow>;
}) {
  const [adding, setAdding] = useState(false);
  const [addKey, setAddKey] = useState(0);

  function closeAdd() {
    setAdding(false);
    setAddKey((k) => k + 1); // force a fresh blank form next time
  }

  return (
    <Card>
      <CardHeader
        title="Findings"
        subtitle="Import from your scan events, then complete CVSS, description, and remediation before issuing."
        action={<ImportScansButton slug={slug} deliverableId={deliverableId} />}
      />

      <div className="space-y-3">
        {findings.length === 0 && !adding ? (
          <p className="text-sm text-text-muted">
            No findings yet. Import from your workspace scan events, or add one manually. An empty
            deliverable still issues a valid attestation PDF.
          </p>
        ) : null}

        {findings.map((f) => (
          <FindingRowForm key={f.id} slug={slug} deliverableId={deliverableId} finding={f} />
        ))}

        {adding ? (
          <FindingRowForm
            key={`new-${addKey}`}
            slug={slug}
            deliverableId={deliverableId}
            onSaved={closeAdd}
            onCancel={closeAdd}
          />
        ) : null}
      </div>

      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4" />
          Add finding
        </Button>
      </div>
    </Card>
  );
}
