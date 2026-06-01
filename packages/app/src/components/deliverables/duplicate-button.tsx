'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from '@/components/icons';
import { duplicateDeliverable } from '@/app/w/[slug]/deliverables/actions';

/**
 * Clone an issued (locked) deliverable into a fresh editable draft, then jump
 * into the new draft so the assessor can revise it. An issued PDF is an
 * immutable signed artifact, so this is the only revise path: the partner keeps
 * the original signed report on file and edits the copy. Stays disabled after a
 * successful clone so a double-click can't spawn two revision drafts before the
 * navigation lands.
 */
export function DuplicateButton({ slug, id }: { slug: string; id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDuplicate() {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set('slug', slug);
    fd.set('id', id);
    const result = await duplicateDeliverable(fd);
    if (result.ok && result.id) {
      router.push(`/w/${slug}/deliverables/${result.id}`);
      return;
    }
    setPending(false);
    setError(result.error ?? 'Could not create a revision draft. Please try again.');
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button type="button" variant="secondary" onClick={onDuplicate} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
        {pending ? 'Duplicating...' : 'Duplicate as new draft'}
      </Button>
      {error ? <span className="text-sm text-status-danger">{error}</span> : null}
    </div>
  );
}
