'use client';

import { useEffect, useState } from 'react';
import { Grid3X3, Loader2 } from 'lucide-react';
import type { ZionPattern } from '@/types/audit';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';

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

const CHAIN_COLORS: Record<string, { color: string; bg: string }> = {
  sui: { color: '#4DA2FF', bg: 'rgba(77, 162, 255, 0.12)' },
  aptos: { color: '#2DD8A3', bg: 'rgba(45, 216, 163, 0.12)' },
  evm: { color: '#627EEA', bg: 'rgba(98, 126, 234, 0.12)' },
  solana: { color: '#9945FF', bg: 'rgba(153, 69, 255, 0.12)' },
  near: { color: '#00EC97', bg: 'rgba(0, 236, 151, 0.12)' },
  auto: { color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)' },
};

function ChainChip({ chain }: { chain: string }) {
  const { color, bg } = CHAIN_COLORS[chain.toLowerCase()] ?? {
    color: 'var(--color-text-secondary)',
    bg: 'var(--color-bg-tertiary)',
  };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: bg, borderRadius: 'var(--radius-sm)' }}
    >
      {chain}
    </span>
  );
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<ZionPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let mounted = true;
    fetch('/api/zion/patterns', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Failed (${res.status})`);
        }
        return res.json() as Promise<ZionPattern[]>;
      })
      .then((data) => {
        if (mounted) setPatterns(data);
      })
      .catch((err: unknown) => {
        if (mounted)
          setError(err instanceof Error ? err.message : 'Failed to load patterns');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
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
          Loading patterns…
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
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Audit', href: '/audit' },
          { label: 'Patterns' },
        ]}
      />
      <div>
        <h1 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
          Pattern Library
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {patterns.length} vulnerability patterns across DeFi categories
        </p>
      </div>

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
                    className="text-[11px] font-bold uppercase px-2 py-0.5 shrink-0"
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
                {pattern.chains && pattern.chains.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pattern.chains.map((chain) => (
                      <ChainChip key={chain} chain={chain} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
