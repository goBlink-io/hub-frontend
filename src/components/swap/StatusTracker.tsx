'use client';

import { useState, useEffect, useRef } from 'react';
import { SwapStatus } from '@/lib/shared';
import { Check, X, Clock } from 'lucide-react';

interface StatusTrackerProps {
  depositAddress: string;
  onReset: () => void;
}

// Cycling reassurance messages for each status phase
const REASSURANCE_MESSAGES: Record<string, string[]> = {
  PENDING_DEPOSIT: [
    'Waiting for your deposit to arrive...',
    'Monitoring the source chain for your transaction...',
    'Your deposit address is ready — funds will be detected automatically.',
  ],
  PENDING_QUOTE: [
    'Preparing the best route for your transfer...',
    'Calculating optimal execution path...',
    'Finding the best price across protocols...',
  ],
  PROCESSING: [
    'Executing your transfer...',
    'Bridging assets to the destination chain...',
    'Almost there — finalizing on the destination chain...',
    'Confirming the transaction on-chain...',
    'Your tokens are on the way...',
  ],
};

export default function StatusTracker({ depositAddress, onReset }: StatusTrackerProps) {
  const [status, setStatus] = useState<SwapStatus>('PENDING_DEPOSIT');
  const [_loading, setLoading] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [reassuranceIdx, setReassuranceIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTime = useRef(Date.now());

  // Elapsed time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cycle reassurance messages every 6 seconds
  useEffect(() => {
    const messages = REASSURANCE_MESSAGES[status];
    if (!messages) return;

    const interval = setInterval(() => {
      setReassuranceIdx((prev) => (prev + 1) % messages.length);
    }, 6000);

    // Reset index when status changes
    setReassuranceIdx(0);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (!depositAddress) return;

    const interval = setInterval(fetchStatus, 5000);
    fetchStatus();
    return () => clearInterval(interval);
  }, [depositAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStatus = async () => {
    if (!depositAddress) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/status/${depositAddress}`);

      if (!response.ok) {
        // 404 = explorer hasn't indexed yet, 503 = service temp unavailable — silent retry
        if (response.status === 404 || response.status === 503) return;
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data.status);
      setError(null);
    } catch (err: any) {
      console.error('Status fetch error:', err);
      setError(err.message || 'Connection issue — still tracking your transfer.');
    } finally {
      setLoading(false);
    }
  };

  const isTerminal = status === 'SUCCESS' || status === 'FAILED' || status === 'REFUNDED';
  const reassuranceMessages = REASSURANCE_MESSAGES[status];
  const currentReassurance = reassuranceMessages ? reassuranceMessages[reassuranceIdx] : null;

  // Timeline step definitions
  const steps = [
    { key: 'quote', label: 'Quote received', sub: 'Deposit address generated' },
    { key: 'deposit', label: 'Deposit detected', sub: 'Funds received on source chain' },
    { key: 'processing', label: 'Processing transfer', sub: 'Bridging to destination chain' },
    { key: 'complete', label: 'Complete', sub: 'Tokens delivered' },
  ];

  const getStepState = (stepKey: string): 'done' | 'active' | 'pending' => {
    switch (status) {
      case 'PENDING_QUOTE':
        return stepKey === 'quote' ? 'active' : 'pending';
      case 'PENDING_DEPOSIT':
        if (stepKey === 'quote') return 'done';
        if (stepKey === 'deposit') return 'active';
        return 'pending';
      case 'PROCESSING':
        if (stepKey === 'quote' || stepKey === 'deposit') return 'done';
        if (stepKey === 'processing') return 'active';
        return 'pending';
      case 'SUCCESS':
        return 'done';
      case 'FAILED':
      case 'REFUNDED':
        if (stepKey === 'quote' || stepKey === 'deposit') return 'done';
        if (stepKey === 'processing') return 'done';
        return 'pending';
      case 'INCOMPLETE_DEPOSIT':
        if (stepKey === 'quote') return 'done';
        if (stepKey === 'deposit') return 'active';
        return 'pending';
      default:
        return 'pending';
    }
  };

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="card p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-h3">Transfer Status</h3>
        <button
          onClick={onReset}
          className="btn-ghost text-body-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Back
        </button>
      </div>

      {/* Main Status Display */}
      <div className="flex flex-col items-center py-6 mb-6">
        {/* Status Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{
            background: status === 'SUCCESS'
              ? 'var(--success-bg)'
              : (status === 'FAILED' || status === 'REFUNDED')
                ? 'var(--error-bg)'
                : 'var(--info-bg)',
          }}
        >
          {status === 'SUCCESS' ? (
            <Check className="h-8 w-8" style={{ color: 'var(--color-success)' }} />
          ) : status === 'FAILED' || status === 'REFUNDED' ? (
            <X className="h-8 w-8" style={{ color: 'var(--color-danger)' }} />
          ) : (
            <svg className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
        </div>

        {/* Status Title */}
        <h4 className="text-h4 mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {status === 'SUCCESS' && 'Transfer Complete!'}
          {status === 'FAILED' && 'Transfer Failed'}
          {status === 'REFUNDED' && 'Transfer Refunded'}
          {status === 'PROCESSING' && 'Transfer in Progress'}
          {status === 'PENDING_DEPOSIT' && 'Awaiting Deposit'}
          {status === 'PENDING_QUOTE' && 'Preparing Transfer'}
          {status === 'INCOMPLETE_DEPOSIT' && 'Incomplete Deposit'}
          {!['SUCCESS', 'FAILED', 'REFUNDED', 'PROCESSING', 'PENDING_DEPOSIT', 'PENDING_QUOTE', 'INCOMPLETE_DEPOSIT'].includes(status) && 'Tracking Transfer'}
        </h4>

        {/* Cycling reassurance text */}
        {currentReassurance && (
          <p
            className="text-body-sm text-center transition-opacity duration-500"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {currentReassurance}
          </p>
        )}

        {/* Elapsed time badge */}
        {!isTerminal && (
          <div
            className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-tiny font-medium"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
          >
            <Clock className="h-3.5 w-3.5" />
            {formatElapsed(elapsedSeconds)}
          </div>
        )}
      </div>

      {/* Timeline Stepper */}
      <div className="space-y-0 mb-6">
        {steps.map((step, idx) => {
          const state = getStepState(step.key);
          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Vertical connector + dot */}
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: state === 'done'
                      ? 'var(--color-success)'
                      : state === 'active'
                        ? 'var(--color-primary)'
                        : 'var(--color-bg-tertiary)',
                    border: state === 'pending' ? '2px solid var(--color-border)' : 'none',
                  }}
                >
                  {state === 'done' ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : state === 'active' ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-text-tertiary)' }} />
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className="w-0.5 h-8"
                    style={{
                      background: state === 'done' ? 'var(--color-success)' : 'var(--color-border)',
                    }}
                  />
                )}
              </div>

              {/* Step text */}
              <div className="pt-0.5 pb-3">
                <p
                  className="text-body-sm font-medium"
                  style={{
                    color: state === 'pending' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                  }}
                >
                  {step.label}
                </p>
                <p className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                  {step.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deposit Address — collapsible detail */}
      {depositAddress && (
        <div
          className="p-3 rounded-xl mb-5"
          style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
        >
          <label className="block text-tiny font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Deposit Address
          </label>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-tiny font-mono break-all"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {depositAddress}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(depositAddress)}
              className="btn-ghost px-2 py-1 text-tiny flex-shrink-0"
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="p-3 rounded-xl mb-5 flex items-start gap-2"
          style={{ background: 'var(--warning-bg)', border: '1px solid var(--color-warning)', color: 'var(--warning-text)' }}
        >
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
          <p className="text-body-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {status === 'SUCCESS' && (
        <button
          onClick={onReset}
          className="btn btn-primary w-full h-12 text-body-sm"
        >
          Start New Transfer
        </button>
      )}

      {(status === 'FAILED' || status === 'REFUNDED') && (
        <div className="space-y-3">
          {status === 'FAILED' && (
            <div
              className="p-3 rounded-xl text-body-sm"
              style={{ background: 'var(--error-bg)', color: 'var(--error-text)' }}
            >
              The transfer could not be completed. Your funds will be refunded to your return address if they were deposited.
            </div>
          )}
          {status === 'REFUNDED' && (
            <div
              className="p-3 rounded-xl text-body-sm"
              style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}
            >
              Your funds have been refunded to your return address.
            </div>
          )}
          <button
            onClick={onReset}
            className="btn btn-secondary w-full h-12 text-body-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
