'use client';

import { useState, useEffect, useRef } from 'react';
import { Trophy, Share2, Check, Link as LinkIcon, Bookmark, X } from 'lucide-react';
import { generateTransferUrl } from '@/lib/transfer-links';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatElapsed } from '@/lib/transfer-links';

interface TransferSuccessProps {
  amountOut: string;
  toToken: string;
  toChain: string;
  elapsedSeconds: number;
  feeUsd?: number | null;
  // Optional extra data for generating a transfer link
  fromChain?: string;
  fromToken?: string;
  amountIn?: string;
  amountInUsd?: string;
  // Optional recipient address for address book
  recipientAddress?: string;
  // Token icons
  fromTokenIcon?: string;
  toTokenIcon?: string;
}

export default function TransferSuccess({
  amountOut,
  toToken,
  toChain,
  elapsedSeconds,
  feeUsd,
  fromChain,
  fromToken,
  amountIn,
  amountInUsd,
  recipientAddress,
  fromTokenIcon,
  toTokenIcon,
}: TransferSuccessProps) {
  const [shared, setShared] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [labelEditing, setLabelEditing] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);
  const { saveAddress, profile } = useUserProfile();

  const chainName = toChain.charAt(0).toUpperCase() + toChain.slice(1);
  const smartDefaultLabel = `My ${chainName} Wallet`;

  const isAlreadySaved = recipientAddress
    ? profile.savedAddresses.some(a => a.address === recipientAddress)
    : false;
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; color: string; delay: number; size: number }>
  >([]);

  useEffect(() => {
    const colors = ['#2563EB', '#7C3AED', '#22C55E', '#EAB308', '#F97316', '#EC4899'];
    setParticles(
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 1.2,
        size: 6 + Math.random() * 6,
      }))
    );
  }, []);

  const estimatedSavings = null; // Removed — no reliable comparison data

  const handleCopyLink = () => {
    if (!fromChain || !fromToken || !amountIn) return;
    const url = generateTransferUrl({
      fromChain,
      toChain,
      fromToken,
      toToken,
      amountIn,
      amountOut,
      amountInUsd,
      elapsedSeconds,
      feeUsd,
      timestamp: Date.now(),
    });
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    });
  };

  const handleShare = () => {
    const text = [
      `Just transferred ${amountOut} ${toToken} to ${chainName} in ${elapsedSeconds}s using goBlink ⚡`,
      `No bridges. No waiting. Just instant transfers.`,
      `https://goblink.io`,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    });
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl py-8 px-6 text-center"
      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
    >
      {/* CSS Confetti */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg) scale(1);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(130px) rotate(720deg) scale(0.6); opacity: 0; }
        }
      `}</style>

      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-12px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animation: `confetti-fall 1.8s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}

      {/* Checkmark circle */}
      <div
        className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full"
        style={{ background: 'rgba(34,197,94,0.15)' }}
      >
        <Check className="h-8 w-8" style={{ color: 'var(--success, #22c55e)' }} />
      </div>

      <div className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Done!
      </div>
      <p className="text-sm mb-4 inline-flex items-center gap-1.5 justify-center flex-wrap" style={{ color: 'var(--text-secondary)' }}>
        {fromTokenIcon && <img src={fromTokenIcon} alt={fromToken || ''} className="w-5 h-5 rounded-full inline-block" />}
        {toTokenIcon && <img src={toTokenIcon} alt={toToken} className="w-5 h-5 rounded-full inline-block" />}
        {amountOut} {toToken} arrived on {chainName} in {elapsedSeconds}s
      </p>

      {estimatedSavings && (
        <div
          className="flex items-center justify-center gap-2 mb-5 px-4 py-2.5 rounded-lg"
          style={{ background: 'rgba(34,197,94,0.12)' }}
        >
          <Trophy className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--success, #22c55e)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--success, #22c55e)' }}>
            You saved ~${estimatedSavings} vs manual bridging
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
        {recipientAddress && !isAlreadySaved && !addressSaved && !labelEditing && (
          /* Stage 1: Save prompt button */
          <button
            onClick={() => {
              setCustomLabel(smartDefaultLabel);
              setLabelEditing(true);
              setTimeout(() => {
                labelInputRef.current?.focus();
                labelInputRef.current?.select();
              }, 50);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: 'var(--elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <Bookmark className="h-4 w-4" />
            Save address
          </button>
        )}

        {recipientAddress && labelEditing && (
          /* Stage 2: Inline label input — morphs in place */
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg w-full sm:w-auto"
            style={{ background: 'var(--elevated)', border: '1px solid var(--brand)' }}
          >
            <Bookmark className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--brand)' }} />
            <input
              ref={labelInputRef}
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customLabel.trim()) {
                  saveAddress(customLabel.trim(), recipientAddress, toChain);
                  setLabelEditing(false);
                  setAddressSaved(true);
                }
                if (e.key === 'Escape') {
                  setLabelEditing(false);
                }
              }}
              placeholder="Name this address..."
              maxLength={40}
              className="bg-transparent text-sm font-medium outline-none min-w-0 w-36"
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              onClick={() => {
                if (!customLabel.trim()) return;
                saveAddress(customLabel.trim(), recipientAddress, toChain);
                setLabelEditing(false);
                setAddressSaved(true);
              }}
              disabled={!customLabel.trim()}
              className="flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--brand)', color: '#fff' }}
            >
              Save
            </button>
            <button
              onClick={() => setLabelEditing(false)}
              className="flex-shrink-0 p-1 rounded-md transition-all hover:opacity-70"
              style={{ color: 'var(--text-faint)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {addressSaved && (
          /* Stage 3: Confirmation */
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: 'rgba(34,197,94,0.1)',
              color: 'var(--success)',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            <Check className="h-4 w-4" />
            Saved as &ldquo;{customLabel}&rdquo;
          </div>
        )}
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {shared ? (
            <Check className="h-4 w-4" style={{ color: 'var(--success)' }} />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {shared ? 'Copied to clipboard!' : 'Share'}
        </button>

        {fromChain && fromToken && amountIn && (
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: linkCopied ? 'rgba(34,197,94,0.1)' : 'var(--elevated)',
              color: linkCopied ? 'var(--success)' : 'var(--text-secondary)',
              border: `1px solid ${linkCopied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            }}
          >
            {linkCopied ? (
              <Check className="h-4 w-4" style={{ color: 'var(--success)' }} />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            {linkCopied ? 'Link copied!' : 'Copy receipt link'}
          </button>
        )}
      </div>
    </div>
  );
}
