'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/console/fleet', label: 'Fleet', icon: 'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25' },
  { href: '/console/policy', label: 'Policy', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { href: '/console/alerts', label: 'Alerts', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
] as const;

export default function ConsoleSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 220,
        background: '#242220',
        borderRight: '1px solid #3A3836',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2"
        style={{ padding: '20px 20px 16px' }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'rgba(139,154,142,0.15)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B9A8E" strokeWidth="2">
            <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <span
          className="font-display"
          style={{ fontSize: 14, fontWeight: 700, color: '#F5F1E8' }}
        >
          PanGuard
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#8B9A8E',
            letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
          }}
        >
          Console
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1" style={{ padding: '8px 0' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 no-underline"
              style={{
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? '#8B9A8E' : '#A09A94',
                borderLeft: `3px solid ${isActive ? '#8B9A8E' : 'transparent'}`,
                background: isActive ? 'rgba(139,154,142,0.08)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: back to site */}
      <div className="mt-auto" style={{ padding: '16px 20px', borderTop: '1px solid #3A3836' }}>
        <Link
          href="/"
          className="no-underline"
          style={{ fontSize: 12, color: '#A09A94' }}
        >
          Back to panguard.ai
        </Link>
      </div>
    </aside>
  );
}
