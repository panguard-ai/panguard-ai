import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import type { ApiKey, WorkspaceMember } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { KeyRound, Trash2, Users } from '@/components/icons';
import {
  createApiKey,
  inviteMember,
  removeMember,
  revokeApiKey,
  updateWorkspaceName,
} from './actions';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  const supabase = await createClient();
  const [{ data: membersRaw }, { data: keysRaw }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', ctx.workspace.id)
      .order('invited_at'),
    supabase
      .from('api_keys')
      .select('*')
      .eq('workspace_id', ctx.workspace.id)
      .order('created_at', { ascending: false }),
  ]);

  // postgrest-js v2 generic inference drops to `never` under our Database
  // shape even with Relationships: []; treat these as their canonical row
  // types per the SQL migrations.
  const memberRows = (membersRaw ?? []) as unknown as WorkspaceMember[];
  const keyRows = (keysRaw ?? []) as unknown as ApiKey[];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          {ctx.workspace.name} · <span className="font-mono">{ctx.workspace.slug}</span> · your role: <Badge tone="sage">{ctx.role}</Badge>
        </p>
      </div>

      <Card padding="lg">
        <CardHeader
          title="General"
          subtitle="The workspace name is visible to all members."
        />
        <form action={updateWorkspaceName} className="space-y-4">
          <input type="hidden" name="slug" value={ctx.workspace.slug} />
          <Input
            name="name"
            label="Workspace name"
            defaultValue={ctx.workspace.name}
            required
            minLength={2}
            maxLength={64}
          />
          <div>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>

      <Card padding="lg">
        <CardHeader
          title="Members"
          subtitle={`${memberRows.length} member${memberRows.length === 1 ? '' : 's'} in this workspace.`}
        />
        <form action={inviteMember} className="mb-6 flex flex-wrap items-end gap-3">
          <input type="hidden" name="slug" value={ctx.workspace.slug} />
          <div className="min-w-[240px] flex-1">
            <Input
              name="email"
              type="email"
              label="Invite by email"
              placeholder="teammate@company.com"
              required
            />
          </div>
          <Select
            name="role"
            label="Role"
            defaultValue="analyst"
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'analyst', label: 'Analyst' },
              { value: 'auditor', label: 'Auditor' },
              { value: 'readonly', label: 'Read-only' },
            ]}
          />
          <Button type="submit" variant="secondary" size="sm">
            <Users className="h-3.5 w-3.5" />
            Send invite
          </Button>
        </form>
        <Table>
          <THead>
            <TR>
              <TH>User</TH>
              <TH>Role</TH>
              <TH>Joined</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {memberRows.map((m) => (
              <TR key={`${m.workspace_id}:${m.user_id}`}>
                <TD className="font-mono text-xs">{m.user_id}</TD>
                <TD>
                  <Badge tone={m.role === 'admin' ? 'sage' : 'neutral'}>
                    {m.role}
                  </Badge>
                </TD>
                <TD>{new Date(m.invited_at).toLocaleDateString()}</TD>
                <TD>
                  <form action={removeMember}>
                    <input type="hidden" name="slug" value={ctx.workspace.slug} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-xs text-status-danger hover:underline"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </form>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card padding="lg">
        <CardHeader
          title="API keys"
          subtitle="Keys authorise the CLI and CI to submit events and download reports."
        />
        <form action={createApiKey} className="mb-6 flex flex-wrap items-end gap-3">
          <input type="hidden" name="slug" value={ctx.workspace.slug} />
          <div className="min-w-[240px] flex-1">
            <Input name="name" label="Key name" placeholder="CI runner" required />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            <KeyRound className="h-3.5 w-3.5" />
            Create key
          </Button>
        </form>
        {keyRows.length === 0 ? (
          <p className="text-sm text-text-muted">No API keys yet.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Prefix</TH>
                <TH>Status</TH>
                <TH>Last used</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {keyRows.map((k) => (
                <TR key={k.id}>
                  <TD className="text-text-primary">{k.name}</TD>
                  <TD className="font-mono text-xs">{k.key_prefix}…</TD>
                  <TD>
                    <Badge tone={k.revoked_at ? 'danger' : 'safe'}>
                      {k.revoked_at ? 'revoked' : 'active'}
                    </Badge>
                  </TD>
                  <TD>
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleString()
                      : 'never'}
                  </TD>
                  <TD>
                    {!k.revoked_at ? (
                      <form action={revokeApiKey}>
                        <input type="hidden" name="slug" value={ctx.workspace.slug} />
                        <input type="hidden" name="id" value={k.id} />
                        <button
                          type="submit"
                          className="text-xs text-status-danger hover:underline"
                        >
                          Revoke
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
