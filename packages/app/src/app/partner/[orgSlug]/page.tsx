import { notFound } from 'next/navigation';
import { requireOrgBySlug, listOrgWorkspaces } from '@/lib/organizations';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Users } from '@/components/icons';
import type { Tier } from '@/lib/types';
import { CreateClientForm } from './create-client-form';

const tierTone: Record<Tier, 'neutral' | 'sage' | 'info'> = {
  community: 'neutral',
  pilot: 'sage',
  enterprise: 'info',
};

const regionLabel: Record<string, string> = {
  eu: 'EU',
  us: 'US',
  apac: 'APAC',
  global: 'Global',
};

export default async function PartnerFleetPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgBySlug(orgSlug);
  if (!ctx) notFound();

  const clients = await listOrgWorkspaces(ctx.organization.id);
  const isAdmin = ctx.role === 'partner_admin';

  const stats = [
    { label: 'Client workspaces', value: clients.length },
    { label: 'Pilot', value: clients.filter((c) => c.tier === 'pilot').length },
    { label: 'Enterprise', value: clients.filter((c) => c.tier === 'enterprise').length },
    { label: 'Region', value: regionLabel[ctx.organization.region] ?? ctx.organization.region },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Fleet overview</h1>
        <p className="mt-1 text-sm text-text-muted">
          {ctx.organization.name} — every client workspace you manage, in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-wide text-text-muted">{s.label}</p>
            <p className="mt-2 font-display text-3xl text-text-primary">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card padding="lg">
        <CardHeader
          title="Clients"
          subtitle="Open a client to manage its endpoints, events, and reports."
        />
        {clients.length === 0 ? (
          <EmptyClients canCreate={isAdmin} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Client</TH>
                <TH>Slug</TH>
                <TH>Tier</TH>
                <TH>Created</TH>
                <TH>{''}</TH>
              </TR>
            </THead>
            <TBody>
              {clients.map((c) => (
                <TR key={c.id}>
                  <TD className="text-text-primary">{c.name}</TD>
                  <TD className="font-mono text-xs">{c.slug}</TD>
                  <TD>
                    <Badge tone={tierTone[c.tier]}>{c.tier}</Badge>
                  </TD>
                  <TD>{new Date(c.created_at).toLocaleDateString()}</TD>
                  <TD>
                    <Button variant="ghost" size="sm" href={`/w/${c.slug}`}>
                      Open
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {isAdmin ? <CreateClientForm orgSlug={ctx.organization.slug} /> : null}
    </div>
  );
}

function EmptyClients({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-2 p-8 text-center">
      <Users className="mx-auto h-8 w-8 text-brand-sage" />
      <h3 className="mt-3 text-base font-semibold text-text-primary">No clients yet</h3>
      <p className="mt-1 text-sm text-text-muted">
        {canCreate
          ? 'Add your first client workspace below to start onboarding.'
          : 'A partner admin will add client workspaces here.'}
      </p>
    </div>
  );
}
