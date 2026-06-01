'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from '@/components/icons';
import { createDeliverable } from '@/app/w/[slug]/deliverables/actions';

/**
 * Create a draft deliverable, then jump straight into its detail page so the
 * assessor can start editing. Replaces an inline server-action form: a failed
 * create now surfaces a readable error and a pending state instead of silently
 * doing nothing. Stays disabled after a successful create so a double-click
 * can't spawn two drafts before the navigation lands.
 */
export function NewDeliverableButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set('slug', slug);
    const result = await createDeliverable(fd);
    if (result.ok && result.id) {
      router.push(`/w/${slug}/deliverables/${result.id}`);
      return;
    }
    setPending(false);
    setError(result.error ?? 'Could not create the deliverable. Please try again.');
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" onClick={onCreate} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {pending ? 'Creating...' : 'New deliverable'}
      </Button>
      {error ? <span className="text-sm text-status-danger">{error}</span> : null}
    </div>
  );
}
