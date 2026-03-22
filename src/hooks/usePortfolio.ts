'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWallet } from '@goblink/connect/react';
import { getTokenBalance } from '@/lib/balances';
import { getChainLogo } from '@/lib/chain-logos';
import { getChainMeta } from '@/lib/chain-meta';

/* ─── Types ─── */

export interface TokenBalance {
  chain: string;
  address: string;
  symbol: string;
  name: string;
  balance: string;
  balanceFormatted: string;
  usdValue: number;
  change24h: number;
  logoUrl?: string;
  portfolioPercent: number;
}

export interface ChainBalance {
  chain: string;
  totalUsd: number;
  tokenCount: number;
  percent: number;
  color: string;
}

export interface PortfolioData {
  totalValueUsd: number;
  tokens: TokenBalance[];
  chainBreakdown: ChainBalance[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  connectedChains: string[];
}

/* ─── Chain → Token Definitions ─── */

interface ChainTokenDef {
  symbol: string;
  assetId: string;
  decimals: number;
  blockchain: string;
  contractAddress?: string;
  address?: string;
  name?: string;
}

interface PortfolioChainDef {
  id: string;
  type: 'near' | 'evm' | 'solana' | 'sui';
  tokens: ChainTokenDef[];
}

const PORTFOLIO_CHAINS: PortfolioChainDef[] = [
  { id: 'near', type: 'near', tokens: [
    { symbol: 'NEAR', assetId: 'native', decimals: 24, blockchain: 'near', name: 'NEAR Protocol' },
  ]},
  { id: 'ethereum', type: 'evm', tokens: [
    { symbol: 'ETH', assetId: 'native', decimals: 18, blockchain: 'ethereum', name: 'Ethereum' },
  ]},
  { id: 'base', type: 'evm', tokens: [
    { symbol: 'ETH', assetId: 'native', decimals: 18, blockchain: 'base', name: 'Ethereum' },
  ]},
  { id: 'arbitrum', type: 'evm', tokens: [
    { symbol: 'ETH', assetId: 'native', decimals: 18, blockchain: 'arbitrum', name: 'Ethereum' },
  ]},
  { id: 'optimism', type: 'evm', tokens: [
    { symbol: 'ETH', assetId: 'native', decimals: 18, blockchain: 'optimism', name: 'Ethereum' },
  ]},
  { id: 'solana', type: 'solana', tokens: [
    { symbol: 'SOL', assetId: 'native', decimals: 9, blockchain: 'solana', name: 'Solana' },
  ]},
  { id: 'sui', type: 'sui', tokens: [
    { symbol: 'SUI', assetId: 'native', decimals: 9, blockchain: 'sui', name: 'Sui' },
  ]},
  { id: 'bsc', type: 'evm', tokens: [
    { symbol: 'BNB', assetId: 'native', decimals: 18, blockchain: 'bsc', name: 'BNB' },
  ]},
  { id: 'polygon', type: 'evm', tokens: [
    { symbol: 'POL', assetId: 'native', decimals: 18, blockchain: 'polygon', name: 'Polygon' },
  ]},
  { id: 'avalanche', type: 'evm', tokens: [
    { symbol: 'AVAX', assetId: 'native', decimals: 18, blockchain: 'avalanche', name: 'Avalanche' },
  ]},
];

/* ─── Price Fetching ─── */

interface PriceEntry {
  assetId: string;
  priceUsd?: string;
}

async function fetchPrices(): Promise<Record<string, number>> {
  try {
    const res = await fetch('/api/tokens/prices');
    if (!res.ok) return {};
    const data: PriceEntry[] = await res.json();
    const map: Record<string, number> = {};
    for (const p of data) {
      if (p.priceUsd) {
        const price = parseFloat(p.priceUsd);
        if (price > 0) map[p.assetId] = price;
      }
    }
    return map;
  } catch {
    return {};
  }
}

/* Map token symbol → best price from the prices map */
const SYMBOL_ASSET_MAP: Record<string, string[]> = {
  NEAR: ['nep141:wrap.near', 'native'],
  ETH: ['nep141:eth.omft.near', 'native'],
  SOL: ['nep141:sol.omft.near'],
  SUI: ['nep141:sui.omft.near'],
  BNB: ['nep141:bnb.omft.near'],
  POL: ['nep141:pol.omft.near'],
  AVAX: ['nep141:avax.omft.near'],
};

function resolvePrice(symbol: string, prices: Record<string, number>): number {
  const candidates = SYMBOL_ASSET_MAP[symbol];
  if (candidates) {
    for (const assetId of candidates) {
      if (prices[assetId]) return prices[assetId];
    }
  }
  // Brute-force search by matching suffix
  const sym = symbol.toLowerCase();
  for (const [assetId, price] of Object.entries(prices)) {
    const id = assetId.toLowerCase();
    if (id.endsWith(`:${sym}.omft.near`) || id.endsWith(`:wrap.${sym}`)) return price;
  }
  return 0;
}

/* ─── Format helpers ─── */

function formatBalance(value: string): string {
  const n = parseFloat(value);
  if (isNaN(n) || n === 0) return '0';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  const mag = Math.floor(Math.log10(Math.abs(n)));
  const decimals = Math.min(Math.max(0, -mag + 5), 12);
  return n.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export { formatUsd };

/* ─── The Hook ─── */

const REFRESH_INTERVAL = 30_000;

export function usePortfolio(): PortfolioData {
  const { getAddress } = useWallet();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectedChains = useMemo(() => {
    const chains: string[] = [];
    for (const chain of PORTFOLIO_CHAINS) {
      const addr = getAddress(chain.type);
      if (addr) chains.push(chain.id);
    }
    return chains;
  }, [getAddress]);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const prices = await fetchPrices();
      const balances: TokenBalance[] = [];

      const fetches = PORTFOLIO_CHAINS.flatMap(chain => {
        const addr = getAddress(chain.type);
        if (!addr) return [];
        return chain.tokens.map(async (token) => {
          try {
            const balance = await getTokenBalance(addr, {
              blockchain: token.blockchain,
              symbol: token.symbol,
              decimals: token.decimals,
            });
            const num = parseFloat(balance);
            if (num > 0) {
              const price = resolvePrice(token.symbol, prices);
              const usdValue = num * price;
              const logo = getChainLogo(chain.id);
              balances.push({
                chain: chain.id,
                address: token.contractAddress ?? 'native',
                symbol: token.symbol,
                name: token.name ?? token.symbol,
                balance,
                balanceFormatted: formatBalance(balance),
                usdValue,
                change24h: 0, // API doesn't provide 24h change yet
                logoUrl: logo?.icon,
                portfolioPercent: 0, // calculated below
              });
            }
          } catch {
            // skip failed fetches silently
          }
        });
      });

      await Promise.allSettled(fetches);

      // Calculate portfolio percentages
      const total = balances.reduce((s, t) => s + t.usdValue, 0);
      for (const b of balances) {
        b.portfolioPercent = total > 0 ? (b.usdValue / total) * 100 : 0;
      }

      // Sort by USD value descending
      balances.sort((a, b) => b.usdValue - a.usdValue);
      setTokens(balances);
    } catch (e) {
      setError('Failed to load balances. Tap to retry.');
      console.error('Portfolio fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [getAddress]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchBalances();
    intervalRef.current = setInterval(fetchBalances, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBalances]);

  const totalValueUsd = useMemo(
    () => tokens.reduce((s, t) => s + t.usdValue, 0),
    [tokens],
  );

  const chainBreakdown = useMemo((): ChainBalance[] => {
    const byChain = new Map<string, { totalUsd: number; count: number }>();
    for (const t of tokens) {
      const existing = byChain.get(t.chain) ?? { totalUsd: 0, count: 0 };
      existing.totalUsd += t.usdValue;
      existing.count += 1;
      byChain.set(t.chain, existing);
    }

    return Array.from(byChain.entries())
      .map(([chain, data]) => {
        const meta = getChainMeta(chain);
        return {
          chain,
          totalUsd: data.totalUsd,
          tokenCount: data.count,
          percent: totalValueUsd > 0 ? (data.totalUsd / totalValueUsd) * 100 : 0,
          color: meta.color,
        };
      })
      .sort((a, b) => b.totalUsd - a.totalUsd);
  }, [tokens, totalValueUsd]);

  return {
    totalValueUsd,
    tokens,
    chainBreakdown,
    loading,
    error,
    refresh: fetchBalances,
    connectedChains,
  };
}
