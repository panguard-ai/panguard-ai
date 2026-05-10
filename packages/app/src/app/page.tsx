import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMyWorkspaces } from '@/lib/workspaces';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const workspaces = await listMyWorkspaces();
  if (workspaces.length === 0) redirect('/onboarding');
  if (workspaces.length === 1) redirect(`/w/${workspaces[0]!.slug}`);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-semibold text-text-primary">Choose a workspace</h1>
      <p className="mb-8 text-sm text-text-muted">
        Pick which workspace you want to open, or create a new one.
      </p>
      <div className="grid gap-3">
        {workspaces.map((w) => (
          <Link key={w.id} href={`/w/${w.slug}`}>
            <Card className="hover:border-brand-sage cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{w.name}</h3>
                  <p className="mt-0.5 text-xs text-text-muted font-mono">/w/{w.slug}</p>
                </div>
                <span className="text-sm text-brand-sage">Open →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <Button variant="secondary" href="/onboarding">
          Create another workspace
        </Button>
      </div>
    </main>
  );
}
