import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3" />}
          {item.href ? (
            <Link href={item.href} className="hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ color: 'var(--color-text-primary)' }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
