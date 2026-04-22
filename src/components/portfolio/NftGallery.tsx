'use client';

import { Image as ImageIcon, Sparkles } from 'lucide-react';

interface NftGalleryProps {
  connectedChains: string[];
}

export function NftGallery({ connectedChains }: NftGalleryProps) {
  const hasSui = connectedChains.includes('sui');

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-h5 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          NFTs
        </h2>
        <span
          className="text-tiny px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}
        >
          Coming Soon
        </span>
      </div>

      {hasSui ? (
        <div className="space-y-3">
          <p className="text-body-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Sui wallet detected — Rewardian NFTs will appear here.
          </p>
          {/* Placeholder grid */}
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-bg-tertiary)' }}
              >
                <Sparkles className="h-6 w-6" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-8">
          <ImageIcon className="h-10 w-10 mb-3 opacity-20" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-body-sm" style={{ color: 'var(--color-text-muted)' }}>
            NFT gallery coming soon
          </p>
          <p className="text-tiny mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Connect a Sui wallet to view Rewardian NFTs
          </p>
        </div>
      )}
    </div>
  );
}
