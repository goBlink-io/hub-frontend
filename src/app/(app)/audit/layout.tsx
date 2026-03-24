'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Grid3X3, Bug } from 'lucide-react';
import type { ReactNode } from 'react';

interface TabItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const tabs: TabItem[] = [
  { href: '/audit', label: 'Audit', icon: <Shield size={14} /> },
  { href: '/audit/patterns', label: 'Patterns', icon: <Grid3X3 size={14} /> },
  { href: '/audit/exploits', label: 'Exploits', icon: <Bug size={14} /> },
];

export default function AuditLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/audit'
              ? pathname === '/audit'
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium flex-1 justify-center transition-all"
              style={{
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                backgroundColor: isActive ? 'var(--color-bg-tertiary)' : 'transparent',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
