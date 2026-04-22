import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMyWorkspaces, requireWorkspaceBySlug } from '@/lib/workspaces';
import { Sidebar } from '@/components/workspace/sidebar';
import { Topbar } from '@/components/workspace/topbar';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const workspaces = await listMyWorkspaces();

  // Next.js 15: headers() is async.
  const h = await headers();
  const activePath = h.get('x-invoke-path') ?? h.get('x-matched-path') ?? `/w/${slug}`;

  return (
    <div className="flex min-h-screen bg-surface-0 text-text-primary">
      <Sidebar slug={slug} activePath={activePath} />
      <div className="flex flex-1 flex-col">
        <Topbar
          workspace={ctx.workspace}
          allWorkspaces={workspaces}
          userEmail={user?.email ?? ''}
        />
        <main className="flex-1 overflow-x-hidden p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
