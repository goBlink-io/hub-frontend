'use client';

import { useState, useMemo } from 'react';
import { useWallet } from '@goblink/connect/react';
import {
  PieChart, Wallet, RefreshCw, Search, SlidersHorizontal,
  ArrowUpDown, TrendingUp, TrendingDown,
} from 'lucide-react';
import { usePortfolio, formatUsd } from '@/hooks/usePortfolio';
import { ChainDonut } from '@/components/portfolio/ChainDonut';
import { TokenRow } from '@/components/portfolio/TokenRow';
import { ChainChips } from '@/components/portfolio/ChainChips';
import { NftGallery } from '@/components/portfolio/NftGallery';
import { ActivityFeed } from '@/components/portfolio/ActivityFeed';
import { PortfolioSkeleton } from '@/components/portfolio/PortfolioSkeleton';
import { getChainMeta } from '@/lib/chain-meta';
import { getChainLogo } from '@/lib/chain-logos';
import { ProductSuggestion } from '@/components/shared/ProductSuggestion';

type SortKey = 'value' | 'name' | 'chain' | 'change';

export default function PortfolioPage() {
  const { getAddress, isConnected } = useWallet();
  const {
    totalValueUsd, tokens, chainBreakdown,
    loading, error, refresh, connectedChains,
  } = usePortfolio();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [chainFilter, setChainFilter] = useState<string | null>(null);

  const hasAnyWallet = connectedChains.length > 0;

  /* ─── Filtered & Sorted Tokens ─── */
  const filteredTokens = useMemo(() => {
    let list = [...tokens];

    // Chain filter
    if (chainFilter) {
      list = list.filter((t) => t.chain === chainFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          getChainMeta(t.chain).name.toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'value': cmp = a.usdValue - b.usdValue; break;
        case 'name': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'chain': cmp = a.chain.localeCompare(b.chain); break;
        case 'change': cmp = a.change24h - b.change24h; break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [tokens, search, sortKey, sortAsc, chainFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  /* ─── Truncate wallet addresses ─── */
  const walletBadges = useMemo(() => {
    const badges: { chain: string; address: string; color: string }[] = [];
    const types = ['near', 'evm', 'solana', 'sui'] as const;
    const seen = new Set<string>();
    for (const type of types) {
      const addr = getAddress(type);
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        const chainName = type === 'evm' ? 'ethereum' : type;
        const meta = getChainMeta(chainName);
        const truncated = addr.length > 12
          ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
          : addr;
        badges.push({ chain: chainName, address: truncated, color: meta.color });
      }
    }
    return badges;
  }, [getAddress]);

  /* ─── Empty / Not Connected ─── */
  if (!hasAnyWallet) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="card p-12 text-center animate-fade-up">
          <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
          <h1 className="text-h3 mb-2">Portfolio</h1>
          <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
            Connect a wallet to view your portfolio
          </p>
        </div>
      </div>
    );
  }

  /* ─── First Load ─── */
  if (loading && tokens.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PortfolioSkeleton />
      </div>
    );
  }

  /* ─── Error ─── */
  if (error && tokens.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="card p-12 text-center animate-fade-up">
          <p className="text-body-sm mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>
          <button onClick={refresh} className="btn btn-primary h-10 px-5 text-body-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hasTokens = tokens.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6 animate-fade-up">

      {/* ─── Total Value Header ─── */}
      <div className="card p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <PieChart className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-h3">Portfolio</h1>
        </div>

        <div
          className="text-4xl md:text-5xl font-bold mb-1 tabular-nums"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {formatUsd(totalValueUsd)}
        </div>

        <p className="text-tiny mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Across {chainBreakdown.length} chain{chainBreakdown.length !== 1 ? 's' : ''}
          {' · '}{tokens.length} token{tokens.length !== 1 ? 's' : ''}
        </p>

        {/* Connected wallet badges */}
        {walletBadges.length > 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
            {walletBadges.map((w) => (
              <span
                key={w.address}
                className="text-tiny px-2 py-0.5 rounded-full font-mono"
                style={{
                  background: w.color + '18',
                  color: w.color,
                  border: `1px solid ${w.color}33`,
                }}
              >
                {w.address}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={refresh}
          disabled={loading}
          className="btn btn-secondary h-8 px-3 text-tiny gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ─── Chain Chips (mobile scrollable filter) ─── */}
      {chainBreakdown.length > 0 && (
        <ChainChips
          breakdown={chainBreakdown}
          activeChain={chainFilter}
          onChainClick={setChainFilter}
        />
      )}

      {/* ─── Chain Donut + Breakdown ─── */}
      {chainBreakdown.length > 0 && (
        <div className="card p-5">
          <h2 className="text-h5 mb-4">Chain Breakdown</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ChainDonut breakdown={chainBreakdown} totalValueUsd={totalValueUsd} />

            <div className="flex-1 w-full space-y-2">
              {chainBreakdown.map((chain) => {
                const meta = getChainMeta(chain.chain);
                const logo = getChainLogo(chain.chain);
                return (
                  <button
                    key={chain.chain}
                    type="button"
                    onClick={() =>
                      setChainFilter(chainFilter === chain.chain ? null : chain.chain)
                    }
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{
                      background:
                        chainFilter === chain.chain
                          ? meta.color + '18'
                          : 'var(--color-bg-tertiary)',
                      minHeight: '44px',
                    }}
                  >
                    {logo?.icon ? (
                      <img
                        src={logo.icon}
                        alt={meta.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: meta.color }}
                      >
                        {meta.icon.substring(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div
                        className="text-body-sm font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {meta.name}
                      </div>
                      <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                        {chain.tokenCount} token{chain.tokenCount !== 1 ? 's' : ''} ·{' '}
                        {chain.percent.toFixed(1)}%
                      </div>
                    </div>
                    <div
                      className="text-body-sm font-semibold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {formatUsd(chain.totalUsd)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Token List ─── */}
      {hasTokens && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h5">Tokens</h2>
            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <select
                value={sortKey}
                onChange={(e) => handleSort(e.target.value as SortKey)}
                className="input h-8 text-tiny px-2"
                style={{ minWidth: '100px' }}
              >
                <option value="value">By Value</option>
                <option value="name">By Name</option>
                <option value="chain">By Chain</option>
                <option value="change">By Change</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full h-10 pl-9 text-body-sm"
              style={{ fontSize: '16px' }}
            />
          </div>

          {filteredTokens.length === 0 ? (
            <div className="text-center py-8">
              <Search
                className="h-8 w-8 mx-auto mb-2 opacity-20"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <p className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                No tokens match your search
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left text-tiny font-medium pb-2" style={{ color: 'var(--color-text-muted)' }}>
                        Token
                      </th>
                      <th className="text-left text-tiny font-medium pb-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                        Chain
                      </th>
                      <th className="text-right text-tiny font-medium pb-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                        Balance
                      </th>
                      <th className="text-right text-tiny font-medium pb-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                        Value
                      </th>
                      <th className="text-right text-tiny font-medium pb-2 px-3" style={{ color: 'var(--color-text-muted)' }}>
                        24h
                      </th>
                      <th className="text-right text-tiny font-medium pb-2 pl-3" style={{ color: 'var(--color-text-muted)' }}>
                        Portfolio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTokens.map((token) => (
                      <TokenRow
                        key={`${token.chain}-${token.symbol}`}
                        token={token}
                        variant="row"
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filteredTokens.map((token) => (
                  <TokenRow
                    key={`${token.chain}-${token.symbol}`}
                    token={token}
                    variant="card"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Empty tokens state ─── */}
      {!hasTokens && !loading && (
        <div className="card p-12 text-center">
          <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-body-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            No tokens found
          </p>
          <p className="text-tiny mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Transfer some tokens to your connected wallets to get started.
          </p>
        </div>
      )}

      {/* ─── NFT Gallery ─── */}
      <NftGallery connectedChains={connectedChains} />

      {/* ─── Activity Feed ─── */}
      <ActivityFeed chainFilter={chainFilter} />

      <ProductSuggestion exclude="portfolio" />
    </div>
  );
}
