import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrgBySlug } from '@/lib/organizations';
import { Badge } from '@/components/ui/badge';
import { Shield } from '@/components/icons';
import type { ContractStatus } from '@/lib/types';

// Suspended orgs never reach the layout (requireOrgBySlug returns null), so
// only the two reachable statuses need a tone.
const contractTone: Record<ContractStatus, 'safe' | 'caution' | 'neutral'> = {
  active: 'safe',
  trial: 'caution',
  suspended: 'neutral',
};

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgBySlug(orgSlug);
  if (!ctx) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 text-text-primary">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-brand-sage" />
          <Link href={`/partner/${ctx.organization.slug}`} className="font-semibold">
            {ctx.organization.name}
          </Link>
          <Badge tone={contractTone[ctx.organization.contract_status]}>
            {ctx.organization.contract_status}
          </Badge>
        </div>
        <span className="text-xs uppercase tracking-wide text-text-muted">Partner console</span>
      </header>
      <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
    </div>
  );
}
