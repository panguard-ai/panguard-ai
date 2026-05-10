import Link from 'next/link';
import { FileText, LayoutDashboard, ListOrdered, Settings, Shield } from '@/components/icons';

interface SidebarProps {
  slug: string;
  activePath: string;
}

export function Sidebar({ slug, activePath }: SidebarProps) {
  const base = `/w/${slug}`;
  const items = [
    { href: base, label: 'Overview', icon: LayoutDashboard, match: base },
    { href: `${base}/events`, label: 'Events', icon: ListOrdered, match: `${base}/events` },
    { href: `${base}/reports`, label: 'Reports', icon: FileText, match: `${base}/reports` },
    { href: `${base}/settings`, label: 'Settings', icon: Settings, match: `${base}/settings` },
  ];

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface-0">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Shield className="h-5 w-5 text-brand-sage" />
        <span className="font-semibold text-text-primary">PanGuard</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map(({ href, label, icon: Icon, match }) => {
          const isActive = href === base ? activePath === base : activePath.startsWith(match);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
