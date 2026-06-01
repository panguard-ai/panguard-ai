'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { InlineToast } from '@/components/ui/toast';
import { Loader2, ScanLine } from '@/components/icons';
import { importFindingsFromScans } from '@/app/w/[slug]/deliverables/actions';

/**
 * Pull this workspace's scan-match events into the deliverable as seeded
 * findings (dedup by rule + asset, ATR-enriched title/category/controls). The
 * action is idempotent: re-running only adds new scan results and never
 * clobbers the assessor's manual edits. CVSS / description / remediation are
 * still completed by hand before issuing.
 */
export function ImportScansButton({
  slug,
  deliverableId,
}: {
  slug: string;
  deliverableId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    tone: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  async function onImport() {
    setPending(true);
    setResult(null);
    const formData = new FormData();
    formData.set('slug', slug);
    formData.set('id', deliverableId);
    const res = await importFindingsFromScans(formData);
    setPending(false);
    if (!res.ok) {
      setResult({ tone: 'error', message: res.error ?? 'Import failed' });
      return;
    }
    const n = res.imported ?? 0;
    setResult({
      tone: n > 0 ? 'success' : 'info',
      message:
        n > 0
          ? `Imported ${n} finding${n === 1 ? '' : 's'} from scan events.`
          : 'No new scan findings to import.',
    });
    if (n > 0) router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" size="sm" onClick={onImport} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {pending ? 'Importing...' : 'Import from scans'}
      </Button>
      {result ? <InlineToast tone={result.tone}>{result.message}</InlineToast> : null}
    </div>
  );
}
