'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeftRight, CreditCard, Store, BookOpen, PieChart } from 'lucide-react';

const PRODUCTS = [
  { id: 'swap', icon: ArrowLeftRight, title: 'Swap', desc: 'Transfer tokens across 26+ chains in seconds', href: '/swap', affinity: ['pay', 'portfolio'] },
  { id: 'pay', icon: CreditCard, title: 'Pay', desc: 'Create and share payment links instantly', href: '/pay', affinity: ['swap', 'merchant'] },
  { id: 'merchant', icon: Store, title: 'Merchant', desc: 'Accept crypto payments for your business', href: '/merchant', affinity: ['pay'] },
  { id: 'book', icon: BookOpen, title: 'BlinkBook', desc: 'Build and publish knowledge bases', href: '/book', affinity: [] as string[] },
  { id: 'portfolio', icon: PieChart, title: 'Portfolio', desc: 'Track your cross-chain balances', href: '/portfolio', affinity: ['swap', 'history'] },
] as const;

interface ProductSuggestionProps {
  exclude: string;
}

export function ProductSuggestion({ exclude }: ProductSuggestionProps) {
  const suggestions = useMemo(() => {
    const available = PRODUCTS.filter((p) => p.id !== exclude);

    // Score products by affinity to current page
    const current = PRODUCTS.find(p => p.id === exclude);
    if (current) {
      const scored = available.map(p => ({
        ...p,
        score: (current.affinity as readonly string[]).includes(p.id) ? 2 : (p.affinity as readonly string[]).includes(exclude) ? 1 : 0,
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 2);
    }

    return available.slice(0, 2);
  }, [exclude]);

  return (
    <div className="mt-8">
      <h3 className="text-caption font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        Explore more
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.map((product) => (
          <Link
            key={product.id}
            href={product.href}
            className="card-standard p-4 flex items-start gap-3 group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)' }}
            >
              <product.icon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {product.title}
              </div>
              <div className="text-tiny" style={{ color: 'var(--color-text-secondary)' }}>
                {product.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
