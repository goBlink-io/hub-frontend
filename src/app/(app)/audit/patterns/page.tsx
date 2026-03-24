'use client';

import { useState, useEffect } from 'react';
import { Grid3X3, Loader2 } from 'lucide-react';
import { getPatterns } from '@/lib/audit-api';
import { ChainBadge } from '@/components/audit/ChainBadge';
import type { Pattern } from '@/types/audit';

const CATEGORIES = [
  'All',
  'AMM',
  'Lending',
  'Token',
  'Governance',
  'Oracle',
  'Bridge',
  'Staking',
  'Access Control',
];

const SEVERITY_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: 'var(--color-danger)', bg: 'rgba(239, 68, 68, 0.12)' },
  high: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
  medium: { color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.12)' },
  low: { color: 'var(--color-info)', bg: 'rgba(6, 182, 212, 0.12)' },
  info: { color: 'var(--color-text-muted)', bg: 'var(--color-bg-tertiary)' },
};

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let mounted = true;
    getPatterns()
      .then((data) => {
        if (mounted) setPatterns(data);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load patterns');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const filtered =
    activeCategory === 'All'
      ? patterns
      : patterns.filter((p) => p.category === activeCategory);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loading patterns...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <Grid3X3 size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {error}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          The pattern library will load when the Zion API is available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
          Pattern Library
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {patterns.length} vulnerability patterns across DeFi categories
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all shrink-0"
            style={{
              backgroundColor:
                activeCategory === cat
                  ? 'var(--color-primary)'
                  : 'var(--color-bg-tertiary)',
              color: activeCategory === cat ? '#fff' : 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          No patterns in this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((pattern) => {
            const sev = SEVERITY_COLORS[pattern.severity] ?? SEVERITY_COLORS.info;
            return (
              <div
                key={pattern.id}
                className="p-4"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {pattern.name}
                  </h3>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 shrink-0"
                    style={{
                      color: sev.color,
                      backgroundColor: sev.bg,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {pattern.severity}
                  </span>
                </div>
                <p
                  className="text-xs mb-3 line-clamp-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {pattern.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {pattern.chains.map((chain) => (
                    <ChainBadge key={chain} chain={chain} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
