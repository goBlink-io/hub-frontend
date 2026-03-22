'use client';

import type { ChainBalance } from '@/hooks/usePortfolio';
import { formatUsd } from '@/hooks/usePortfolio';
import { getChainMeta } from '@/lib/chain-meta';
import { getChainLogo } from '@/lib/chain-logos';

interface ChainChipsProps {
  breakdown: ChainBalance[];
  activeChain: string | null;
  onChainClick: (chain: string | null) => void;
}

export function ChainChips({ breakdown, activeChain, onChainClick }: ChainChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
      {/* All chip */}
      <button
        type="button"
        onClick={() => onChainClick(null)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-tiny font-medium transition-colors"
        style={{
          background: activeChain === null ? 'var(--brand)' : 'var(--elevated)',
          color: activeChain === null ? '#fff' : 'var(--text-secondary)',
          minHeight: '44px',
        }}
      >
        All
      </button>

      {breakdown.map((chain) => {
        const meta = getChainMeta(chain.chain);
        const logo = getChainLogo(chain.chain);
        const isActive = activeChain === chain.chain;

        return (
          <button
            key={chain.chain}
            type="button"
            onClick={() => onChainClick(isActive ? null : chain.chain)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-tiny font-medium transition-all"
            style={{
              background: isActive ? meta.color + '33' : 'var(--elevated)',
              color: isActive ? meta.color : 'var(--text-secondary)',
              border: isActive ? `1px solid ${meta.color}55` : '1px solid transparent',
              minHeight: '44px',
            }}
          >
            {logo?.icon && (
              <img
                src={logo.icon}
                alt={meta.name}
                className="w-4 h-4 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span>{meta.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {formatUsd(chain.totalUsd)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
