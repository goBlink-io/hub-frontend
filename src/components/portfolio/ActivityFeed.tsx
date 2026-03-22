'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@goblink/connect/react';
import {
  Clock, CheckCircle, AlertTriangle, Loader2,
  ExternalLink, ArrowDownLeft, ArrowUpRight, Repeat,
  ChevronDown,
} from 'lucide-react';
import { getExplorerTxUrl } from '@/lib/shared';
import { getChainMeta } from '@/lib/chain-meta';

interface Transaction {
  id: string;
  wallet_address: string;
  from_chain: string;
  from_token: string;
  to_chain: string;
  to_token: string;
  amount_in: string;
  amount_out: string | null;
  amount_usd: number | null;
  status: string;
  deposit_tx_hash: string | null;
  fulfillment_tx_hash: string | null;
  created_at: string;
}

type TxType = 'all' | 'send' | 'receive' | 'swap';

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'success') return <CheckCircle className="h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} />;
  if (s === 'failed') return <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--color-danger)' }} />;
  if (s === 'processing') return <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--color-primary)' }} />;
  return <Clock className="h-3.5 w-3.5" style={{ color: 'var(--color-warning)' }} />;
}

function TxTypeIcon({ fromChain, toChain }: { fromChain: string; toChain: string }) {
  if (fromChain !== toChain) return <Repeat className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />;
  return <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />;
}

const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface ActivityFeedProps {
  chainFilter?: string | null;
}

export function ActivityFeed({ chainFilter }: ActivityFeedProps) {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TxType>('all');

  const walletAddresses = address || '';

  const fetchTransactions = useCallback(async () => {
    if (!walletAddresses) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        wallet: walletAddresses,
        page: String(page),
        limit: '10',
      });

      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const txs: Transaction[] = data.data?.transactions ?? [];
      setTransactions(txs);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [walletAddresses, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = transactions.filter((tx) => {
    if (chainFilter) {
      const chainLower = chainFilter.toLowerCase();
      if (tx.from_chain.toLowerCase() !== chainLower && tx.to_chain.toLowerCase() !== chainLower) {
        return false;
      }
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (!walletAddresses) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-h5">Activity</h2>
      </div>

      {loading && transactions.length === 0 ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
            No recent activity{chainFilter ? ` on ${getChainMeta(chainFilter).name}` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((tx) => {
            const fromMeta = getChainMeta(tx.from_chain);
            const toMeta = getChainMeta(tx.to_chain);

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ minHeight: '44px' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-bg-tertiary)' }}
                >
                  <TxTypeIcon fromChain={tx.from_chain} toChain={tx.to_chain} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-body-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {tx.amount_in} {tx.from_token}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                    <span className="text-body-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {tx.amount_out ?? '...'} {tx.to_token}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusIcon status={tx.status} />
                    <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                      {fromMeta.name} → {toMeta.name}
                    </span>
                    <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                      · {formatDate(tx.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {tx.amount_usd != null && tx.amount_usd > 0 && (
                    <span className="text-tiny font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {usdFmt.format(tx.amount_usd)}
                    </span>
                  )}
                  {tx.fulfillment_tx_hash && (
                    <a
                      href={getExplorerTxUrl(tx.to_chain, tx.fulfillment_tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded"
                      style={{ color: 'var(--color-text-muted)', minWidth: '28px', minHeight: '28px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {page < totalPages && filtered.length > 0 && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading}
          className="w-full mt-3 btn btn-secondary h-10 text-tiny gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Load More
        </button>
      )}
    </div>
  );
}
