'use client';

import type { HistoryEntry } from '@/hooks/useTransactionHistory';
import { Clock, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

interface RecentTransfersProps {
  history: HistoryEntry[];
  onSelect: (depositAddress: string) => void;
}

function StatusIcon({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED') return <CheckCircle className="h-4 w-4" style={{ color: 'var(--success)' }} />;
  if (s === 'FAILED' || s === 'REFUNDED') return <AlertTriangle className="h-4 w-4" style={{ color: 'var(--error)' }} />;
  if (s === 'PROCESSING' || s === 'DEPOSIT_RECEIVED') return <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--brand)' }} />;
  return <Clock className="h-4 w-4" style={{ color: 'var(--warning)' }} />;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RecentTransfers({ history, onSelect }: RecentTransfersProps) {
  const recent = history.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="text-caption font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Recent Transfers</h3>
      <div className="space-y-1">
        {recent.map(entry => (
          <button key={entry.id} onClick={() => onSelect(entry.depositAddress)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left active:scale-[0.99]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--elevated)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <StatusIcon status={entry.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-body-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <span className="truncate">{entry.amount} {entry.fromToken}</span>
                <span style={{ color: 'var(--text-faint)' }}>→</span>
                <span className="truncate">{entry.toToken}</span>
              </div>
              <div className="text-tiny" style={{ color: 'var(--text-muted)' }}>
                {entry.fromChain} → {entry.toChain}
              </div>
            </div>
            <span className="text-tiny flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{timeAgo(entry.timestamp)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
