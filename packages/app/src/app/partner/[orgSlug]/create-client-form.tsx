'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClientWorkspace } from './actions';

/**
 * Inline form a partner_admin uses to provision a new client workspace.
 * On success it navigates into the freshly created client dashboard
 * (/w/<slug>) — the partner can configure it immediately, and the trip
 * proves the org-scoped RLS access works end to end.
 */
export function CreateClientForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createClientWorkspace(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? 'Failed to create client workspace');
      return;
    }
    formRef.current?.reset();
    if (result.slug) {
      router.push(`/w/${result.slug}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader
        title="Add client workspace"
        subtitle="Provision a new end-client tenant under your organization."
      />
      <form
        ref={formRef}
        action={onSubmit}
        className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <Input name="name" label="Client name" placeholder="Acme Corp" required />
        <Input
          name="slug"
          label="URL slug"
          placeholder="acme-corp"
          hint="2-40 chars: a-z, 0-9, hyphen"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create client'}
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-status-danger">{error}</p> : null}
    </Card>
  );
}
