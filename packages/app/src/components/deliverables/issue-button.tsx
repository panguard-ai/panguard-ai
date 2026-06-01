'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileCheck } from '@/components/icons';
import { issueDeliverable } from '@/app/w/[slug]/deliverables/actions';

/**
 * Issue action: renders the signed PDF and locks the deliverable. Issuing is
 * irreversible (the row flips to `issued` and metadata edits are rejected
 * afterward), so it asks for confirmation first.
 */
export function IssueButton({ slug, id }: { slug: string; id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function onIssue() {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set('slug', slug);
    fd.set('id', id);
    const result = await issueDeliverable(fd);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? 'Failed to issue deliverable');
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={onIssue} disabled={pending}>
            {pending ? 'Issuing...' : 'Confirm issue'}
          </Button>
        </div>
      ) : (
        <Button onClick={() => setConfirming(true)} disabled={pending}>
          <FileCheck className="h-4 w-4" />
          Issue report
        </Button>
      )}
      {error ? <span className="text-sm text-status-danger">{error}</span> : null}
    </div>
  );
}
