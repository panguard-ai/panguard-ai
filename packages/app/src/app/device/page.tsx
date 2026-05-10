import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMyWorkspaces } from '@/lib/workspaces';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { approveDeviceCode } from './actions';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function DevicePage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/device${sp.code ? `?code=${encodeURIComponent(sp.code)}` : ''}`;
    redirect(`/login?redirect=${encodeURIComponent(next)}`);
  }

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect('/onboarding');

  // Wrap the action to satisfy React 19's form-action type (void return).
  async function onApprove(formData: FormData): Promise<void> {
    'use server';
    const result = await approveDeviceCode(formData);
    if (!result.ok) {
      throw new Error(result.error ?? 'device_approval_failed');
    }
    // Success: redirect to a confirmation page (will be /device/approved).
    redirect('/device/approved');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-text-primary">Authorize CLI</h1>
      <p className="mb-6 text-sm text-text-muted">
        You will grant a CLI session access to a workspace as {user.email}. You can revoke the token
        from Settings → API keys at any time.
      </p>
      <Card padding="lg">
        <form action={onApprove} className="space-y-4">
          <Input
            name="userCode"
            label="User code"
            placeholder="XXXX-XXXX"
            defaultValue={sp.code ?? ''}
            required
            pattern="[A-Z0-9]{4}-[A-Z0-9]{4}"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <Select
            name="workspaceSlug"
            label="Workspace"
            options={workspaces.map((w) => ({ value: w.slug, label: w.name }))}
          />
          <Button type="submit" className="w-full">
            Authorize
          </Button>
        </form>
      </Card>
    </main>
  );
}
