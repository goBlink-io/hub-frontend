'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@goblink/connect/react';
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
  const [recipient, setRecipient] = useState('');
  const [toChain, setToChain] = useState('near');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [name, setName] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>(() => loadLinks());

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
  }, [recipient, toChain, toToken, amount, memo, name, savedLinks]);

  const handleCopy = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const updated = savedLinks.filter(l => l.id !== id);
    setSavedLinks(updated);
    saveLinks(updated);
  }, [savedLinks]);

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

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Create Payment Link */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <CreditCard className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-h3">Create Payment Link</h2>
        </div>

        <div className="space-y-4">
          {/* Recipient */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-caption font-medium" style={{ color: 'var(--color-text-secondary)' }}>Receiving Address</label>
              {address && (
                <button onClick={handleAutoFill} className="text-tiny font-semibold" style={{ color: 'var(--color-primary)' }}>
                  Use my wallet
                </button>
              )}
            </div>
            <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder="Enter wallet address" className="input w-full h-11 font-mono text-body-sm" />
          </div>

          {/* Chain */}
          <div>
            <label className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Chain</label>
            <select value={toChain} onChange={e => setToChain(e.target.value)}
              className="input w-full h-11 text-body-sm font-semibold">
              {SUPPORTED_CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Token */}
          <div>
            <label className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Token</label>
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
            <label className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Amount</label>
            <input type="text" inputMode="decimal" value={amount}
              onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v); }}
              placeholder="0.00" className="input w-full h-12 text-h4" />
          </div>

          {/* Optional fields */}
          <div>
            <label className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Name <span className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>(optional)</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name or business" className="input w-full h-11 text-body-sm" />
          </div>

          <div>
            <label className="block text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Memo <span className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>(optional)</span>
            </label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)}
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
                className="btn btn-secondary h-10 px-3" title="Open link">
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Payment Links */}
      {savedLinks.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h3 className="text-h4 mb-4">Your Payment Links</h3>
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
                    className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }} title="Share">
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleCopy(link.url)}
                    className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }} title="Copy">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }} title="Delete">
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
