'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { BottomSheet } from '@/components/shared/BottomSheet';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

/** Format balance for display — full precision kept internally, truncated visually */
function formatBal(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n) || n === 0) return '0.00';
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  // For small values: avoid scientific notation by using toFixed with enough decimal places.
  // toPrecision(6) can produce "1.23456e-7" for tiny numbers; .toString() preserves it.
  if (n >= 0.001) return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  if (n >= 0.000001) return n.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return n.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}

interface Token {
  assetId: string;
  symbol: string;
  name?: string;
  icon?: string;
  priceUsd?: string | number;
  price?: string | number;
  blockchain?: string;
  decimals?: number;
}

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: string;
  onSelect: (assetId: string) => void;
  balances: Record<string, string>;
  loadingBalances: boolean;
  label: string;
  placeholder?: string;
  emptyMessage?: string;
}

const cleanSymbol = (s: string) => s.replace(/\.(omft|omdep)$/, '');

export default function TokenSelector({
  tokens, selectedToken, onSelect, balances, loadingBalances, label, placeholder = 'Select a token', emptyMessage
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const selected = tokens.find(t => t.assetId === selectedToken);
  const withIcons = tokens.filter(t => t.icon);
  const filtered = (search
    ? withIcons.filter(t => t.symbol.toLowerCase().includes(search.toLowerCase()) || t.name?.toLowerCase().includes(search.toLowerCase()))
    : withIcons
  ).slice().sort((a, b) => {
    // Primary sort: USD value descending (highest balance wins)
    const balA = parseFloat(balances[a.assetId] || '0');
    const balB = parseFloat(balances[b.assetId] || '0');
    const priceA = parseFloat(String(a.priceUsd || a.price || '0'));
    const priceB = parseFloat(String(b.priceUsd || b.price || '0'));
    const valA = balA * priceA;
    const valB = balB * priceB;
    if (valA !== valB) return valB - valA;
    if (balA !== balB) return balB - balA;
    // Fallback: alphabetical
    return a.symbol.localeCompare(b.symbol);
  });

  const close = () => { setIsOpen(false); setSearch(''); };

  return (
    <div className="mb-2">
      <label className="block text-caption font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>

      {/* Trigger */}
      <button type="button" onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors"
        style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
        {selected ? (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {selected.icon ? (
              <img src={selected.icon} alt="" className="w-7 h-7 rounded-full flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
                {cleanSymbol(selected.symbol)[0]}
              </div>
            )}
            <div className="flex flex-col items-start min-w-0">
              <span className="font-semibold text-body-sm truncate">{cleanSymbol(selected.symbol)}</span>
              <span className="text-tiny truncate" style={{ color: 'var(--color-text-muted)' }}>
                {loadingBalances ? '...' : `Bal: ${formatBal(balances[selected.assetId] || '0')}`}
                {(selected.priceUsd || selected.price) && ` · $${Number(selected.priceUsd || selected.price).toFixed(Number(selected.priceUsd || selected.price) < 0.01 ? 6 : 2)}`}
              </span>
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>{placeholder}</span>
        )}
        <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" style={{ color: 'var(--color-text-muted)' }} />
      </button>

      {/* Token list content — shared between BottomSheet (mobile) and modal (desktop) */}
      {(() => {
        const tokenListContent = (
          <>
            {/* Search */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tokens..."
                  className="input w-full pl-9 h-11 text-body-sm"
                />
              </div>
            </div>

            {/* Token list */}
            <div className="overflow-y-auto flex-1 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch', maxHeight: '60vh' }}>
              {tokens.length === 0 ? (
                <div className="px-4 py-3 space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-20 mb-1.5" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'var(--color-bg-tertiary)' }}
                  >
                    <Search className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
                  </div>
                  <p className="text-body-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {search ? 'No tokens found' : (emptyMessage || 'No tokens available')}
                  </p>
                  <p className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                    {search
                      ? 'Check the spelling or try a different search term.'
                      : 'Try connecting a wallet or switching chains.'}
                  </p>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="mt-3 text-tiny font-semibold transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((token) => {
                  const bal = balances[token.assetId] || '0.00';
                  const price = token.priceUsd || token.price;
                  const isSel = token.assetId === selectedToken;

                  return (
                    <button key={token.assetId} type="button"
                      onClick={() => { onSelect(token.assetId); close(); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors active:scale-[0.99]"
                      style={{ background: isSel ? 'var(--color-bg-tertiary)' : 'transparent' }}>
                      {token.icon ? (
                        <img src={token.icon} alt="" className="w-10 h-10 rounded-full flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'var(--color-primary)' }}>
                          {cleanSymbol(token.symbol)[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-body-sm" style={{ color: 'var(--color-text-primary)' }}>{cleanSymbol(token.symbol)}</span>
                          {token.name && <span className="text-tiny truncate" style={{ color: 'var(--color-text-tertiary)' }}>{token.name}</span>}
                        </div>
                        <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                          {loadingBalances ? '...' : `Bal: ${formatBal(bal)}`}
                          {price && ` · $${Number(price).toFixed(Number(price) < 0.01 ? 6 : 2)}`}
                        </div>
                      </div>
                      {isSel && <Check className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />}
                    </button>
                  );
                })
              )}
            </div>
          </>
        );

        if (isMobile) {
          return (
            <BottomSheet isOpen={isOpen} onClose={close} title={label}>
              {tokenListContent}
            </BottomSheet>
          );
        }

        // Desktop modal
        return isOpen ? (
          <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
            <div className="fixed inset-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full mx-4"
              style={{ maxHeight: '85vh' }}>
              <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', maxHeight: '85vh' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <h3 className="text-h5" style={{ color: 'var(--color-text-primary)' }}>{label}</h3>
                  <button onClick={close} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} aria-label="Close token selector">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {tokenListContent}
              </div>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}
