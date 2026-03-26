'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { decodePaymentRequest } from '@/lib/payment-requests';
import { CreditCard, ArrowRight, AlertTriangle, ExternalLink } from 'lucide-react';

export default function PublicPayPage() {
  const params = useParams();
  const id = params.id as string;

  const paymentRequest = useMemo(() => decodePaymentRequest(id), [id]);
  const [paying, setPaying] = useState(false);

  if (!paymentRequest) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="card p-8 text-center max-w-sm">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-warning)' }} />
          <h1 className="text-h3 mb-2">Invalid Payment Link</h1>
          <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
            This payment link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const chainName = paymentRequest.toChain.charAt(0).toUpperCase() + paymentRequest.toChain.slice(1);

  const handlePay = () => {
    setPaying(true);
    // Redirect to swap page with pre-filled values
    const swapUrl = `/swap?toChain=${paymentRequest.toChain}&toToken=${paymentRequest.toToken}&amount=${paymentRequest.amount}&recipient=${paymentRequest.recipient}&lockDest=true`;
    window.location.href = swapUrl;
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="card p-6 sm:p-8 max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--info-bg)' }}>
            <CreditCard className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 className="text-h3">Payment Request</h1>
            {paymentRequest.name && (
              <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>from {paymentRequest.name}</p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="p-5 rounded-xl mb-5 text-center" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
          <div className="text-tiny font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Amount requested</div>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {paymentRequest.amount} {paymentRequest.toToken}
          </div>
          <div className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
            on {chainName}
          </div>
        </div>

        {/* Memo */}
        {paymentRequest.memo && (
          <div className="p-3 rounded-xl mb-5" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <div className="text-tiny font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Memo</div>
            <p className="text-body-sm" style={{ color: 'var(--color-text-primary)' }}>{paymentRequest.memo}</p>
          </div>
        )}

        {/* Recipient */}
        <div className="p-3 rounded-xl mb-5" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
          <div className="text-tiny font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Paying to</div>
          <code className="text-tiny font-mono break-all" style={{ color: 'var(--color-text-secondary)' }}>
            {paymentRequest.recipient}
          </code>
        </div>

        {/* Pay button */}
        <button onClick={handlePay} disabled={paying}
          className="btn btn-primary w-full h-12 text-body-sm gap-2">
          {paying ? 'Redirecting...' : (
            <>Pay with any token <ArrowRight className="h-4 w-4" /></>
          )}
        </button>

        <p className="text-center text-tiny mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
          Send from any chain — goBlink handles the conversion automatically.
        </p>

        {/* Powered by */}
        <div className="mt-6 pt-4 text-center" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>
            Powered by <a href="https://goblink.io" target="_blank" rel="noopener noreferrer"
              className="font-semibold" style={{ color: 'var(--color-primary)' }}>goBlink</a>
          </p>
        </div>
      </div>
    </div>
  );
}
