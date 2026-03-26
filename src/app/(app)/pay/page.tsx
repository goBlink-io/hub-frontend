'use client';

import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@goblink/connect/react';
import { useToast } from '@/contexts/ToastContext';
import { generatePaymentUrl, type PaymentRequestData } from '@/lib/payment-requests';
import { CreditCard, Copy, Check, ExternalLink, QrCode, Share2, Plus, Trash2 } from 'lucide-react';
import { ProductSuggestion } from '@/components/shared/ProductSuggestion';

const SUPPORTED_CHAINS = [
  { id: 'near', name: 'NEAR' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'solana', name: 'Solana' },
  { id: 'sui', name: 'Sui' },
  { id: 'bsc', name: 'BNB Chain' },
  { id: 'polygon', name: 'Polygon' },
];

const POPULAR_TOKENS = ['USDC', 'USDT', 'ETH', 'NEAR', 'SOL', 'SUI', 'BNB', 'DAI'];

interface SavedLink {
  id: string;
  url: string;
  data: PaymentRequestData;
  createdAt: number;
}

const STORAGE_KEY = 'goblink_payment_links';

function loadLinks(): SavedLink[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveLinks(links: SavedLink[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(links)); } catch {}
}

export default function PayPage() {
  const { address } = useWallet();
  const { toast } = useToast();
  const [recipient, setRecipient] = useState('');
  const [toChain, setToChain] = useState('near');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [name, setName] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>(() => loadLinks());
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Undo deletion state
  const [pendingDelete, setPendingDelete] = useState<SavedLink | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fill recipient from wallet
  const handleAutoFill = useCallback(() => {
    if (address) setRecipient(address);
  }, [address]);

  const handleGenerate = useCallback(() => {
    if (!recipient || !amount || !toToken || !toChain) return;

    const data: PaymentRequestData = {
      recipient,
      toChain,
      toToken,
      amount,
      memo: memo || undefined,
      name: name || undefined,
      createdAt: Date.now(),
    };

    const url = generatePaymentUrl(data);
    setGeneratedUrl(url);

    const link: SavedLink = {
      id: crypto.randomUUID(),
      url,
      data,
      createdAt: Date.now(),
    };

    const updated = [link, ...savedLinks].slice(0, 20);
    setSavedLinks(updated);
    saveLinks(updated);
    toast('Payment link created!', 'success');
  }, [recipient, toChain, toToken, amount, memo, name, savedLinks, toast]);

  const handleCopy = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const linkToDelete = savedLinks.find(l => l.id === id);
    if (!linkToDelete) return;

    // Immediately remove from view
    const updated = savedLinks.filter(l => l.id !== id);
    setSavedLinks(updated);
    saveLinks(updated);
    setPendingDelete(linkToDelete);

    // Clear any existing timer
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);

    // Set timer to finalize
    deleteTimerRef.current = setTimeout(() => {
      setPendingDelete(null);
      deleteTimerRef.current = null;
    }, 5000);

    toast('Link deleted. Tap Undo to restore.', 'info');
  }, [savedLinks, toast]);

  const handleUndoDelete = useCallback(() => {
    if (!pendingDelete) return;
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = null;

    const restored = [pendingDelete, ...savedLinks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
    setSavedLinks(restored);
    saveLinks(restored);
    setPendingDelete(null);
    toast('Link restored!', 'success');
  }, [pendingDelete, savedLinks, toast]);

  const handleShare = useCallback(async (url: string, data: PaymentRequestData) => {
    const text = `Pay ${data.amount} ${data.toToken} on ${data.toChain} via goBlink`;
    if (navigator.share) {
      await navigator.share({ title: 'goBlink Payment Link', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleRecipientBlur = () => {
    if (recipient && recipient.length < 3) {
      setRecipientError('Please enter a valid wallet address');
    } else {
      setRecipientError(null);
    }
  };

  const handleAmountBlur = () => {
    if (amount && (isNaN(Number(amount)) || Number(amount) <= 0)) {
      setAmountError('Amount must be greater than 0');
    } else {
      setAmountError(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Create Payment Link */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <CreditCard className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-h3">Create Payment Link</h1>
        </div>

        <div className="space-y-4">
          {/* Recipient */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="pay-recipient" className="text-caption font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Receiving Address<span className="text-[var(--color-danger)]"> *</span>
              </label>
              {address && (
                <button onClick={handleAutoFill} className="text-tiny font-semibold" style={{ color: 'var(--color-primary)' }}>
                  Use my wallet
                </button>
              )}
            </div>
            <input id="pay-recipient" type="text" value={recipient}
              onChange={e => { setRecipient(e.target.value); setRecipientError(null); }}
              onBlur={handleRecipientBlur}
              placeholder="Enter wallet address" className="input w-full h-11 font-mono text-body-sm"
              style={{ borderColor: recipientError ? 'var(--color-danger)' : undefined }}
            />
            {recipientError && (
              <p className="text-xs mt-1" role="alert" aria-live="polite" style={{ color: 'var(--color-danger)' }}>
                {recipientError}
              </p>
            )}
          </div>

          {/* Chain */}
          <div>
            <label htmlFor="pay-chain" className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Chain</label>
            <select id="pay-chain" value={toChain} onChange={e => setToChain(e.target.value)}
              className="input w-full h-11 text-body-sm font-semibold">
              {SUPPORTED_CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Token */}
          <div>
            <label className="block text-caption font-medium mb-1.5" id="pay-token-label" style={{ color: 'var(--color-text-secondary)' }}>Token</label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TOKENS.map(t => (
                <button key={t} onClick={() => setToToken(t)}
                  className="px-3 py-1.5 rounded-lg text-tiny font-semibold transition-all active:scale-95"
                  style={{
                    background: toToken === t ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    color: toToken === t ? '#fff' : 'var(--color-text-secondary)',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="pay-amount" className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Amount<span className="text-[var(--color-danger)]"> *</span>
            </label>
            <input id="pay-amount" type="text" inputMode="decimal" value={amount}
              onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) { setAmount(v); setAmountError(null); } }}
              onBlur={handleAmountBlur}
              placeholder="0.00" className="input w-full h-12 text-h4"
              style={{ borderColor: amountError ? 'var(--color-danger)' : undefined }}
            />
            {amountError && (
              <p className="text-xs mt-1" role="alert" aria-live="polite" style={{ color: 'var(--color-danger)' }}>
                {amountError}
              </p>
            )}
          </div>

          {/* Optional fields */}
          <div>
            <label htmlFor="pay-name" className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Name <span className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>(optional)</span>
            </label>
            <input id="pay-name" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name or business" className="input w-full h-11 text-body-sm" />
          </div>

          <div>
            <label htmlFor="pay-memo" className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Memo <span className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>(optional)</span>
            </label>
            <input id="pay-memo" type="text" value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="What's this payment for?" className="input w-full h-11 text-body-sm" />
          </div>

          <button onClick={handleGenerate}
            disabled={!recipient || !amount || !toToken}
            className="btn btn-primary w-full h-12 text-body-sm">
            <Plus className="h-4 w-4 mr-2" />
            Generate Payment Link
          </button>
        </div>

        {/* Generated URL */}
        {generatedUrl && (
          <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <label className="block text-tiny font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Payment Link</label>
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 text-tiny font-mono break-all" style={{ color: 'var(--color-text-secondary)' }}>
                {generatedUrl}
              </code>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleCopy(generatedUrl)}
                className="btn btn-secondary flex-1 h-10 text-tiny gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={() => window.open(generatedUrl, '_blank')}
                className="btn btn-secondary h-10 px-3"
                aria-label="Open payment link in new tab">
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Undo toast */}
      {pendingDelete && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-slide-up"
            style={{ background: 'var(--info-bg)', borderColor: 'var(--color-border)' }}>
            <span className="text-body-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>
              Link deleted
            </span>
            <button onClick={handleUndoDelete}
              className="text-body-sm font-bold px-3 py-1 rounded-lg"
              style={{ color: 'var(--color-primary)', background: 'var(--color-bg-tertiary)' }}>
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Saved Payment Links */}
      {savedLinks.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-h4 mb-4">Your Payment Links</h2>
          <div className="space-y-3">
            {savedLinks.map(link => (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {link.data.amount} {link.data.toToken}
                  </div>
                  <div className="text-tiny truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {link.data.toChain} · {link.data.memo || 'No memo'} · {new Date(link.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleShare(link.url, link.data)}
                    className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}
                    aria-label="Share payment link">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleCopy(link.url)}
                    className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}
                    aria-label="Copy payment link">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }}
                    aria-label="Delete payment link">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProductSuggestion exclude="pay" />
    </div>
  );
}
