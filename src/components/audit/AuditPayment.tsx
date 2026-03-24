'use client';

import { useState, useCallback } from 'react';
import { Wallet, CreditCard, Check, Loader2 } from 'lucide-react';
import { generatePaymentUrl, type PaymentRequestData } from '@/lib/payment-requests';

interface AuditPaymentProps {
  onPaymentComplete: () => void;
  priceUsd: string;
  tierName?: string;
}

const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_AUDIT_TREASURY_ADDRESS || 'goblink-treasury.near';

export function AuditPayment({ onPaymentComplete, priceUsd, tierName }: AuditPaymentProps) {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'confirmed'>('idle');
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleCryptoPay = useCallback(() => {
    const data: PaymentRequestData = {
      recipient: TREASURY_ADDRESS,
      toChain: 'near',
      toToken: 'USDC',
      amount: priceUsd,
      memo: `audit-${Date.now()}`,
      name: 'goBlink Audit',
      createdAt: Date.now(),
    };

    const url = generatePaymentUrl(data);
    window.open(url, '_blank');
    setPaymentStatus('pending');

    // For now, auto-confirm after a delay (will be wired to real verification later)
    setTimeout(() => {
      setPaymentStatus('confirmed');
      onPaymentComplete();
    }, 3000);
  }, [priceUsd, onPaymentComplete]);

  const handleStripePay = useCallback(() => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2000);
  }, []);

  if (paymentStatus === 'confirmed') {
    return (
      <div
        className="flex items-center gap-3 p-4"
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <Check size={20} style={{ color: 'var(--color-success)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
          Payment confirmed
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Price display */}
      <div className="text-center mb-4">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {tierName || 'Audit'} — Total
        </span>
        <div
          className="text-2xl font-bold mt-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          ${priceUsd} <span className="text-sm font-normal" style={{ color: 'var(--color-text-secondary)' }}>USDC</span>
        </div>
      </div>

      {/* Payment buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Crypto */}
        <button
          onClick={handleCryptoPay}
          disabled={paymentStatus === 'pending'}
          className="flex flex-col items-center gap-2 p-4 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            cursor: paymentStatus === 'pending' ? 'wait' : 'pointer',
            opacity: paymentStatus === 'pending' ? 0.7 : 1,
          }}
        >
          {paymentStatus === 'pending' ? (
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          ) : (
            <Wallet size={24} style={{ color: 'var(--color-primary)' }} />
          )}
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {paymentStatus === 'pending' ? 'Confirming...' : 'Pay with Crypto'}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            goBlink Pay
          </span>
        </button>

        {/* Stripe */}
        <div className="relative">
          <button
            onClick={handleStripePay}
            className="w-full flex flex-col items-center gap-2 p-4 transition-all"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            <CreditCard size={24} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              Pay with Card
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              Stripe
            </span>
          </button>

          {/* Coming Soon tooltip */}
          {showComingSoon && (
            <div
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-semibold whitespace-nowrap animate-fade-up"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Coming Soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
