'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@goblink/connect/react';
import { Clock, CheckCircle, AlertTriangle, Loader2, ExternalLink, ArrowUpDown } from 'lucide-react';
import { getExplorerTxUrl } from '@/lib/shared';
import { ProductSuggestion } from '@/components/shared/ProductSuggestion';

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
  deposit_address: string | null;
  deposit_tx_hash: string | null;
  fulfillment_tx_hash: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const config = {
    completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'var(--color-success)', bg: 'var(--success-bg)', label: 'Completed' },
    success: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'var(--color-success)', bg: 'var(--success-bg)', label: 'Completed' },
    pending: { icon: <Clock className="h-3.5 w-3.5" />, color: 'var(--color-warning)', bg: 'var(--warning-bg)', label: 'Pending' },
    processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: 'var(--color-primary)', bg: 'var(--info-bg)', label: 'Processing' },
    failed: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'var(--color-danger)', bg: 'var(--error-bg)', label: 'Failed' },
    refunded: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'var(--color-warning)', bg: 'var(--warning-bg)', label: 'Refunded' },
  }[s] || { icon: <Clock className="h-3.5 w-3.5" />, color: 'var(--color-text-muted)', bg: 'var(--color-bg-tertiary)', label: status };

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-tiny font-medium"
      style={{ background: config.bg, color: config.color }}>
      {config.icon} {config.label}
    </span>
  );
}

export default function HistoryPage() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const walletAddresses = address || '';

  const fetchTransactions = useCallback(async () => {
    if (!walletAddresses) return;
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        wallet: walletAddresses,
        page: String(page),
        limit: '20',
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTransactions(data.data?.transactions || []);
      setTotalPages(data.data?.totalPages || 1);
    } catch {
      setFetchError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddresses, page, statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h3">Transaction History</h1>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="input h-9 text-tiny px-3" style={{ minWidth: '120px' }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {!walletAddresses ? (
        <div className="card p-12 text-center">
          <ArrowUpDown className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-body-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Connect a wallet to see your history</p>
          <p className="text-tiny mt-1" style={{ color: 'var(--color-text-muted)' }}>All your cross-chain transfers will appear here.</p>
        </div>
      ) : fetchError ? (
        <div className="card p-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" style={{ color: 'var(--color-danger)' }} />
          <p className="text-body-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{fetchError}</p>
          <button onClick={fetchTransactions} className="btn btn-secondary px-4 h-9 text-tiny mt-3">Retry</button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="skeleton-shimmer h-4 w-40" />
                <div className="skeleton-shimmer h-5 w-20 rounded-full" />
              </div>
              <div className="skeleton-shimmer h-3 w-56" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-body-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>No transactions yet</p>
          <p className="text-tiny mt-1" style={{ color: 'var(--color-text-muted)' }}>Your transfer history will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {tx.amount_in} {tx.from_token}
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                  <span className="text-body-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {tx.amount_out || '...'} {tx.to_token}
                  </span>
                </div>
                <StatusBadge status={tx.status} />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                  {tx.from_chain} → {tx.to_chain} · {formatDate(tx.created_at)}
                  {tx.amount_usd && ` · $${tx.amount_usd.toFixed(2)}`}
                </div>
                <div className="flex items-center gap-1">
                  {tx.deposit_tx_hash && (
                    <a href={getExplorerTxUrl(tx.from_chain, tx.deposit_tx_hash)} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded" style={{ color: 'var(--color-text-muted)' }} title="View deposit tx" aria-label="View deposit transaction">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {tx.fulfillment_tx_hash && (
                    <a href={getExplorerTxUrl(tx.to_chain, tx.fulfillment_tx_hash)} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded" style={{ color: 'var(--color-success)' }} title="View delivery tx" aria-label="View delivery transaction">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn btn-secondary px-4 h-9 text-tiny">Previous</button>
              <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn btn-secondary px-4 h-9 text-tiny">Next</button>
            </div>
          )}
        </div>
      )}

      <ProductSuggestion exclude="history" />
    </div>
  );
}
