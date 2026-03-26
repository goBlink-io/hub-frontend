'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@goblink/connect/react';
import { sendNearTransaction, sendSuiTransaction } from '@/lib/transactions';
import { isEvmChain, isNativeToken, EVM_CHAINS, getExplorerTxUrl } from '@/lib/shared';
import { getChainLogo } from '@/lib/chain-logos';
import { formatTokenAmount } from '@/lib/format';
import { X, ArrowDown, Check, Loader2, AlertTriangle, Copy, Shield } from 'lucide-react';
import Link from 'next/link';
import TransactionStoryline from './TransactionStoryline';
import TransferSuccess from './TransferSuccess';

type ModalStep = 'preview' | 'confirming' | 'tracking';

interface TransferModalProps {
  quote: Record<string, unknown>;
  onClose: () => void;
  onComplete: (depositAddress: string, txHash?: string) => void;
  onOutcome?: (result: { status: string; fulfillmentTxHash?: string }) => void;
}

interface TransactionData {
  depositAddress: string;
  status: string;
  depositTxHash: string | null;
  fulfillmentTxHash: string | null;
  amountIn: string;
  amountOut: string | null;
  createdAt: string;
}

export default function TransferModal({ quote, onClose, onComplete, onOutcome }: TransferModalProps) {
  const { quote: quoteData, quoteRequest, originTokenMetadata, destinationTokenMetadata, fromChain, toChain, feeInfo, source, paymentRequestId } = quote as Record<string, any>;
  const { getAddress } = useWallet();

  const [closing, setClosing] = useState(false);
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const [step, setStep] = useState<ModalStep>('preview');
  const [confirmationStep, setConfirmationStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showManualDeposit, setShowManualDeposit] = useState(false);
  const [trackingStartedAt, setTrackingStartedAt] = useState(0);
  const [dismissedCloseMsg, setDismissedCloseMsg] = useState(false);
  const [trackingElapsed, setTrackingElapsed] = useState(0);

  const startTracking = () => {
    setTrackingStartedAt(Date.now());
    setStep('tracking');
  };

  const fromLogo = getChainLogo(fromChain);
  const toLogo = getChainLogo(toChain);

  const formatAtomicAmount = (atomicAmount: string, decimals: number) => {
    try {
      const num = parseFloat(atomicAmount.replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return '0';
      const human = num / Math.pow(10, decimals);
      return human.toLocaleString(undefined, { maximumFractionDigits: Math.min(decimals, 6), minimumFractionDigits: 2 });
    } catch { return atomicAmount; }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getChainFromAssetId = (assetId: string): string | null => {
    if (assetId.startsWith('nep141:')) return 'near';
    if (assetId.startsWith('sui:') || (assetId.startsWith('0x') && assetId.includes('::'))) return 'sui';
    if (assetId.includes('@')) return assetId.split('@')[1];
    return null;
  };

  const getTokenAddressFromAssetId = (assetId: string): string => {
    let address = assetId;
    if (address.includes(':')) address = address.split(':')[1];
    if (address.includes('@')) address = address.split('@')[0];
    return address;
  };

  const [outcomeLogged, setOutcomeLogged] = useState(false);

  const pollStatus = useCallback(async (depAddr: string) => {
    try {
      const response = await fetch(`/api/status/${depAddr}`);
      if (!response.ok) return;
      const data = await response.json();
      setTransaction(data);

      const normalizedStatus = (data.rawStatus || data.status || '').toUpperCase();
      if (['COMPLETED', 'SUCCESS', 'FAILED', 'REFUNDED'].includes(normalizedStatus)) {
        if (!outcomeLogged) {
          setOutcomeLogged(true);
          const isSuccess = normalizedStatus === 'COMPLETED' || normalizedStatus === 'SUCCESS';
          onOutcome?.({
            status: isSuccess ? 'success' : data.status.toLowerCase(),
            fulfillmentTxHash: data.fulfillmentTxHash || data.destinationTxHash || undefined,
          });
          fetch('/api/route-stats/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromChain, toChain,
              fromToken: originTokenMetadata?.symbol || '',
              toToken: destinationTokenMetadata?.symbol || '',
              success: isSuccess,
            }),
          }).catch(() => {});
        }
        return true;
      }
    } catch { /* retry */ }
    return false;
  }, [outcomeLogged, fromChain, toChain, originTokenMetadata, destinationTokenMetadata, onOutcome]);

  // Track elapsed seconds during tracking step
  useEffect(() => {
    if (step !== 'tracking' || !trackingStartedAt) return;
    const timer = setInterval(() => {
      setTrackingElapsed(Math.floor((Date.now() - trackingStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, trackingStartedAt]);

  useEffect(() => {
    if (step !== 'tracking' || !depositAddress) return;
    pollStatus(depositAddress);
    const interval = setInterval(async () => {
      const done = await pollStatus(depositAddress);
      if (done) clearInterval(interval);
    }, 6000);
    return () => clearInterval(interval);
  }, [step, depositAddress, pollStatus]);

  const handleConfirm = async () => {
    setStep('confirming');
    setError(null);
    setConfirmationStep('Preparing your transfer...');

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quoteRequest, dry: false }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get transfer address');
      }

      const actualQuote = await response.json();
      const depAddr = actualQuote.depositAddress || actualQuote.quote?.depositAddress || actualQuote.address;
      if (!depAddr) throw new Error('No transfer address in response');

      const baseAmountIn: string =
        actualQuote.quote?.maxAmountIn || actualQuote.quote?.amountIn ||
        actualQuote.maxAmountIn || actualQuote.amountIn || quoteRequest.amount;

      let sendAmount = baseAmountIn;
      if (quoteRequest.swapType === 'EXACT_OUTPUT' && feeInfo?.bps) {
        try {
          const feeBps = parseInt(String(feeInfo.bps), 10);
          if (feeBps > 0) {
            const base = BigInt(baseAmountIn);
            sendAmount = ((base * BigInt(10000 + feeBps)) / BigInt(10000)).toString();
          }
        } catch { sendAmount = baseAmountIn; }
      }

      setDepositAddress(depAddr);
      const originChain = fromChain || getChainFromAssetId(quoteRequest.originAsset);

      // Log transaction
      const walletAddress = getAddress(originChain === 'near' ? 'near' : originChain === 'sui' ? 'sui' : originChain === 'solana' ? 'solana' : 'evm') || '';
      if (walletAddress) {
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress, walletChain: originChain,
            depositAddress: depAddr,
            fromChain: fromChain || originChain, fromToken: originTokenMetadata?.symbol || quoteRequest.originAsset,
            toChain, toToken: destinationTokenMetadata?.symbol || quoteRequest.destinationAsset,
            amountIn: sendAmount, recipient: quoteRequest.recipient,
            refundTo: quoteRequest.refundTo, status: 'pending',
            feeBps: feeInfo?.bps, feeAmount: feeInfo?.estimatedUsd || null,
            ...(source && { source }), ...(paymentRequestId && { paymentRequestId }),
          }),
        }).catch(() => {});
      }

      // Use @goblink/connect's sendTransaction for chain-specific signing
      if (originChain === 'near') {
        setConfirmationStep('Approve in your NEAR wallet...');
        const tokenAddress = getTokenAddressFromAssetId(quoteRequest.originAsset);
        const txHash = await sendNearTransaction({
          chain: 'near', tokenAddress, recipientAddress: depAddr,
          amount: sendAmount, decimals: originTokenMetadata?.decimals || 18,
        });
        onComplete(depAddr, txHash);
        startTracking();
      } else if (originChain === 'sui') {
        setConfirmationStep('Approve in your Sui wallet...');
        // For Sui, we need the native send — use walletSendTransaction if available
        // Otherwise show manual deposit
        setShowManualDeposit(true);
        setStep('preview');
        setConfirmationStep('');
      } else {
        // For all other chains (EVM, Solana, etc.), show manual deposit address
        setShowManualDeposit(true);
        setStep('preview');
        setConfirmationStep('');
      }
    } catch (err: unknown) {
      const error = err as Error & { code?: number; shortMessage?: string };
      let errorMessage = 'Transfer failed. Please try again.';
      if (error.code === 4001 || error.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled.';
      } else if (error.shortMessage || error.message) {
        errorMessage = error.shortMessage || error.message;
      }
      if (depositAddress) { setShowManualDeposit(true); setStep('preview'); }
      else setStep('preview');
      setError(errorMessage);
      setConfirmationStep('');
    }
  };

  const handleManualDeposit = () => {
    if (depositAddress) { onComplete(depositAddress); startTracking(); }
  };

  const getExplorerLink = (txHash: string, chain: string) => {
    return getExplorerTxUrl(chain, txHash);
  };

  const txRawStatus = (transaction?.status || '').toUpperCase();
  const isComplete = txRawStatus === 'COMPLETED' || txRawStatus === 'SUCCESS';
  const elapsedSeconds = trackingStartedAt ? Math.floor((Date.now() - trackingStartedAt) / 1000) : 0;
  const feePercent = feeInfo?.percent ? `${feeInfo.percent}%` : null;
  const feeUsdNum = feeInfo?.estimatedUsd ? parseFloat(feeInfo.estimatedUsd) : null;
  const timeEstimateSecs = 60;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center sm:p-4"
        style={{ animation: closing ? 'modal-exit 0.2s ease-in forwards' : 'modal-enter 0.25s ease-out' }}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          style={{ animation: closing ? 'backdrop-exit 0.2s ease-in forwards' : 'backdrop-enter 0.25s ease-out' }}
          onClick={step !== 'confirming' ? handleClose : undefined} />

        <div className="relative rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          {/* Header */}
          <div className="sticky top-0 rounded-t-2xl z-10 px-6 py-4 flex items-center justify-between"
            style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="text-h4">
              {step === 'preview' && 'Confirm Transfer'}
              {step === 'confirming' && 'Processing...'}
              {step === 'tracking' && 'Transfer Status'}
            </h2>
            {step !== 'confirming' && (
              <button onClick={handleClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} aria-label="Close transfer modal">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="p-6">
            {/* PREVIEW */}
            {step === 'preview' && (
              <div className="space-y-5">
                {/* Summary card */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="p-4" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <p className="text-tiny font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>You&apos;re sending</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {fromLogo && <img src={fromLogo.icon} alt={fromLogo.name} className="w-8 h-8 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{originTokenMetadata?.symbol}</div>
                          <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>on {fromLogo?.name || fromChain}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{quoteData.amountInFormatted}</div>
                        <div className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>${quoteData.amountInUsd}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center -my-1 relative z-10">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center border-4" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-bg-tertiary)' }}>
                      <ArrowDown className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                  </div>

                  <div className="p-4" style={{ background: 'rgba(16,185,129,0.06)', borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-tiny font-medium mb-2" style={{ color: 'var(--color-success)' }}>You&apos;ll receive</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {toLogo && <img src={toLogo.icon} alt={toLogo.name} className="w-8 h-8 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{destinationTokenMetadata?.symbol}</div>
                          <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>on {toLogo?.name || toChain}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>~{formatTokenAmount(quoteData.amountOutFormatted)}</div>
                        <div className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>${quoteData.amountOutUsd}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3 text-center text-body-sm">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{feeInfo?.estimatedUsd ? `$${feeInfo.estimatedUsd}` : feePercent || '—'}</div>
                    <div className="text-tiny mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Fee</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>~{timeEstimateSecs}s</div>
                    <div className="text-tiny mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Time</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <div className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {destinationTokenMetadata ? formatAtomicAmount(quoteData.minAmountOut, destinationTokenMetadata.decimals) : quoteData.minAmountOut}
                    </div>
                    <div className="text-tiny mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Min. received</div>
                  </div>
                </div>

                {/* Safety guarantee */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                  <p className="text-tiny" style={{ color: 'var(--color-text-secondary)' }}>
                    If the transfer can&apos;t complete, your {originTokenMetadata?.symbol || 'tokens'} will be returned to your wallet.
                  </p>
                </div>

                {/* Manual deposit */}
                {showManualDeposit && depositAddress && (
                  <div className="p-4 rounded-xl" style={{ background: 'var(--info-bg)', border: '1px solid var(--color-border)' }}>
                    <div className="text-body-sm font-medium mb-2" style={{ color: 'var(--info-text)' }}>Transfer Address</div>
                    <p className="text-tiny mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      Send {quoteData.amountInFormatted} to complete the transfer:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg text-tiny font-mono break-all" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                        {depositAddress}
                      </code>
                      <button onClick={() => copyToClipboard(depositAddress)} className="p-2 rounded-lg" style={{ background: 'var(--color-primary)', color: '#fff' }} aria-label="Copy deposit address">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <button onClick={handleManualDeposit} className="btn btn-primary w-full mt-3 py-2.5 text-body-sm">
                      I&apos;ve Sent — Track Status
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl flex items-start gap-2" role="alert" aria-live="polite" style={{ background: 'var(--error-bg)', border: '1px solid var(--color-danger)' }}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
                    <p className="text-body-sm" style={{ color: 'var(--error-text)' }}>{error}</p>
                  </div>
                )}

                {!showManualDeposit && (
                  <button onClick={handleConfirm} className="btn btn-primary w-full py-3.5 text-base shadow-lg">
                    Confirm Transfer
                  </button>
                )}
              </div>
            )}

            {/* CONFIRMING */}
            {step === 'confirming' && (
              <div className="flex flex-col items-center py-12">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                </div>
                <h3 className="text-h4 mb-2">{confirmationStep || 'Processing...'}</h3>
                <p className="text-body-sm text-center max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Please don&apos;t close this window. Check your wallet for approval.
                </p>
              </div>
            )}

            {/* TRACKING */}
            {step === 'tracking' && (
              <div className="space-y-5">
                {isComplete && (
                  <TransferSuccess
                    amountOut={transaction?.amountOut && destinationTokenMetadata?.decimals ? formatAtomicAmount(transaction.amountOut, destinationTokenMetadata.decimals) : (quoteData.amountOutFormatted || '?')}
                    toToken={destinationTokenMetadata?.symbol || '?'} toChain={toChain}
                    elapsedSeconds={elapsedSeconds} feeUsd={feeUsdNum}
                    fromChain={fromChain} fromToken={originTokenMetadata?.symbol}
                    amountIn={quoteData.amountInFormatted} amountInUsd={quoteData.amountInUsd}
                    recipientAddress={quoteRequest?.recipient}
                    fromTokenIcon={originTokenMetadata?.icon} toTokenIcon={destinationTokenMetadata?.icon}
                  />
                )}

                {/* Safe to close message */}
                {trackingElapsed >= 30 && !isComplete && !dismissedCloseMsg && (
                  <div
                    className="p-3 rounded-xl flex items-center justify-between"
                    style={{ background: 'var(--info-bg)', border: '1px solid rgba(59,130,246,0.15)' }}
                  >
                    <p className="text-body-sm" style={{ color: 'var(--info-text)' }}>
                      You can safely close this modal — we&apos;ll complete your transfer in the background.
                      Check your <Link href="/history" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>transfer history</Link> anytime.
                    </p>
                    <button
                      onClick={() => setDismissedCloseMsg(true)}
                      className="ml-3 flex-shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <TransactionStoryline
                  status={transaction?.status || null}
                  fromChain={fromChain} toChain={toChain}
                  fromToken={originTokenMetadata?.symbol || '?'} toToken={destinationTokenMetadata?.symbol || '?'}
                  amountIn={quoteData.amountInFormatted}
                  amountOut={transaction?.amountOut && destinationTokenMetadata?.decimals ? formatAtomicAmount(transaction.amountOut, destinationTokenMetadata.decimals) : (quoteData.amountOutFormatted || null)}
                  timeEstimate={Math.max(60, quoteData.timeEstimate ? parseInt(quoteData.timeEstimate, 10) : 60)}
                  depositTxHash={transaction?.depositTxHash || null}
                  fulfillmentTxHash={transaction?.fulfillmentTxHash || null}
                  fromLogo={fromLogo} toLogo={toLogo}
                  fromTokenIcon={originTokenMetadata?.icon} toTokenIcon={destinationTokenMetadata?.icon}
                  getExplorerLink={getExplorerLink}
                  startedAt={trackingStartedAt}
                />

                <button onClick={handleClose}
                  className={`btn w-full py-3 text-body-sm ${isComplete ? 'btn-primary' : 'btn-secondary'}`}>
                  {isComplete ? 'Done' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
