'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, Loader2, AlertTriangle, ExternalLink, ArrowRight, Undo2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StoryPhase {
  id: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
}

interface TransactionStorylineProps {
  status: string | null;           // From 1Click status API
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string | null;
  timeEstimate: number | null;     // Seconds from quote response
  depositTxHash: string | null;
  fulfillmentTxHash: string | null;
  fromLogo?: { icon: string; name: string } | null;
  toLogo?: { icon: string; name: string } | null;
  fromTokenIcon?: string;
  toTokenIcon?: string;
  getExplorerLink: (txHash: string, chain: string) => string;
  startedAt: number;               // Date.now() when tracking began
}

// ── Phase definitions ──────────────────────────────────────────────────────────

function getPhases(fromChain: string, toChain: string, fromToken: string, toToken: string): StoryPhase[] {
  const fromName = fromChain.charAt(0).toUpperCase() + fromChain.slice(1);
  const toName = toChain.charAt(0).toUpperCase() + toChain.slice(1);

  return [
    {
      id: 'signed',
      label: 'Transfer approved',
      detail: `Sending ${fromToken} from your ${fromName} wallet`,
      icon: <Check className="h-4 w-4" />,
    },
    {
      id: 'confirmed',
      label: `Sent from ${fromName}`,
      detail: 'Your tokens are on the way',
      icon: <Check className="h-4 w-4" />,
    },
    {
      id: 'routing',
      label: 'Finding the best route',
      detail: 'Smart routing is matching you with the best available rate',
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
    },
    {
      id: 'arriving',
      label: `Arriving on ${toName}`,
      detail: `${toToken} is being delivered to your wallet`,
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
    },
    {
      id: 'complete',
      label: 'Transfer complete!',
      detail: `${toToken} is in your wallet on ${toName}`,
      icon: <Check className="h-4 w-4" />,
    },
  ];
}

// Map API status → which phase we're on (index into phases array)
function getActivePhaseIndex(status: string | null, depositTxHash: string | null): number {
  if (!status) return 0; // Just signed, waiting for status

  const s = status.toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED') return 4;
  if (s === 'PROCESSING' || s === 'DEPOSIT_RECEIVED') {
    return depositTxHash ? 3 : 2;
  }
  if (s === 'PENDING_DEPOSIT' || s === 'PENDING_QUOTE') {
    return depositTxHash ? 1 : 0;
  }
  return 0;
}

function isTerminal(status: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return ['SUCCESS', 'COMPLETED', 'FAILED', 'REFUNDED'].includes(s);
}

function isFailed(status: string | null): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return ['FAILED', 'REFUNDED'].includes(s);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TransactionStoryline({
  status,
  fromChain,
  toChain,
  fromToken,
  toToken,
  amountIn,
  amountOut,
  timeEstimate,
  depositTxHash,
  fulfillmentTxHash,
  fromLogo,
  toLogo,
  fromTokenIcon,
  toTokenIcon,
  getExplorerLink,
  startedAt,
}: TransactionStorylineProps) {
  const [elapsed, setElapsed] = useState(0);

  // Tick every second for the countdown
  useEffect(() => {
    if (isTerminal(status)) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  const phases = useMemo(
    () => getPhases(fromChain, toChain, fromToken, toToken),
    [fromChain, toChain, fromToken, toToken],
  );

  const activeIndex = getActivePhaseIndex(status, depositTxHash);
  const failed = isFailed(status);
  const complete = status?.toUpperCase() === 'SUCCESS' || status?.toUpperCase() === 'COMPLETED';

  // Countdown
  const remaining = timeEstimate ? Math.max(0, timeEstimate - elapsed) : null;
  const progress = timeEstimate && timeEstimate > 0
    ? Math.min(100, (elapsed / timeEstimate) * 100)
    : null;

  return (
    <div className="space-y-5">
      {/* ── Header: amount flow ── */}
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--color-bg-tertiary)' }}>
        <div className="flex items-center gap-2">
          {(fromTokenIcon || fromLogo) && (
            <img src={fromTokenIcon || fromLogo!.icon} alt={fromToken} className="w-6 h-6 rounded-full"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{amountIn} {fromToken}</span>
        </div>
        <ArrowRight className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: complete ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
            {amountOut || '...'} {toToken}
          </span>
          {(toTokenIcon || toLogo) && (
            <img src={toTokenIcon || toLogo!.icon} alt={toToken} className="w-6 h-6 rounded-full"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </div>
      </div>

      {/* ── Failed state ── */}
      {failed && (
        <div className="flex flex-col items-center py-6 rounded-xl" style={{ background: 'var(--error-bg, rgba(239,68,68,0.08))' }}>
          <div className="mb-3 p-3 rounded-full" style={{ background: 'rgba(239,68,68,0.15)' }}>
            {status?.toUpperCase() === 'REFUNDED'
              ? <Undo2 className="h-6 w-6 text-amber-500" />
              : <AlertTriangle className="h-6 w-6 text-red-500" />
            }
          </div>
          <div className="text-lg font-bold" style={{ color: status?.toUpperCase() === 'REFUNDED' ? 'var(--warning, #eab308)' : 'var(--error, #ef4444)' }}>
            {status?.toUpperCase() === 'REFUNDED' ? 'Funds Returned' : 'Transfer Failed'}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {status?.toUpperCase() === 'REFUNDED'
              ? 'Your funds have been returned to your wallet.'
              : 'Something went wrong. Your funds are safe.'}
          </p>
        </div>
      )}

      {/* ── Progress bar + countdown ── */}
      {!failed && !complete && (
        <div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: progress !== null ? `${Math.max(5, progress)}%` : '30%',
                background: 'var(--gradient)',
              }}
            />
          </div>
          {/* Time info */}
          <div className="flex justify-between mt-2">
            <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
              {elapsed}s elapsed
            </span>
            {remaining !== null && remaining > 0 && (
              <span className="text-tiny font-medium" style={{ color: 'var(--color-primary)' }}>
                ~{remaining}s remaining
              </span>
            )}
            {remaining === 0 && !complete && (
              <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                Almost there...
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Complete celebration ── */}
      {complete && (
        <div className="flex flex-col items-center py-6 rounded-xl" style={{ background: 'var(--success-bg, rgba(34,197,94,0.08))' }}>
          <div className="mb-3 p-3 rounded-full" style={{ background: 'rgba(34,197,94,0.15)' }}>
            <Check className="h-7 w-7" style={{ color: 'var(--color-success)' }} />
          </div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>
            Transfer Complete!
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {amountOut || amountIn} {toToken} arrived in {elapsed}s
          </p>
        </div>
      )}

      {/* ── Phase timeline ── */}
      <div className="space-y-0">
        {phases.map((phase, i) => {
          const isCompleted = i < activeIndex || (complete && i === phases.length - 1);
          const isActive = i === activeIndex && !failed && !complete;
          const isFuture = i > activeIndex && !complete;

          return (
            <div key={phase.id} className="flex items-start gap-3 relative">
              {/* Vertical line */}
              {i < phases.length - 1 && (
                <div
                  className="absolute left-[13px] top-[26px] w-0.5 h-[calc(100%-2px)]"
                  style={{
                    background: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
                  }}
                />
              )}

              {/* Dot / icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  background: isCompleted
                    ? 'var(--color-success)'
                    : isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-bg-tertiary)',
                  color: isCompleted || isActive ? 'white' : 'var(--color-text-muted)',
                  ringColor: isActive ? 'var(--color-primary)' : undefined,
                  // ring-offset needs to match the parent bg
                  '--tw-ring-offset-color': 'var(--color-bg-primary)',
                } as React.CSSProperties}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-text-tertiary)' }} />
                )}
              </div>

              {/* Text */}
              <div className={`pb-5 ${isFuture ? 'opacity-40' : ''}`}>
                <div
                  className={`text-sm font-medium ${isActive ? 'font-semibold' : ''}`}
                  style={{ color: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                >
                  {phase.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {phase.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Explorer links ── */}
      {(depositTxHash || fulfillmentTxHash) && (
        <div className="space-y-2">
          {depositTxHash && (
            <a
              href={getExplorerLink(depositTxHash, fromChain)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <div>
                <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>Deposit tx</div>
                <code className="text-tiny font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {depositTxHash.slice(0, 10)}...{depositTxHash.slice(-8)}
                </code>
              </div>
              <ExternalLink className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
            </a>
          )}
          {fulfillmentTxHash && (
            <a
              href={getExplorerLink(fulfillmentTxHash, toChain)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{ background: 'var(--success-bg, rgba(34,197,94,0.08))' }}
            >
              <div>
                <div className="text-tiny" style={{ color: 'var(--color-success)' }}>Delivery tx</div>
                <code className="text-tiny font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {fulfillmentTxHash.slice(0, 10)}...{fulfillmentTxHash.slice(-8)}
                </code>
              </div>
              <ExternalLink className="h-4 w-4" style={{ color: 'var(--color-success)' }} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
