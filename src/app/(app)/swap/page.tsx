'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import QuotePreview from '@/components/swap/QuotePreview';
import StatusTracker from '@/components/swap/StatusTracker';
import TransferModal from '@/components/swap/TransferModal';
import RecentTransfers from '@/components/swap/RecentTransfers';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { Skeleton } from '@/components/ui/Skeleton';

const SwapForm = dynamic(() => import('@/components/swap/SwapForm'), {
  ssr: false,
  loading: () => <SwapSkeleton />,
});

function SwapSkeleton() {
  return (
    <div className="card-hero p-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

type SwapView = 'form' | 'quote' | 'tracking' | 'modal';

export default function SwapPage() {
  const [view, setView] = useState<SwapView>('form');
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { history, addEntry, updateStatus } = useTransactionHistory();

  const handleQuoteReceived = useCallback((q: Record<string, unknown>) => {
    setQuote(q);
    setView('modal');
  }, []);

  const handleSwapInitiated = useCallback((depAddr: string, txHash?: string) => {
    setDepositAddress(depAddr);
    setView('tracking');

    if (quote) {
      const q = quote as Record<string, any>;
      addEntry({
        fromChain: q.fromChain || '',
        toChain: q.toChain || '',
        fromToken: q.originTokenMetadata?.symbol || '',
        toToken: q.destinationTokenMetadata?.symbol || '',
        amount: q.quote?.amountInFormatted || '',
        depositAddress: depAddr,
        status: 'pending',
      });
    }
  }, [quote, addEntry]);

  const handleReset = useCallback(() => {
    setView('form');
    setQuote(null);
    setDepositAddress(null);
    setRefreshKey(k => k + 1);
  }, []);

  const handleSelectRecent = useCallback((depAddr: string) => {
    setDepositAddress(depAddr);
    setView('tracking');
  }, []);

  const handleModalClose = useCallback(() => {
    setView('form');
    setQuote(null);
  }, []);

  const handleOutcome = useCallback((result: { status: string; fulfillmentTxHash?: string }) => {
    if (depositAddress) {
      updateStatus(depositAddress, result.status === 'success' ? 'completed' : result.status);
    }
  }, [depositAddress, updateStatus]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {view === 'form' && (
        <>
          <div className="card-hero p-1">
            <SwapForm
              onQuoteReceived={handleQuoteReceived}
              refreshKey={refreshKey}
              onSwapInitiated={handleSwapInitiated}
            />
          </div>
          <div className="mt-4">
            <RecentTransfers history={history} onSelect={handleSelectRecent} />
          </div>
        </>
      )}

      {view === 'quote' && quote && (
        <QuotePreview
          quote={quote}
          onReset={handleReset}
          onSwapInitiated={handleSwapInitiated}
        />
      )}

      {view === 'tracking' && depositAddress && (
        <StatusTracker
          depositAddress={depositAddress}
          onReset={handleReset}
        />
      )}

      {view === 'modal' && quote && (
        <TransferModal
          quote={quote}
          onClose={handleModalClose}
          onComplete={handleSwapInitiated}
          onOutcome={handleOutcome}
        />
      )}
    </div>
  );
}
