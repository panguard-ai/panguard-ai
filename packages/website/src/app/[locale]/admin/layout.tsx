'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Link } from '@/navigation';
import BrandLogo from '@/components/ui/BrandLogo';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Monitor,
  ShieldAlert,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Loader2,
  ShieldOff,
} from 'lucide-react';

interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly enabled: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, enabled: true },
  { id: 'endpoints', label: 'Endpoints', href: '/admin/endpoints', icon: Monitor, enabled: true },
  { id: 'threats', label: 'Threats', href: '/admin/threats', icon: ShieldAlert, enabled: true },
  { id: 'policies', label: 'Policies', href: '/admin/policies', icon: FileText, enabled: false },
  { id: 'settings', label: 'Settings', href: '/admin/settings', icon: Settings, enabled: false },
] as const;

function getActiveNavId(pathname: string): string {
  for (const item of NAV_ITEMS) {
    if (pathname.includes(item.href)) {
      return item.id;
    }
  }
  return 'dashboard';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = getActiveNavId(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-sage animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldOff className="w-8 h-8 text-text-tertiary mx-auto" />
          <p className="text-sm text-text-tertiary">Access denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-surface-1 border-r border-border flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-border shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <BrandLogo size={20} className="text-brand-sage" />
            <span className="font-semibold tracking-wider text-text-primary text-sm">PANGUARD</span>
            <span className="text-[10px] uppercase tracking-widest text-text-tertiary font-medium ml-1">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            const Icon = item.icon;

            if (!item.enabled) {
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted cursor-not-allowed"
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span className="text-sm">{item.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider bg-surface-2 text-text-tertiary px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href as '/admin/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-sage/10 text-brand-sage'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/60'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-sage" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border px-4 py-3 shrink-0">
          {user && (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-text-tertiary truncate">{user.email}</p>
              </div>
              <button
                onClick={() => void logout()}
                className="text-text-tertiary hover:text-status-danger transition-colors shrink-0 ml-2"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          {!user && (
            <Link
              href="/login"
              className="text-sm text-brand-sage hover:text-brand-sage-light transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-surface-1 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-1.5 text-text-tertiary hover:text-text-secondary transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs">Back to site</span>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
