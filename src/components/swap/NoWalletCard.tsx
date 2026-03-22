'use client';

import { Wallet, ArrowLeftRight, Edit3 } from 'lucide-react';

interface NoWalletCardProps {
  chainId: string;
  chainName: string;
  connectedChains: { id: string; name: string }[];
  onEnterManually: () => void;
  onSwitchChain: (chainId: string) => void;
  onConnectWallet: () => void;
}

export default function NoWalletCard({
  chainName,
  connectedChains,
  onEnterManually,
  onSwitchChain,
  onConnectWallet,
}: NoWalletCardProps) {
  return (
    <div
      className="rounded-xl p-4 mt-2"
      style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
    >
      <p className="text-body-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        No {chainName} wallet connected
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={onConnectWallet}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-all active:scale-[0.98]"
          style={{ background: 'var(--brand)', color: '#fff' }}
        >
          <Wallet className="h-4 w-4" />
          Connect {chainName} wallet
        </button>
        <button
          onClick={onEnterManually}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-all active:scale-[0.98]"
          style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <Edit3 className="h-4 w-4" />
          Enter address manually
        </button>
        {connectedChains.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {connectedChains.slice(0, 3).map(chain => (
              <button
                key={chain.id}
                onClick={() => onSwitchChain(chain.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-tiny font-medium transition-all active:scale-95"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                <ArrowLeftRight className="h-3 w-3" />
                {chain.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
