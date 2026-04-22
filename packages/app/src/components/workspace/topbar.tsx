import { signOut } from '@/app/(auth)/login/actions';
import { LogOut } from '@/components/icons';
import type { Workspace } from '@/lib/types';
import { WorkspaceSwitcher } from './workspace-switcher';

interface Props {
  workspace: Workspace;
  allWorkspaces: ReadonlyArray<Workspace>;
  userEmail: string;
}

export function Topbar({ workspace, allWorkspaces, userEmail }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface-0 px-4 md:px-6">
      <div className="flex items-center gap-3">
        <WorkspaceSwitcher current={workspace} options={allWorkspaces} />
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-text-muted sm:inline">
          {userEmail}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-brand-sage hover:text-text-primary"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
