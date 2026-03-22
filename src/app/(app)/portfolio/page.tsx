'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@goblink/connect/react';
import { getTokenBalance } from '@/lib/balances';
import { CHAIN_LOGOS, getChainLogo } from '@/lib/chain-logos';
import { PieChart, Wallet, RefreshCw, Loader2, TrendingUp } from 'lucide-react';

interface TokenBalance {
  symbol: string;
  name?: string;
  balance: string;
  balanceUsd: number;
  chain: string;
  icon?: string;
  priceUsd: number;
}

interface ChainSummary {
  chain: string;
  chainName: string;
  totalUsd: number;
  tokenCount: number;
  logo: string | null;
  color: string;
}

const PORTFOLIO_CHAINS = [
  { id: 'near', type: 'near' as const, tokens: [{ symbol: 'NEAR', assetId: 'native', decimals: 24, blockchain: 'near' }] },
  { id: 'ethereum', type: 'evm' as const, tokens: [{ symbol: 'ETH', assetId: 'native', decimals: 18, blockchain: 'ethereum' }] },
  { id: 'base', type: 'evm' as const, tokens: [{ symbol: 'ETH', assetId: 'native', decimals: 18, blockchain: 'base' }] },
  { id: 'arbitrum', type: 'evm' as const, tokens: [{ symbol: 'ETH', assetId: 'native', decimals: 18, blockchain: 'arbitrum' }] },
  { id: 'solana', type: 'solana' as const, tokens: [{ symbol: 'SOL', assetId: 'native', decimals: 9, blockchain: 'solana' }] },
  { id: 'sui', type: 'sui' as const, tokens: [{ symbol: 'SUI', assetId: 'native', decimals: 9, blockchain: 'sui' }] },
  { id: 'bsc', type: 'evm' as const, tokens: [{ symbol: 'BNB', assetId: 'native', decimals: 18, blockchain: 'bsc' }] },
  { id: 'polygon', type: 'evm' as const, tokens: [{ symbol: 'POL', assetId: 'native', decimals: 18, blockchain: 'polygon' }] },
];

export default function PortfolioPage() {
  const { getAddress, isChainConnected } = useWallet();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});

  // Fetch prices
  useEffect(() => {
    fetch('/api/tokens/prices')
      .then(r => r.json())
      .then((data: { assetId: string; priceUsd?: string }[]) => {
        const priceMap: Record<string, number> = {};
        // Map common symbols to prices
        for (const p of data) {
          if (p.priceUsd) {
            const price = parseFloat(p.priceUsd);
            if (price > 0) {
              // Extract symbol from assetId for matching
              priceMap[p.assetId] = price;
            }
          }
        }
        setPrices(priceMap);
      })
      .catch(() => {});
  }, []);

  // Known prices for common native tokens (fallback)
  const getPrice = useCallback((symbol: string): number => {
    // Try exact match in prices map
    for (const [, price] of Object.entries(prices)) {
      if (price > 0) {
        // Simple heuristic — match by known symbols
        // TODO: Better price matching using assetId
      }
    }
    return 0;
  }, [prices]);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    const balances: TokenBalance[] = [];

    for (const chain of PORTFOLIO_CHAINS) {
      const address = getAddress(chain.type);
      if (!address) continue;

      for (const token of chain.tokens) {
        try {
          const balance = await getTokenBalance(address, {
            blockchain: token.blockchain,
            symbol: token.symbol,
            decimals: token.decimals,
          });

          const balNum = parseFloat(balance);
          if (balNum > 0) {
            const chainLogo = getChainLogo(chain.id);
            balances.push({
              symbol: token.symbol,
              balance,
              balanceUsd: 0, // Will be filled when prices available
              chain: chain.id,
              icon: chainLogo?.icon,
              priceUsd: 0,
            });
          }
        } catch {
          // Skip failed balance fetches
        }
      }
    }

    setTokenBalances(balances);
    setLoading(false);
  }, [getAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const totalValue = useMemo(() =>
    tokenBalances.reduce((sum, t) => sum + t.balanceUsd, 0),
    [tokenBalances]
  );

  const chainSummaries = useMemo((): ChainSummary[] => {
    const byChain = new Map<string, { totalUsd: number; tokens: number }>();
    for (const t of tokenBalances) {
      const existing = byChain.get(t.chain) || { totalUsd: 0, tokens: 0 };
      existing.totalUsd += t.balanceUsd;
      existing.tokens += 1;
      byChain.set(t.chain, existing);
    }

    return Array.from(byChain.entries()).map(([chain, data]) => {
      const logo = getChainLogo(chain);
      return {
        chain,
        chainName: logo?.name || chain,
        totalUsd: data.totalUsd,
        tokenCount: data.tokens,
        logo: logo?.icon || null,
        color: logo?.color || '#666',
      };
    }).sort((a, b) => b.totalUsd - a.totalUsd);
  }, [tokenBalances]);

  const hasAnyWallet = PORTFOLIO_CHAINS.some(c => getAddress(c.type));

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Total Value */}
      <div className="card p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <PieChart className="h-5 w-5" style={{ color: 'var(--brand)' }} />
          <h1 className="text-h3">Portfolio</h1>
        </div>

        {hasAnyWallet ? (
          <>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {totalValue > 0 ? `$${totalValue.toFixed(2)}` : '—'}
            </div>
            <p className="text-tiny" style={{ color: 'var(--text-muted)' }}>
              Across {chainSummaries.length} chain{chainSummaries.length !== 1 ? 's' : ''}
            </p>
            <button onClick={fetchBalances} disabled={loading}
              className="mt-3 btn btn-secondary h-8 px-3 text-tiny gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        ) : (
          <>
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>Connect a wallet to view your portfolio</p>
          </>
        )}
      </div>

      {/* Chain Breakdown */}
      {chainSummaries.length > 0 && (
        <div className="card p-5">
          <h2 className="text-h5 mb-3">Chains</h2>
          <div className="space-y-2">
            {chainSummaries.map(chain => (
              <div key={chain.chain} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--elevated)' }}>
                {chain.logo && (
                  <img src={chain.logo} alt={chain.chainName} className="w-8 h-8 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1">
                  <div className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{chain.chainName}</div>
                  <div className="text-tiny" style={{ color: 'var(--text-muted)' }}>
                    {chain.tokenCount} token{chain.tokenCount !== 1 ? 's' : ''}
                  </div>
                </div>
                {chain.totalUsd > 0 && (
                  <div className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    ${chain.totalUsd.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token List */}
      {tokenBalances.length > 0 && (
        <div className="card p-5">
          <h2 className="text-h5 mb-3">Tokens</h2>
          <div className="space-y-1">
            {tokenBalances.map((token, i) => {
              const chainLogo = getChainLogo(token.chain);
              return (
                <div key={`${token.chain}-${token.symbol}-${i}`}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl"
                  style={{ background: 'transparent' }}>
                  <div className="relative">
                    {token.icon ? (
                      <img src={token.icon} alt={token.symbol} className="w-9 h-9 rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: chainLogo?.color || 'var(--brand)' }}>
                        {token.symbol[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{token.symbol}</div>
                    <div className="text-tiny" style={{ color: 'var(--text-muted)' }}>{chainLogo?.name || token.chain}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{token.balance}</div>
                    {token.balanceUsd > 0 && (
                      <div className="text-tiny" style={{ color: 'var(--text-muted)' }}>${token.balanceUsd.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      )}
    </div>
  );
}
