'use client';

interface SwapCTAProps {
  loading: boolean;
  disabled: boolean;
  disabledReason: string | null;
  onSubmit: () => void;
  formError: string | null;
  showTip: boolean;
  quoteSlowWarning?: boolean;
}

export default function SwapCTA({
  loading,
  disabled,
  disabledReason,
  onSubmit,
  formError,
  showTip,
  quoteSlowWarning = false,
}: SwapCTAProps) {
  return (
    <>
      {/* Error */}
      {formError && (
        <div
          className="mb-4 p-3 rounded-xl text-body-sm"
          role="alert"
          aria-live="polite"
          style={{
            background: 'var(--error-bg)',
            color: 'var(--error-text)',
            border: '1px solid var(--color-danger)',
          }}
        >
          {formError}
        </div>
      )}

      {/* Button */}
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="btn btn-primary w-full h-12 text-body-sm"
      >
        {loading
          ? (quoteSlowWarning ? 'Still searching for the best route...' : 'Getting Preview...')
          : 'Preview Transfer'}
      </button>

      {/* Slow quote warning */}
      {loading && quoteSlowWarning && (
        <p
          className="text-center text-tiny mt-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Cross-chain quotes can take up to 15 seconds on busy networks.
        </p>
      )}

      {/* Disabled reason */}
      {disabled && !loading && disabledReason && (
        <p
          className="text-center text-tiny mt-2"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {disabledReason}
        </p>
      )}

      {/* Tip */}
      {showTip && (
        <div
          className="mt-4 p-3 rounded-xl text-body-sm"
          style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}
        >
          <strong>Tip:</strong> Connect wallets on both chains to auto-fill addresses.
        </div>
      )}
    </>
  );
}
