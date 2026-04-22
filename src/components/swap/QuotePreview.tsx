'use client';

import { useState } from 'react';
import { formatTokenAmount } from '@/lib/format';
import { X, Loader2, AlertTriangle, Copy, Check } from 'lucide-react';

interface QuotePreviewProps {
  quote: Record<string, unknown>;
  onReset: () => void;
  onSwapInitiated: (depositAddress: string, txHash?: string) => void;
}

export default function QuotePreview({ quote, onReset, onSwapInitiated }: QuotePreviewProps) {
  const {
    quote: quoteData,
    quoteRequest,
    destinationTokenMetadata,
    fromChain,
    toChain: _toChain,
    feeInfo,
  } = quote as unknown as {
    quote: {
      amountInFormatted: string;
      amountInUsd?: string;
      amountOutFormatted: string;
      amountOutUsd?: string;
      minAmountOut: string;
      timeEstimate?: number;
    };
    quoteRequest: { slippageTolerance: number } & Record<string, unknown>;
    destinationTokenMetadata?: { symbol?: string; decimals: number };
    fromChain: string;
    toChain: string;
    feeInfo?: { estimatedUsd?: string; percent?: string };
  };
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [showDepositInfo, setShowDepositInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatAtomicAmount = (atomicAmount: string, decimals: number) => {
    try {
      const cleanAmount = atomicAmount.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleanAmount);
      if (isNaN(num)) return '0';
      const humanReadable = num / Math.pow(10, decimals);
      return humanReadable.toLocaleString(undefined, {
        maximumFractionDigits: Math.min(decimals, 6),
        minimumFractionDigits: 2,
      });
    } catch { return atomicAmount; }
  };

  const handleConfirmSwap = async () => {
    setIsConfirming(true);
    setError(null);
    setConfirmationStep('Getting deposit address...');

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quoteRequest, dry: false }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get deposit address');
      }

      const actualQuote = await response.json();
      const receivedDepositAddress = actualQuote.depositAddress || actualQuote.quote?.depositAddress || actualQuote.address;

      if (!receivedDepositAddress) throw new Error('No deposit address in response');
      setDepositAddress(receivedDepositAddress);

      // Show deposit address for manual transfer
      setShowDepositInfo(true);
      setConfirmationStep('');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to complete swap');
      setConfirmationStep('');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleManualDeposit = () => {
    if (depositAddress) onSwapInitiated(depositAddress);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fromChainName = fromChain ? fromChain.charAt(0).toUpperCase() + fromChain.slice(1) : '';
  const toChainName = _toChain ? _toChain.charAt(0).toUpperCase() + _toChain.slice(1) : '';

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-h3">Transfer Preview</h3>
        <button onClick={onReset} className="btn-ghost text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>

      <div className="rounded-xl p-4 mb-5 space-y-3" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>You send</span>
          <div className="text-right">
            <div className="text-h4 font-bold" style={{ color: 'var(--color-text-primary)' }}>{quoteData.amountInFormatted}</div>
            {quoteData.amountInUsd && <div className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>≈ ${quoteData.amountInUsd}</div>}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-tiny font-medium" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            {fromChainName} → {toChainName}
          </div>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>You receive</span>
          <div className="text-right">
            <div className="text-h4 font-bold" style={{ color: 'var(--color-success)' }}>{formatTokenAmount(quoteData.amountOutFormatted)}</div>
            {quoteData.amountOutUsd && <div className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>≈ ${quoteData.amountOutUsd}</div>}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        <div className="flex justify-between text-body-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Minimum received</span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {destinationTokenMetadata ? formatAtomicAmount(quoteData.minAmountOut, destinationTokenMetadata.decimals) : quoteData.minAmountOut}
          </span>
        </div>
        <div className="flex justify-between text-body-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Estimated time</span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>~{Math.max(60, quoteData.timeEstimate ?? 60)}s</span>
        </div>
        {feeInfo && (
          <div className="flex justify-between text-body-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Platform fee</span>
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {feeInfo.estimatedUsd ? `$${feeInfo.estimatedUsd}` : `${feeInfo.percent}%`}
            </span>
          </div>
        )}
        <div className="flex justify-between text-body-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Price protection</span>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{(quoteRequest.slippageTolerance / 100)}%</span>
        </div>
      </div>

      {showDepositInfo && depositAddress && (
        <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--info-bg)', border: '1px solid var(--color-border)' }}>
          <h4 className="font-semibold text-body-sm mb-2" style={{ color: 'var(--info-text)' }}>Transfer Address</h4>
          <p className="text-body-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Send {quoteData.amountInFormatted} to the address below to complete the transfer:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg text-body-sm font-mono break-all" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
              {depositAddress}
            </code>
            <button onClick={() => copyToClipboard(depositAddress)} className="btn-secondary px-3 py-2 text-body-sm flex-shrink-0">
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
          </div>
          <button onClick={handleManualDeposit} className="btn btn-primary w-full mt-4">
            I&apos;ve Sent the Funds — Track Status
          </button>
        </div>
      )}

      {isConfirming && confirmationStep && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm" style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}>
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {confirmationStep}
        </div>
      )}

      {!showDepositInfo && (
        <>
          <button onClick={handleConfirmSwap} disabled={isConfirming} className="btn btn-primary w-full h-12 text-body-sm">
            {isConfirming ? 'Signing...' : 'Confirm & Sign'}
          </button>
          {!isConfirming && (
            <p className="text-center text-tiny mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              You&apos;ll approve this in your wallet. Transfer is irreversible once signed.
            </p>
          )}
        </>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl flex items-start gap-2" style={{ background: 'var(--error-bg)', border: '1px solid var(--color-danger)', color: 'var(--error-text)' }}>
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-body-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
