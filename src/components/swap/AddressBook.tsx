'use client';

import { useState, useCallback } from 'react';
import { X, Copy, Check, Trash2, BookUser, ArrowRight, Plus } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { SavedAddress } from '@/hooks/useUserProfile';
import { CHAIN_LOGOS } from '@/lib/chain-logos';

interface AddressBookProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: when provided, each row gets a "Use" button that fires this and closes the modal */
  onSelect?: (address: string, chain: string) => void;
}

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function AddressRow({
  entry,
  onRemove,
  onSelect,
}: {
  entry: SavedAddress;
  onRemove: (address: string) => void;
  onSelect?: (address: string, chain: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(entry.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [entry.address]);

  const chainLogo = CHAIN_LOGOS[entry.chain];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90"
      style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
    >
      {/* Chain logo */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
        style={{ background: chainLogo?.bgColor || 'var(--surface)' }}>
        {chainLogo?.icon ? (
          <img
            src={chainLogo.icon}
            alt={chainLogo.name}
            className="w-6 h-6 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-tiny font-bold uppercase">{entry.chain.slice(0, 2)}</span>
        )}
      </div>

      {/* Label + address */}
      <div className="flex-1 min-w-0">
        <div className="text-body-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {entry.label}
        </div>
        <div className="font-mono text-tiny truncate" style={{ color: 'var(--text-muted)' }}>
          {truncateAddress(entry.address)} · {chainLogo?.name || entry.chain}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onSelect && (
          <button
            onClick={() => onSelect(entry.address, entry.chain)}
            title="Use this address"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-tiny font-semibold transition-all hover:opacity-80 active:scale-95"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            Use <ArrowRight className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={handleCopy}
          title="Copy address"
          className="p-1.5 rounded-lg transition-all hover:opacity-80 active:scale-90"
          style={{ color: copied ? 'var(--success)' : 'var(--text-muted)' }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          onClick={() => onRemove(entry.address)}
          title="Remove address"
          className="p-1.5 rounded-lg transition-all hover:opacity-80 active:scale-90"
          style={{ color: 'var(--text-faint)' }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const SUPPORTED_CHAINS = [
  'EVM', 'SOLANA', 'SUI', 'NEAR', 'BITCOIN', 'APTOS', 'STARKNET', 'TON', 'TRON',
];

export default function AddressBook({ isOpen, onClose, onSelect }: AddressBookProps) {
  const { profile, hydrated, removeAddress, saveAddress } = useUserProfile();
  const [filterChain, setFilterChain] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newChain, setNewChain] = useState('EVM');
  const [addError, setAddError] = useState('');

  const handleAddAddress = () => {
    setAddError('');
    const label = newLabel.trim();
    const address = newAddress.trim();
    if (!label) { setAddError('Label is required'); return; }
    if (!address) { setAddError('Address is required'); return; }
    if (profile.savedAddresses.length >= 20) { setAddError('Maximum 20 addresses'); return; }
    if (profile.savedAddresses.some(a => a.address === address)) { setAddError('Address already saved'); return; }
    saveAddress(label, address, newChain);
    setNewLabel('');
    setNewAddress('');
    setNewChain('evm');
    setShowAddForm(false);
  };

  const handleSelect = onSelect
    ? (address: string, chain: string) => { onSelect(address, chain); onClose(); }
    : undefined;

  if (!isOpen) return null;

  const addresses = filterChain
    ? profile.savedAddresses.filter(a => a.chain === filterChain)
    : profile.savedAddresses;

  const chainOptions = [...new Set(profile.savedAddresses.map(a => a.chain))];

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <BookUser className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            <h2 className="text-h4">Address Book</h2>
          </div>
          <div className="flex items-center gap-2">
            {profile.savedAddresses.length < 20 && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-tiny font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{ background: showAddForm ? 'var(--elevated)' : 'var(--brand)', color: showAddForm ? 'var(--text-secondary)' : '#fff' }}
              >
                <Plus className="h-3.5 w-3.5" />
                {showAddForm ? 'Cancel' : 'Add'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-all hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chain filter */}
        {chainOptions.length > 1 && (
          <div className="px-5 pt-3 pb-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterChain('')}
                className="px-3 py-1 rounded-full text-tiny font-semibold transition-all"
                style={{
                  background: !filterChain ? 'var(--brand)' : 'var(--elevated)',
                  color: !filterChain ? '#fff' : 'var(--text-secondary)',
                }}
              >
                All
              </button>
              {chainOptions.map(chain => (
                <button
                  key={chain}
                  onClick={() => setFilterChain(filterChain === chain ? '' : chain)}
                  className="px-3 py-1 rounded-full text-tiny font-semibold transition-all capitalize"
                  style={{
                    background: filterChain === chain ? 'var(--brand)' : 'var(--elevated)',
                    color: filterChain === chain ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {CHAIN_LOGOS[chain]?.name || chain}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add address form */}
        {showAddForm && (
          <div className="px-5 py-3 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <input
                type="text"
                placeholder="Label (e.g. My Phantom)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                maxLength={30}
                className="w-full px-3 py-2 rounded-lg text-body-sm outline-none transition-all"
                style={{ background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Wallet address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-body-sm font-mono outline-none transition-all"
                style={{ background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <select
                value={newChain}
                onChange={(e) => setNewChain(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-body-sm outline-none transition-all capitalize"
                style={{ background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {SUPPORTED_CHAINS.map(chain => (
                  <option key={chain} value={chain}>
                    {CHAIN_LOGOS[chain]?.name || chain}
                  </option>
                ))}
              </select>
            </div>
            {addError && (
              <p className="text-tiny" style={{ color: 'var(--error, #ef4444)' }}>{addError}</p>
            )}
            <button
              onClick={handleAddAddress}
              className="w-full py-2 rounded-lg text-body-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--brand)', color: '#fff' }}
            >
              Save Address
            </button>
          </div>
        )}

        {/* Address list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {!hydrated ? (
            <div className="text-center py-8">
              <div className="animate-pulse h-4 w-32 rounded mx-auto" style={{ background: 'var(--elevated)' }} />
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-10">
              <BookUser className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
                {filterChain ? 'No addresses saved for this chain.' : 'No saved addresses yet.'}
              </p>
              <p className="text-tiny mt-1" style={{ color: 'var(--text-faint)' }}>
                After a transfer, tap &ldquo;Save address&rdquo; to add it here.
              </p>
            </div>
          ) : (
            addresses.map(entry => (
              <AddressRow key={entry.address} entry={entry} onRemove={removeAddress} onSelect={handleSelect} />
            ))
          )}
        </div>

        {/* Footer */}
        {profile.savedAddresses.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-tiny text-center" style={{ color: 'var(--text-faint)' }}>
              {profile.savedAddresses.length}/{20} addresses saved
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
